# API V1

NestJS registra las rutas de negocio bajo `/v1`. En el despliegue de mismo origen, el navegador llama a `/api/v1` y Nginx quita el prefijo público `/api` antes de reenviar la solicitud. Para ese despliegue, compila el frontend con `VITE_API_BASE_URL=/api` o deja el valor vacío. En desarrollo directo, usa el origen de NestJS, por ejemplo `http://localhost:3000`. Los adjuntos guardados se resuelven con la base configurada.

Cuando dos controladores declaraban el mismo método y ruta, se conserva el contrato V1 actual. Swagger en NestJS incluye las operaciones adicionales. La gestión de certificados con un archivo S3 registrado usa `/v1/proveedores/:proveedorId/certificados/documentos/registro` para la colección y `/v1/proveedores/:proveedorId/certificados/:id/documentos/registro` para el detalle.

Esta carpeta reúne el contrato que consume el frontend. Para cambios de rutas, payloads o reglas, consulta primero este índice y las fuentes indicadas; no es necesario leerlo para tareas que no afectan la API.

## Fuentes y salidas

- [`contract-schema.sql`](contract-schema.sql) es la única entrada SQL de `pnpm contract:generate`. Describe el esquema usado para generar el contrato; no es una migración ni reemplaza entidades y migraciones backend.
- [`openapi.json`](openapi.json) es la salida generada y la especificación consumida por los DTOs frontend. El backend conserva una copia runtime en `epe-backend/src/common/v1/contract/`; ambas deben coincidir.
- [`business-rules.md`](business-rules.md) documenta reglas de uso, decisiones y límites que OpenAPI no representa.
- Para modificar una regla junto con sus vistas y datos simulados, sigue el [flujo de cambios](../development.md#cambios-de-vistas-reglas-de-negocio-y-mock). En `business-rules.md`, identifica cualquier regla nueva disponible solo en mock y su adaptación backend pendiente; no la presentes como parte de la API implementada.
- El [generador](../../dev/generate-v1-contract.mjs) complementa el SQL con las rutas auxiliares sin tabla propia, incluyendo `GET /v1/documentos/{id}/estado` y su alias `archivos-locales`: verifican metadatos y objeto real en S3. Consulta los estados y permisos en [business-rules.md](business-rules.md#disponibilidad-de-adjuntos).

Genera y verifica desde `epe-web/` con `pnpm contract:generate` y `pnpm contract:check`. No edites OpenAPI a mano. La implementación del comportamiento vive en controladores, servicios, entidades y migraciones de `epe-backend`; consulta sus fuentes al evaluar diferencias con el contrato.

El SQL de esta carpeta es distinto del [modelo objetivo compartido](../../../docs/target-model/README.md). No los copies ni sincronices automáticamente: el primero alimenta el generador V1 y el segundo documenta una propuesta de modelo.

Las escrituras V1 con moneda usan `PEN` o `USD`. El servicio valida el código de moneda, así como la consistencia de los conteos MTD. Las columnas de lectura conservan el tipo del [esquema PostgreSQL](../../../epe-backend/docs/database.md).

## Recuperación de contraseña

`POST /v1/auth/recuperar-password` recibe `correo` y devuelve un mensaje uniforme. El enlace abre `/restablecer-password`. El formulario envía `token` y `password` a `POST /v1/auth/restablecer-password`. La contraseña vigente se conserva hasta la confirmación, el enlace vence en 30 minutos y solo se puede usar una vez. [Configuración y persistencia](../../../epe-backend/docs/backend-flow.md#recuperación-de-contraseña).

## Documento del chofer

`POST /v1/transportistas/{id}/choferes` y su `PATCH` aceptan `tipoDocumento` y `numeroDocumento` como texto opcional. La API devuelve ambos campos y `numeroLicencia` al consultar el chofer. Los registros anteriores recuperan el documento de su persona vinculada si existe. [Migración](../../../epe-backend/docs/database.md#documento-del-chofer).

## Vínculo entre cliente y campaña

`POST /v1/campanas/{id}/requerimientos` devuelve `409 CAMPAIGN_CLIENT_ALREADY_LINKED` si el cliente ya está vinculado. La misma regla se aplica al cambiar el cliente mediante `PATCH`. Cada vínculo admite varios contratos. Los vínculos históricos siguen disponibles para consulta y edición.

## Responsable libre de campaña

`POST /v1/campanas` acepta `responsableNombre` como texto opcional. La API recorta los espacios de los extremos, admite hasta 150 caracteres después del recorte y devuelve `422 VALIDATION_FAILED` si excede el límite. Un texto vacío o `null` se guarda como `null`. El nombre se guarda aunque la persona no tenga cuenta y es independiente de `responsableUsuarioId`.

`GET /v1/campanas/{id}` devuelve el valor persistido, incluido `null` para campañas anteriores. En `PATCH /v1/campanas/{id}`, omitir el campo conserva el valor guardado y enviar `null` lo borra.

Ejemplo de solicitud a `POST /v1/campanas`

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

Se conservan las rutas `POST/PATCH /v1/requerimientos/{parentId}/contratos[/{id}]` y `POST/PATCH /v1/contratos/{parentId}/entregas[/{id}]`. Reciben `variedades: [{ frutaDerivadaId, kilos }]`: obligatorio al crear, al menos una fila, IDs únicos y kilos positivos con hasta tres decimales. En PATCH, enviar `variedades` sustituye todas las líneas; omitirlo conserva el desglose confirmado y permite editar otros campos. Los históricos pendientes requieren completar primero sus líneas. Se conservan los demás campos editables. `kilosAcordados` y `kilosProgramados` son ahora solo lectura: los calcula el backend; enviarlos en una escritura se rechaza.

Las respuestas de creación, edición, detalle y colección incluyen `variedades`, `desgloseConfirmado` y `desglosePendiente`. Los contratos añaden `saldosVariedades: [{ frutaDerivadaId, kilosAcordados, kilosProgramados, kilosDisponibles }]`. Para editar una entrega, `GET /v1/requerimientos/{parentId}/contratos/{id}?excluirEntregaId=123` excluye todas sus filas del consumo; rechaza IDs que no pertenezcan al contrato. El filtro no modifica el desglose contractual. Los saldos son informativos; cada escritura vuelve a validarlos bajo bloqueo.

`GET /v1/entregas/{parentId}/variedades[/{id}]` sigue disponible. Sus escrituras individuales pasan a solo lectura (405): modificar una entrega exige el PATCH de cabecera con el desglose completo para asegurar atomicidad. Clientes externos que antes enviaban totales o escribían líneas por separado deben adaptarse junto con este despliegue.

Ejemplo de escritura: `{"fecha":"2026-11-05","destino":"Paita","variedades":[{"frutaDerivadaId":1,"kilos":1000},{"frutaDerivadaId":2,"kilos":200}]}`. El total confirmado es 1,200 kg.

## Portal compartido del chofer

La sesión con rol Chofer obtiene las entregas coordinadas en `GET /v1/chofer/contexto`. `POST /v1/chofer/coordinaciones/{id}/carga` registra la carga inicial en una transacción y `PATCH /v1/chofer/cargas/{id}/datos` actualiza los datos operativos de una carga existente. En Industria, el registro del rechazo deja la entrega visible y bloquea el despacho. Consulte la [regla del portal](business-rules.md).
