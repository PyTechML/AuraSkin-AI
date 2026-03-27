-- One-time sync: any rows only in consultation_slots (post-backfill writes) → availability_slots
INSERT INTO availability_slots (id, doctor_id, date, start_time, end_time, status, created_at, updated_at)
SELECT
  cs.id,
  cs.dermatologist_id,
  cs.slot_date::date,
  cs.start_time::time,
  cs.end_time::time,
  cs.status,
  COALESCE(cs.created_at, now()),
  now()
FROM consultation_slots cs
WHERE NOT EXISTS (SELECT 1 FROM availability_slots a WHERE a.id = cs.id)
ON CONFLICT (id) DO UPDATE SET
  doctor_id = EXCLUDED.doctor_id,
  date = EXCLUDED.date,
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  status = EXCLUDED.status,
  updated_at = now();
