-- ============================================================
--  SEED: Datos de demostración para AquaData
--  Ejecutar en Supabase SQL Editor
-- ============================================================
--
--  INSTRUCCIONES:
--  1. Reemplaza 'TU_ORGANIZATION_ID' abajo con tu organization_id real
--  2. Reemplaza 'TU_USER_ID' con tu user id (auth.users.id)
--  3. Ejecuta todo el script en el SQL Editor de Supabase
--
-- ============================================================

DO $$
DECLARE
  -- ========== CONFIGURA ESTOS VALORES ==========
  v_org_id   uuid := '5dd91946-3265-48b1-87e1-5ccaa56f267d';  -- <-- CAMBIA ESTO
  v_user_id  uuid := '0ba65c42-ce89-45e0-9a98-87cdb00c9998';          -- <-- CAMBIA ESTO
  -- =============================================

  -- Pond IDs
  v_pond1 uuid := gen_random_uuid();
  v_pond2 uuid := gen_random_uuid();
  v_pond3 uuid := gen_random_uuid();
  v_pond4 uuid := gen_random_uuid();
  v_pond5 uuid := gen_random_uuid();
  v_pond6 uuid := gen_random_uuid();

  -- Batch IDs
  v_batch1 uuid := gen_random_uuid();
  v_batch2 uuid := gen_random_uuid();
  v_batch3 uuid := gen_random_uuid();
  v_batch4 uuid := gen_random_uuid();
  v_batch5 uuid := gen_random_uuid();
  v_batch6 uuid := gen_random_uuid();
  v_batch7 uuid := gen_random_uuid();  -- completado
  v_batch8 uuid := gen_random_uuid();  -- completado

  -- Loop variables
  v_day       integer;
  v_date      date;
  v_weight    numeric;
  v_feed      numeric;
  v_temp      numeric;
  v_oxygen    numeric;
  v_ammonia   numeric;
  v_nitrite   numeric;
  v_nitrate   numeric;
  v_ph        numeric;
  v_mortality integer;
  v_fca       numeric;
  v_biomass   numeric;
  v_pop       integer;
  v_prev_wt   numeric;
  v_feed_cost numeric;
