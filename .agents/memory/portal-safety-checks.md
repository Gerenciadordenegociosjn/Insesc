---
name: Portal safety checks
description: Isolation boundary for portal publication checks
---

Run portal publication checks against a freshly created, disposable PostgreSQL database and synthetic image bytes held only in process memory. Never use the shared API preview or the real storage bucket for test publication.

**Why:** A test must be able to publish a page and fetch its media to verify the public boundary without making test content visible to visitors or leaving files behind.

**How to apply:** When extending portal integration coverage, preserve the separate-database guard, in-memory storage substitute, and cleanup on both success and failure.