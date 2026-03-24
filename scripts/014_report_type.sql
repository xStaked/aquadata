-- Add report_type and week_end_date to production_records
-- report_type: 'daily' | 'weekly'
-- week_end_date: only set for weekly reports (record_date = week start)

ALTER TABLE production_records
  ADD COLUMN IF NOT EXISTS report_type text NOT NULL DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS week_end_date date;

-- Add constraint to ensure valid values
ALTER TABLE production_records
  DROP CONSTRAINT IF EXISTS production_records_report_type_check;

ALTER TABLE production_records
  ADD CONSTRAINT production_records_report_type_check
  CHECK (report_type IN ('daily', 'weekly'));