BEGIN

  -- ============================================================
  --  ESTANQUES (6 ponds)
  -- ============================================================
  INSERT INTO public.ponds (id, organization_id, name, area_m2, depth_m, species, status) VALUES
    (v_pond1, v_org_id, 'Estanque A1', 1200, 1.2, 'Tilapia roja',    'active'),
    (v_pond2, v_org_id, 'Estanque A2', 1500, 1.3, 'Tilapia roja',    'active'),
    (v_pond3, v_org_id, 'Estanque B1',  800, 1.0, 'Tilapia roja',    'active'),
    (v_pond4, v_org_id, 'Estanque B2',  800, 1.0, 'Tilapia roja',    'active'),
    (v_pond5, v_org_id, 'Estanque C1', 2000, 1.5, 'Camarón blanco',  'active'),
    (v_pond6, v_org_id, 'Estanque C2', 2000, 1.5, 'Camarón blanco',  'inactive');

  -- ============================================================
  --  LOTES / CICLOS (8 batches: 6 activos, 2 completados)
  -- ============================================================
  INSERT INTO public.batches (id, pond_id, start_date, end_date, initial_population, current_population, status, feed_cost_per_kg, sale_price_per_kg, target_weight_g) VALUES
    -- Activos
    (v_batch1, v_pond1, '2025-09-15', NULL, 15000, 14650, 'active', 28.00, 85.00, 450),
    (v_batch2, v_pond2, '2025-10-01', NULL, 20000, 19720, 'active', 28.00, 85.00, 450),
    (v_batch3, v_pond3, '2025-11-10', NULL,  8000,  7890, 'active', 28.00, 85.00, 400),
    (v_batch4, v_pond4, '2025-12-01', NULL, 10000,  9950, 'active', 28.00, 85.00, 400),
    (v_batch5, v_pond5, '2025-10-20', NULL, 25000, 24200, 'active', 35.00, 120.00, 30),
    (v_batch6, v_pond6, '2026-01-05', NULL,  5000,  4980, 'active', 35.00, 120.00, 30),
    -- Completados
    (v_batch7, v_pond1, '2025-03-01', '2025-09-10', 12000, 10800, 'completed', 25.00, 80.00, 400),
    (v_batch8, v_pond5, '2025-04-15', '2025-10-15', 22000, 19500, 'completed', 32.00, 110.00, 28);

  -- ============================================================
  --  REGISTROS DE PRODUCCIÓN
  -- ============================================================

  -- ---- Batch 1: Tilapia A1 (desde 2025-09-15, ~148 días) ----
  v_prev_wt := 0;
  v_pop := 15000;
  FOR v_day IN 0..147 LOOP
    v_date := '2025-09-15'::date + v_day;
    -- Peso: curva sigmoidal simplificada 5g → ~320g
    v_weight := round((5 + (315 * v_day::numeric / 150) * (1 - exp(-0.03 * v_day)))::numeric, 1);
    v_weight := v_weight + round((random() * 4 - 2)::numeric, 1);
    IF v_weight < 5 THEN v_weight := 5; END IF;

    -- Alimentación: ~3-5% de biomasa
    v_biomass := (v_pop * v_weight) / 1000.0;
    v_feed := round((v_biomass * (0.04 - 0.01 * v_day::numeric / 150) + random() * 3)::numeric, 1);
    IF v_feed < 5 THEN v_feed := 5; END IF;

    -- Temperatura: 27-31°C con variación estacional
    v_temp := round((28.5 + 1.5 * sin(v_day * 0.05) + random() * 1.5 - 0.75)::numeric, 1);

    -- Oxígeno: 4-7 mg/L, ocasionalmente bajo
    v_oxygen := round((5.5 + random() * 1.5 - 0.5 + 0.5 * cos(v_day * 0.1))::numeric, 1);
    IF v_day IN (35, 72, 110) THEN v_oxygen := round((2.5 + random())::numeric, 1); END IF;

    -- Amonio: generalmente 0.1-0.4, spikes ocasionales
    v_ammonia := round((0.2 + random() * 0.2)::numeric, 2);
    IF v_day IN (36, 73, 111) THEN v_ammonia := round((0.8 + random() * 1.0)::numeric, 2); END IF;

    -- Nitritos: 0.01-0.15
    v_nitrite := round((0.05 + random() * 0.1)::numeric, 3);
    IF v_day IN (37, 74) THEN v_nitrite := round((0.3 + random() * 0.2)::numeric, 3); END IF;

    -- Nitratos: 5-25
    v_nitrate := round((10 + random() * 10 + v_day * 0.05)::numeric, 1);

    -- pH: 7.2-8.2
    v_ph := round((7.6 + random() * 0.6 - 0.3)::numeric, 1);

    -- Mortalidad: 0-3 normal, spikes
    v_mortality := floor(random() * 3)::integer;
    IF v_day IN (20, 55, 90, 125) THEN v_mortality := floor(10 + random() * 25)::integer; END IF;
    v_pop := v_pop - v_mortality;

    -- FCA
    v_fca := NULL;
    IF v_prev_wt > 0 AND (v_weight - v_prev_wt) > 0 THEN
      v_fca := round((v_feed / ((v_weight - v_prev_wt) * v_pop / 1000.0))::numeric, 2);
      IF v_fca > 5 THEN v_fca := round((1.5 + random() * 0.8)::numeric, 2); END IF;
    END IF;

    v_biomass := round((v_pop * v_weight / 1000.0)::numeric, 2);
    v_feed_cost := round((v_feed * 28.00)::numeric, 2);
    v_prev_wt := v_weight;

    INSERT INTO public.production_records
      (batch_id, record_date, feed_kg, avg_weight_g, mortality_count, temperature_c, oxygen_mg_l,
       ammonia_mg_l, nitrite_mg_l, nitrate_mg_l, ph, calculated_fca, calculated_biomass_kg,
       feed_cost, other_cost, confirmed_by, notes)
    VALUES
      (v_batch1, v_date, v_feed, v_weight, v_mortality, v_temp, v_oxygen,
       v_ammonia, v_nitrite, v_nitrate, v_ph, v_fca, v_biomass,
       v_feed_cost, round((random() * 15)::numeric, 2), v_user_id, NULL);
  END LOOP;

  -- ---- Batch 2: Tilapia A2 (desde 2025-10-01, ~132 días) ----
  v_prev_wt := 0;
  v_pop := 20000;
  FOR v_day IN 0..131 LOOP
    v_date := '2025-10-01'::date + v_day;
    v_weight := round((5 + (310 * v_day::numeric / 150) * (1 - exp(-0.028 * v_day)))::numeric, 1);
    v_weight := v_weight + round((random() * 3 - 1.5)::numeric, 1);
    IF v_weight < 5 THEN v_weight := 5; END IF;

    v_biomass := (v_pop * v_weight) / 1000.0;
    v_feed := round((v_biomass * (0.042 - 0.012 * v_day::numeric / 150) + random() * 4)::numeric, 1);
    IF v_feed < 8 THEN v_feed := 8; END IF;

    v_temp := round((28.0 + 2.0 * sin(v_day * 0.04) + random() * 1.2 - 0.6)::numeric, 1);
    v_oxygen := round((5.8 + random() * 1.2 - 0.4)::numeric, 1);
    IF v_day IN (40, 95) THEN v_oxygen := round((3.0 + random() * 0.8)::numeric, 1); END IF;

    v_ammonia := round((0.15 + random() * 0.25)::numeric, 2);
    IF v_day IN (41, 96) THEN v_ammonia := round((0.7 + random() * 0.6)::numeric, 2); END IF;
    v_nitrite := round((0.04 + random() * 0.08)::numeric, 3);
    v_nitrate := round((8 + random() * 12 + v_day * 0.04)::numeric, 1);
    v_ph := round((7.5 + random() * 0.7 - 0.35)::numeric, 1);

    v_mortality := floor(random() * 4)::integer;
    IF v_day IN (25, 60, 100) THEN v_mortality := floor(15 + random() * 20)::integer; END IF;
    v_pop := v_pop - v_mortality;

    v_fca := NULL;
    IF v_prev_wt > 0 AND (v_weight - v_prev_wt) > 0 THEN
      v_fca := round((v_feed / ((v_weight - v_prev_wt) * v_pop / 1000.0))::numeric, 2);
      IF v_fca > 5 THEN v_fca := round((1.4 + random() * 0.9)::numeric, 2); END IF;
    END IF;

    v_biomass := round((v_pop * v_weight / 1000.0)::numeric, 2);
    v_feed_cost := round((v_feed * 28.00)::numeric, 2);
    v_prev_wt := v_weight;

    INSERT INTO public.production_records
      (batch_id, record_date, feed_kg, avg_weight_g, mortality_count, temperature_c, oxygen_mg_l,
       ammonia_mg_l, nitrite_mg_l, nitrate_mg_l, ph, calculated_fca, calculated_biomass_kg,
       feed_cost, other_cost, confirmed_by)
    VALUES
      (v_batch2, v_date, v_feed, v_weight, v_mortality, v_temp, v_oxygen,
       v_ammonia, v_nitrite, v_nitrate, v_ph, v_fca, v_biomass,
       v_feed_cost, round((random() * 12)::numeric, 2), v_user_id);
  END LOOP;

  -- ---- Batch 3: Tilapia B1 (desde 2025-11-10, ~92 días) ----
  v_prev_wt := 0;
  v_pop := 8000;
  FOR v_day IN 0..91 LOOP
    v_date := '2025-11-10'::date + v_day;
    v_weight := round((5 + (280 * v_day::numeric / 140) * (1 - exp(-0.032 * v_day)))::numeric, 1);
    v_weight := v_weight + round((random() * 3 - 1.5)::numeric, 1);
    IF v_weight < 5 THEN v_weight := 5; END IF;

    v_biomass := (v_pop * v_weight) / 1000.0;
    v_feed := round((v_biomass * (0.038 - 0.008 * v_day::numeric / 140) + random() * 2)::numeric, 1);
    IF v_feed < 3 THEN v_feed := 3; END IF;

    v_temp := round((27.5 + 1.0 * sin(v_day * 0.06) + random() * 1.0 - 0.5)::numeric, 1);
    v_oxygen := round((6.0 + random() * 1.0 - 0.3)::numeric, 1);
    v_ammonia := round((0.1 + random() * 0.2)::numeric, 2);
    v_nitrite := round((0.03 + random() * 0.07)::numeric, 3);
    v_nitrate := round((7 + random() * 8 + v_day * 0.06)::numeric, 1);
    v_ph := round((7.7 + random() * 0.5 - 0.25)::numeric, 1);

    v_mortality := floor(random() * 2)::integer;
    IF v_day IN (30, 65) THEN v_mortality := floor(8 + random() * 15)::integer; END IF;
    v_pop := v_pop - v_mortality;

    v_fca := NULL;
    IF v_prev_wt > 0 AND (v_weight - v_prev_wt) > 0 THEN
      v_fca := round((v_feed / ((v_weight - v_prev_wt) * v_pop / 1000.0))::numeric, 2);
      IF v_fca > 5 THEN v_fca := round((1.3 + random() * 0.7)::numeric, 2); END IF;
    END IF;

    v_biomass := round((v_pop * v_weight / 1000.0)::numeric, 2);
    v_feed_cost := round((v_feed * 28.00)::numeric, 2);
    v_prev_wt := v_weight;

    INSERT INTO public.production_records
      (batch_id, record_date, feed_kg, avg_weight_g, mortality_count, temperature_c, oxygen_mg_l,
       ammonia_mg_l, nitrite_mg_l, nitrate_mg_l, ph, calculated_fca, calculated_biomass_kg,
       feed_cost, other_cost, confirmed_by)
    VALUES
      (v_batch3, v_date, v_feed, v_weight, v_mortality, v_temp, v_oxygen,
       v_ammonia, v_nitrite, v_nitrate, v_ph, v_fca, v_biomass,
       v_feed_cost, round((random() * 10)::numeric, 2), v_user_id);
  END LOOP;

  -- ---- Batch 4: Tilapia B2 (desde 2025-12-01, ~71 días) ----
  v_prev_wt := 0;
  v_pop := 10000;
  FOR v_day IN 0..70 LOOP
    v_date := '2025-12-01'::date + v_day;
    v_weight := round((5 + (250 * v_day::numeric / 140) * (1 - exp(-0.03 * v_day)))::numeric, 1);
    v_weight := v_weight + round((random() * 2.5 - 1.25)::numeric, 1);
    IF v_weight < 5 THEN v_weight := 5; END IF;

    v_biomass := (v_pop * v_weight) / 1000.0;
    v_feed := round((v_biomass * (0.04 - 0.01 * v_day::numeric / 140) + random() * 2)::numeric, 1);
    IF v_feed < 4 THEN v_feed := 4; END IF;

    v_temp := round((27.0 + 1.5 * sin(v_day * 0.05) + random() * 1.0 - 0.5)::numeric, 1);
    v_oxygen := round((5.5 + random() * 1.5 - 0.5)::numeric, 1);
    IF v_day = 45 THEN v_oxygen := round((3.2 + random() * 0.5)::numeric, 1); END IF;

    v_ammonia := round((0.12 + random() * 0.18)::numeric, 2);
    IF v_day = 46 THEN v_ammonia := round((0.6 + random() * 0.5)::numeric, 2); END IF;
    v_nitrite := round((0.04 + random() * 0.06)::numeric, 3);
    v_nitrate := round((6 + random() * 10 + v_day * 0.05)::numeric, 1);
    v_ph := round((7.6 + random() * 0.6 - 0.3)::numeric, 1);

    v_mortality := floor(random() * 2)::integer;
    IF v_day = 35 THEN v_mortality := floor(12 + random() * 18)::integer; END IF;
    v_pop := v_pop - v_mortality;

    v_fca := NULL;
    IF v_prev_wt > 0 AND (v_weight - v_prev_wt) > 0 THEN
      v_fca := round((v_feed / ((v_weight - v_prev_wt) * v_pop / 1000.0))::numeric, 2);
      IF v_fca > 5 THEN v_fca := round((1.4 + random() * 0.6)::numeric, 2); END IF;
    END IF;

    v_biomass := round((v_pop * v_weight / 1000.0)::numeric, 2);
    v_feed_cost := round((v_feed * 28.00)::numeric, 2);
    v_prev_wt := v_weight;

    INSERT INTO public.production_records
      (batch_id, record_date, feed_kg, avg_weight_g, mortality_count, temperature_c, oxygen_mg_l,
       ammonia_mg_l, nitrite_mg_l, nitrate_mg_l, ph, calculated_fca, calculated_biomass_kg,
       feed_cost, other_cost, confirmed_by)
    VALUES
      (v_batch4, v_date, v_feed, v_weight, v_mortality, v_temp, v_oxygen,
       v_ammonia, v_nitrite, v_nitrate, v_ph, v_fca, v_biomass,
       v_feed_cost, round((random() * 8)::numeric, 2), v_user_id);
  END LOOP;

  -- ---- Batch 5: Camarón C1 (desde 2025-10-20, ~113 días) ----
  v_prev_wt := 0;
  v_pop := 25000;
  FOR v_day IN 0..112 LOOP
    v_date := '2025-10-20'::date + v_day;
    -- Camarón: 1g → ~25g en ~120 días
    v_weight := round((1 + (24 * v_day::numeric / 120) * (1 - exp(-0.035 * v_day)))::numeric, 1);
    v_weight := v_weight + round((random() * 0.6 - 0.3)::numeric, 1);
    IF v_weight < 1 THEN v_weight := 1; END IF;

    v_biomass := (v_pop * v_weight) / 1000.0;
    v_feed := round((v_biomass * (0.05 - 0.015 * v_day::numeric / 120) + random() * 1.5)::numeric, 1);
    IF v_feed < 2 THEN v_feed := 2; END IF;

    v_temp := round((29.0 + 1.0 * sin(v_day * 0.04) + random() * 1.0 - 0.5)::numeric, 1);
    v_oxygen := round((5.0 + random() * 1.5 - 0.5)::numeric, 1);
    IF v_day IN (50, 85) THEN v_oxygen := round((2.8 + random() * 0.8)::numeric, 1); END IF;

    v_ammonia := round((0.15 + random() * 0.3)::numeric, 2);
    IF v_day IN (51, 86) THEN v_ammonia := round((1.0 + random() * 1.2)::numeric, 2); END IF;
    v_nitrite := round((0.05 + random() * 0.1)::numeric, 3);
    v_nitrate := round((12 + random() * 15 + v_day * 0.08)::numeric, 1);
    v_ph := round((7.8 + random() * 0.4 - 0.2)::numeric, 1);

    v_mortality := floor(random() * 8)::integer;  -- camarón tiene más mortalidad base
    IF v_day IN (30, 60, 90) THEN v_mortality := floor(50 + random() * 80)::integer; END IF;
    v_pop := v_pop - v_mortality;
    IF v_pop < 1000 THEN v_pop := 1000; END IF;

    v_fca := NULL;
    IF v_prev_wt > 0 AND (v_weight - v_prev_wt) > 0 THEN
      v_fca := round((v_feed / ((v_weight - v_prev_wt) * v_pop / 1000.0))::numeric, 2);
      IF v_fca > 6 THEN v_fca := round((1.8 + random() * 1.0)::numeric, 2); END IF;
    END IF;

    v_biomass := round((v_pop * v_weight / 1000.0)::numeric, 2);
    v_feed_cost := round((v_feed * 35.00)::numeric, 2);
    v_prev_wt := v_weight;

    INSERT INTO public.production_records
      (batch_id, record_date, feed_kg, avg_weight_g, mortality_count, temperature_c, oxygen_mg_l,
       ammonia_mg_l, nitrite_mg_l, nitrate_mg_l, ph, calculated_fca, calculated_biomass_kg,
       feed_cost, other_cost, confirmed_by)
    VALUES
      (v_batch5, v_date, v_feed, v_weight, v_mortality, v_temp, v_oxygen,
       v_ammonia, v_nitrite, v_nitrate, v_ph, v_fca, v_biomass,
       v_feed_cost, round((random() * 20)::numeric, 2), v_user_id);
  END LOOP;

  -- ---- Batch 6: Camarón C2 (desde 2026-01-05, ~36 días, ciclo joven) ----
  v_prev_wt := 0;
  v_pop := 5000;
  FOR v_day IN 0..35 LOOP
    v_date := '2026-01-05'::date + v_day;
    v_weight := round((1 + (8 * v_day::numeric / 40) * (1 - exp(-0.04 * v_day)))::numeric, 1);
    v_weight := v_weight + round((random() * 0.3 - 0.15)::numeric, 1);
    IF v_weight < 1 THEN v_weight := 1; END IF;

    v_biomass := (v_pop * v_weight) / 1000.0;
    v_feed := round((v_biomass * 0.05 + random() * 0.5)::numeric, 1);
    IF v_feed < 0.5 THEN v_feed := 0.5; END IF;

    v_temp := round((28.5 + random() * 1.5 - 0.75)::numeric, 1);
    v_oxygen := round((5.5 + random() * 1.0)::numeric, 1);
    v_ammonia := round((0.1 + random() * 0.15)::numeric, 2);
    v_nitrite := round((0.02 + random() * 0.05)::numeric, 3);
    v_nitrate := round((5 + random() * 5)::numeric, 1);
    v_ph := round((7.9 + random() * 0.3 - 0.15)::numeric, 1);

    v_mortality := floor(random() * 2)::integer;
    v_pop := v_pop - v_mortality;

    v_fca := NULL;
    IF v_prev_wt > 0 AND (v_weight - v_prev_wt) > 0 THEN
      v_fca := round((v_feed / ((v_weight - v_prev_wt) * v_pop / 1000.0))::numeric, 2);
      IF v_fca > 5 THEN v_fca := round((1.6 + random() * 0.5)::numeric, 2); END IF;
    END IF;

    v_biomass := round((v_pop * v_weight / 1000.0)::numeric, 2);
    v_feed_cost := round((v_feed * 35.00)::numeric, 2);
    v_prev_wt := v_weight;

    INSERT INTO public.production_records
      (batch_id, record_date, feed_kg, avg_weight_g, mortality_count, temperature_c, oxygen_mg_l,
       ammonia_mg_l, nitrite_mg_l, nitrate_mg_l, ph, calculated_fca, calculated_biomass_kg,
       feed_cost, other_cost, confirmed_by)
    VALUES
      (v_batch6, v_date, v_feed, v_weight, v_mortality, v_temp, v_oxygen,
       v_ammonia, v_nitrite, v_nitrate, v_ph, v_fca, v_biomass,
       v_feed_cost, round((random() * 5)::numeric, 2), v_user_id);
  END LOOP;

  -- ---- Batch 7: Completado - Tilapia A1 anterior (Mar-Sep 2025) ----
  v_prev_wt := 0;
  v_pop := 12000;
  FOR v_day IN 0..189 LOOP
    v_date := '2025-03-01'::date + v_day;
    v_weight := round((5 + (395 * v_day::numeric / 190) * (1 - exp(-0.025 * v_day)))::numeric, 1);
    v_weight := v_weight + round((random() * 3 - 1.5)::numeric, 1);
    IF v_weight < 5 THEN v_weight := 5; END IF;

    v_biomass := (v_pop * v_weight) / 1000.0;
    v_feed := round((v_biomass * (0.04 - 0.012 * v_day::numeric / 190) + random() * 3)::numeric, 1);
    IF v_feed < 4 THEN v_feed := 4; END IF;

    v_temp := round((27.5 + 2.5 * sin(v_day * 0.02) + random() * 1.5 - 0.75)::numeric, 1);
    v_oxygen := round((5.2 + random() * 1.5 - 0.5)::numeric, 1);
    v_ammonia := round((0.18 + random() * 0.22)::numeric, 2);
    v_nitrite := round((0.04 + random() * 0.08)::numeric, 3);
    v_nitrate := round((9 + random() * 10 + v_day * 0.03)::numeric, 1);
    v_ph := round((7.5 + random() * 0.6 - 0.3)::numeric, 1);

    v_mortality := floor(random() * 3)::integer;
    IF v_day IN (40, 80, 120, 160) THEN v_mortality := floor(5 + random() * 15)::integer; END IF;
    v_pop := v_pop - v_mortality;

    v_fca := NULL;
    IF v_prev_wt > 0 AND (v_weight - v_prev_wt) > 0 THEN
      v_fca := round((v_feed / ((v_weight - v_prev_wt) * v_pop / 1000.0))::numeric, 2);
      IF v_fca > 5 THEN v_fca := round((1.5 + random() * 0.6)::numeric, 2); END IF;
    END IF;

    v_biomass := round((v_pop * v_weight / 1000.0)::numeric, 2);
    v_feed_cost := round((v_feed * 25.00)::numeric, 2);
    v_prev_wt := v_weight;

    INSERT INTO public.production_records
      (batch_id, record_date, feed_kg, avg_weight_g, mortality_count, temperature_c, oxygen_mg_l,
       ammonia_mg_l, nitrite_mg_l, nitrate_mg_l, ph, calculated_fca, calculated_biomass_kg,
       feed_cost, other_cost, confirmed_by)
    VALUES
      (v_batch7, v_date, v_feed, v_weight, v_mortality, v_temp, v_oxygen,
       v_ammonia, v_nitrite, v_nitrate, v_ph, v_fca, v_biomass,
       v_feed_cost, round((random() * 10)::numeric, 2), v_user_id);
  END LOOP;

  -- ---- Batch 8: Completado - Camarón C1 anterior (Abr-Oct 2025) ----
  v_prev_wt := 0;
  v_pop := 22000;
  FOR v_day IN 0..182 LOOP
    v_date := '2025-04-15'::date + v_day;
    v_weight := round((1 + (27 * v_day::numeric / 183) * (1 - exp(-0.03 * v_day)))::numeric, 1);
    v_weight := v_weight + round((random() * 0.5 - 0.25)::numeric, 1);
    IF v_weight < 1 THEN v_weight := 1; END IF;

    v_biomass := (v_pop * v_weight) / 1000.0;
    v_feed := round((v_biomass * (0.05 - 0.018 * v_day::numeric / 183) + random() * 2)::numeric, 1);
    IF v_feed < 2 THEN v_feed := 2; END IF;

    v_temp := round((29.5 + 1.5 * sin(v_day * 0.03) + random() * 1.0 - 0.5)::numeric, 1);
    v_oxygen := round((5.0 + random() * 1.5 - 0.5)::numeric, 1);
    v_ammonia := round((0.2 + random() * 0.25)::numeric, 2);
    v_nitrite := round((0.05 + random() * 0.1)::numeric, 3);
    v_nitrate := round((10 + random() * 12 + v_day * 0.05)::numeric, 1);
    v_ph := round((7.7 + random() * 0.5 - 0.25)::numeric, 1);

    v_mortality := floor(random() * 6)::integer;
    IF v_day IN (45, 90, 135) THEN v_mortality := floor(30 + random() * 50)::integer; END IF;
    v_pop := v_pop - v_mortality;
    IF v_pop < 1000 THEN v_pop := 1000; END IF;

    v_fca := NULL;
    IF v_prev_wt > 0 AND (v_weight - v_prev_wt) > 0 THEN
      v_fca := round((v_feed / ((v_weight - v_prev_wt) * v_pop / 1000.0))::numeric, 2);
      IF v_fca > 6 THEN v_fca := round((1.7 + random() * 0.8)::numeric, 2); END IF;
    END IF;

    v_biomass := round((v_pop * v_weight / 1000.0)::numeric, 2);
    v_feed_cost := round((v_feed * 32.00)::numeric, 2);
    v_prev_wt := v_weight;

    INSERT INTO public.production_records
      (batch_id, record_date, feed_kg, avg_weight_g, mortality_count, temperature_c, oxygen_mg_l,
       ammonia_mg_l, nitrite_mg_l, nitrate_mg_l, ph, calculated_fca, calculated_biomass_kg,
       feed_cost, other_cost, confirmed_by)
    VALUES
      (v_batch8, v_date, v_feed, v_weight, v_mortality, v_temp, v_oxygen,
       v_ammonia, v_nitrite, v_nitrate, v_ph, v_fca, v_biomass,
       v_feed_cost, round((random() * 15)::numeric, 2), v_user_id);
  END LOOP;

  -- ============================================================
  --  ALERTAS (20 alertas variadas)
  -- ============================================================
  INSERT INTO public.alerts (organization_id, pond_id, batch_id, alert_type, severity, message, is_read, created_at) VALUES
    -- Oxígeno bajo
    (v_org_id, v_pond1, v_batch1, 'low_oxygen', 'warning',  'Oxigeno bajo detectado: 3.2 mg/L en Estanque A1 (minimo recomendado: 4 mg/L)', false, '2025-10-20 06:30:00-05'),
    (v_org_id, v_pond1, v_batch1, 'low_oxygen', 'critical', 'Oxigeno critico: 1.8 mg/L en Estanque A1 (nivel peligroso < 2 mg/L)', true,  '2025-11-25 05:45:00-05'),
    (v_org_id, v_pond5, v_batch5, 'low_oxygen', 'warning',  'Oxigeno bajo detectado: 2.9 mg/L en Estanque C1 (minimo recomendado: 4 mg/L)', false, '2025-12-09 07:00:00-05'),
    (v_org_id, v_pond5, v_batch5, 'low_oxygen', 'critical', 'Oxigeno critico: 1.5 mg/L en Estanque C1 (nivel peligroso < 2 mg/L)', false, '2026-01-13 06:15:00-05'),
    (v_org_id, v_pond4, v_batch4, 'low_oxygen', 'warning',  'Oxigeno bajo detectado: 3.4 mg/L en Estanque B2 (minimo recomendado: 4 mg/L)', true,  '2026-01-15 06:00:00-05'),

    -- Amonio alto
    (v_org_id, v_pond1, v_batch1, 'high_ammonia', 'warning',  'Amonio elevado: 0.85 mg/L en Estanque A1 (maximo recomendado: 0.5 mg/L)', true,  '2025-10-21 08:00:00-05'),
    (v_org_id, v_pond1, v_batch1, 'high_ammonia', 'critical', 'Amonio critico: 1.7 mg/L en Estanque A1 (nivel peligroso > 1.5 mg/L)', false, '2025-11-26 08:30:00-05'),
    (v_org_id, v_pond5, v_batch5, 'high_ammonia', 'critical', 'Amonio critico: 2.1 mg/L en Estanque C1 (nivel peligroso > 1.5 mg/L)', false, '2025-12-10 09:00:00-05'),
    (v_org_id, v_pond2, v_batch2, 'high_ammonia', 'warning',  'Amonio elevado: 0.72 mg/L en Estanque A2 (maximo recomendado: 0.5 mg/L)', true,  '2025-11-10 07:45:00-05'),
    (v_org_id, v_pond4, v_batch4, 'high_ammonia', 'warning',  'Amonio elevado: 0.65 mg/L en Estanque B2 (maximo recomendado: 0.5 mg/L)', false, '2026-01-16 08:15:00-05'),

    -- Mortalidad alta
    (v_org_id, v_pond1, v_batch1, 'high_mortality', 'warning',  'Mortalidad elevada: 28 individuos en Estanque A1 en un dia', true,  '2025-10-05 10:00:00-05'),
    (v_org_id, v_pond5, v_batch5, 'high_mortality', 'critical', 'Mortalidad critica: 115 individuos en Estanque C1 en un dia', false, '2025-11-19 10:30:00-05'),
    (v_org_id, v_pond5, v_batch5, 'high_mortality', 'critical', 'Mortalidad critica: 92 individuos en Estanque C1 en un dia', false, '2025-12-19 11:00:00-05'),
    (v_org_id, v_pond2, v_batch2, 'high_mortality', 'warning',  'Mortalidad elevada: 22 individuos en Estanque A2 en un dia', true,  '2025-10-26 09:00:00-05'),
    (v_org_id, v_pond4, v_batch4, 'high_mortality', 'warning',  'Mortalidad elevada: 18 individuos en Estanque B2 en un dia', false, '2026-01-05 10:00:00-05'),

    -- FCA elevado
    (v_org_id, v_pond1, v_batch1, 'high_fca', 'warning', 'FCA elevado: 2.85 en Estanque A1 (objetivo: < 1.8)', true,  '2025-12-15 12:00:00-05'),
    (v_org_id, v_pond2, v_batch2, 'high_fca', 'warning', 'FCA elevado: 3.10 en Estanque A2 (objetivo: < 1.8)', false, '2026-01-20 12:30:00-05'),
    (v_org_id, v_pond5, v_batch5, 'high_fca', 'warning', 'FCA elevado: 2.65 en Estanque C1 (objetivo: < 1.8)', false, '2026-01-25 11:45:00-05'),
    (v_org_id, v_pond3, v_batch3, 'high_fca', 'warning', 'FCA elevado: 2.72 en Estanque B1 (objetivo: < 1.8)', true,  '2026-01-08 13:00:00-05'),
    (v_org_id, v_pond5, v_batch5, 'high_mortality', 'critical', 'Mortalidad critica: 78 individuos en Estanque C1 en un dia', false, '2026-01-18 09:30:00-05');

  -- ============================================================
  --  TRATAMIENTOS DE BIORREMEDIACIÓN
  -- ============================================================
  INSERT INTO public.bioremediation_treatments (pond_id, treatment_date, product_name, dose_liters, ammonia_before, ammonia_after, notes, user_id) VALUES
    (v_pond1, '2025-10-22', 'BioAqua Pro',     12.5, 0.85, 0.25, 'Tratamiento post-alerta de amonio. Resultados en 48h.', v_user_id),
    (v_pond1, '2025-11-27', 'BioAqua Pro',     15.0, 1.70, 0.40, 'Tratamiento de emergencia por amonio critico.',         v_user_id),
    (v_pond5, '2025-12-11', 'AquaRemedium X',  25.0, 2.10, 0.55, 'Camarón sensible, dosis aumentada.',                    v_user_id),
    (v_pond2, '2025-11-11', 'BioAqua Pro',     18.0, 0.72, 0.18, 'Tratamiento preventivo.',                               v_user_id),
    (v_pond5, '2026-01-14', 'AquaRemedium X',  22.0, 1.50, 0.35, 'Segundo tratamiento del ciclo en C1.',                  v_user_id);

  -- ============================================================
  --  CÁLCULOS DE BIORREMEDIACIÓN (historial)
  -- ============================================================
  INSERT INTO public.bioremediation_calcs (user_id, pond_length, pond_width, pond_depth, volume_m3, bioremediation_dose, notes) VALUES
    (v_user_id, 40, 30, 1.2, 1440, 14.4, 'Calculo para Estanque A1'),
    (v_user_id, 50, 30, 1.3, 1950, 19.5, 'Calculo para Estanque A2'),
    (v_user_id, 50, 40, 1.5, 3000, 30.0, 'Calculo para Estanque C1 - camaron');

  -- ============================================================
  --  Actualizar current_population en batches activos
  -- ============================================================
  UPDATE public.batches SET current_population = (
    SELECT b.initial_population - COALESCE(SUM(pr.mortality_count), 0)
    FROM public.batches b
    LEFT JOIN public.production_records pr ON pr.batch_id = b.id
    WHERE b.id = batches.id
    GROUP BY b.initial_population
  )
  WHERE status = 'active' AND id IN (v_batch1, v_batch2, v_batch3, v_batch4, v_batch5, v_batch6);

  RAISE NOTICE '✅ Seed completado: 6 estanques, 8 lotes, ~800 registros, 20 alertas, 5 tratamientos';
END $$;
