# API V1

Esta carpeta reúne el contrato que consume el frontend. Para cambios de rutas, payloads o reglas, consulta primero este índice y las fuentes indicadas; no es necesario leerlo para tareas que no afectan la API.

## Fuentes y salidas

- [`contract-schema.sql`](contract-schema.sql) es la única entrada SQL de `pnpm contract:generate`. Describe el esquema usado para generar el contrato; no es una migración ni reemplaza entidades y migraciones backend.
- [`openapi.json`](openapi.json) es la salida generada y la especificación consumida por los DTOs frontend. El backend conserva una copia runtime en `epe-backend/src/common/v1/contract/`; ambas deben coincidir.
- [`business-rules.md`](business-rules.md) documenta reglas de uso, decisiones y límites que OpenAPI no representa.
- Para modificar una regla junto con sus vistas y datos simulados, sigue el [flujo de cambios](../development.md#cambios-de-vistas-reglas-de-negocio-y-mock). En `business-rules.md`, identifica cualquier regla nueva disponible solo en mock y su adaptación backend pendiente; no la presentes como parte de la API implementada.
- El [generador](../../dev/generate-v1-contract.mjs) complementa el SQL con las rutas auxiliares sin tabla propia, incluyendo `GET /api/documentos/{id}/estado` y su alias `archivos-locales`: verifican metadatos y objeto real en S3. Consulta los estados y permisos en [business-rules.md](business-rules.md#disponibilidad-de-adjuntos).

Genera y verifica desde `epe-web/` con `pnpm contract:generate` y `pnpm contract:check`. No edites OpenAPI a mano. La implementación del comportamiento vive en controladores, servicios, entidades y migraciones de `epe-backend`; consulta sus fuentes al evaluar diferencias con el contrato.

El SQL de esta carpeta es distinto del [modelo objetivo compartido](../../../docs/target-model/README.md). No los copies ni sincronices automáticamente: el primero alimenta el generador V1 y el segundo documenta una propuesta de modelo.

## Desglose de contratos y entregas

Se conservan las rutas `POST/PATCH /api/requerimientos/{parentId}/contratos[/{id}]` y `POST/PATCH /api/contratos/{parentId}/entregas[/{id}]`. Reciben `variedades: [{ frutaDerivadaId, kilos }]`: obligatorio al crear, al menos una fila, IDs únicos y kilos positivos con hasta tres decimales. En PATCH, enviar `variedades` sustituye todas las líneas; omitirlo conserva el desglose confirmado y permite editar otros campos. Los históricos pendientes requieren completar primero sus líneas. Se conservan los demás campos editables. `kilosAcordados` y `kilosProgramados` son ahora solo lectura: los calcula el backend; enviarlos en una escritura se rechaza.

Las respuestas de creación, edición, detalle y colección incluyen `variedades`, `desgloseConfirmado` y `desglosePendiente`. Los contratos añaden `saldosVariedades: [{ frutaDerivadaId, kilosAcordados, kilosProgramados, kilosDisponibles }]`. Para editar una entrega, `GET /api/requerimientos/{parentId}/contratos/{id}?excluirEntregaId=123` excluye todas sus filas del consumo; rechaza IDs que no pertenezcan al contrato. El filtro no modifica el desglose contractual. Los saldos son informativos; cada escritura vuelve a validarlos bajo bloqueo.

`GET /api/entregas/{parentId}/variedades[/{id}]` sigue disponible. Sus escrituras individuales pasan a solo lectura (405): modificar una entrega exige el PATCH de cabecera con el desglose completo para asegurar atomicidad. Clientes externos que antes enviaban totales o escribían líneas por separado deben adaptarse junto con este despliegue.

Ejemplo de escritura: `{"fecha":"2026-11-05","destino":"Paita","variedades":[{"frutaDerivadaId":1,"kilos":1000},{"frutaDerivadaId":2,"kilos":200}]}`. El total confirmado es 1,200 kg.
