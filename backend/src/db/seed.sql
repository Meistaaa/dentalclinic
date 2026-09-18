-- Sample data for demos. Run once per database, even when deployments repeat.
-- This also preserves later edits to seeded doctors' working periods.
--
-- Appointment dates are relative to CURRENT_DATE so the dashboard always has
-- today's and upcoming appointments to show when the seed first runs.

CREATE TABLE IF NOT EXISTS seed_runs (
  name TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  PERFORM pg_advisory_xact_lock(20260918);
  IF EXISTS (SELECT 1 FROM seed_runs WHERE name = 'sample_data_v1') THEN
    RETURN;
  END IF;

INSERT INTO doctors (name, specialization, phone, email, is_active) VALUES
  ('Dr. Amara Okonkwo',  'General Dentistry',  '+1-555-0101', 'amara.okonkwo@brightsmile.test',  TRUE),
  ('Dr. Ravi Menon',     'Orthodontics',       '+1-555-0102', 'ravi.menon@brightsmile.test',     TRUE),
  ('Dr. Sofia Marchetti','Endodontics',        '+1-555-0103', 'sofia.marchetti@brightsmile.test',TRUE),
  ('Dr. Jonas Weber',    'Periodontics',       '+1-555-0104', 'jonas.weber@brightsmile.test',    TRUE),
  ('Dr. Priya Raman',    'Pediatric Dentistry','+1-555-0105', 'priya.raman@brightsmile.test',    FALSE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time)
SELECT d.id, v.day_of_week, v.start_time::time, v.end_time::time
FROM (VALUES
  ('amara.okonkwo@brightsmile.test', 1, '09:00', '17:00'),
  ('amara.okonkwo@brightsmile.test', 2, '09:00', '17:00'),
  ('amara.okonkwo@brightsmile.test', 3, '09:00', '17:00'),
  ('amara.okonkwo@brightsmile.test', 4, '09:00', '17:00'),
  ('amara.okonkwo@brightsmile.test', 5, '09:00', '17:00'),
  ('ravi.menon@brightsmile.test', 1, '10:00', '18:00'),
  ('ravi.menon@brightsmile.test', 3, '10:00', '18:00'),
  ('ravi.menon@brightsmile.test', 5, '10:00', '18:00'),
  ('sofia.marchetti@brightsmile.test', 2, '08:00', '15:00'),
  ('sofia.marchetti@brightsmile.test', 3, '08:00', '15:00'),
  ('sofia.marchetti@brightsmile.test', 4, '08:00', '15:00'),
  ('jonas.weber@brightsmile.test', 1, '09:00', '16:00'),
  ('jonas.weber@brightsmile.test', 2, '09:00', '16:00'),
  ('jonas.weber@brightsmile.test', 3, '09:00', '16:00'),
  ('jonas.weber@brightsmile.test', 4, '09:00', '16:00'),
  ('priya.raman@brightsmile.test', 6, '09:00', '13:00')
) AS v(email, day_of_week, start_time, end_time)
JOIN doctors d ON d.email = v.email
ON CONFLICT DO NOTHING;

INSERT INTO appointments
  (patient_name, patient_phone, patient_email, doctor_id, appointment_date, appointment_time, reason, status)
SELECT v.patient_name, v.patient_phone, v.patient_email, d.id,
       CURRENT_DATE + v.day_offset, v.at, v.reason, v.status
FROM (VALUES
  ('Lena Fischer',   '+1-555-0201', 'lena.fischer@example.test',   'amara.okonkwo@brightsmile.test',   0, TIME '09:00', 'Routine checkup and cleaning',  'confirmed'),
  ('Tomas Nowak',    '+1-555-0202', 'tomas.nowak@example.test',    'amara.okonkwo@brightsmile.test',   0, TIME '11:30', 'Persistent tooth sensitivity',  'pending'),
  ('Aisha Bello',    '+1-555-0203', 'aisha.bello@example.test',    'ravi.menon@brightsmile.test',      1, TIME '10:00', 'Braces adjustment',             'confirmed'),
  ('Marco Silva',    '+1-555-0204', 'marco.silva@example.test',    'sofia.marchetti@brightsmile.test', 2, TIME '08:30', 'Root canal follow-up',          'pending'),
  ('Hannah Berg',    '+1-555-0205', 'hannah.berg@example.test',    'jonas.weber@brightsmile.test',     3, TIME '14:00', 'Gum inflammation assessment',   'pending'),
  ('Yusuf Demir',    '+1-555-0206', 'yusuf.demir@example.test',    'ravi.menon@brightsmile.test',      7, TIME '16:00', 'Retainer fitting',              'confirmed'),
  ('Claire Dubois',  '+1-555-0207', 'claire.dubois@example.test',  'amara.okonkwo@brightsmile.test',  -7, TIME '09:30', 'Filling replacement',           'completed'),
  ('Oliver Grant',   '+1-555-0208', 'oliver.grant@example.test',   'sofia.marchetti@brightsmile.test',-3, TIME '13:00', 'Emergency toothache',           'cancelled')
) AS v(patient_name, patient_phone, patient_email, doctor_email, day_offset, at, reason, status)
JOIN doctors d ON d.email = v.doctor_email
ON CONFLICT DO NOTHING;

INSERT INTO seed_runs (name) VALUES ('sample_data_v1');
END;
$$;
