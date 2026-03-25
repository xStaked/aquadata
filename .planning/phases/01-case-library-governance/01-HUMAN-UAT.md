---
status: partial
phase: 01-case-library-governance
source:
  - 01-VERIFICATION.md
started: 2026-03-25T02:28:26Z
updated: 2026-03-25T02:28:26Z
---

## Current Test

Awaiting human smoke validation for the admin case-library workflow in `pnpm dev`.

## Tests

### 1. Crear un caso gobernado
expected: Desde `/admin/bioremediation/cases`, un admin puede crear un caso con issue, zone, species, product_name, treatment_approach, dose, outcome y status, y el registro persiste tras recargar.
result: pending

### 2. Editar un caso existente
expected: El dialogo de edicion actualiza al menos dos campos y la tabla muestra los valores mas recientes despues de guardar y recargar.
result: pending

### 3. Validar estados `draft`, `approved`, `retired`
expected: La fila puede pasar por los tres estados y solo `approved` queda marcada como usable para assistant grounding.
result: pending

### 4. Revisar metadatos de gobernanza
expected: La tabla muestra author, last_reviewed_at y el estado actual despues de crear y aprobar o retirar un caso.
result: pending

### 5. Verificar integracion y acceso admin
expected: La biblioteca se abre desde `/admin/bioremediation` y un usuario no admin recibe redirect a `/dashboard` o `/auth/login`.
result: pending

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps

None yet.
