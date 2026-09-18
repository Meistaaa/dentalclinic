-- Base schema for a fresh database. Versioned changes are applied afterward
-- from migrations/ by npm run db:migrate.

CREATE TABLE IF NOT EXISTS doctors (
  id              SERIAL PRIMARY KEY,
  name            TEXT        NOT NULL CHECK (length(trim(name)) > 0),
  specialization  TEXT        NOT NULL CHECK (length(trim(specialization)) > 0),
  phone           TEXT        NOT NULL CHECK (length(trim(phone)) > 0),
  email           TEXT        NOT NULL UNIQUE CHECK (position('@' IN email) > 1),
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appointments (
  id               SERIAL PRIMARY KEY,
  patient_name     TEXT        NOT NULL CHECK (length(trim(patient_name)) > 0),
  patient_phone    TEXT        NOT NULL CHECK (length(trim(patient_phone)) > 0),
  patient_email    TEXT        NOT NULL CHECK (position('@' IN patient_email) > 1),
  -- RESTRICT, not CASCADE: deleting a doctor must never silently erase the
  -- appointment history of patients who booked with them. The API turns this
  -- into a 409 and asks the caller to deactivate the doctor instead.
  doctor_id        INTEGER     NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
  appointment_date DATE        NOT NULL,
  appointment_time TIME        NOT NULL,
  reason           TEXT        NOT NULL DEFAULT '',
  status           TEXT        NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes backing the filters the appointments API exposes.
CREATE INDEX IF NOT EXISTS appointments_doctor_id_idx ON appointments (doctor_id);
CREATE INDEX IF NOT EXISTS appointments_date_idx      ON appointments (appointment_date);
CREATE INDEX IF NOT EXISTS appointments_status_idx    ON appointments (status);

-- updated_at maintained by the database: an UPDATE that forgets to set it, from
-- any client, still gets an accurate timestamp.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS doctors_set_updated_at ON doctors;
CREATE TRIGGER doctors_set_updated_at
  BEFORE UPDATE ON doctors
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS appointments_set_updated_at ON appointments;
CREATE TRIGGER appointments_set_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
