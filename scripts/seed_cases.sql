-- Seed data: bioremediation cases for chat testing
-- Especies: Tilapia Roja, Tilapia Negra, Cachama Blanca, Bocachico, Bagres, Trucha
-- Producto: BioTerraPro
--
-- Ejecutar en Supabase SQL Editor.
-- Usa automáticamente el primer usuario existente como author_id.
-- Para usar un usuario específico: reemplaza la línea SELECT id INTO admin_id...

DO $$
DECLARE
  admin_id UUID;
BEGIN
  SELECT id INTO admin_id FROM auth.users LIMIT 1;

  IF admin_id IS NULL THEN
    RAISE EXCEPTION 'No hay usuarios en auth.users. Crea al menos uno antes de correr este seed.';
  END IF;

  INSERT INTO public.bioremediation_cases
    (issue, zone, species, product_name, treatment_approach, dose, dose_unit, outcome, status, status_usable_for_grounding, author_id, notes)
  VALUES

  -- ── Tilapia Roja ────────────────────────────────────────────────────────────

  (
    'Fondo negro con acumulación de materia orgánica y olor a sulfuro en estanque de tierra',
    'Llanos Orientales',
    'tilapia-roja',
    'bioterrapro',
    'Aplicación en seco sobre el fondo húmedo al vaciar el estanque entre ciclos. Incorporación con rastrillo o rotovator en los primeros 5 cm. Reposo 5 días antes de la inundación.',
    250,
    'g/ha',
    'Fondo clareó visiblemente al día 4. Sin olor a sulfuro en siguiente ciclo. FCR mejoró 0.15 puntos.',
    'approved', true, admin_id,
    'Estanque 1.2 ha, 3 ciclos previos sin mantenimiento de fondo. Profundidad 1.2 m.'
  ),

  (
    'Oxígeno disuelto cae a 3 mg/L en madrugada, peces en superficie',
    'Llanos Orientales',
    'tilapia-roja',
    'bioterrapro',
    'Aplicación nocturna de emergencia con aireación simultánea al máximo. Reducción de ración al 60% durante 3 días post-aplicación. Revisión de OD a las 6am.',
    250,
    'g/ha',
    'OD recuperado a 5.5 mg/L antes del amanecer. Sin mortalidad. Se identificó exceso de alimentación como causa raíz.',
    'approved', true, admin_id,
    'Estanque 0.8 ha, densidad 8 peces/m², temperatura 28°C.'
  ),

  (
    'pH por encima de 9 al mediodía con bloom de algas verde-azul',
    'Meta',
    'tilapia-roja',
    'bioterrapro',
    'Aplicación matutina temprana antes del pico fotosintético. Recambio parcial 20% el día 2. Reducción de alimentación al 70% por 3 días.',
    250,
    'g/ha',
    'pH estabilizado entre 7.8 y 8.5 al día 5. Transparencia Secchi mejoró de 15 cm a 38 cm.',
    'approved', true, admin_id,
    'Estanque sin aireación mecánica, época seca con alta radiación solar.'
  ),

  -- ── Tilapia Negra ───────────────────────────────────────────────────────────

  (
    'Agua turbia color marrón con visibilidad < 20 cm y crecimiento lento semana 10',
    'Huila',
    'tilapia-negra',
    'bioterrapro',
    'Aplicación semanal por 3 semanas consecutivas. Ajuste de alimentación al 80% de la ración durante el tratamiento. Sin recambio durante la primera semana.',
    250,
    'g/ha',
    'Transparencia mejoró a 45 cm en 2 semanas. Tasa de crecimiento semanal subió de 18 g a 26 g. FCR bajó de 2.0 a 1.7.',
    'approved', true, admin_id,
    'Estanque 1.0 ha, tilapia nilótica negra, densidad 7 peces/m².'
  ),

  (
    'Mortalidad gradual sin causa química clara, fondo con zonas oscuras',
    'Tolima',
    'tilapia-negra',
    'bioterrapro',
    'Aplicación fraccionada: 50% al atardecer, 50% al amanecer siguiente. Aireación al máximo durante 48h post-aplicación.',
    250,
    'g/ha',
    'Mortalidad cesó al día 3. Fondo clareó en el 70% del área al día 7. Ciclo recuperado con pérdida menor al 4%.',
    'approved', true, admin_id,
    'Estanque 0.6 ha, alta carga orgánica por lluvias prolongadas.'
  ),

  -- ── Cachama Blanca ──────────────────────────────────────────────────────────

  (
    'Nitritos elevados (> 0.8 mg/L) en fase de engorde con reducción de apetito',
    'Casanare',
    'cachama-blanca',
    'bioterrapro',
    'Dosis de choque única aplicada en la tarde. Aireación continua por 72h. Restricción de alimentación al 50% por 48h. Monitoreo de nitritos cada 24h.',
    300,
    'g/ha',
    'Nitritos bajaron a 0.2 mg/L en 96h. Apetito normalizado al día 5. Ciclo completado sin recaída.',
    'approved', true, admin_id,
    'Estanque 1.5 ha, profundidad 1.4 m, densidad 2 peces/m². Aireación 4 paletas.'
  ),

  (
    'Preparación de estanque nuevo con suelo ácido (pH fondo < 6.5) en zona de sabana',
    'Casanare',
    'cachama-blanca',
    'bioterrapro',
    'Aplicación en capas sobre suelo seco durante la preparación. Mezcla mecánica con rastrillo seguida de inundación gradual. No sembrar antes de 5 días post-aplicación.',
    300,
    'g/ha',
    'pH fondo subió de 6.2 a 7.3 antes de la siembra. Primer ciclo de cachama completado sin problemas de fondo ni mortalidad temprana.',
    'approved', true, admin_id,
    'Estanque nuevo 2 ha, suelo arcilloso con alto contenido de hierro. Primer ciclo productivo.'
  ),

  -- ── Bocachico ───────────────────────────────────────────────────────────────

  (
    'Fondo con alta carga orgánica entre ciclos en estanque de bocachico con historia de 5 años',
    'Río Magdalena medio',
    'bocachico',
    'bioterrapro',
    'Aplicación post-cosecha sobre fondo húmedo. Reposo de 7 días antes de inundación. Complemento con encalado si pH fondo < 6.8.',
    250,
    'g/ha',
    'Reducción de capa negra en 85% del área. Siguiente ciclo sin eventos de baja de oxígeno en las primeras 4 semanas.',
    'approved', true, admin_id,
    'Estanque 1.8 ha con 5 ciclos sin mantenimiento intensivo de fondo.'
  ),

  (
    'Baja de oxígeno recurrente en noches con cielo nublado y alta densidad de siembra',
    'Santander',
    'bocachico',
    'bioterrapro',
    'Aplicación preventiva al inicio del período lluvioso. Reducción de densidad en próximo ciclo como medida complementaria. Aireación nocturna preventiva.',
    250,
    'g/ha',
    'Eventos de hipoxia nocturna se redujeron de 3-4 por semana a 0 en las siguientes 3 semanas. Sin mortalidad masiva.',
    'approved', true, admin_id,
    'Estanque 0.9 ha, densidad alta para bocachico 5 peces/m².'
  ),

  -- ── Bagres ──────────────────────────────────────────────────────────────────

  (
    'Acumulación severa de amonio (> 2 mg/L) en sistema intensivo de bagre',
    'Valle del Cauca',
    'bagres',
    'bioterrapro',
    'Aplicación de emergencia con parada de alimentación por 24h. Aireación máxima. Recambio del 25% del agua al día 2. Segunda dosis a la semana si amonio no baja de 1 mg/L.',
    350,
    'g/ha',
    'Amonio bajó a 0.8 mg/L en 72h y a 0.3 mg/L al día 7. Alimentación retomada gradualmente. Sin mortalidad.',
    'approved', true, admin_id,
    'Estanque 0.5 ha, sistema intensivo con alta carga proteica en dieta, temperatura 26°C.'
  ),

  (
    'Fondo con acumulación de heces y alimento no consumido en estanque de engorde de bagre',
    'Cundinamarca',
    'bagres',
    'bioterrapro',
    'Aplicación directa al fondo en puntos de mayor acumulación. Distribución uniforme con bomba de baja presión. Reducción de ración al 70% durante 5 días.',
    350,
    'g/ha',
    'Reducción visible de sedimento en 60% al día 10. OD nocturno mejoró de 3.5 mg/L a 5.8 mg/L. FCR bajó de 1.9 a 1.6.',
    'approved', true, admin_id,
    'Estanque 0.7 ha, bagre rayado en fase de engorde semana 16.'
  ),

  -- ── Trucha ──────────────────────────────────────────────────────────────────

  (
    'Agua con exceso de sólidos suspendidos y branquias afectadas en trucha arcoíris',
    'Nariño',
    'trucha',
    'bioterrapro',
    'Aplicación en canal de entrada para distribución homogénea con el flujo. Dosis fraccionada en 3 aplicaciones cada 48h. Monitoreo de branquias al día 7.',
    300,
    'g/ha',
    'Sólidos suspendidos bajaron 65% en 10 días. Lesiones branquiales mejoraron notablemente en revisión al día 14. Sin mortalidad adicional.',
    'approved', true, admin_id,
    'Estanque de canal 0.3 ha, trucha arcoíris 200g promedio, agua de río con sedimento fino.'
  ),

  (
    'Mortalidad temprana en alevines de trucha por desbalance bacteriano en estanque nuevo',
    'Boyacá',
    'trucha',
    'bioterrapro',
    'Acondicionamiento del estanque 10 días antes de la siembra de alevines. Aplicación única sobre fondo y paredes. Llenado gradual con monitoreo de pH y OD.',
    300,
    'g/ha',
    'pH estabilizado en 7.0–7.4. Siembra de alevines exitosa con sobrevivencia >95% en primera semana vs 60% en ciclo anterior sin tratamiento.',
    'approved', true, admin_id,
    'Estanque nuevo en concreto 0.15 ha, agua de nacimiento, temperatura 14°C.'
  ),

  -- ── BIOAQUAPRO — Tilapia Roja ────────────────────────────────────────────────

  (
    'Bloom intenso de algas verde-azul con pH >9.5 y olor a tierra en estanque de engorde',
    'Meta',
    'tilapia-roja',
    'bioaquapro',
    'Aplicación directa al agua en horas de la mañana antes del pico fotosintético. Distribución perimetral con bomba de baja presión. Reducción de ración al 60% por 4 días. Recambio parcial 15% al día 3.',
    500,
    'mL/ha',
    'Bloom colapsó progresivamente entre día 3 y 5. pH bajó a 8.2 al día 6. Transparencia Secchi pasó de 12 cm a 40 cm. Sin mortalidad.',
    'approved', true, admin_id,
    'Estanque 1.0 ha sin aireación mecánica, época seca, radiación alta. Temperatura 30°C.'
  ),

  (
    'Oxígeno disuelto en 2.8 mg/L al amanecer con tilapia en superficie y signos de estrés',
    'Llanos Orientales',
    'tilapia-roja',
    'bioaquapro',
    'Aplicación nocturna de emergencia con aireación simultánea al máximo. Dosis de choque única. Monitoreo de OD cada 2h hasta las 8am. Reducción de ración al 50% por 3 días.',
    600,
    'mL/ha',
    'OD recuperado a 5.0 mg/L en 3h post-aplicación. Sin mortalidad. Se identificó sobrecarga de alimentación los 2 días previos como causa raíz.',
    'approved', true, admin_id,
    'Estanque 0.8 ha, densidad 8 peces/m², aireación insuficiente para la biomasa en esa fase.'
  ),

  -- ── BIOAQUAPRO — Tilapia Negra ───────────────────────────────────────────────

  (
    'Amonio total >1.5 mg/L en semana 8 con reducción de apetito y crecimiento lento',
    'Huila',
    'tilapia-negra',
    'bioaquapro',
    'Aplicación en dos dosis fraccionadas (mañana y tarde del mismo día). Parada de alimentación 24h. Aireación continua. Recambio 20% al día 2. Monitoreo de amonio cada 48h.',
    500,
    'mL/ha',
    'Amonio bajó a 0.4 mg/L al día 5. Apetito normalizado al día 6. Tasa de crecimiento semanal recuperada al nivel previo en 10 días.',
    'approved', true, admin_id,
    'Estanque 1.0 ha, tilapia nilótica negra, densidad 7 peces/m², dieta alta en proteína.'
  ),

  -- ── BIOAQUAPRO — Cachama Blanca ──────────────────────────────────────────────

  (
    'Turbidez extrema por arcilla coloidal después de lluvias fuertes, visibilidad < 10 cm',
    'Casanare',
    'cachama-blanca',
    'bioaquapro',
    'Aplicación preventiva al inicio del período lluvioso y dosis de choque post-evento. Distribución uniforme en toda la superficie con bote. Sin recambio durante los primeros 5 días para no introducir más sedimento.',
    450,
    'mL/ha',
    'Turbidez se redujo notablemente en 72h. Visibilidad Secchi alcanzó 35 cm al día 7. Consumo de alimento volvió a la normalidad al día 4.',
    'approved', true, admin_id,
    'Estanque 1.5 ha en zona de sabana con suelo arcilloso y lluvias intensas en temporada.'
  ),

  (
    'Nitritos >0.6 mg/L en fase de engorde con cachama en semana 12, reducción de consumo',
    'Casanare',
    'cachama-blanca',
    'bioaquapro',
    'Dosis única de choque aplicada al atardecer. Aireación máxima por 48h. Reducción de ración al 50% durante 3 días. Segunda dosis a los 5 días si nitritos no bajan de 0.3 mg/L.',
    550,
    'mL/ha',
    'Nitritos bajaron a 0.2 mg/L en 96h con dosis única. No fue necesaria segunda dosis. Consumo recuperado al día 6. Ciclo completado sin recaída.',
    'approved', true, admin_id,
    'Estanque 1.2 ha, densidad 2 peces/m², 4 paletas de aireación. Temperatura 28°C.'
  ),

  -- ── BIOAQUAPRO — Bocachico ───────────────────────────────────────────────────

  (
    'Episodios recurrentes de hipoxia nocturna en época de lluvias con alta nubosidad',
    'Santander',
    'bocachico',
    'bioaquapro',
    'Aplicación preventiva semanal durante todo el período lluvioso. Aireación nocturna preventiva desde las 10pm. Reducción de densidad en próximo ciclo como medida estructural.',
    400,
    'mL/ha',
    'Eventos de OD <3 mg/L se redujeron de 4 por semana a 0 en las siguientes 4 semanas. Sin mortalidad masiva durante el tratamiento.',
    'approved', true, admin_id,
    'Estanque 0.9 ha, densidad alta 5 peces/m², sin aireación mecánica estable.'
  ),

  -- ── BIOAQUAPRO — Bagre ───────────────────────────────────────────────────────

  (
    'Acumulación de amonio y nitritos simultánea en sistema intensivo de bagre, peces en superficie',
    'Valle del Cauca',
    'bagres',
    'bioaquapro',
    'Aplicación de emergencia con parada inmediata de alimentación. Aireación al máximo. Recambio urgente del 30% en las primeras 4h. Segunda dosis a las 48h. Retoma de alimentación gradual al día 4.',
    700,
    'mL/ha',
    'Amonio bajó de 2.1 a 0.5 mg/L en 72h. Nitritos de 0.9 a 0.2 mg/L al día 5. Sin mortalidad masiva. Pérdida estimada < 2%.',
    'approved', true, admin_id,
    'Estanque 0.5 ha, sistema intensivo, alta carga proteica en dieta, temperatura 26°C. Sobrecarga por falla eléctrica 6h.'
  ),

  -- ── BIOAQUAPRO — Trucha ──────────────────────────────────────────────────────

  (
    'Branquias con mucus excesivo y lesiones en trucha arcoíris por mala calidad del agua de entrada',
    'Nariño',
    'trucha',
    'bioaquapro',
    'Aplicación en el canal de entrada para distribución continua con el flujo. Tres dosis fraccionadas en días alternos. Reducción de densidad al 80% como medida de soporte. Revisión de branquias al día 10.',
    350,
    'mL/ha',
    'Lesiones branquiales se redujeron significativamente al día 10. Producción de mucus normalizada. Mortalidad cesó al día 4. FCR mejoró de 1.5 a 1.3 en las semanas siguientes.',
    'approved', true, admin_id,
    'Canal 0.3 ha, agua de río con carga orgánica alta por escorrentía agrícola. Trucha 180g promedio.'
  ),

  -- ── Caso draft — NO debe aparecer en el chat ────────────────────────────────

  (
    'Protocolo en evaluación para tilapia con nueva cepa bacteriana',
    'Tolima',
    'tilapia-roja',
    'bioterrapro',
    'En revisión. No usar como referencia.',
    250,
    'g/ha',
    'Sin datos confirmados.',
    'draft', false, admin_id,
    'NO debe aparecer en el chat — status draft'
  );

  RAISE NOTICE 'Seed completado: 20 casos approved (12 bioterrapro + 8 bioaquapro) + 1 draft insertados con author_id = %', admin_id;
END;
$$;
