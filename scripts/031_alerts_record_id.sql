-- Migration 031: Add record_id to alerts for tracking which production record generated each alert
-- This allows re-calculating alerts on record edit and cleaning up stale alerts.

ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS record_id UUID REFERENCES public.production_records(id) ON DELETE CASCADE;

-- Index for fast lookup when deleting/regenerating alerts for a specific record
CREATE INDEX IF NOT EXISTS idx_alerts_record_id ON public.alerts(record_id);
