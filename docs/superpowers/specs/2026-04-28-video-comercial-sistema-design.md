# Video comercial del sistema · Diseño

## Objetivo

Crear un video corto de 35 a 45 segundos para mostrar a clientes potenciales lo que el sistema puede hacer y, al mismo tiempo, posicionar la capacidad del equipo para vender y construir otro tipo de software vertical.

La pieza debe vender claridad operativa, control y capacidad de ejecución de producto. No debe sentirse como un tutorial ni como una grabación literal de pantalla.

## Contexto del producto

El sistema actual es una plataforma acuícola construida en Next.js con módulos visibles para:

- dashboard operativo
- analítica de producción
- captura manual y OCR de reportes
- alertas operativas
- bioremediación
- costos, ventas y utilidades

El lenguaje visual actual del producto ya da una base útil:

- azul principal `#234085`
- azul acento `#2AA6D1`
- fondos claros con sensación SaaS ejecutiva
- tarjetas, métricas y bloques de información limpios

## Dirección creativa aprobada

### Concepto

`Control Room`

La narrativa presenta el sistema como un centro de control acuícola: una interfaz que transforma operación compleja en decisiones claras y accionables.

### Mood

- comercial
- premium
- ejecutivo
- claro

### Canvas

- fondo claro
- sin estética oscura genérica

### Fuente visual

Se toma como base el branding y patrones actuales del producto. No se introduce una identidad paralela.

## Audiencia

- clientes potenciales B2B
- productores o empresas que buscan digitalizar operación
- prospectos que también podrían comprar otros sistemas hechos por el equipo

## Mensaje principal

“Convertimos operación compleja en software claro, accionable y vendible.”

## Mensajes secundarios

- toda la operación en una sola vista
- los datos no solo se registran; se convierten en decisiones
- la captura de información puede ser simple y asistida por IA
- el sistema detecta problemas y orienta acciones
- el equipo puede construir software vertical serio para industrias operativas

## Estructura narrativa

El video se organiza en 5 escenas dentro de una sola composición principal de HyperFrames con transiciones consistentes y ritmo comercial.

### Escena 1 · Centro de control · 0s-7s

Objetivo:
presentar el producto con impacto ejecutivo.

Contenido:

- dashboard principal
- KPIs
- alertas
- accesos rápidos

Mensaje en pantalla:
`Toda la operación acuícola en una sola vista`

### Escena 2 · Datos que se vuelven decisiones · 7s-14s

Objetivo:
mostrar analítica como herramienta de control, no solo visualización.

Contenido:

- tendencias de peso
- FCA
- calidad de agua
- gráficos operativos

Mensaje en pantalla:
`Analítica para anticipar y decidir`

### Escena 3 · Captura inteligente · 14s-22s

Objetivo:
mostrar que el software reduce fricción en la entrada de datos.

Contenido:

- carga manual
- lectura rápida de oxígeno/temperatura
- OCR por foto

Mensaje en pantalla:
`Del campo al sistema en minutos`

### Escena 4 · Alerta a acción · 22s-31s

Objetivo:
demostrar que el sistema activa respuestas, no solo reportes.

Contenido:

- panel de alertas
- severidades
- salto a calculadora de bioremediación

Mensaje en pantalla:
`Detecta, prioriza y actúa`

### Escena 5 · Cierre comercial · 31s-40s

Objetivo:
cerrar con posicionamiento de producto y capacidad del equipo.

Contenido:

- resumen visual de módulos
- statement final de valor

Mensaje en pantalla:
`Software que convierte complejidad en claridad, control y crecimiento`

## Enfoque visual

### Estilo

- interfaz limpia
- tarjetas amplias
- alto contraste entre titulares y datos
- sensación de software premium y confiable
- movimiento fluido, sin exageración

### Paleta base

- `#234085` como color estructural principal
- `#2AA6D1` como acento
- blancos y azules muy claros para profundidad
- neutros oscuros para texto principal

### Tipografía

La composición debe evitar las fuentes genéricas prohibidas por la skill. La selección final debe sentirse editorial/ejecutiva para titulares y precisa/funcional para datos, manteniendo legibilidad de video.

## Motion design

### Principios

- cada escena entra con animaciones `gsap.from()`
- no habrá animaciones de salida intermedias; las transiciones harán el handoff
- solo la escena final podrá resolver con fade out
- el primer movimiento nunca arranca en `t=0`
- se variarán easing, dirección y velocidad entre elementos

### Transiciones

Como la energía aprobada es comercial y clara, se usará una familia consistente de transiciones tipo SaaS/editorial:

- primaria: `push slide` o `blur crossfade`
- acento: una transición más enfática para el cambio hacia OCR o cierre comercial

No se mezclarán demasiados estilos de transición dentro de una pieza tan corta.

## Arquitectura de la pieza

### Entregables de diseño/implementación

- `DESIGN.md` mínimo para HyperFrames, basado en el branding existente
- composición principal `index.html`
- si conviene, subcomposiciones para escenas modulares

### Duración

- objetivo: 40s aprox.
- rango aceptable: 35s-45s

### Formato

- horizontal `1920x1080`

## Copy strategy

El copy en pantalla debe ser corto y legible en lectura rápida. Regla: una idea fuerte por escena.

Se priorizan frases de venta de alto nivel sobre detalles de uso.

## Manejo de errores y riesgos

- riesgo: convertir la pieza en demo literal de UI
  respuesta: abstraer pantallas en layouts hero y recortes, no hacer screencast plano

- riesgo: saturar con demasiados módulos
  respuesta: limitar el relato a 5 escenas con una promesa clara por escena

- riesgo: verse genérico
  respuesta: apoyar la pieza en la identidad real del producto y una dirección visual consistente

## Verificación

Antes de dar la pieza por terminada se debe validar:

- storyboard respetado
- identidad visual alineada al branding actual
- duración dentro del rango
- HyperFrames `lint` y `validate` en verde
- revisión visual de layout, contraste y ritmo

## Fuera de alcance

- voiceover
- subtítulos sincronizados
- versión vertical
- exportes múltiples para campañas

Esos elementos pueden añadirse después, pero no forman parte de esta primera pieza.
