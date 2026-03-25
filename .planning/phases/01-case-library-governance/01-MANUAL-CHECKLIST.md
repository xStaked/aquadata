# Phase 1 Manual Checklist

Ejecuta `pnpm dev` desde la raiz del proyecto y valida estos pasos en orden:

1. Abre `/admin/bioremediation` con una cuenta `admin`. Verifica que existe una entrada clara hacia `/admin/bioremediation/cases` con copy sobre biblioteca de casos gobernada.
2. Entra a `/admin/bioremediation/cases`. Confirma que la pagina carga tarjetas KPI, filtros por `status`, `species` y `product`, y un boton visible para crear casos.
3. Haz clic en el control de crear caso. Completa `issue`, `zone`, `species`, `product_name`, `treatment_approach`, `dose`, `dose_unit`, `outcome` y `status`, luego guarda. Espera volver a la lista y confirma que el nuevo caso aparece sin recargar manualmente.
4. Recarga `/admin/bioremediation/cases`. Verifica que el caso creado persiste y mantiene los valores guardados en la tabla.
5. Usa el control de editar fila sobre el caso creado. Cambia al menos `issue`, `product_name` y `outcome`, guarda y confirma que la fila refleja los cambios despues del cierre del dialogo.
6. Cambia el estado del caso desde `draft` a `approved` usando los botones de estado de la fila. Verifica que el badge muestre `Aprobado`, que `last_reviewed_at` quede visible, y que la columna de grounding indique que es usable para assistant grounding o elegible.
7. Cambia el mismo caso de `approved` a `retired`. Verifica que el badge muestre `Retirado` y que la columna de grounding vuelva a indicar que ya no es elegible.
8. Devuelve el caso a `draft`. Confirma que el badge muestre `Borrador`, que la fila siga visible en la tabla, y que el estado usable for assistant grounding o elegible quede desactivado.
9. Revisa en la tabla que cada fila relevante muestre `author`, `last_reviewed_at` y el estado actual con el badge correspondiente (`draft`, `approved`, `retired`).
10. Prueba los filtros: selecciona un `status`, luego una `species`, luego un `product`. Confirma que la lista cambia y que al volver a `all` reaparecen todos los casos.
11. Desde una sesion sin rol `admin`, intenta abrir `/admin/bioremediation/cases`. Verifica que el flujo haga redirect a `/dashboard` o `/auth/login`, y que no se muestre la tabla de gestion.
