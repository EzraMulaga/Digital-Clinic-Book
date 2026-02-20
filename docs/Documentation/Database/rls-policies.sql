-- =============================================================================
-- Digital Clinic Book – Row Level Security Policies
-- =============================================================================
-- Apply these in the Supabase SQL Editor AFTER creating all tables.
--
-- Key design rule:
--   patients does NOT have an auth_user_id column.
--   Authentication linkage is stored in patient_users(auth_user_id, patient_id).
--   All patient-access policies MUST join through patient_users.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. patients
-- ---------------------------------------------------------------------------
alter table patients enable row level security;

-- Drop any legacy policies that incorrectly referenced patients.auth_user_id
drop policy if exists "Emergency read access" on patients;
drop policy if exists "Patient self select" on patients;
drop policy if exists "Patient self update" on patients;

-- Active practitioners can read any patient record
create policy "Practitioners can read patients"
  on patients
  for select
  to authenticated
  using (
    exists (
      select 1 from practitioners
      where practitioners.auth_user_id = auth.uid()
        and practitioners.is_active = true
    )
  );

-- Active practitioners can create new patient records
create policy "Practitioners can insert patients"
  on patients
  for insert
  to authenticated
  with check (
    exists (
      select 1 from practitioners
      where practitioners.auth_user_id = auth.uid()
        and practitioners.is_active = true
    )
  );

-- Active practitioners can update patient records
create policy "Practitioners can update patients"
  on patients
  for update
  to authenticated
  using (
    exists (
      select 1 from practitioners
      where practitioners.auth_user_id = auth.uid()
        and practitioners.is_active = true
    )
  )
  with check (
    exists (
      select 1 from practitioners
      where practitioners.auth_user_id = auth.uid()
        and practitioners.is_active = true
    )
  );

-- A patient user can read ONLY their own patient row (via patient_users join)
create policy "Patient users can read own record"
  on patients
  for select
  to authenticated
  using (
    exists (
      select 1 from patient_users
      where patient_users.patient_id = patients.patient_id
        and patient_users.auth_user_id = auth.uid()
    )
  );

-- A patient user can update ONLY their own patient row (via patient_users join)
create policy "Patient users can update own record"
  on patients
  for update
  to authenticated
  using (
    exists (
      select 1 from patient_users
      where patient_users.patient_id = patients.patient_id
        and patient_users.auth_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from patient_users
      where patient_users.patient_id = patients.patient_id
        and patient_users.auth_user_id = auth.uid()
    )
  );


-- ---------------------------------------------------------------------------
-- 2. patient_users
-- ---------------------------------------------------------------------------
alter table patient_users enable row level security;

-- A patient user can read their own link row
create policy "Patient users can read own link"
  on patient_users
  for select
  to authenticated
  using (auth_user_id = auth.uid());

-- Active practitioners can read all patient–user links
create policy "Practitioners can read patient_users"
  on patient_users
  for select
  to authenticated
  using (
    exists (
      select 1 from practitioners
      where practitioners.auth_user_id = auth.uid()
        and practitioners.is_active = true
    )
  );


-- ---------------------------------------------------------------------------
-- 3. practitioners
-- ---------------------------------------------------------------------------
alter table practitioners enable row level security;

-- A practitioner can read their own row
create policy "Practitioners can read own profile"
  on practitioners
  for select
  to authenticated
  using (auth_user_id = auth.uid());

-- Active practitioners can read all other practitioner rows
create policy "Practitioners can read all practitioners"
  on practitioners
  for select
  to authenticated
  using (
    exists (
      select 1 from practitioners p2
      where p2.auth_user_id = auth.uid()
        and p2.is_active = true
    )
  );

-- A practitioner can update their own profile
create policy "Practitioners can update own profile"
  on practitioners
  for update
  to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());


-- ---------------------------------------------------------------------------
-- 4. visits
-- ---------------------------------------------------------------------------
alter table visits enable row level security;

-- Active practitioners can do full CRUD on visits
create policy "Practitioners can read visits"
  on visits
  for select
  to authenticated
  using (
    exists (
      select 1 from practitioners
      where practitioners.auth_user_id = auth.uid()
        and practitioners.is_active = true
    )
  );

create policy "Practitioners can insert visits"
  on visits
  for insert
  to authenticated
  with check (
    exists (
      select 1 from practitioners
      where practitioners.auth_user_id = auth.uid()
        and practitioners.is_active = true
    )
  );

create policy "Practitioners can update visits"
  on visits
  for update
  to authenticated
  using (
    exists (
      select 1 from practitioners
      where practitioners.auth_user_id = auth.uid()
        and practitioners.is_active = true
    )
  )
  with check (
    exists (
      select 1 from practitioners
      where practitioners.auth_user_id = auth.uid()
        and practitioners.is_active = true
    )
  );

-- A patient user can read ONLY visits belonging to their own patient record
create policy "Patient users can read own visits"
  on visits
  for select
  to authenticated
  using (
    exists (
      select 1 from patient_users
      where patient_users.patient_id = visits.patient_id
        and patient_users.auth_user_id = auth.uid()
    )
  );


-- ---------------------------------------------------------------------------
-- 5. diagnoses
-- ---------------------------------------------------------------------------
alter table diagnoses enable row level security;

