-- Migration 024: Add custom_fish_prices JSONB column to organizations
-- Stores per-species sale prices set by the org admin.
-- Format: { "Tilapia": 8500, "Cachama": 7000, ... }
-- Key: species name (string), Value: price per kg in COP (numeric)
-- Empty object ({}) means no custom prices — system falls back to SIPSA market prices.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS custom_fish_prices JSONB DEFAULT '{}'::jsonb;
