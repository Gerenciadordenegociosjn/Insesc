# Portal publication integration checks

Run `pnpm --filter @workspace/api-server run test:portal` from the workspace root.

The runner requires a development `DATABASE_URL` with permission to create and
drop a database. It refuses production/deployment mode, creates a uniquely named
`portal_test_*` PostgreSQL database, applies the current Drizzle schema there,
starts the actual Express app on an ephemeral loopback port, then drops the
database in a `finally` block (even on test failure). It never uses the shared
proxy or the normal portal database. A failed cleanup is reported as an error
and should be investigated before re-running.

The suite follows the requests used by the portal pages/editor/preview/settings
UI: content staff create and save drafts; administrators publish/unpublish;
auditors read but cannot edit; signed-out and unrelated roles cannot preview;
public page/list/media/settings responses only show published snapshots. It also
checks version conflicts and required core system blocks. Image uploads are
simulated in process memory: no storage credentials, real bucket, official
images, or official portal pages are used. No fixture is ever published as
official INCESC content.