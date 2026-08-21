# Digital Clinic Book – Supabase Database Documentation

## 1. Purpose

This document defines the **database design** for the Digital Clinic Book system using **Supabase (PostgreSQL)**.

The goal is to faithfully digitize a traditional paper clinic book while ensuring:

* Medical correctness
* Clear separation of concerns
* Secure emergency access
* Long-term scalability

This schema supports:

* Patient identity and emergency data
* Clinic visits (encounters)
* Diagnoses
* Treatments
* Prescriptions

---

## 2. Core Design Principles

1. **Patient data is not visit data**
2. **Visits are immutable historical records**
3. **Emergency access is read-only and minimal**
4. **Diagnosis, treatment, and prescription are first-class entities**
5. **Database enforces structure; UI enforces flow**

This mirrors how clinics have always operated on paper.

---

## 3. Entity Relationship Overview

```
Patient
  └── Visit (Encounter)
        ├── Diagnosis
        ├── Treatment
        └── Prescription
```

* One patient can have many visits
* One visit can have many diagnoses, treatments, and prescriptions
* Emergency access never reads visit history

---

## 4. Database Schema (Supabase SQL)

Run the following in the **Supabase SQL Editor**, in order.

---

### 4.1 Patients Table

Stores patient identity and emergency-critical information only.

```sql
create table patients (
  patient_id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  date_of_birth date,
  blood_type text,
  allergies text,
  chronic_conditions text,
  emergency_notes text,
  created_at timestamptz default now()
);
```

---

### 4.2 Visits Table (Clinic Book Spine)

Each row represents **one clinic visit or encounter**.

```sql
create table visits (
  visit_id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(patient_id) on delete cascade,
  visit_date timestamptz default now(),
  reason_for_visit text,
  practitioner_name text,
  created_at timestamptz default now()
);
```

> ⚠️ **Live drift, confirmed 2026-08-21 via schema extract — decision made, migration pending execution.** `practitioner_name` (shown in the original DDL above for historical accuracy) was meant to be replaced by the `practitioner_id` FK (§5.2/§8, correctly enforced live as of 2026-08-21), but the original migration that added `practitioner_id` was additive — it never dropped `practitioner_name`. **Decision (project owner, 2026-08-21): drop it.** `practitioner_id` — joined to `practitioners` for display — is the sole source of truth going forward. App code (`clinic-services.js` and the visit create/edit/details/patient-info pages) has already been updated to stop reading/writing the free-text column. The actual `alter table visits drop column practitioner_name` is staged in [`migrations/20260821_drop_visits_practitioner_name.sql`](migrations/20260821_drop_visits_practitioner_name.sql) — not yet run. See ONGOING.md issue #9.

---

### 4.3 Diagnoses Table

Stores one or more diagnoses made during a visit.

```sql
create table diagnoses (
  diagnosis_id uuid primary key default gen_random_uuid(),
  visit_id uuid references visits(visit_id) on delete cascade,
  diagnosis text not null,
  notes text,
  created_at timestamptz default now()
);
```

---

### 4.4 Treatments Table

Stores treatments performed during a visit.

```sql
create table treatments (
  treatment_id uuid primary key default gen_random_uuid(),
  visit_id uuid references visits(visit_id) on delete cascade,
  treatment text not null,
  notes text,
  created_at timestamptz default now()
);
```

---

### 4.5 Prescriptions Table

Models prescription pad entries, line by line.

```sql
create table prescriptions (
  prescription_id uuid primary key default gen_random_uuid(),
  visit_id uuid references visits(visit_id) on delete cascade,
  medication_name text not null,
  dosage text,
  frequency text,
  duration text,
  instructions text,
  created_at timestamptz default now()
);
```

---

## 5. Practitioner Table

Medical practitioners are **first-class actors** in the system. They must be stored separately from patients and linked to visits for accountability, auditing, and future role-based access control.

This table is compatible with all existing tables and mirrors how clinics record practitioner identity.

---

### 5.1 Practitioners Table

```sql
create table practitioners (
  practitioner_id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  registration_number text unique not null,
  role text not null, -- e.g. Doctor, Nurse, Medical Officer
  is_active boolean default false, -- self-registration must not grant access; see §6.2
  created_at timestamptz default now()
);
```

---

### 5.2 Linking Practitioners to Visits

To maintain **clinical accountability**, each visit should reference the practitioner responsible.

Update the `visits` table as follows:

```sql
alter table visits
add column practitioner_id uuid references practitioners(practitioner_id);
```

This replaces free-text practitioner names with a **verifiable foreign key**.

---

### 5.3 Why This Design Is Correct

