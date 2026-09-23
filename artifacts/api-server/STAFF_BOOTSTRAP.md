# Staff bootstrap

There is intentionally no public signup or bootstrap endpoint. The first
administrator must be created manually by the verified owner, independently in
the production environment. Do not run this procedure until the owner has
verified the operator's identity out of band.

From the API server environment, run the approved bootstrap CLI against the
development database after building the API. Enter four lines on stdin:
username, name, email and a strong temporary password; finish with EOF.
Use a private operator terminal so the password is not exposed in a shared
terminal recording or shell history:

```sh
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/api-server exec node ./dist/bootstrap-admin.mjs
```

For production, run `node ./dist/bootstrap-admin.mjs` from the deployed API release (with its
production `DATABASE_URL`) through the approved operator session; never point a
development command at production or run the production command against a
developer database. The command refuses to run if any administrator already
exists.

Only a server-controlled operator session from an approved deployment may run
this command. Do not run it from a laptop against production, expose it as an
HTTP action, or perform a schema push against production. Production schema
changes must go through the approved migration/release process; this bootstrap
procedure only inserts the first administrator.

The CLI reads `username`, `name`, `email`, and a high-entropy temporary
password from stdin, hashes the password with Node `scrypt`, and creates an
administrator with `passwordChangeRequired=true`. It does not print or store
the password. Deliver the temporary password to the verified operator through
an approved secure channel, then require password and TOTP setup at first
login. Never use a default password, public signup, or a browser-supplied
identity for this procedure.

Only an existing administrator should grant subsequent roles through the
reviewed administrative workflow. The API returns a generated temporary
password exactly once when creating a user; record it only in the approved
secret-delivery process and discard it after delivery.

Receipt uploads are limited to PDF/PNG/JPEG and 25 MiB. The server checks
stored object metadata and magic bytes before consuming an upload intent. This
does not perform antivirus/OCR or prove that every PII field was removed; a
human redaction attestation and separate reviewer/publisher workflow remain
mandatory.