# API V1

Esta carpeta reúne el contrato que consume el frontend. Para cambios de rutas, payloads o reglas, consulta primero este índice y las fuentes indicadas; no es necesario leerlo para tareas que no afectan la API.

## Fuentes y salidas

- [`contract-schema.sql`](contract-schema.sql) es la única entrada SQL de `pnpm contract:generate`. Describe el esquema usado para generar el contrato; no es una migración ni reemplaza entidades y migraciones backend.
- [`openapi.json`](openapi.json) es la salida generada y la especificación consumida por los DTOs frontend. El backend conserva una copia runtime en `epe-backend/src/common/v1/contract/`; ambas deben coincidir.
- [`business-rules.md`](business-rules.md) documenta reglas de uso, decisiones y límites que OpenAPI no representa.
- El [generador](../../dev/generate-v1-contract.mjs) complementa el SQL con las rutas auxiliares sin tabla propia, incluyendo `GET /api/documentos/{id}/estado` y su alias `archivos-locales`: verifican metadatos y objeto real en S3. Consulta los estados y permisos en [business-rules.md](business-rules.md#disponibilidad-de-adjuntos).

Genera y verifica desde `epe-web/` con `pnpm contract:generate` y `pnpm contract:check`. No edites OpenAPI a mano. La implementación del comportamiento vive en controladores, servicios, entidades y migraciones de `epe-backend`; consulta sus fuentes al evaluar diferencias con el contrato.

El SQL de esta carpeta es distinto del [modelo objetivo compartido](../../../docs/target-model/README.md). No los copies ni sincronices automáticamente: el primero alimenta el generador V1 y el segundo documenta una propuesta de modelo.