* Preserves historical accuracy (practitioners are never deleted)
* Enables audit trails and compliance
* Allows future Supabase Auth integration
* Supports role-based access control (RBAC)

---

## 6. Authentication & Identity Model

The system supports **two authenticated actor types**:

1. **Practitioners** – full access based on role
2. **Patients (Users)** – limited self-access

Authentication is handled by **Supabase Auth** (email + password). The database stores **profile linkage**, not raw passwords.

---

### 6.1 Supabase Auth Principle (Important)

* Passwords are **never stored in application tables**
* Supabase manages credential hashing and validation
* Application tables reference `auth.users.id`

This matches modern security best practice and compliance requirements.

---

### 6.2 Practitioners Table (Auth-Linked)

```sql
create table practitioners (
  practitioner_id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique not null references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  registration_number text unique not null,
  role text not null, -- Doctor, Nurse, Medical Officer
  is_active boolean default false,
  created_at timestamptz default now()
);
```

* `auth_user_id` links to Supabase email/password login
* Deactivating a practitioner does not erase history
* **`is_active` defaults to `false`.** Self-registration (`practitioner-signup.js`) creates the account but does not grant it access — every practitioner-scoped RLS policy requires `is_active = true`. There is no in-app admin UI yet; an operator must verify the practitioner's `registration_number` out-of-band and flip the flag manually (`update practitioners set is_active = true where practitioner_id = '...'`). See `rls-policies.sql` section 0.

---

### 6.3 Patient Users Table (Self-Access Accounts)

Patients may optionally have login access to their own records.

```sql
create table patient_users (
  patient_user_id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique not null references auth.users(id) on delete cascade,
  patient_id uuid not null references patients(patient_id) on delete cascade,
  created_at timestamptz default now()
);
```

* One auth user → one patient
* Patients never gain practitioner privileges

---

## 7. QR Code Integration

Each patient is assigned a **unique, scannable QR code** that resolves to their `patient_id`.

---

### 7.1 QR Code Fields (Patients Table)

```sql
alter table patients
add column qr_token text unique not null default encode(gen_random_bytes(16), 'hex');
```

* `qr_token` is **public-safe**, unlike raw UUIDs
* Used in emergency and lookup flows

---

### 7.2 QR Lookup Flow

```
QR Code → qr_token → get_emergency_patient_by_token() RPC → emergency snapshot
```

* Emergency access resolves via token
* Full record access still requires practitioner authentication

---

### 7.3 QR Safety Guarantees

* Tokens are unguessable
* Can be rotated if compromised
* No direct exposure of internal IDs

---

## 8. Visit–Practitioner Link (Updated)

Each visit is explicitly tied to an authenticated practitioner.

```sql
alter table visits
add column practitioner_id uuid references practitioners(practitioner_id);
```

