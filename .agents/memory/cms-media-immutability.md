---
name: Immutable CMS media
description: Why signed uploads must be copied before portal images become publishable
---

Treat a signed upload URL as writable until it expires, even after the server has verified its file type and confirmed the media record. Copy validated bytes to a fresh private destination that was never the target of an issued upload URL before making them eligible for publication.

**Why:** Confirming metadata does not revoke an already-issued signed PUT URL. The uploader could overwrite the original object after validation, causing a published image to serve different or unsafe bytes.

**How to apply:** For future media or document publication features, keep upload targets separate from final immutable objects. Serve only the final verified copy through an authorization or publication check. Avoid making the private bucket globally public.