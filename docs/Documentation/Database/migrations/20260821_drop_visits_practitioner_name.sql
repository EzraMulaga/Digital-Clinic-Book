-- =============================================================================
-- Migration: Drop legacy visits.practitioner_name column
-- =============================================================================
-- Context: ONGOING.md issue #9. visits.practitioner_id (FK to practitioners,
-- added live 2026-08-21) is now the enforced source of truth for which
-- practitioner is associated with a visit. The free-text practitioner_name
-- column predates that FK; when practitioner_id was added, practitioner_name
-- was never dropped, so the two columns have coexisted unenforced -- nothing
-- checked that they agreed, or that either was even populated.
--
-- Decision (project owner, 2026-08-21): drop practitioner_name. The app
-- (docs/src/js/services/clinic-services.js and the visit create/edit/details/
-- patient-info pages) has already been updated to stop reading/writing it and
-- to display the practitioner's name via the practitioner_id -> practitioners
-- join instead. Do not run this migration before that app code is deployed,
-- or visits created/edited in between will silently lose the practitioner
-- name in the UI (the DB will still work -- practitioner_id is unaffected).
--
-- IMPORTANT -- run Step 1 FIRST and review the result before running Step 2.
-- Any row where practitioner_name is set but practitioner_id is null will
-- permanently lose that text once the column is dropped: there is no
-- automatic backfill, since a free-text name can't be reliably matched to a
-- specific practitioners row.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Step 1 (run first, read-only): find visits that would lose information
-- ---------------------------------------------------------------------------
-- If this returns zero rows, it's safe to go straight to Step 2.
-- If it returns rows, for each one either:
--   (a) identify the matching practitioner and backfill practitioner_id
--       manually before dropping the column, e.g.:
--         update visits set practitioner_id = '<uuid>' where visit_id = '<uuid>';
--   (b) or accept the loss (reasonable for demo/seed data).
select visit_id, visit_date, practitioner_name, practitioner_id
from visits
where practitioner_name is not null
  and practitioner_id is null;

-- ---------------------------------------------------------------------------
-- Step 2: drop the column
-- ---------------------------------------------------------------------------
-- Only run this after reviewing Step 1's output and resolving anything it
-- surfaced.
alter table visits drop column if exists practitioner_name;

-- ---------------------------------------------------------------------------
-- Step 3: refresh PostgREST schema cache
-- ---------------------------------------------------------------------------
notify pgrst, 'reload schema';
