# Staff bootstrap

There is intentionally no public bootstrap endpoint. A newly authenticated Clerk
user is inserted with the `unassigned` role and cannot access `/api/admin`.

After verifying the owner's identity through Clerk, the owner must run the
following SQL in the development database (and repeat through the
approved production migration process before publishing), replacing the two
values with the verified Clerk user id and role:

```sql
UPDATE users
SET role = 'administrator', active = true, updated_at = CURRENT_TIMESTAMP
WHERE id = '<verified-clerk-user-id>';
```

Only an existing administrator should grant subsequent roles through a
reviewed administrative workflow. Never promote the first registrant based
only on registration order or an email supplied by the browser.

Receipt uploads are limited to PDF/PNG/JPEG and 25 MiB. The server checks
stored object metadata and magic bytes before consuming an upload intent. This
does not perform antivirus/OCR or prove that every PII field was removed; a
human redaction attestation and separate reviewer/publisher workflow remain
mandatory.