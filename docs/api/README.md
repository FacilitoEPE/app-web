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

## Documento del chofer

`POST /api/transportistas/{id}/choferes` y su `PATCH` aceptan `tipoDocumento` y `numeroDocumento` como texto opcional. La API devuelve ambos campos y `numeroLicencia` al consultar el chofer. Los registros anteriores recuperan el documento de su persona vinculada si existe. [Migración](../../../epe-backend/docs/database.md#documento-del-chofer).

## Vínculo entre cliente y campaña

`POST /api/campanas/{id}/requerimientos` devuelve `409 CAMPAIGN_CLIENT_ALREADY_LINKED` si el cliente ya está vinculado. La misma regla se aplica al cambiar el cliente mediante `PATCH`. Cada vínculo admite varios contratos. Los vínculos históricos siguen disponibles para consulta y edición.

## Responsable libre de campaña

`POST /api/campanas` acepta `responsableNombre` como texto opcional. La API recorta los espacios de los extremos, admite hasta 150 caracteres después del recorte y devuelve `422 VALIDATION_FAILED` si excede el límite. Un texto vacío o `null` se guarda como `null`. El nombre se guarda aunque la persona no tenga cuenta y es independiente de `responsableUsuarioId`.

`GET /api/campanas/{id}` devuelve el valor persistido, incluido `null` para campañas anteriores. En `PATCH /api/campanas/{id}`, omitir el campo conserva el valor guardado y enviar `null` lo borra.

Ejemplo de solicitud a `POST /api/campanas`

```json
{
  "nombre": "Campaña Mango 2027",
  "frutaId": 3,
  "fechaInicio": "2027-01-01",
  "fechaFin": "2027-06-30",
  "requerimientoComercial": 500,
  "responsableNombre": "  Lucía Torres  "
}
```

La respuesta `201 Created` y la lectura posterior del detalle incluyen estos campos, entre otros

```json
{
  "campaniaId": 42,
  "nombre": "Campaña Mango 2027",
  "responsableNombre": "Lucía Torres",
  "responsableUsuarioId": null
}
```

El formulario envía el nombre en el alta. Al consultar la campaña, el frontend muestra `responsableNombre` y usa el nombre del usuario asociado si el campo está vacío.

## Desglose de contratos y entregas

Se conservan las rutas `POST/PATCH /api/requerimientos/{parentId}/contratos[/{id}]` y `POST/PATCH /api/contratos/{parentId}/entregas[/{id}]`. Reciben `variedades: [{ frutaDerivadaId, kilos }]`: obligatorio al crear, al menos una fila, IDs únicos y kilos positivos con hasta tres decimales. En PATCH, enviar `variedades` sustituye todas las líneas; omitirlo conserva el desglose confirmado y permite editar otros campos. Los históricos pendientes requieren completar primero sus líneas. Se conservan los demás campos editables. `kilosAcordados` y `kilosProgramados` son ahora solo lectura: los calcula el backend; enviarlos en una escritura se rechaza.

Las respuestas de creación, edición, detalle y colección incluyen `variedades`, `desgloseConfirmado` y `desglosePendiente`. Los contratos añaden `saldosVariedades: [{ frutaDerivadaId, kilosAcordados, kilosProgramados, kilosDisponibles }]`. Para editar una entrega, `GET /api/requerimientos/{parentId}/contratos/{id}?excluirEntregaId=123` excluye todas sus filas del consumo; rechaza IDs que no pertenezcan al contrato. El filtro no modifica el desglose contractual. Los saldos son informativos; cada escritura vuelve a validarlos bajo bloqueo.

`GET /api/entregas/{parentId}/variedades[/{id}]` sigue disponible. Sus escrituras individuales pasan a solo lectura (405): modificar una entrega exige el PATCH de cabecera con el desglose completo para asegurar atomicidad. Clientes externos que antes enviaban totales o escribían líneas por separado deben adaptarse junto con este despliegue.

Ejemplo de escritura: `{"fecha":"2026-11-05","destino":"Paita","variedades":[{"frutaDerivadaId":1,"kilos":1000},{"frutaDerivadaId":2,"kilos":200}]}`. El total confirmado es 1,200 kg.
