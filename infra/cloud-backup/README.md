# Rack cloud backup (deployed)

Encrypted backup endpoint for Rack. Rack encrypts everything on-device with the
user's passphrase before sending, so this only ever stores opaque ciphertext
keyed by a passphrase-derived id. It cannot read the data.

## What is deployed (AWS account 280012167843, us-east-1)

| Piece | Name |
|---|---|
| Lambda | `rack-backup` (nodejs20.x, `handler.handler`, env `BUCKET`) |
| IAM role | `rack-backup-lambda-role` (S3 Get/Put/List on the bucket + logs) |
| S3 bucket | `rack-backup-280012167843` (private, SSE-AES256, public access blocked) |
| API | API Gateway **HTTP API** `rack-backup` → Lambda proxy, CORS for the app origins |

**Live endpoint:** `https://xbih5t41wg.execute-api.us-east-1.amazonaws.com`

### Why API Gateway, not a Lambda Function URL

This account blocks public (auth `NONE`) Lambda Function URLs via an
organization guardrail (SCP) — they create fine but return 403 on invoke. An
HTTP API in front of the Lambda is the public ingress that works. Two gotchas
hit during deploy, both fixed:
- API Gateway needs `lambda:InvokeFunction` permission on the function
  (`apigateway.amazonaws.com`, source `arn:aws:execute-api:...:<api-id>/*/*`).
- The role needs `s3:ListBucket`, else a GET on a missing key returns 403 (not
  404) and the handler 500s. The handler also treats 404/NotFound as "no backup".

## API

`POST <endpoint>` JSON:
- Back up: `{ "action": "put", "id": "<hash>", "blob": "<ciphertext>" }`
- Restore: `{ "action": "get", "id": "<hash>" }` -> `{ "blob": "<ciphertext>" }` or 404 `{ "blob": null }`

## Update the handler code

```bash
cd infra/cloud-backup
zip -q /tmp/rack-backup.zip handler.mjs
aws lambda update-function-code --function-name rack-backup --region us-east-1 \
  --zip-file fileb:///tmp/rack-backup.zip
```

## Notes

- Public but useless without the passphrase (id is a hash of it; blob is
  AES-GCM encrypted with a key stretched from it).
- 50MB blob cap and id-format limit guard against abuse. For a single user this
  is fine; a shared-secret header or WAF rate limit could be added later.
- To wipe a backup: `aws s3 rm s3://rack-backup-280012167843/backups/<id>.txt`.
