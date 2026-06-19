# Descarga Excel de registros productivos

## Objetivo

Agregar descarga en Excel para los datos de `Reportes de Produccion` y `Oxigeno y temperatura` desde la pagina `/dashboard/records`.

## Alcance

- La descarga debe respetar los filtros activos de la pagina:
  - estanque,
  - fecha desde,
  - fecha hasta,
  - tipo de reporte para reportes productivos.
- Si no hay filtros, debe descargar todos los registros disponibles para la organizacion del usuario.
- La descarga no debe limitarse a la pagina actual de 20 filas.
- El formato requerido es Excel (`.xlsx`).

## Enfoque

La pagina seguira mostrando datos paginados para mantener la interfaz ligera. Para exportar, se cargara una coleccion separada con todos los registros que coincidan con los filtros activos y se enviara al componente cliente de exportacion.

El componente `components/records-export.tsx` se ampliara con un exportador para lecturas de oxigeno y temperatura. El exportador existente de reportes productivos se conservara, pero recibira la lista completa filtrada en vez de solo las filas visibles.

## Columnas

### Reportes de Produccion

Se mantienen las columnas actuales del Excel de registros productivos: fecha, estanque, numero de peces, alimento, peso promedio, mortalidad, parametros de calidad de agua, ganancia diaria, FCA, biomasa y peso de muestreo.

### Oxigeno y temperatura

El Excel incluira:

- Fecha
- Hora
- Estanque
- Temperatura (C)
- Oxigeno (mg/L)
- Notas

## Permisos y seguridad

Las consultas deben limitarse a los estanques de la organizacion del usuario autenticado, usando el mismo contexto que ya usa la pagina. No se exponen datos de otras organizaciones.

## Estados de UI

- Mostrar boton `Excel` en la cabecera de la pestaña activa cuando existan registros exportables.
- Deshabilitar el boton mientras se genera el archivo.
- No mostrar boton cuando no haya datos para exportar.

## Validacion

- Ejecutar `pnpm lint`.
- Ejecutar `pnpm build`.
- Verificar manualmente `/dashboard/records`:
  - descarga sin filtros,
  - descarga con filtro de estanque,
  - descarga con rango de fechas,
  - descarga en la pestaña `Oxigeno y temperatura`.