create policy "Practitioners can read diagnoses"
  on diagnoses
  for select
  to authenticated
  using (
    exists (
      select 1 from practitioners
      where practitioners.auth_user_id = auth.uid()
        and practitioners.is_active = true
    )
  );

create policy "Practitioners can insert diagnoses"
  on diagnoses
  for insert
  to authenticated
  with check (
    exists (
      select 1 from practitioners
      where practitioners.auth_user_id = auth.uid()
        and practitioners.is_active = true
    )
  );

create policy "Patient users can read own diagnoses"
  on diagnoses
  for select
  to authenticated
  using (
    exists (
      select 1 from visits
      join patient_users on patient_users.patient_id = visits.patient_id
      where visits.visit_id = diagnoses.visit_id
        and patient_users.auth_user_id = auth.uid()
    )
  );


-- ---------------------------------------------------------------------------
-- 6. treatments
-- ---------------------------------------------------------------------------
alter table treatments enable row level security;

create policy "Practitioners can read treatments"
  on treatments
  for select
  to authenticated
  using (
    exists (
      select 1 from practitioners
      where practitioners.auth_user_id = auth.uid()
        and practitioners.is_active = true
    )
  );

create policy "Practitioners can insert treatments"
  on treatments
  for insert
  to authenticated
  with check (
    exists (
      select 1 from practitioners
      where practitioners.auth_user_id = auth.uid()
        and practitioners.is_active = true
    )
  );

create policy "Patient users can read own treatments"
  on treatments
  for select
  to authenticated
  using (
    exists (
      select 1 from visits
      join patient_users on patient_users.patient_id = visits.patient_id
      where visits.visit_id = treatments.visit_id
        and patient_users.auth_user_id = auth.uid()
    )
  );


-- ---------------------------------------------------------------------------
-- 7. prescriptions
-- ---------------------------------------------------------------------------
alter table prescriptions enable row level security;

create policy "Practitioners can read prescriptions"
  on prescriptions
  for select
  to authenticated
  using (
    exists (
      select 1 from practitioners
      where practitioners.auth_user_id = auth.uid()
        and practitioners.is_active = true
    )
  );

create policy "Practitioners can insert prescriptions"
  on prescriptions
  for insert
  to authenticated
  with check (
    exists (
      select 1 from practitioners
      where practitioners.auth_user_id = auth.uid()
        and practitioners.is_active = true
    )
  );

create policy "Patient users can read own prescriptions"
  on prescriptions
  for select
  to authenticated
  using (
    exists (
      select 1 from visits
      join patient_users on patient_users.patient_id = visits.patient_id
      where visits.visit_id = prescriptions.visit_id
        and patient_users.auth_user_id = auth.uid()
    )
  );


-- ---------------------------------------------------------------------------
-- 8. Self-registration insert policies
-- ---------------------------------------------------------------------------
-- These allow a newly signed-up authenticated user to create their own patient
-- record and patient_users link during the registration flow in user-signup.js.
-- The unique constraint on patient_users.auth_user_id prevents duplicates.

-- A new user (who has no patient record yet) can insert one patient row
create policy "New users can create their patient record"
  on patients
  for insert
  to authenticated
  with check (
    not exists (
      select 1 from patient_users
      where patient_users.auth_user_id = auth.uid()
    )
  );

-- A user can insert their own link row (auth_user_id must equal auth.uid())
create policy "Users can create own patient link"
  on patient_users
  for insert
  to authenticated
  with check (auth_user_id = auth.uid());


-- ---------------------------------------------------------------------------
-- 9. Atomic patient signup function (SECURITY DEFINER)
-- ---------------------------------------------------------------------------
-- This function creates the patient record and the patient_users link in one
-- call, bypassing RLS for the insert.  It is safe because:
--   * it only inserts the calling user's own auth.uid()
--   * it uses SECURITY DEFINER so the anon/authenticated role is not blocked
--
-- Call from the client:
--   const { data, error } = await supabase.rpc('register_patient_user', {
--     p_first_name: '...', p_last_name: '...', ...
--   });
-- ---------------------------------------------------------------------------
create or replace function register_patient_user(
  p_first_name         text,
  p_last_name          text,
  p_date_of_birth      date    default null,
  p_blood_type         text    default null,
  p_allergies          text    default null,
  p_chronic_conditions text    default null,
  p_emergency_notes    text    default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id uuid;
begin
  -- Insert the patient record (no auth_user_id column exists on patients)
  insert into patients (first_name, last_name, date_of_birth, blood_type,
                        allergies, chronic_conditions, emergency_notes)
  values (p_first_name, p_last_name, p_date_of_birth, p_blood_type,
          p_allergies, p_chronic_conditions, p_emergency_notes)
  returning patient_id into v_patient_id;

  -- Link the auth user to the patient record
  insert into patient_users (auth_user_id, patient_id)
  values (auth.uid(), v_patient_id);

  return v_patient_id;
end;
$$;

-- Only authenticated users may call this function
revoke all on function register_patient_user from public;
grant execute on function register_patient_user to authenticated;


-- ---------------------------------------------------------------------------
-- 10. Refresh PostgREST schema cache
-- ---------------------------------------------------------------------------
-- Run this after applying schema or RLS changes so PostgREST picks them up
-- immediately without a server restart.
notify pgrst, 'reload schema';
