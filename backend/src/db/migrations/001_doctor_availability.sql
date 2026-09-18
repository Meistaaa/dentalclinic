CREATE TABLE doctor_availability (
  id SERIAL PRIMARY KEY,
  doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT doctor_availability_time_order CHECK (start_time < end_time),
  CONSTRAINT doctor_availability_half_hour CHECK (
    EXTRACT(MINUTE FROM start_time)::integer % 30 = 0 AND
    EXTRACT(MINUTE FROM end_time)::integer % 30 = 0 AND
    EXTRACT(SECOND FROM start_time) = 0 AND
    EXTRACT(SECOND FROM end_time) = 0
  ),
  CONSTRAINT doctor_availability_unique_period UNIQUE (doctor_id, day_of_week, start_time, end_time)
);

CREATE INDEX doctor_availability_doctor_day_idx ON doctor_availability (doctor_id, day_of_week, start_time);

CREATE TRIGGER doctor_availability_set_updated_at
  BEFORE UPDATE ON doctor_availability
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_no_double_booking;

-- A cancelled appointment releases the slot. The unique index also closes
-- the race between two requests that both observe a free slot.
CREATE UNIQUE INDEX appointments_no_double_booking_active
  ON appointments (doctor_id, appointment_date, appointment_time)
  WHERE status <> 'cancelled';
