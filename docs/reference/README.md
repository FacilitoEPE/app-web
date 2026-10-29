# Fuentes del contrato V1

Instantánea del 2026-10-29 de `app/docs/README.md` (en `agreements.md`) y los cuatro documentos normativos de `app/docs/agro-schema/`.

Se incluyen en este repositorio para que el agente backend pueda consultar las reglas y regenerar el contrato sin depender de una carpeta hermana. No ejecutar el SQL sobre una base existente sin revisar su migración. Los enlaces históricos al prototipo o a auditorías externas conservan su procedencia; el contrato entregable está en `../future-api-contract.md` y `../future-api.openapi.json`.

Al cambiar la fuente acordada, actualizar esta instantánea, revisar las diferencias y ejecutar `pnpm contract:generate`, `pnpm contract:check` y `pnpm test`. El generador solo lee `agro-schema/03_schema_total.sql`; nunca lo ejecuta.
