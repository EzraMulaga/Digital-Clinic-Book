# Migrations

SQL files here are **hand-off migrations, not auto-applied**. Nothing in this
repo executes them — write the SQL, the project owner reviews it and runs it
manually via the Supabase SQL Editor against `taicbbbjqgxrrtguirpx`.

## Naming

`YYYYMMDD_description.sql`, e.g. `20260821_visits_practitioner_name_decision.sql`.
Date-prefixed so ordering is unambiguous even without a real migration tool
tracking sequence numbers. If this project later adopts the Supabase CLI
(`supabase migration new <name>`), its default timestamp format
(`YYYYMMDDHHMMSS_name.sql`) is a strict superset of this one, so these files
can move into `supabase/migrations/` without renaming.

## Conventions for each file

- Idempotent where possible (`drop ... if exists` before `create`), matching
  the style already used in [`../rls-policies.sql`](../rls-policies.sql).
- A header comment stating what the change does and why — link back to the
  relevant [ONGOING.md](../../../../ONGOING.md) issue number.
- One logical change per file. Don't bundle unrelated fixes.

## Tracking what's actually been applied

There is currently no automated tracking (see the process discussion in
ONGOING.md, "MIGRATION-TRACKING / DRIFT-PREVENTION PROCESS" section) —
this is exactly the gap that let `rls-policies.sql` silently diverge from
live state for an unknown period. Until that's resolved, applied status is
tracked manually in ONGOING.md's log: after running a file, tell the
assistant (or note it yourself) so the corresponding ONGOING.md entry can be
marked confirmed-live, the same way the 2026-08-21 RLS fix and FK addition
were.