> ✅ **Fixed 2026-08-21.** The live `visits.practitioner_id` column previously had no FK constraint (a bare nullable `uuid`); a foreign key referencing `practitioners(practitioner_id)` has since been added live, matching the DDL above, with `ON DELETE NO ACTION` (Postgres' implicit default when unspecified — deleting a `practitioners` row that any `visits` row still references is blocked, rather than cascading or nulling). **Open question, not yet decided:** whether `NO ACTION` is actually the intended behavior — it currently means a practitioner can never be deleted once they've logged even one visit (there is no in-app delete-practitioner flow today, so this is latent, not an active problem). `SET NULL` would be the alternative if visits should survive practitioner deletion with the link simply cleared; `CASCADE` would be wrong here regardless (deleting a practitioner must never delete historical visit records). See issue #8 in [ONGOING.md](../../../ONGOING.md). The separate `practitioner_name` legacy-column question (§4.2, §9 below) is a different, already-decided item — see the migration.

---

## 9. Access Control Summary

| Actor        | Auth Required | Access Scope                |
| ------------ | ------------- | --------------------------- |
| Emergency    | No            | get_emergency_patient_by_token() RPC only |
| Patient user | Yes           | Own records only            |
| Practitioner | Yes           | Role-based full access      |

---

## 10. Emergency Access Lookup

Emergency access **must never expose visit history**.

Lookup is implemented as a `SECURITY DEFINER` RPC, `get_emergency_patient_by_token(p_qr_token text)` (see `rls-policies.sql` section 10), not a public view. A view granted to `anon` would let anyone enumerate every patient's emergency data by querying it with no filter, since PostgREST applies the caller's filter on top of whatever the view already exposes rather than enforcing one. The RPC's `where qr_token = p_qr_token` is baked into the function body instead, so a caller can only ever retrieve the one row matching a token they already possess — preserving the "`qr_token` is unguessable" guarantee from §7.3. The function returns only the life-saving snapshot columns (identity + blood type, allergies, chronic conditions, emergency notes) and nothing from `visits`, `diagnoses`, `treatments`, or `prescriptions`.

---

## 6. Security Model

### Important: `patients` does NOT have `auth_user_id`

The `patients` table stores **medical identity only**. Authentication linkage is kept in the separate `patient_users` table:

```
patient_users(patient_user_id, auth_user_id, patient_id, created_at)
```

Any RLS policy that checks user identity for `patients` **must join through `patient_users`**. Writing `patients.auth_user_id = auth.uid()` will cause the PostgREST error:

> *Could not find the auth_user_id column of patients in the schema cache.*

---

### Row Level Security

Enable RLS on all tables:

```sql
alter table patients      enable row level security;
alter table patient_users enable row level security;
alter table practitioners enable row level security;
alter table visits        enable row level security;
alter table diagnoses     enable row level security;
alter table treatments    enable row level security;
alter table prescriptions enable row level security;
```

---

### `patients` policies

```sql
-- Remove any legacy policy that incorrectly referenced patients.auth_user_id
drop policy if exists "Emergency read access" on patients;

-- Active practitioners can read all patient records
create policy "Practitioners can read patients"
  on patients for select to authenticated
  using (
    exists (
      select 1 from practitioners
      where practitioners.auth_user_id = auth.uid()
        and practitioners.is_active = true
    )
  );

-- Active practitioners can create new patient records
create policy "Practitioners can insert patients"
  on patients for insert to authenticated
  with check (
    exists (
      select 1 from practitioners
      where practitioners.auth_user_id = auth.uid()
        and practitioners.is_active = true
    )
  );

-- Active practitioners can update patient records
create policy "Practitioners can update patients"
  on patients for update to authenticated
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

-- A patient user can read ONLY their own row — join through patient_users
create policy "Patient users can read own record"
  on patients for select to authenticated
  using (
    exists (
      select 1 from patient_users
      where patient_users.patient_id   = patients.patient_id
        and patient_users.auth_user_id = auth.uid()
    )
  );

-- A patient user can update ONLY their own row — join through patient_users
create policy "Patient users can update own record"
  on patients for update to authenticated
  using (
    exists (
      select 1 from patient_users
      where patient_users.patient_id   = patients.patient_id
        and patient_users.auth_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from patient_users
      where patient_users.patient_id   = patients.patient_id
        and patient_users.auth_user_id = auth.uid()
    )
  );
```

---

### `patient_users` policies

```sql
-- A patient user can read their own link row
create policy "Patient users can read own link"
  on patient_users for select to authenticated
  using (auth_user_id = auth.uid());

-- Active practitioners can read all patient–user links
create policy "Practitioners can read patient_users"
  on patient_users for select to authenticated
  using (
    exists (
      select 1 from practitioners
      where practitioners.auth_user_id = auth.uid()
        and practitioners.is_active = true
    )
  );
```

---

### `practitioners` policies

```sql
-- A practitioner can read and update their own profile
create policy "Practitioners can read own profile"
  on practitioners for select to authenticated
  using (auth_user_id = auth.uid());

create policy "Practitioners can update own profile"
  on practitioners for update to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- Active practitioners can read all practitioner rows
create policy "Practitioners can read all practitioners"
  on practitioners for select to authenticated
  using (
    exists (
      select 1 from practitioners p2
      where p2.auth_user_id = auth.uid()
        and p2.is_active = true
    )
  );
```

> See `docs/Documentation/Database/rls-policies.sql` for the complete RLS setup
> including self-registration insert policies, the `register_patient_user`
> SECURITY DEFINER function, and policies for `visits`, `diagnoses`,
> `treatments`, and `prescriptions`.

---

### Refreshing the PostgREST schema cache

After applying any schema or RLS changes, notify PostgREST to reload immediately
without restarting the server:

```sql
notify pgrst, 'reload schema';
```

---

## 7. Data Flow Summary

1. Patient is registered → `patients`
2. Each clinic visit → `visits`
3. Diagnoses, treatments, prescriptions recorded per visit
4. Emergency UI queries **only** the `get_emergency_patient_by_token()` RPC
5. No emergency write access exists

---

## 8. What This Schema Enables

Without redesign:

* Practitioner authentication
* Role-based access control
* QR-code patient lookup
* Audit logging
* Medical analytics
* Legal compliance exports

---

## 9. What Is Explicitly Prevented

* Emergency access to visit history
* Editing patient data from emergency UI
* Mixing diagnosis, treatment, and prescription data
* Deleting historical visits

---

## 10. Status

This schema is:

* Clinically realistic
* Academically correct (3NF)
* Supabase-native
* Ready for frontend integration

---

**End of Document**
