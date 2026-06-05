# Rack cloud backup (your AWS)

A tiny backend for Rack's encrypted cloud backup: one Lambda + one private S3
bucket. Rack encrypts everything on your device with your passphrase before it
is sent, so this server only ever stores opaque ciphertext. It has no idea who
you are and cannot read your data.

## API (what Rack calls)

`POST <function-url>` with a JSON body:

- Back up: `{ "action": "put", "id": "<derived-id>", "blob": "<ciphertext>" }`
- Restore: `{ "action": "get", "id": "<derived-id>" }` -> `{ "blob": "<ciphertext>" }` or 404

`id` is a SHA-256 of your passphrase (the server never sees the passphrase).

## Deploy with AWS SAM (recommended)

Requires the AWS SAM CLI and credentials.

```bash
cd infra/cloud-backup
sam build
sam deploy --guided   # accept defaults; allows creating IAM roles
```

When it finishes, copy the `BackupUrl` output and paste it into Rack:
**Settings -> Cloud backup -> Backup endpoint URL**, set a passphrase, tap
**Back up now**.

## Deploy by hand (AWS console)

1. **S3**: create a private bucket (block all public access). Note its name.
2. **Lambda**: create a function, runtime **Node.js 20.x**. Paste
   `handler.mjs` as the code (file/handler `handler.handler`). Set env var
   `BUCKET` to the bucket name. Timeout 15s.
3. **Permissions**: give the function's role `s3:GetObject` and `s3:PutObject`
   on `arn:aws:s3:::<bucket>/*`.
4. **Function URL**: enable one, **Auth type: NONE**, and under CORS allow
   origin `*`, method `POST`, header `content-type`. Copy the URL.
5. Paste the URL into Rack as above.

## Notes

- The Function URL is public but useless without your passphrase: the `id` is a
  hash of it and the blob is AES-GCM encrypted with a key stretched from it.
- Use a strong passphrase. If you lose it, the backup cannot be recovered.
- Cost is effectively nothing for one user (a few KB blob, occasional requests).
- To wipe a backup, delete `backups/<id>.txt` from the bucket.
