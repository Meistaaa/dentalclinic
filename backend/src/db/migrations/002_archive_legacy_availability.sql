-- Preserve existing free-text schedules for manual review before removing the
-- old live column. The text cannot be converted reliably for arbitrary doctors.
CREATE TABLE IF NOT EXISTS doctor_availability_legacy (
  doctor_id INTEGER PRIMARY KEY REFERENCES doctors(id) ON DELETE CASCADE,
  availability_text TEXT NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'doctors' AND column_name = 'availability'
  ) THEN
    EXECUTE 'INSERT INTO doctor_availability_legacy (doctor_id, availability_text) '
      || 'SELECT id, availability FROM doctors WHERE availability <> '''' '
      || 'ON CONFLICT (doctor_id) DO NOTHING';
    ALTER TABLE doctors DROP COLUMN availability;
  END IF;
END;
$$;
