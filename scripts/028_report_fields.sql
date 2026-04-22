-- Migration 028: Add report fields for biomass (manual), sampling weight, seed source, and pond entry date

-- Rename calculated_biomass_kg to biomass_kg to reflect manual input
-- Existing data is preserved; the field is still nullable for historical compatibility.
ALTER TABLE public.production_records RENAME COLUMN calculated_biomass_kg TO biomass_kg;

-- Add sampling_weight_g (peso de muestreo) as optional manual field
ALTER TABLE public.production_records ADD COLUMN IF NOT EXISTS sampling_weight_g NUMERIC;

-- Add seed_source to batches (origen de semilla)
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS seed_source TEXT;

-- Add pond_entry_date to batches (fecha de ingreso al lago / estanque)
-- Defaults to start_date for existing batches so "dias en lago" matches "dias de cultivo" historically.
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS pond_entry_date DATE;
UPDATE public.batches SET pond_entry_date = start_date WHERE pond_entry_date IS NULL;
