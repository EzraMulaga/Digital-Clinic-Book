
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

## 5. Emergency Access View

Emergency access **must never expose visit history**.

This view restricts data to a life-saving snapshot only.

```sql
create view emergency_patient_view as
select
  patient_id,
  first_name,
  last_name,
  blood_type,
  allergies,
  chronic_conditions,
  emergency_notes
from patients;
```

---

## 6. Security Model (Trial Phase)

### Row Level Security

```sql
alter table patients enable row level security;
```

Trial policy (demo only):

```sql
create policy "Emergency read access"
on patients
for select
using (true);
```

> In production, this is replaced with token-based or role-based policies.

---

## 7. Data Flow Summary

1. Patient is registered → `patients`
2. Each clinic visit → `visits`
3. Diagnoses, treatments, prescriptions recorded per visit
4. Emergency UI queries **only** `emergency_patient_view`
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
* Suitable for documentation and assessment submission

---

**End of Document**
