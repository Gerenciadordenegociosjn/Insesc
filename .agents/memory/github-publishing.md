---
name: GitHub publishing through connectors
description: Authentication and integrity constraints when updating GitHub from Replit
---

Treat GitHub connector API access and the local Git client's push credentials as independent. A working connector does not prove that `git push` will authenticate.

**Why:** A reconnected GitHub integration allowed authenticated repository writes while Git still used an invalid credential. Large binary output read through the code-execution shell callback was silently shortened, so the first uploaded blobs did not match their original Git hashes.

**How to apply:** Check both authentication paths separately. If the connector API is used to publish a snapshot, verify each binary blob and the final tree against local Git object hashes before updating the branch. Preserve remote ancestry locally rather than relying on a later forced push.