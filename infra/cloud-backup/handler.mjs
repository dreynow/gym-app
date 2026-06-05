import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'

// Rack encrypted cloud backup. Stores/returns an opaque, client-encrypted blob
// keyed by a passphrase-derived id. The server never sees the passphrase or the
// plaintext. Deploy as a Lambda Function URL (auth NONE) backed by one S3 bucket.

const s3 = new S3Client({})
const BUCKET = process.env.BUCKET

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
}
const json = (statusCode, obj) => ({
  statusCode,
  headers: { ...cors, 'content-type': 'application/json' },
  body: JSON.stringify(obj),
})

export const handler = async (event) => {
  const method = event.requestContext?.http?.method
  if (method === 'OPTIONS') return { statusCode: 204, headers: cors }
  if (method !== 'POST') return json(405, { error: 'POST only' })

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return json(400, { error: 'invalid json' })
  }

  const id = String(body.id || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 64)
  if (!id) return json(400, { error: 'missing id' })
  const Key = `backups/${id}.txt`

  try {
    if (body.action === 'put') {
      if (typeof body.blob !== 'string' || body.blob.length > 50 * 1024 * 1024) {
        return json(400, { error: 'invalid blob' })
      }
      await s3.send(
        new PutObjectCommand({ Bucket: BUCKET, Key, Body: body.blob, ContentType: 'text/plain' }),
      )
      return json(200, { ok: true })
    }
    if (body.action === 'get') {
      try {
        const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key }))
        return json(200, { blob: await obj.Body.transformToString() })
      } catch (e) {
        if (e?.name === 'NoSuchKey' || e?.$metadata?.httpStatusCode === 404) {
          return json(404, { blob: null })
        }
        throw e
      }
    }
    return json(400, { error: 'unknown action' })
  } catch {
    return json(500, { error: 'server error' })
  }
}
