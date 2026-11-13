# 4. Estado de Integración Frontend ↔ Backend (`epe-web`)

**Prefijo de la API actual.** NestJS y el mock usan `/v1`. En el despliegue de mismo origen, el frontend solicita `/api/v1` y Nginx quita `/api` antes de reenviar. La vista previa y la verificación de adjuntos usan la misma base pública.

> **Fuente vigente del estado por vista.** Actualiza las entradas superiores al cambiar el estado y sincroniza los documentos afectados según las [reglas de epe-web](../AGENTS.md). Las entradas inferiores son evidencia histórica, no estado vigente; vencen 90 días después de su fecha salvo excepción documentada. Elimina las entradas vencidas al revisar el registro.

## Correcciones prioritarias de la auditoría · 12/11/2026

- La web cancela la carga principal al salir de una pantalla, ir al selector o cerrar sesión. Las lecturas del plan tienen un tiempo máximo de 15 segundos por petición.
- El backend condiciona cada actualización del índice de adjuntos a la versión leída en S3 y consulta en PostgreSQL los solapes y el flete acumulado del acuerdo.
- La recuperación usa un enlace de un solo uso. El mock simula la solicitud y el consumo con el token de prueba formado por 64 letras `a`. El envío real requiere configurar Resend y el origen público de la web en el backend. [Contrato y configuración](api/README.md#recuperación-de-contraseña).

## QA local con backend y S3 — 2026-11-10

En la carga `CAR-8-7`, la interfaz confirmó los adjuntos de recepción y facturación, el cierre físico, el registro de factura de prueba y un cobro con saldo cero. El cierre administrativo quedó pendiente del evento final del chofer. Consulte el [recorrido y los hallazgos](evidence/qa-2026-11-10.md).

## Vínculo único por cliente y campaña — 2026-11-08

Los selectores de Campañas y Planificación Comercial muestran solo vínculos disponibles. La API V1 serializa las altas y cambios por campaña y devuelve `409 CAMPAIGN_CLIENT_ALREADY_LINKED` ante un duplicado. El mock aplica la misma regla y conserva sus ejemplos históricos para verificar que siguen disponibles. El cambio conserva los contratos y entregas de los vínculos anteriores y no requiere una migración.

## Registro de choferes, entregas y adjuntos — 2026-11-08 · Completo en desarrollo

- El documento y la licencia del chofer se recuperan al volver a abrir su ficha. La API y el mock conservan el número como texto. La [migración](../../epe-backend/docs/database.md#documento-del-chofer) incorpora los campos y copia el documento de la persona vinculada cuando existe.
- Las fotos de identidad y las fichas técnicas pueden subirse con una URL base relativa. El detalle de certificación abre la evidencia por pago. El detalle del transportista permite consultar la cotización vinculada incluso si el acuerdo está en borrador.
- El programa semanal agrupa entregas programadas por cliente y día, con filtros de fecha, variedad y placa. Esta vista usa kilos programados, por lo que sustituye el comportamiento histórico que mostraba cargas realizadas.
- El registro de transportista selecciona ciudad con el catálogo de ubigeo y el de finca permite ver un marcador con sus coordenadas. En el portal del chofer se puede usar la ubicación actual en un contexto seguro con permiso del navegador o marcar una salida. El mapa dibuja la ruta por carretera y estima kilómetros y minutos con `VITE_PICKUP_ROUTE_URL`, que apunta a un endpoint OSRM. Sin servicio operativo, muestra una línea recta de referencia y ofrece el trayecto por carretera en Google Maps.
- La migración y los flujos con almacenamiento real quedan por verificar en el entorno de destino.

## Vinculación de proveedores en ejecución — 2026-11-08

El formulario de alta fija el rol de acopiador en campañas en ejecución. La API V1 y el mock rechazan nuevas participaciones como productor y conservan las participaciones de productores ya vinculados.

## Optimización de peticiones por vista — 2026-11-05 · Implementada en desarrollo y revisada

Se corrigió el origen de las recargas globales sin cambiar estilos, distribución de pantallas, endpoints, esquema de datos ni librerías. La implementación ajusta el diseño del reporte a los proyectores y las reglas que ya existen: usa un contexto explícito de la ruta activa y los DTOs confirmados por el backend para actualizarlo. La matriz de diseño inferior sigue describiendo dependencias y oportunidades de optimización; este apartado describe lo que efectivamente se implementó.

### Cambios aplicados

- [`operations-resources.ts`](../src/modules/operations/api/operations-resources.ts) declara recursos, PK, padres y grupos por ruta. El lector verifica IDs, carga únicamente esos grupos y sus ancestros, mantiene todas las páginas necesarias y limita a seis las lecturas en vuelo. Campañas/proveedores/clientes/transportistas se acotan por identidad y las ramas operativas por campaña. Una ruta sin plan falla explícitamente en lugar de activar una descarga global silenciosa.
- [`FrontendDataBoundary`](../src/FrontendDataBoundary.tsx) cambia de ámbito al navegar y no presenta datos de la ruta anterior mientras carga. El selector `/modules` cancela el contexto anterior y no inicia lecturas de negocio. Las respuestas de rutas/sesiones abandonadas no pueden sustituir el contexto vigente. Las llamadas simultáneas para el mismo ámbito comparten la carga; solo una escritura confirmada durante esa lectura obliga a reconciliarla.
- [`v1-client`](../src/shared/api/v1-client.ts) comunica resultados de escrituras mediante una interfaz de `shared` sin importar módulos. [`operations-context.api.ts`](../src/modules/operations/api/operations-context.api.ts) integra esos DTOs por PK y padre en el estado de la vista; los lectores del listado/detalle reutilizan ese mismo resultado confirmado. No es caché HTTP: no se persistieron respuestas, no se añadió TTL y cada entrada a una ruta vuelve a leer su ámbito. `Cache-Control: no-store` continúa activo.
- [`commitRemote`](../src/shared/api/data-contract.ts) conserva el éxito si falla la actualización posterior y muestra el aviso correspondiente. No repite escrituras automáticamente. Un rechazo confirmado o una validación local sin pasos guardados no vuelve a descargar datos; una escritura parcial o de resultado incierto reconcilia el ámbito activo y conserva el error original si falla esa lectura.
- Crear/editar campaña ya no recarga otros módulos. Los adjuntos solo se vinculan/desvinculan si hubo un cambio efectivo; no se envía DELETE cuando la campaña ya estaba sin documento. Si falla el vínculo después de guardar la campaña, se informa que la campaña quedó guardada y debe editarse, evitando sugerir otra alta. El índice de documentos se obtiene al necesitarlo; un vínculo recién creado no se confunde con un índice completo.
- Los controladores de creación/edición de transportistas, incluido su detalle, dejaron de ejecutar el segundo PATCH de extras. La pestaña Solicitudes y cotizaciones conserva su contador desde las invitaciones; cotizaciones/documentos se completan al abrir esa gestión.
- El maestro de cliente y los detalles de participación/requerimiento usan las rutas individuales con padre ya disponibles en V1. Contratos comerciales usa `clienteNegocioId` en la consulta de requerimientos; los cambios de contratos/entregas reproyectan las filas sin repetir el efecto HTTP.
- Calidad separa portada, resumen, análisis y guías. Abrir el resumen no consulta análisis/MTD ni documentos; abrir análisis no descarga coordinaciones/cargas. Los catálogos de selección de proveedores/fincas se completan al abrir el vínculo, preservando las previsualizaciones existentes.
- `FileDropzone` identifica la comprobación por URL estable y reintento explícito, no por la referencia de un objeto recreado en cada render. Conserva cancelación, permisos, estados de disponibilidad y comprobación real del documento.
- El generador usa una representación decimal determinista para `multipleOf`: `pnpm contract:check` vuelve a aprobar sin regenerar ni cambiar el OpenAPI publicado. El servidor ficticio de vínculos devuelve ahora el vínculo, como hace el controlador backend real, en lugar de `{ ok: true }`.

### Mediciones y comprobaciones

| Escenario local, con las mismas fixtures V1 | Antes | Después implementado |
|---|---|---|
| Arranque de Campañas | 139 GET del contexto global, más la lectura de la página | 2 GET: campañas y frutas |
| Crear campaña sin adjunto y actualizar listado | 1 POST + 145 GET | 1 POST; listado/estadísticas usan la respuesta confirmada, sin GET adicionales |
| Editar transportista | Dos PATCH, dos contextos completos y recarga del listado | Un PATCH con extras; sin GET posteriores en la prueba de detalle |
| Dos arranques simultáneos de Campañas, sin escrituras | Dos descargas completas programadas | Un único ciclo de 2 GET |
| Rechazo HTTP 400 de PATCH de campaña | PATCH rechazado + descarga completa | Solo el PATCH rechazado |
| Subir/vincular/desvincular documento desde Campañas | Refrescos globales tras cambios de vínculo | Escrituras de documento/vínculo; cero GET del contexto |

Las cifras excluyen restauración de sesión, preflight, imágenes y verificación individual de documentos visibles. No son latencias ni volúmenes medidos en producción. [`scoped-requests.test.ts`](../dev/scoped-requests.test.ts) recorre los 45 patrones administrativos con enlace directo y prueba deduplicación, cancelación, paginación, filtros, documentos, escrituras parciales y equivalencia de saldos de Facturación/Liquidación frente al contexto completo. [`data-contract.test.ts`](../src/shared/api/data-contract.test.ts) cubre el resultado confirmado, los rechazos y la incertidumbre de red.

### Límites conservados deliberadamente

- Liquidación mantiene la rama financiera de todas las campañas dentro de ese módulo: el acumulado UIT por persona, el saldo de acuerdos/adelantos y las sugerencias de numeración actuales requieren histórico. Ya no descarga certificados, análisis ni cobros. No se redujo el histórico a una sola carga ni se añadió un agregado backend inexistente.
- Los listados de proveedores y clientes conservan las relaciones que alimentan hectáreas/certificados/producción y campañas/contratos. Las portadas operativas siguen recorriendo sus ramas cuando presentan totales de todas las campañas. El contrato actual no permite convertir esos recorridos en una sola consulta agregada.
- Algunas ramas se cargan como grupo de campaña para conservar contadores y permitir los formularios actuales; no se reescribieron todos los proyectores ni se implementaron las ampliaciones opcionales de lectura del reporte. El camino global `*` queda explícito para pruebas/comparaciones, no como arranque normal de una vista.
- No se cambió la seguridad, los snapshots históricos, la autoridad de validación del backend ni la semántica de pagos/cobros. Las escrituras de varios recursos siguen sin ser una transacción única; ante resultado incierto se consulta el estado, sin repetir POST financieros automáticamente.

### Revisión final — lectura de transportistas optimizada

La revisión final encontró que `/campaigns/:id/deliveries` ([CampaignDeliveriesPage](../src/modules/campaigns/pages/CampaignDeliveriesPage.tsx)) pedía el directorio completo aunque ya tenía los transportistas de la campaña. Ahora reutiliza esos datos del ámbito activo. `/campaigns/:id/carriers` ([CampaignCarriersPage](../src/modules/campaigns/pages/CampaignCarriersPage.tsx)) muestra los vinculados desde el ámbito y difiere el directorio completo hasta abrir «Vincular transportista». La prueba de regresión comprueba que ambas vistas eviten la colección raíz durante su carga y que la lista global se consulte al pedirla para el selector.

Validación final: `pnpm test`, **67 archivos / 439 pruebas aprobadas**; `pnpm build`, aprobado con comprobación de tipos y aviso de tamaño de chunk principal; `pnpm contract:check`, aprobado; ESLint de archivos modificados/nuevos, aprobado. Copias OpenAPI frontend/backend idénticas; enlaces actuales verificados. Recorrido manual local de solo lectura: frontend V1 temporal en `http://localhost:3001` conectado al backend activo `http://localhost:3000`; autenticación administrativa correcta, vista `/campaigns` mostró datos del backend y la consola no registró errores. Se confirmó `GET /api/auth/me`, `/api/campanas` y `/api/frutas` con HTTP 200. La instancia temporal se cerró. No se creó ni modificó una campaña real, por lo que el POST y su efecto en el backend real siguen cubiertos por la prueba aislada con fixture; no se ha verificado un despliegue productivo.

## Auditoría de peticiones por vista — 2026-11-05 · Diagnóstico previo sustituido

Evidencia conservada como línea de base de la optimización superior; ese apartado es su sucesor vigente. Vence el 2027-02-03 salvo renovación justificada de la evidencia. Los estados «sin cambios» siguientes describen el momento del diagnóstico, no el código actual.

Alcance: lecturas iniciales, recargas después de escrituras y dependencias de efectos en el frontend administrador. Se aplicó Ponytail Audit al flujo de peticiones. Se supone una sesión administrativa por navegador y crecimiento del histórico de campañas, proveedores y cargas. Los conteos siguientes provienen de las funciones reales del frontend contra el servidor HTTP ficticio V1 local, con fixtures aisladas; no son mediciones de producción ni incluyen renderizado React, preflight CORS, imágenes o comprobaciones de documentos montados en pantalla.

### Causa del caso «crear campaña recarga las demás API»

`CampaignFormModal` → `createCampana` → `campaignScreenV1.create` → `commitRemote` → `refreshRemoteData` → `refreshFrontendData` → `loadOperationsContext`. El último paso descarga todos los módulos del administrador. Después, `CampaignsPage.handleCreateSuccess` vuelve a consultar `/api/campanas`.

| Escenario reproducido | GET | Escrituras | Descargas completas del contexto |
|---|---:|---:|---:|
| Carga inicial del contexto con las fixtures originales | 139 | 0 | 1 |
| Crear campaña sin documento y recargar el listado de campañas | 145 | 1 POST | 1 |
| Guardar campaña, vincular documento existente y recargar listado | 289 | 1 PATCH + 1 POST | 2 |
| Guardar campaña, ejecutar la rama sin documento y recargar listado | 289 | 1 PATCH + 1 DELETE | 2 |
| Editar transportista siguiendo el controlador de la página y recargar listado | 289 | 2 PATCH al mismo transportista | 2 |
| Dos solicitudes simultáneas de refresco, sin escrituras | 288 | 0 | 2 |
| PATCH simple de campaña rechazado con HTTP 400 | 144 | 1 PATCH rechazado | 1 |

Los escenarios posteriores al alta conservan esa campaña adicional en la fixture: el contexto pasa de 139 a 144 GET porque se consultan cinco colecciones hijas incluso para una campaña nueva sin relaciones. Vincular documento se midió sin subir su binario; guardar y recargar listado reproduce la composición de llamadas, no la pantalla de detalle, que hace otras lecturas. Los números cambian con los datos y la paginación.

### Hallazgos priorizados

1. **Corregir primero: una lectura ajena convierte un guardado exitoso en error.** `src/shared/api/data-contract.ts:24` espera el refresco global antes de devolver el resultado de la escritura. Se reprodujo un PATCH guardado y un 503 posterior en `/api/parametros-uit`: la operación del frontend rechazó, pero un GET individual confirmó el cambio persistido. Propuesta: distinguir el resultado del guardado del resultado de la actualización de pantalla, y limitar esta última a sus dependencias. Mantenerlo puede inducir reintentos de altas, pagos u otros comandos ya aceptados por el servidor; no se comprobó duplicación efectiva de pagos.

2. **Recarga global después de mutaciones de cualquier dominio.** `src/shared/api/data-contract.ts:11` y `src/frontend-data.ts:103` no reciben recurso, campaña ni entidad afectados. Crear una campaña sin adjunto produjo 146 peticiones totales, incluyendo UIT, normas, liquidaciones, facturas y cobros existentes. Propuesta: refrescar las dependencias reales de cada comando y mantener coherentes las proyecciones que las consumen. Quitar el refresco sin sustituir esa sincronización dejaría almacenes desactualizados.

3. **La primera vista administrativa carga todo el histórico operativo.** `src/FrontendDataBoundary.tsx:14` exige el mismo contexto para cualquier ruta distinta de `/modules`. `src/modules/operations/api/operations-context.api.ts:93` recorre proveedores, campañas, entregas, cargas y sus hijos en etapas, con paralelismo sin límite dentro de cada etapa. `readAllV1` descarga todas las páginas de 100 filas. Cada proveedor agrega seis colecciones; cada campaña, cinco; cada carga, ocho, más descendientes. Propuesta: cargas por vista y entidad, conservando solo sus dependencias necesarias. Hoy incluso una vista sencilla depende de servicios ajenos y el costo crece con el histórico completo.

4. **Campañas puede descargar todo dos veces en un guardado.** `src/modules/campaigns/components/CampaignFormModal.tsx:165` guarda mediante `commitRemote`, que refresca; luego las líneas 166–167 vinculan o desvinculan el documento y refrescan otra vez. En edición, la rama sin lineamientos intenta desvincular aunque la campaña ya estuviera sin documento. Propuesta: tratar el guardado y el cambio efectivo de vínculo como un solo comando con una actualización final acotada; preservar la reconciliación necesaria ante escrituras parciales.

5. **Transporte repite la escritura de los datos adicionales.** `src/modules/carriers/pages/CarriersPage.tsx:111` y `:120` pasan los extras a `createCarrier`/`updateCarrier` y después llaman `setCarrierExtras`. `src/modules/carriers/api/v1-screen.api.ts:16` ya los incluye; `src/modules/carriers/carrierExtras.store.ts:24` vuelve a persistirlos mediante `quotationCommands.extras`. Cada paso refresca todo. Se reprodujeron dos PATCH al mismo transportista y 289 GET con la fixture ampliada. Propuesta: una sola escritura de todos los campos ya soportados y una actualización acotada.

6. **Contratos comerciales consulta todas las campañas para mostrar un cliente.** `src/modules/commercial-planning/components/CommercialContractsSubView.tsx:74` recorre las campañas y espera sus requerimientos uno por uno; recién entonces filtra `clientId`. Por montaje son las páginas de campañas más al menos una petición por campaña, aunque el cliente solo participe en una. Además, el efecto depende de `contractRecords` y `deliveryRecords` (`:127`), reemplazados en cada refresco global (`src/frontend-data.ts:73`), por lo que vuelve a dispararse con cambios ajenos mientras está montado. Propuesta: usar los datos pertinentes ya obtenidos en ese ciclo o una lectura acotada al cliente que admita el contrato existente; separar la lectura remota de la proyección de contratos y entregas. No basta con paralelizar todas las peticiones.

7. **Lecturas duplicadas entre la carga global y las páginas.** Tras cargar el contexto, los listados de campañas, proveedores, clientes y transportistas vuelven a descargar sus colecciones mediante `readAllV1` en sus respectivos `api/v1-screen.api.ts`. El detalle de campaña vuelve a pedir campaña, participaciones y requerimientos (`src/modules/campaigns/pages/CampaignDetailsPage.tsx:133`). El alta de campaña vuelve a pedir el listado después del refresco global. Propuesta: una única carga fresca por ámbito que alimente la página y las proyecciones necesarias. Los catálogos de fruta y variedades de V1 se leen del contexto; sus funciones `getFrutas`/`getFrutaDerivadas` no representan nuevas peticiones HTTP.

8. **Detalle de cliente descarga el directorio completo.** `src/modules/commercial-planning/pages/ClientDetailsPage.tsx:34` llama `getClientesNegocio()` y busca un ID en memoria. La colección se pagina internamente hasta descargar todos los clientes; se repite después de editar. El recurso V1 ya dispone de lectura individual en `src/modules/clients/api/v1.api.ts`. Propuesta: exponer esa lectura mapeada a la página, sin importar DTOs ni cliente HTTP en ella.

9. **Los refrescos simultáneos comparten promesa pero programan otra descarga.** `src/frontend-data.ts:54` incrementa `requested` antes de comprobar `inFlight`; el bucle de `:89` ejecuta otra vuelta. Dos llamadas simultáneas sin escrituras produjeron 288 GET. Propuesta: distinguir deduplicación de lecturas de reconciliación por una mutación posterior al inicio de la lectura. Eliminar el bucle sin esa distinción puede perder actualizaciones válidas.

10. **Comprobar documentos se repite por identidad del objeto.** `src/shared/components/FileDropzone.tsx:73` depende de `file` además de la URL. `src/modules/campaigns/components/CampaignClientRecordModal.tsx:145` y `:148` construyen un nuevo `storedFile(...)` al renderizar; escribir en otros campos vuelve a iniciar `/api/documentos/:id/estado` para documentos reconocidos por ese endpoint, aunque la URL siga igual. Es un hallazgo estático, sin conteo en navegador. Propuesta: estabilizar la referencia del archivo o asociar la comprobación a su identidad estable, conservando «Volver a verificar», cancelación y verificación real del objeto.

El `catch` de `commitRemote` también refresca todo cuando falla una escritura simple (`src/shared/api/data-contract.ts:19`): el caso HTTP 400 produjo 144 GET adicionales. La reconciliación tiene sentido en comandos con varios pasos o resultado incierto; debe distinguirse de un rechazo confirmado sin escrituras parciales.

### Vistas y acciones que heredan la recarga global

| Área | Acciones identificadas en adaptadores V1 y comandos |
|---|---|
| Campañas y sus subrutas | Alta, edición, borrado, inicio/cierre; vínculos de proveedores/clientes; contratos, entregas, coordinación; entrevistas, exámenes; certificados, ampliaciones y pagos; transportistas y acuerdos. |
| Proveedores y sus fichas | CRUD del proveedor; producción, fincas y certificados. |
| Gestión comercial | CRUD del cliente; el detalle añade las consultas del punto 6 y del punto 8. |
| Transporte y sus fichas | CRUD de transportistas, vehículos y choferes; solicitudes/cotizaciones y datos adicionales. El listado añade la duplicación del punto 5. |
| Calidad | Incorporar/quitar campaña, análisis, revisión, cosecha, cargas y guías. |
| Logística y despacho | Documentos, llegada, descarga, evaluación, descarte, devolución de jabas, observaciones/comunicación de compras y cierres. |
| Liquidación de compra | Personas vinculadas, liquidaciones, adelantos y pagos a proveedores/transportistas. |
| Facturación y cobros | Preparación/emisión de factura y registro de cobro. |

El portal del chofer usa una excepción: `src/frontend-data.ts:105` delega a `/api/chofer/contexto`; no se atribuye a ese perfil la descarga global del administrador. El selector `/modules` queda excluido del arranque operativo. `StrictMode` en desarrollo puede repetir efectos de lectura, pero no explica el refresco global después de guardar y no se midió su multiplicador. La verificación de sesión y la comprobación real de documentos tienen finalidad funcional y no se proponen eliminar.

Propuesta de orden, pendiente aceptación: resolver el resultado ambiguo de guardados (1), definir cargas y sincronización por ámbito (2–3 y 7), eliminar duplicaciones específicas (4–6 y 8), y ajustar concurrencia y documentos (9–10). Respetar la decisión vigente de no añadir TanStack Query/SWR ni caché HTTP/Service Worker; no se requieren cambios visuales para abordar estos hallazgos.

Verificación: reproducción temporal con funciones reales y servidor V1 ficticio, incluyendo rechazo de escritura, fallo de lectura posterior y refrescos concurrentes; el instrumento temporal se retiró. `pnpm test`: 65 archivos y 377 pruebas aprobadas; `pnpm exec tsc --noEmit -p tsconfig.app.json`: aprobado; `git diff --check`: aprobado. No se modificaron componentes, APIs ni lógica de negocio. No se midieron producción, latencias reales, tráfico de navegador ni concurrencia entre usuarios; no se auditó el rendimiento interno del backend.

## Plan de consumo API por vista — 2026-11-05 · Referencia de diseño

### Conclusión y alcance

El frontend puede dejar de recargar toda la operación después de guardar usando los recursos V1 existentes. Sin embargo, preservar todos los indicadores actuales exige distinguir datos propios, relaciones necesarias y agregados históricos. Algunos recorridos seguirán teniendo varias peticiones con el contrato actual: eliminarlos por completo requiere lecturas agregadas o consultas inversas nuevas, que se describen como propuestas, no como endpoints disponibles.

Este reporte desarrolla los diez hallazgos de la auditoría anterior. Cubre los **48 patrones de ruta con pantalla** de `src/App.tsx`, incluidas las variantes dinámicas de Calidad y Liquidación; `/` y `*` solo redirigen. Define carga inicial, datos al abrir acciones, sincronización después de escrituras, restricciones del contrato y verificación esperada. El desarrollador autorizó su implementación y permitió adaptar la solución al código existente. La sección superior registra los cambios efectivamente aplicados y las diferencias frente a este diseño; las ampliaciones opcionales del backend siguen como propuestas, no como funcionalidad disponible.

Fuentes contrastadas:

- [Rutas y límites de carga](../src/App.tsx), [orquestación actual](../src/frontend-data.ts), [lector global](../src/modules/operations/api/operations-context.api.ts) y [mutaciones compartidas](../src/shared/api/data-contract.ts).
- [OpenAPI frontend](api/openapi.json) y [copia runtime backend](../../epe-backend/src/common/v1/contract/api-v1.openapi.json): contenido idéntico por SHA-256 en esta revisión. El servidor del contrato es `/api`; los paths internos no incluyen ese prefijo.
- [Helper V1](../../epe-backend/src/common/v1/v1-resource.helper.ts): valida filtros/roles, comprueba pertenencia al padre y ejecuta las escrituras de recursos mediante transacciones individuales. [Servicio de base de datos](../../epe-backend/src/common/v1/v1-database.service.ts): filtros de igualdad, `COUNT`, orden por PK y paginación real en PostgreSQL.
- Controladores/servicios V1 de [campañas](../../epe-backend/src/campana/controllers/campana-v1.controller.ts), [participaciones](../../epe-backend/src/campana-proveedor/controllers/campana-proveedor-v1.controller.ts), [proveedores](../../epe-backend/src/proveedor/controllers/proveedor-v1.controller.ts), [comercial](../../epe-backend/src/cliente-negocio/controllers/cliente-negocio-v1.controller.ts), [transporte](../../epe-backend/src/transporte/controllers/transporte-v1.controller.ts), [calidad](../../epe-backend/src/calidad/controllers/calidad-v1.controller.ts), [logística](../../epe-backend/src/logistica/controllers/logistica-v1.controller.ts), [liquidaciones](../../epe-backend/src/liquidaciones/controllers/liquidaciones-v1.controller.ts) y [facturación](../../epe-backend/src/facturacion/controllers/facturacion-v1.controller.ts).
- Proyectores de [campañas](../src/modules/campaigns/api/campaign-screen-data.ts), [proveedores](../src/modules/providers/api/provider-screen-data.ts), [calidad](../src/modules/quality/api/quality-screen-data.ts), [logística](../src/modules/logistics/api/logistics-screen-data.ts), [liquidación](../src/modules/purchase-settlement/api/settlement-screen-data.ts) y [facturación](../src/modules/billing/api/billing-screen-data.ts), además de los componentes que presentan sus datos. Se aplicó Ponytail Audit para rastrear estas dependencias.

### 1. Reglas comunes del consumo propuesto

1. **Una carga fresca por vista y ámbito.** La clave lógica incluye sesión, recurso, padre, ID y filtros. Compartir solo la petición en curso cuando dos consumidores necesitan exactamente lo mismo; no añadir caché persistente, TTL, Service Worker ni TanStack Query/SWR. Al navegar a otra vista, cargar sus dependencias, sin asumir que el contenido de otra ruta sigue vigente.
2. **Separar lo visible de lo que requiere una acción.** Cargar al entrar los datos necesarios para todas las tarjetas, contadores y filas ya visibles. Cargar catálogos de formularios y datos de modales al abrirlos. No aplazar un indicador visible ni mostrar cero para evitar una petición.
3. **Una colección no es una sola página.** `items.length` no sustituye `total`. Para sumas, búsquedas locales, exportación completa, tendencias o selección entre todas las filas, consumir todas las páginas del ámbito pertinente. Si el total de una colección basta, su primera respuesta trae `total`. No cambiar la paginación visual ni la semántica de filtros/exportación sin decisión del desarrollador.
4. **Identidades y padres reales.** `cxpId` identifica participación; `clientLinkId` identifica requerimiento; `contractId` identifica contrato. En Facturación, el parámetro visual `clientId` actualmente identifica **`clienteNegocioCampanaId`**, no el maestro `clienteNegocioId`. En detalle de liquidación de proveedor, `entryId` identifica **proveedor**, no `liquidacionProveedorId`. Resolverlos antes de construir rutas HTTP.
5. **El dato devuelto por backend prevalece.** Integrar el objeto retornado por POST/PATCH con sus IDs, estados e importes calculados, no el borrador del formulario. Después de DELETE exitoso, quitar únicamente esa identidad y actualizar sus derivados visibles.
6. **Actualizar solo consumidores afectados.** Una escritura de campaña no cambia normas, UIT, cobros ni vehículos. Si cambia una recepción, sí cambian los kilos disponibles para liquidar/facturar esa carga. Recalcular los indicadores afectados de la vista activa; las vistas inactivas leerán datos frescos al abrirse.
7. **Mantener completitud explícita.** Un ámbito parcial no puede hidratar los almacenes globales como si contuviera toda la operación. No convertir recursos no cargados en listas vacías ni reutilizar los proyectores globales sin adaptar sus dependencias. El detalle debe funcionar al abrir una URL directamente y al recargarla.
8. **Fallo de refresco distinto de fallo de escritura.** Un guardado HTTP confirmado sigue confirmado si falla una lectura posterior. Mantener ese resultado y permitir repetir solo la lectura. Si falló un comando de varios pasos, reconciliar los recursos que alcanzó a tocar; si hubo timeout con resultado incierto, consultar el recurso/historial antes de repetir una escritura financiera. Un rechazo confirmado antes de toda escritura no exige reconciliación global.

### 2. Capacidades comprobadas y límites de la API

Todas las rutas de recursos siguientes llevan `/api` delante. Los filtros se combinan por igualdad; `page` y `pageSize` se admiten en colecciones (`pageSize` máximo 100). No hay búsqueda textual genérica, orden arbitrario, listas de IDs ni rangos de fecha en estas operaciones. No enviar `search`, `q`, `desde`, `hasta`, `scope`, `campaniaId` u otros filtros cuando no aparezcan en esa operación del OpenAPI.

| Recurso V1 existente | Filtros útiles confirmados además de paginación | Consecuencia para el frontend |
|---|---|---|
| `GET /campanas` | `campaniaId`, `estado`, `frutaId` | No filtrar solo el estado de la pestaña si las tarjetas/tendencias deben resumir todas las campañas. `calidad` viene dentro de la campaña. |
| `GET /proveedores` | `proveedorId`, `activo` | Búsqueda por nombre/zona sigue siendo local con esta API. |
| `GET /clientes-negocio` | `clienteNegocioId`, `tipoCliente` | `GET /clientes-negocio/{id}` ya resuelve el maestro individual. No incluye sus contratos. |
| `GET /campanas/{c}/proveedores` | `cxpId`, `estado`, `proveedorId`, `entrevistaAplica` | Se puede buscar un proveedor dentro de una campaña, no todas sus campañas en una consulta. |
| `GET /campanas/{c}/requerimientos` | `clienteNegocioCampanaId`, `clienteNegocioId` | Se puede filtrar un cliente en una campaña; no existe consulta V1 inversa global por cliente. |
| `GET /proveedores/{p}/examenes` | `examenProveedorId`, `fecha`, `cxpId` | El filtro `cxpId` existe, pero la pantalla actual agrupa exámenes por proveedor; no cambiar ese alcance silenciosamente. |
| `GET /participaciones/{x}/entrevistas` | `entrevistaId`, `fincaId` | Lectura específica de la participación, sin cargar entrevistas de otros productores. |
| `GET /participaciones/{x}/analisis-calidad`; `GET /participaciones/{x}/mediciones-mtd` | Análisis: ID, `estado`, `fincaId`; MTD: ID, `fincaId` | Los análisis pueden existir sin carga/coordinación; no descubrirlos únicamente a partir de cargas. |
| `GET /requerimientos/{r}/contratos` | `contratoVentaId`, `fecha`, `estado` | Contratos por requerimiento; no por maestro cliente directamente. |
| `GET /contratos/{k}/entregas` | `entregaProgramadaId`, `fecha` | La fecha es igualdad, no semana/rango. |
| `GET /entregas/{e}/coordinaciones` | ID, `acuerdoTransporteId`, `idEmpresaTransporteExterno`, `idVehiculoExterno`, `idChoferTransporteExterno` | Transporte se resuelve desde la entrega. No existe listado administrativo global de coordinaciones por campaña. |
| `GET /coordinaciones/{o}/cargas` | `cargaId` | La carga se consulta con su padre; no existe `GET /cargas/{id}` administrativo en V1. |
| `GET /cargas/{l}/facturas` | `facturaVentaId`, `estado` | Detalle disponible en esa carga. No existe `GET /facturas/{id}` de maestro administrativo; `/facturas/{id}/cobros` es un subrecurso. |
| `GET /cargas/{l}/liquidaciones-proveedor` | ID, `proveedorId`, `personaLiquidacionId`, `fecha`, `registradoPorUsuarioId`, `avisoUitConfirmado` | Filtrar por persona está limitado a una carga. No resuelve su acumulado anual global. |
| `GET /liquidaciones-transporte/{s}/aplicaciones-adelanto` | ID, `adelantoTransporteId`, `fecha` | El saldo de un adelanto exige todas sus aplicaciones, incluso en otras liquidaciones del mismo acuerdo. |
| `GET /parametros-uit` | `parametroUitId`, `anio` | Pedir el año de la fecha de liquidación, no necesariamente el año actual. Para documentos históricos, respetar el valor aplicado guardado. |
| `GET /transportistas`; vehículos y choferes anidados | Maestro: ID, `activo`; hijos: ID, y `activo` para choferes | Cargar unidades/choferes del transportista seleccionado al coordinar; la validación de solapamientos sigue en backend. |

**Rutas auxiliares comprobadas en código:** `/api/auth/*`, `/api/chofer/contexto` y `/api/documentos` con vínculos/subida/descarga se implementan en controladores específicos; no todas figuran en el OpenAPI de recursos. No confundir esa ausencia documental con inexistencia de la implementación. `/documentos/{id}/estado` sí figura en el contrato generado. `GET /api/documentos/vinculos` devuelve el índice completo, sin filtro implementado por tipo/entidad; filtrar en frontend no reduce esa respuesta. No proponer `?tipo=...` como optimización ya soportada. El tipo de respuesta y permisos reales se comprueban en [S3DocumentsController](../../epe-backend/src/archivo/s3-documents.controller.ts), [AuthController](../../epe-backend/src/auth/controllers/auth.controller.ts) y [DriverContextController](../../epe-backend/src/transporte/controllers/driver-context.controller.ts).

### 3. Recorridos de datos reutilizados en la matriz

Los nombres siguientes describen planes de lectura; no son nuevos endpoints ni proponen crear un framework de consultas. Cada recorrido termina tan pronto tiene los campos que utiliza la vista.

| Recorrido | Lecturas existentes y límite de alcance |
|---|---|
| **Campaña base** | `GET /campanas/{c}`, fruta por `GET /frutas/{f}`; variedades por `GET /frutas/{f}/variedades` solo si se muestran o editan. Para listados, una lectura compartida de frutas evita una por fila. |
| **Participación** | `GET /campanas/{c}/proveedores/{x}` → `GET /proveedores/{p}`; fincas, entrevistas y exámenes solo según la ficha. La ruta anidada comprueba que `x` pertenece a `c`. |
| **Requerimiento** | `GET /campanas/{c}/requerimientos/{r}` → `GET /clientes-negocio/{n}`; `GET /requerimientos/{r}/variedades` si sus variedades se presentan o editan. |
| **Entregas de campaña** | `GET /campanas/{c}/requerimientos` → contratos de cada requerimiento → entregas de cada contrato. Maestros de cliente únicos. Variantes de entrega mediante `GET /entregas/{e}/variedades`. No cargar todas las campañas. |
| **Cargas de campaña** | Entregas de campaña → `GET /entregas/{e}/coordinaciones` → `GET /coordinaciones/{o}/cargas`. Alcance por canal se deriva de `ContratoVenta.canal`, no del tipo global del cliente; ese filtro no está disponible en los listados V1. |
| **Origen y transporte de carga** | Coordinación + `GET /coordinaciones/{o}/origenes`, `GET /cargas/{l}/proveedores`, `GET /proveedores-carga/{pc}/origenes`; participaciones, proveedores y fincas referidos; transportista, vehículo y chofer por sus rutas de detalle. Resolver personas del chofer solo si se presentan datos que viven en `Persona`. |
| **Recepción y despacho** | `GET /cargas/{l}/recepciones`, `GET /coordinaciones/{o}/historial-chofer`, guías de la carga si se usan como requisito/resumen. Compras, logística, documentos y checklist están en el objeto de recepción; no inventar un endpoint por cada campo JSON. |
| **Certificación de campaña** | `GET /campanas/{c}/certificaciones` y, por certificado mostrado, `GET /certificaciones/{s}/cobertura`, `GET /certificaciones/{s}/ampliaciones`, `GET /certificaciones/{s}/pagos`. Proveedores cubiertos por IDs. No requiere vehículos ni facturas. |
| **Guía** | `GET /cargas/{l}/guias` o detalle `GET /cargas/{l}/guias/{g}`; `GET /guias/{g}/proveedores`, `GET /guias/{g}/normas`. Para mostrar una guía emitida usar sus snapshots; para editar/preparar, añadir solo los maestros/orígenes necesarios y catálogo de normas. |
| **Liquidación proveedor** | `GET /cargas/{l}/liquidaciones-proveedor` y, por documento relevante, `GET /liquidaciones-proveedor/{s}/pagos`; recepción, precio aplicado y persona de liquidación/snapshot. Personas vinculadas mediante `GET /proveedores/{p}/personas` y detalles `GET /personas/{id}`. |
| **Liquidación transporte** | `GET /cargas/{l}/liquidaciones-transporte`, `GET /cargas/{l}/gastos-transporte`, pagos y aplicaciones de cada documento; acuerdo de campaña y `GET /acuerdos-transporte/{a}/adelantos`. Completar aplicaciones y flete utilizado en todas las cargas del mismo acuerdo cuando se calcula disponibilidad. |
| **Facturación de carga** | `GET /cargas/{l}/facturas`, `GET /facturas/{i}/cobros` para importes cobrados/saldos; recepción con reporte, contrato comercial, kilos cargados. No requiere pagos a proveedores, UIT ni certificados. |
| **Adjuntos vinculados** | Leer `/api/documentos/vinculos` una vez por ciclo que realmente necesite referencias no incluidas en el DTO. Subir solo archivos nuevos; vincular solo cambios efectivos. Comprobar `/api/documentos/{id}/estado` por documento visible con identidad estable; descargar contenido solo al previsualizar/descargar. |

**Enlaces directos:** las rutas visuales de carga y factura no siempre contienen el padre que exige V1. En una sesión sin datos previos, descubrir el padre recorriendo la campaña y detenerse al encontrar la identidad solicitada; después cargar hermanos solo si un contador, selector o validación los necesita. No confiar exclusivamente en `location.state`, ni fabricar el padre, ni restaurar toda la operación. Eliminar ese descubrimiento requiere una lectura por ID con contexto, que hoy no existe para el administrador.

### 4. Matriz por pantalla: campañas y participantes

Notación de rutas HTTP: `c` campaña, `p` proveedor, `x` participación, `r` requerimiento, `k` contrato, `e` entrega, `o` coordinación, `l` carga, `a` acuerdo, `s` documento, `g` guía. Las rutas visuales mantienen los nombres reales de `App.tsx`. Cada fila incluye los datos necesarios para preservar la pantalla actual, no solo su tabla principal.

| ID / ruta visual | Carga al entrar | Carga al abrir una acción / actualización necesaria |
|---|---|---|
| V04 `/campaigns` | Colección de campañas completa para filtros, tendencias y exportación actuales; frutas para nombres/imágenes. No cargar participaciones, cargas ni finanzas. | Nueva campaña: responsable de sesión, frutas y variedades elegidas. Editar: detalle de esa campaña, responsable ajeno por auth si corresponde y adjunto. Después de guardar: objeto retornado y una sola actualización del listado/estadísticas. |
| V05 `/campaigns/:id` | Campaña base; participaciones y maestros proveedor; requerimientos y clientes; certificaciones visibles y sus detalles; acuerdos para contadores; entregas, coordinaciones, cargas y proveedores de esas cargas para kilos programados/cargados; guías de esas cargas para su conteo. | El detalle **sí** tiene dependencias operativas reales. Separar proyección de contratos, certificaciones y transporte para no pedir pagos de transporte solo para contar acuerdos. El modal de proveedores reutiliza la lectura actual del mismo ciclo. Editar/iniciar/cerrar actualiza campaña y los indicadores dependientes. |
| V06 `/campaigns/:id/providers` | Campaña base; participaciones de esa campaña; maestros de proveedores; fincas e entrevistas de productores mostrados para «fincas entrevistadas / en padrón». | Abrir vínculo: directorio de proveedores elegibles y IDs ya vinculados. No cargar certificados, facturas, UIT ni exámenes para un listado que no los muestra. Tras vincular/editar/quitar, actualizar esa participación y sus conteos. |
| V07 `/campaigns/:id/providers/:cxpId` | Participación individual, proveedor, campaña; fincas e entrevistas para ficha/ha; exámenes del proveedor para resumen. | Conservar la agrupación de exámenes por proveedor de la V1 actual; no restringir a `cxpId` sin decisión funcional. Editar datos de participación actualiza esa ficha y sus derivados. |
| V08 `/campaigns/:id/providers/:cxpId/interviews` | Campaña base, participación individual y proveedor; fincas del proveedor; entrevistas de esa participación. | Formulario usa esas fincas y campos de entrevista. Tras guardar, actualizar entrevista/colección y conteo de fincas; no volver a cargar otros proveedores. |
| V09 `/campaigns/:id/providers/:cxpId/exams` | Campaña base, participación individual, proveedor y sus exámenes. | Leer el documento al visualizarlo; guardar actualiza exámenes del proveedor. Mantener alcance actual por proveedor y vincular `cxpId` cuando el comando lo requiera. |
| V10 `/campaigns/:id/clients` | Campaña base, requerimientos de esa campaña y maestros de clientes referidos. | Vínculo: catálogo de clientes y variedades de fruta pertinentes. Tras guardar/quitar: requerimiento afectado y sus indicadores. No cargar contratos/entregas ajenos por defecto. |
| V11 `/campaigns/:id/clients/:clientLinkId` | Requerimiento individual con padre campaña y maestro cliente; contratos de ese requerimiento y entregas que alimenten sus resúmenes; variedades si se muestran. | Editar vínculo carga sus documentos/valores. Actualizar ese requerimiento y proyecciones dependientes, sin descargar todos los requerimientos para encontrar un ID. |
| V12 `/campaigns/:id/clients/:clientLinkId/contracts` | Campaña base, requerimiento individual, cliente, contratos de ese requerimiento y entregas necesarias para sus conteos/kilos; adjuntos de los contratos. | Crear/editar contrato usa requerimiento y tipo de cliente para canal, precio y moneda. Guardar/quitar actualiza la colección de contratos y totales correspondientes. |
| V13 `/campaigns/:id/clients/:clientLinkId/contracts/:contractId/deliveries` | Campaña base, requerimiento individual, cliente y `GET /requerimientos/{r}/contratos/{k}`; entregas de ese contrato, variedades, coordinaciones y orígenes que se muestran. | Coordinar: acuerdos de la campaña, transportistas vinculados, vehículos/choferes del seleccionado, participaciones/fincas elegibles. Guardar entrega o coordinación actualiza sus hijos y resumen, no otros contratos. |
| V14 `/campaigns/:id/certifications` | Campaña base; recorrido de certificaciones con cobertura, ampliaciones, pagos y proveedores cubiertos que sustentan los importes/kilos visibles. | Formulario: participaciones elegibles y documentos. Pago/ampliación actualiza certificado y su colección hija; no cargar liquidaciones de compra. |
| V15 `/campaigns/:id/carriers` | Campaña base, acuerdos y transportistas vinculados; coordinaciones de esa campaña y vehículos/choferes asignados para el texto de asignaciones; adelantos, liquidaciones de transporte, pagos y aplicaciones del acuerdo cuando se presenta `saldoPagado`/estado de pago. | Vincular: directorio de transportistas disponibles. Acuerdo: datos del acuerdo y documentos. Proyectar el saldo con todas las cargas del acuerdo; no todas las campañas. |
| V16 `/campaigns/:id/deliveries` | Recorrido de entregas de esa campaña; coordinaciones, orígenes, clientes, variedades y transporte referidos. | Catálogos de coordinación al abrirla; vehículos/choferes solo del transportista seleccionado. No cargar recepción, facturas o UIT para listar programación. |
| V17 `/campaigns/:id/weekly-delivery-program` | Campaña base y cargas reales de esa campaña; proveedores de carga, variedades, clientes y fechas reales que alimentan `harvestedWeeklyItems`. | La vista vigente usa cosechado/cargado real, no solo programación: no sustituirla por `weeklyCampaignItems` ni incluir coordinaciones futuras como cosecha. Semana/variedad se filtran localmente con el contrato actual. |

### 5. Matriz por pantalla: proveedores, comercial y transporte

| ID / ruta visual | Carga al entrar | Carga al abrir una acción / actualización necesaria |
|---|---|---|
| V18 `/proveedores` | Directorio de proveedores; fincas para cantidad/ha, certificados para cantidad, vínculos de frutas/variedades y catálogos para producción mostrada. Sanidad se toma del maestro. | Estas relaciones **sí** aparecen en filas/tarjetas actuales. Cargarlas solo para el conjunto que se proyecta, teniendo en cuenta búsqueda/exportación completas; no añadir personas, entrevistas, MTD ni finanzas del sistema. Tras CRUD, actualizar el maestro y la fila/indicadores afectados. |
| V19 `/proveedores/:id` | Maestro individual; fincas, certificados, producción y catálogos pertinentes. Además: campañas/participaciones del proveedor, entrevistas para fincas entrevistadas, mediciones para último MTD y recepciones de sus entregas para kilos recepcionados. | La ficha tiene indicadores históricos reales. V1 obliga a descubrir participaciones recorriendo campañas con `proveedorId` y luego sus cargas/recepciones: conservar ese costo acotado al proveedor o proponer una lectura agregada. No mostrar cero por no haber cargado el histórico. |
| V20 `/proveedores/:id/fincas` | Maestro individual, fincas de ese proveedor, fruta/variedades referidas para cultivos y totales de hectáreas. | Abrir edición: catálogo necesario para seleccionar fruta/variedad. Tras guardar/quitar, fincas de ese proveedor y totales locales; no certificados ni liquidaciones. |
| V21 `/proveedores/:id/certificados` | Maestro individual, certificados de ese proveedor y adjuntos vinculados para esa ficha. | Subir/vincular solo si cambia archivo. Actualizar certificado/colección; no fincas, otros proveedores ni facturas. |
| V22 `/planificacion-comercial` | Directorio de clientes; campañas, requerimientos y contratos necesarios para los conteos de campañas activas/contratos de cada cliente en la tabla actual. | Con V1 los conteos exigen recorrer campañas; hacerlo una vez para el directorio, no una vez por cliente. Cambiar datos de contacto solo actualiza el maestro y las etiquetas que dependan de él. No volver a consultar contratos si no cambiaron sus relaciones. |
| V23 `/planificacion-comercial/:id` | `GET /clientes-negocio/{id}`; campañas y `GET /campanas/{c}/requerimientos?clienteNegocioId={n}`; contratos y entregas de esos requerimientos para la subvista. | Evitar el directorio completo y requerimientos de otros clientes. El filtro acota cada campaña pero no elimina el recorrido global de campañas. Editar contacto no debe reejecutar el recorrido de contratos por identidad nueva de un almacén global. |
| V24 `/transportistas` | Directorio de transportistas; sus vehículos/choferes para los conteos que muestra la tabla. Datos adicionales vienen en el maestro. El contador visible de «Solicitudes y cotizaciones» usa la cantidad de invitaciones proyectadas: descubrir solicitudes por campaña e invitaciones; no contar solo cotizaciones respondidas. | Al abrir la pestaña Cotizaciones completar sus filas, campañas, cotizaciones y documentos; al enviar requerimiento cargar campañas activas elegibles y datos de los seleccionados. Un solo POST/PATCH con todos los campos ya soportados; eliminar el segundo `setCarrierExtras` remoto redundante. |
| V25 `/transportistas/:id` | Maestro individual, vehículos y choferes de esa empresa, extras del propio maestro. | Alta/edición/baja de vehículo o chofer actualiza esa colección, el maestro si el backend lo cambia y sus contadores; no rehacer calidad o cobros. |
| V26 `/transportistas/:id/vehiculos` | Pantalla independiente de gestión de vehículos, implementada por `CarrierRecordsManagement`: maestro del transportista y colección de vehículos de esa empresa. No es una redirección. | Cargar el formulario/registro de vehículo seleccionado al abrirlo. No necesitar la colección de choferes por compartir actualmente el mapper `getCarrier`. |
| V27 `/transportistas/:id/choferes` | Pantalla independiente de gestión de choferes, también mediante `CarrierRecordsManagement`: maestro y choferes de esa empresa. Personas adicionales solo si el formulario presenta sus campos. | No confundir cuenta de acceso Chofer con registro de conductor; conservar las validaciones backend de cuenta/activo. No cargar vehículos si no se presentan. |

Las tarjetas/listas que presentan resultados para **todos** los elementos siguen necesitando todas las páginas pertinentes con la API actual. Cargar solo una página y exportar/buscar sobre ella cambiaría el comportamiento. Para eliminar el recorrido de hijos por cada fila conservando esos indicadores, hace falta agregación backend o una respuesta enriquecida aprobada.

### 6. Matriz por pantalla: calidad y logística

| ID / ruta visual | Carga al entrar | Carga al abrir una acción / actualización necesaria |
|---|---|---|
| V28 `/calidad` | Campañas y frutas. Incorporación por canal está en `Campana.calidad`; conteos de campañas por canal se calculan de esos datos. | Agregar/quitar: campañas elegibles y PATCH de esa campaña. No cargar análisis, todas las cargas, guías ni liquidaciones para la portada. |
| V29 `/calidad/:scope/:id` | Campaña base, incorporación al canal y cargas/coordinaciones de esa campaña/canal; clientes, contratos y proveedores de carga/origen para kilos programados/cargados, avance y productores visibles. | No heredar todo `projectQualityData`: resumen no necesita análisis, documentos ni normas que no presenta. |
| V30 `/calidad/:scope/:id/:section` | `analisis`: participaciones de esa campaña, fincas/proveedores, análisis y MTD de esas participaciones, documentos visibles. `carga`: cargas reales de campaña/canal, proveedores/orígenes, transporte, gastos de carga y datos que muestra la tabla. `guias`: cargas y sus guías para conteos/estado. `resumen`: mismo plan V29. | Registrar análisis puede hacerlo sin cosecha. Registrar carga necesita entregas coordinadas sin carga, cosecha/revisión y orígenes de la seleccionada. Editar guía necesita normas, asignaciones y snapshots; no precargar todos esos formularios al entrar en otra sección. Industria conserva sus secciones permitidas actuales. |
| V31 `/calidad/:scope/:id/:section/:loadId` | La ruta vigente acepta `section=guias`: resolver carga bajo campaña/canal, guías de esa carga y datos que necesita su lista. Mantener los conteos del encabezado que realmente se presentan. | Al abrir preparación/edición completar guía, origen, transporte y normas de esa carga. No descargar guías de otras campañas. |
| V32 `/calidad/:scope/:id/:section/:loadId/:guideId` | `section=guias`; validar campaña/canal/carga; guía individual y sus proveedores/normas. Mostrar snapshots persistidos cuando esté emitida. | Solo permisos/acciones pertinentes; no sustituir snapshots por datos actuales de maestros. |
| V33 `/logistica-despacho` | Campañas con cargas, cadena comercial para descubrirlas, datos de carga y despacho/recepción/historial para métricas por etapa; clientes y transporte que se muestran. | La portada agrega todas las campañas relevantes. V1 no tiene resumen de despacho: requiere recorrido global de la rama logística, pero no UIT, cobros, certificados ni análisis completos. |
| V34 `/logistica-despacho/:campaignId` | Misma rama logística, limitada a la campaña; proveedores de carga para cantidades, guías para indicadores/requisitos y recepción/historial. | Cargar solo los documentos que se visualicen. Recalcular conteos de la campaña desde sus cargas; no otras campañas. |
| V35 `/logistica-despacho/:campaignId/cargas/:loadId` | Contexto comercial y transporte de esa carga; proveedores, variedades, orígenes, gastos visibles, recepción, historial y guías necesarias para resumen/etapa. | Si el encabezado cuenta otras cargas, cargar sus identificadores, no sus formularios completos. Estado y pendientes vienen del mismo ciclo de carga. |
| V36 `/logistica-despacho/:campaignId/cargas/:loadId/compras` | Contexto mínimo de carga, proveedores/orígenes, recepción (`compras`), guías asociadas y existencia de liquidaciones de proveedor para bloquear cambios. | Editar observación/compartir compras actualiza recepción; conservar bloqueo si ya hay liquidación. No consultar pagos/cobros para ese bloqueo. |
| V37 `/logistica-despacho/:campaignId/cargas/:loadId/recepcion` | Carga, proveedores/kilos cargados, recepción y campos logísticos; historial/checklist cuando participa en la presentación. | Llegada, descarga, evaluación y descarte actualizan recepción y derivados de esa carga. Peso/reporte afectan preparación de factura y liquidación al entrar a esas vistas. |
| V38 `/logistica-despacho/:campaignId/cargas/:loadId/jabas` | Proveedores de carga y envases; recepción/checklist para cantidades iniciales/devueltas, fecha, evidencia y estado de cierre. | Guardar devolución actualiza recepción; no facturas, personas ni certificados. |
| V39 `/logistica-despacho/:campaignId/cargas/:loadId/documentos` | Recepción y sus documentos/checklist, guías de fruta emitidas e historial necesarios para requisitos de cierre. | Cierre físico/administrativo es acción backend; no reproducir el cierre consultando todos los módulos en frontend. Tras éxito releer recepción y estado de despacho afectados. Mantener guía PDF y salida firmada requeridas actualmente. |

La proyección actual de Logística invoca todo `projectQualityData`, lo que crea dependencias accidentales de análisis, MTD y normas. El plan propone extraer la proyección de carga/guía que Logística utiliza, sin modificar sus reglas ni copiar datos faltantes como vacíos. Los documentos de recepción ya embebidos en su JSON no necesitan otra consulta al índice global para conocer su URL.

### 7. Matriz por pantalla: facturación y liquidación

| ID / ruta visual | Carga al entrar | Carga al abrir una acción / actualización necesaria |
|---|---|---|
| V40 `/facturacion-cobros` | Campañas, requerimientos/clientes, contratos, entregas/coordinaciones/cargas y facturas para contar clientes con cargas, cargas y documentos. | La portada actual cuenta documentos, no muestra el historial de cada cobro. No pedir cobros, UIT, liquidaciones, certificados o MTD hasta que una vista los necesite. |
| V41 `/facturacion-cobros/:campaignId` | Cadena de cargas de campaña, requerimientos/clientes, facturas y cobros para facturado/cobrado/por cobrar, separados por moneda. Contratos para importes contractuales visibles. | Mantener varias facturas por carga y múltiples requerimientos por cliente; no colapsarlos usando `clienteNegocioId`. |
| V42 `/facturacion-cobros/:campaignId/clientes/:clientId` | Requerimiento individual (`clientId` visual), cliente, contratos y cargas de ese requerimiento; recepción con reporte/peso/resultado, proveedores de carga, facturas y cobros. Identificadores de otros clientes con carga si el banner los cuenta. | Preparar: contrato/moneda, recepción y todas las facturas de esa carga para kilos disponibles. Emitir: factura y adjunto. Cobrar: factura e historial de esa factura. No UIT ni pagos a proveedores. |
| V43 `/facturacion-cobros/:campaignId/clientes/:clientId/facturas/:invoiceId` | Resolver carga de esa factura recorriendo únicamente las cargas del requerimiento; factura individual, cobros, recepción/reporte, contrato y datos de campaña/cliente. | El contexto de carga no está en la URL; necesita descubrimiento en arranque frío con V1. Editar preparación requiere facturas hermanas para kilos disponibles; emitir no debe descargar todas las facturas del sistema para intentar garantizar unicidad. La unicidad corresponde al backend. |
| V44 `/facturacion-cobros/:campaignId/clientes/:clientId/facturas/:invoiceId/cobros` | Mismo descubrimiento mínimo de factura; detalle de factura y colección de cobros, campaña/cliente y referencia de carga para contexto. | Después de cobrar: integrar respuesta o releer cobros de esa factura y saldo. No releer todos los clientes/facturas. |
| V45 `/liquidacion-compra` | Rama de cargas de las campañas relevantes; proveedores de carga, recepciones, liquidaciones y pagos/aplicaciones para los conteos de liquidados/pagados/pendientes que ya presenta la portada. | No cargar de inicio todas las personas, sus acumulados UIT, facturas ni análisis. Numeraciones sugeridas globales actuales requieren lectura adicional o un mecanismo backend; no convertirlas en garantía de unicidad. |
| V46 `/liquidacion-compra/:campaignId` | Rama de liquidación de esa campaña, datos de proveedores/transporte, recepciones y pagos/aplicaciones que sustentan estados de sus cargas. | No limitar los pagos a la carga abierta si el indicador resume toda la campaña. |
| V47 `/liquidacion-compra/:campaignId/cargas/:loadId/:section` | Resolver contexto de esa carga. `proveedores`: recepción, proveedores, participaciones/precios, liquidaciones de proveedor y pagos. `transportista`: acuerdo, coordinación/flete, gastos, liquidación, pagos y aplicaciones; disponibilidad del acuerdo completo. | Al liquidar proveedor: personas titulares/vinculadas, UIT del año y acumulado de la persona. Al liquidar/pagar transporte: adelantos/aplicaciones y flete usado en las demás cargas del mismo acuerdo. Las consultas de otra sección se omiten si no alimentan su resumen visible. |
| V48 `/liquidacion-compra/:campaignId/cargas/:loadId/:section/detalle/:entryId` | Proveedor: buscar liquidación en esa carga con `proveedorId=entryId`, documento/snapshot, pagos y datos de origen que se muestran. Transporte: documento de esa carga, gastos, pagos/aplicaciones y referencias de acuerdo/adelantos. | Para consulta histórica usar valores/snapshot aplicados, sin cargar personas de todo el sistema ni calcular UIT actual como si fuera la histórica. Validar identidad y pertenencia, no interpretar `entryId` de proveedor como ID de liquidación. |

**Dependencias históricas que no se pueden recortar a una carga:**

- El acumulado UIT de una persona incluye sus liquidaciones de distintas cargas y campañas del año correspondiente. La API publicada solo filtra `personaLiquidacionId` bajo una carga. Hoy el frontend debe descubrir las cargas y reunir esas liquidaciones si quiere conservar ese aviso exacto; el contrato no permite pedir un acumulado anual en una sola llamada. Leer únicamente la campaña abierta sería incorrecto.
- La disponibilidad de adelantos es desembolso menos aplicaciones en todas las liquidaciones del mismo acuerdo. La disponibilidad de flete también considera otras cargas de ese acuerdo. La validación definitiva sigue en el backend; no sustituirla por un saldo calculado de datos parciales.
- El aviso frontend de número de factura ya usado y las sugerencias de números LC/LT se apoyan actualmente en datos globales. Reducir el ámbito no puede mantenerlos como comprobación exhaustiva. Preferir la validación de unicidad del servidor; cualquier cambio del aviso/sugerencia o nuevo mecanismo de numeración se presenta al desarrollador antes de implementarlo.
- Un cobro o pago exige saldo completo del documento, no de una página del historial. Las monedas contractuales y los importes calculados retornados por el servidor deben conservarse.

### 8. Acceso, selector y portal del chofer

| ID / ruta visual | Consumo necesario | Límite |
|---|---|---|
| V01 `/login` | Enviar login solo al confirmar; recuperación solo al solicitarla. Restaurar sesión existente mediante `/api/auth/me` una vez por intento. | Sin carga operativa antes de autenticación. Un cambio de rol/sesión cancela o descarta respuestas anteriores. |
| V02 `/modules` | Datos de sesión e imágenes/estructura locales. | Cero peticiones operativas de negocio. Abrir el lanzador o precargar código de rutas no debe cargar sus datos. |
| V03 `/chofer` | `/api/chofer/contexto` devuelve todas las entregas coordinadas, incluidas las pendientes de carga. El rol Chofer puede registrar cargas y operar el despacho. | El contexto se limita a los datos operativos del portal. |

Las gestiones independientes de vehículos y choferes deben cargar su colección correspondiente; compartir un componente de orquestación no justifica descargar ambas. `StrictMode` puede repetir efectos durante desarrollo: cancelar solicitudes y deduplicar las que estén en curso, sin desactivarlo para ocultar problemas. Este reporte no define polling, sincronización entre pestañas ni WebSockets; eso sería una decisión adicional de actualización en tiempo real.

### 9. Matriz de actualización después de guardar

Actualizar significa integrar la respuesta y recalcular derivados o ejecutar **una única lectura final de cada colección necesaria**. No significa volver a ejecutar todos los recorridos anteriores. Los ámbitos inactivos no requieren peticiones en segundo plano; deben leer datos frescos al abrirse. Si una misma vista contiene resumen y detalle, ambos consumen el mismo resultado actualizado.

| Comando | Recursos que pueden cambiar | Relectura/sincronización de la vista activa |
|---|---|---|
| Crear/editar campaña | Campaña; vínculo documental si hubo cambio | Campaña/listado y estadísticas basadas en campañas; adjunto retornado por vínculo. Cero lecturas de proveedores, cargas, UIT, facturas y cobros por esta escritura. |
| Iniciar/cerrar campaña | Estado/campos de cierre de campaña | Campaña y acciones habilitadas en su vista. El backend comprueba pendientes del cierre; no descargar todas las finanzas para intentar repetir esa validación. |
| Vincular/editar/quitar proveedor | Participación de una campaña | Colección/identidad afectada, cantidades y elegibilidad. Conservar precios aplicados/snapshots históricos según reglas backend; no reescribir cargas/liquidaciones por inferencia. |
| Vincular/editar/quitar cliente | Requerimiento y variedades/documentos efectivamente escritos | Requerimiento/colección y totales pertinentes; contratos existentes solo si el comando o una regla real los cambia. |
| Guardar/quitar contrato | Contrato, vínculo documental | Contratos del requerimiento; totales de kilos/importes por moneda y elegibilidad de entregas. No releer cobros de otras facturas. |
| Guardar/quitar entrega | Entrega y sus variedades | Entregas del contrato y variedades cambiadas; kilos programados. No datos de recepción/compra ajenos. |
| Coordinar entrega | Coordinación y orígenes | Coordinación/orígenes de esa entrega y estado de programación. El backend valida reservas; no leer todos los choferes/cargas para suplantar esa validación. |
| Guardar entrevista/examen | Entrevista de participación o examen del proveedor | Colección pertinente, fincas entrevistadas/ha o resumen de exámenes. |
| Guardar certificado/ampliar/pagar | Certificado, cobertura, ampliación o pago y documento | Solo certificado/colecciones afectadas y sus kilos/saldos. |
| CRUD proveedor; producción; finca; certificado | Maestro y/o hijos indicados por el comando | Recursos de ese proveedor y fila/totales que los usan. Producción modifica varios recursos: una reconciliación final de maestro/frutas/variedades, sin descargar certificados si no cambiaron. |
| CRUD transportista/unidad/chofer | Maestro o colección hija concreta | Una sola escritura del maestro con extras. Lista/detalle y contadores del transportista, sin refresco global. |
| Enviar solicitud / registrar cotización | Solicitud, vínculo, invitaciones o cotización | Solicitud e invitaciones creadas o cotización de la invitación; contador/lista visible. Si falló tras algunas invitaciones, reconciliar solo esa solicitud y sus hijos. |
| Incorporar/quitar campaña de calidad | `Campana.calidad` | Campaña y pertenencia/conteo por canal de Calidad. |
| Registrar análisis/revisión/MTD | Análisis, mediciones y revisión de cosecha/carga según comando | Participación/finca y carga/entrega revisada; documentos vinculados cambiados. No cargar finanzas. |
| Guardar cosecha/carga | Cosecha, carga, proveedores/orígenes y gastos escritos | Subgrafo de esa carga/entrega y totales visibles de campaña. El programa semanal usa las fechas/kilos reales actualizados. |
| Guardar/emitir/quitar guía | Guía y asignaciones de proveedores/normas | Guía/colecciones hijas y estado de guías de la carga; snapshots de la respuesta. No reconsultar catálogos sin cambio. |
| Llegada/descarga/evaluación/descarte/jabas/documentos | Recepción y sus campos JSON; historia si la acción la registra | Recepción/estado de la carga e historial solo si fue afectado; actualizar kilos/requisitos derivados. No releer pagos ni UIT. |
| Cerrar físicamente/administrativamente | Recepción y campos/efectos que devuelve la acción | Releer recepción y estado/historial efectivamente afectados. Nunca tratar un 409 de pendiente como un cierre exitoso. |
| Vincular persona para liquidación | Persona y vínculo proveedor-persona | Persona retornada y vínculos de ese proveedor. Si una persona existe pero falló el vínculo, no repetir su alta a ciegas. |
| Guardar liquidación proveedor | Liquidación y documento; estado derivado de compra | Documento/colección de la carga y resumen visible; acumulado de la persona/año afectado, incluida la persona anterior si se permitió cambiarla. Usar kilos/precio/UIT/snapshot devueltos por servidor. |
| Guardar liquidación transporte | Coordinación/flete, gastos y liquidación | Recursos escritos de esa carga y disponibilidad del acuerdo; reconciliar todos los pasos realmente ejecutados si hubo error parcial. |
| Pagar proveedor/transportista | Pago del documento | Historial y saldo de ese documento y conteos pagados/pendientes visibles. |
| Aplicar adelanto | Aplicación y disponibilidad del adelanto | Aplicaciones del documento y saldo del adelanto/acuerdo completo; no duplicar como pago de caja. |
| Preparar/editar factura | Factura y vínculo de preparación | Facturas de esa carga, kilos aún facturables y totales visibles del requerimiento. |
| Registrar emisión | Factura con número/fechas/estado y vínculo de comprobante | Esa factura y estado/totales pertinentes. Unicidad de número validada por backend; no volver a consultar todas las facturas. |
| Registrar cobro | Cobro y saldo derivado | Cobros/saldo de esa factura y totales por moneda visibles de cliente/campaña. |
| Cambiar adjunto | Binario, metadatos y vínculo concreto | Integrar respuesta del vínculo; si hay que releer índice, hacerlo una sola vez al final. No cambiar los colores ni retirar la comprobación real de disponibilidad. |

No asumir que un comando de frontend de varios requests es una transacción: la transacción de `V1ResourceHelper` cubre cada escritura individual. Guardar contrato+archivo, carga+orígenes o liquidación+gastos puede quedar parcial. Registrar qué identidad/paso quedó confirmado y reconciliar únicamente ese ámbito antes de permitir reintentos.

### 10. Arquitectura técnica mínima propuesta

- Sustituir gradualmente el bloqueo global de `FrontendDataBoundary` por loaders de dominio por vista/ámbito. La sesión sigue siendo compartida; los fallos de UIT no bloquean Campañas. No eliminar el boundary antes de que todas sus consumidoras tengan sus dependencias explícitas.
- Mantener las capas actuales: página orquesta, API de dominio construye rutas y mapea DTOs, utilidades proyectan datos puros. Extender `readAllV1` para aceptar únicamente filtros válidos del recurso; usar lecturas individuales donde ya existe ID+padre.
- Dividir proyectores por necesidad real: certificados, entregas, carga, guía, facturación y liquidación. `projectCampaignData` no debe obligar a pedir pagos de transporte para mostrar contratos; `projectLogisticsData` no debe obligar a proyectar todos los análisis de Calidad.
- Reutilizar datos de una misma carga en los componentes simultáneos de esa vista. Limitar concurrencia al recorrer muchos padres; no implementar otro `Promise.all` ilimitado del histórico ni reemplazarlo por una cadena completamente secuencial.
- Separar ejecución de escritura de actualización de lecturas; declarar los recursos afectados en los comandos existentes, sin diseñar un bus global genérico. Ante varias llamadas de lectura iguales en curso, compartir resultado; una escritura confirmada posterior al inicio de esa lectura obliga a reconciliar ese ámbito, no toda la aplicación.
- Usar secuencias/cancelación al cambiar IDs, filtros y sesión. Publicar solo resultados del ámbito vigente; descartar los que pertenecen a otra campaña o usuario. Un desmontaje no debe disparar nuevas lecturas de recursos que ya no se muestran.
- Estabilizar identidad de archivos por documento/URL y conservar el reintento explícito. No convertir un fallo de disponibilidad o de índice documental en una lista vacía ni en documento válido.

### 11. Qué puede resolverse ahora y qué requiere ampliar el contrato

| Decisión | Con la API actual | Propuesta adicional, pendiente aprobación |
|---|---|---|
| Guardar campaña sin recargar otros módulos | Sí. Eliminar dependencia de refresco global y usar respuesta/lectura de campañas. | Ningún endpoint nuevo necesario. |
| Maestro individual de cliente, vínculo, contrato o guía con padres conocidos | Sí, hay detalles individuales. | Ninguno para esos casos. |
| Cargas y documentos de una campaña concreta | Sí, recorriendo sus requerimientos/contratos/entregas/coordinaciones. | Consulta de cargas por campaña/canal con contexto para reducir el recorrido. No está publicada hoy. |
| Detalle de carga/factura abierto directamente con ID sin su padre | Requiere descubrimiento dentro del ámbito de campaña/requerimiento. | Lectura administrativa por ID con contexto y pertenencia, sin modificar la URL visual. |
| Resúmenes exactos por campaña de despacho, facturación o liquidación | Requieren recorrer sus hijos y movimientos pertinentes. | Lecturas agregadas que conserven indicadores actuales, filtros y monedas; evitar un mega-contexto que vuelva a traer todo. |
| Filas de proveedor con cantidad de fincas/certificados y hectáreas | Recorrer hijos de proveedores que alimentan búsqueda/exportación/filas actuales. | Resumen por proveedor en listado o lectura agregada por IDs. |
| Participaciones/contratos de un cliente o proveedor a través de campañas | Recorrer campañas y filtrar sus hijos por ID. | Consulta inversa por cliente/proveedor que incluya IDs reales de campaña/requerimiento/participación. |
| Acumulado UIT exacto por persona/año | Historial de sus liquidaciones descubierto a través de cargas. | Lectura agregada persona/año con importe y parámetros aplicables. Mantener validación de escritura en servidor. |
| Saldo de adelantos/flete de un acuerdo | Reunir documentos/aplicaciones/coordinaciones de todas sus cargas. | Resumen por acuerdo con desglose de desembolsado/aplicado/disponible y flete usado. |
| Adjuntos de una entidad sin descargar todo el índice | El índice auxiliar actual es global. | Filtros implementados por tipo/entidad o referencia documental completa en la respuesta del recurso. |
| Búsqueda, filtros por rango y exportación sin descargar colecciones completas | No están soportados en los listados V1 actuales. | Filtros/orden/agregados/exportación de servidor documentados antes de consumirlos. |

No se solicita reabrir el estado de backend completado: las ampliaciones anteriores son oportunidades para optimización adicional, no afirmaciones de funcionalidad faltante en el alcance contratado. Si se aceptan, actualizar la fuente generadora, OpenAPI, DTOs, controlador/servicio, pruebas y copia runtime en un mismo cambio.

### 12. Orden de implementación y criterios de aceptación

| Etapa propuesta | Entrega concreta | Comprobación para aceptarla |
|---|---|---|
| A. Resultado de escrituras | Diferenciar guardado confirmado, lectura fallida y resultado incierto; reconciliación por recursos tocados. | PATCH exitoso + 503 de lectura ajena no provoca otro PATCH/POST. Un comando parcial consulta sus hijos afectados antes de permitir repetir. |
| B. Campañas y duplicaciones | V04 con carga propia; alta/edición/adjuntos en un solo ciclo; una escritura de transportista con extras; maestro individual de cliente. | Crear campaña no llama normas, UIT, liquidaciones, facturas, cobros ni colecciones hijas de otras campañas. Editar transportista no repite PATCH de los extras. |
| C. Rutas hijas acotadas | Participación, requerimiento, contrato y entregas usan padres/IDs reales; lectores/proyecciones por sección. | Cambiar una entrevista de proveedor A no consulta exámenes/proveedores B. Abrir detalle con URL directa funciona sin visitar antes el listado. |
| D. Operación por campaña/carga | Calidad, Logística, Facturación y Liquidación con dependencias de las matrices; conservar agregados históricos exactos. | Un cobro actualiza su factura y totales visibles, sin leer UIT, pagos de compra o análisis. Recepción actualiza su carga y sus pendientes. Adelantos y UIT incluyen su ámbito completo. |
| E. Ampliaciones opcionales | Solo las lecturas agregadas/inversas aprobadas del apartado 11. | Comparar totales con el recorrido V1 actual en varias páginas, monedas y campañas; nunca aceptar menos peticiones con un total incompleto. |

Presupuestos de referencia, **objetivos de implementación, no resultados medidos**:

- Sea `P(R)` la cantidad de páginas necesarias del recurso `R` dentro del ámbito; cada detalle individual cuenta una petición. Una colección con cero registros también necesita una petición para conocer que está vacía.
- V04 en arranque frío, sin abrir modal: `P(campañas) + P(frutas)`, excluyendo restauración de sesión. Con una página por colección serían **2 GET**, sin los 139 GET del contexto global actual. Si las tarjetas usan todo el histórico de campañas, ese conjunto sigue completo.
- Crear campaña sin adjunto desde V04 ya cargada: **1 POST + como máximo P(campañas) GET** si se decide releer listado; cero refrescos de otros recursos. Con una página de campañas: 2 peticiones frente a las 146 del escenario local auditado. También se puede integrar la respuesta sin GET si se conservan correctamente orden/filtros/totales; elegir una estrategia, no ambas.
- Adjuntar un documento nuevo agrega subida y vínculo. Esas dos escrituras no justifican dos descargas del contexto. Quitar un vínculo inexistente no debe emitir DELETE.
- V20/V21: maestro individual más páginas de sus hijos y catálogos/adjuntos que realmente utiliza esa ficha. No se fija un número universal porque nombres, hectáreas, documentos y paginación cambian el conjunto necesario.
- En vistas agregadas, contar peticiones por recorrido, entidades únicas y páginas; no prometer «una petición por vista» con el contrato actual. Registrar por separado GET, POST/PATCH/DELETE, verificaciones documentales y preflight CORS.

Validación prevista para los cambios: pruebas HTTP con las funciones reales y fixtures aisladas; aserciones de endpoints que **no** deben solicitarse; múltiples páginas; estados vacío/error; carrera al cambiar de campaña/sesión; fallo posterior a escritura; doble llamada concurrente; pagos/cobros completos; persona con liquidaciones en varias campañas; adelanto aplicado en más de una carga; varias facturas/monedas; reapertura directa de todas las rutas afectadas. Después, contrastar en navegador autenticado contra backend real y comparar los totales visibles. No modificar datos productivos para medir.

**Validación del diseño:** se inspeccionaron rutas, consumidores, proyectores, comandos, OpenAPI y controladores/servicios del repositorio. La comparación automática del reporte encontró 48 rutas esperadas, 48 documentadas y 48 IDs únicos, sin omisiones ni enlaces de fuentes rotos. Las rutas GET se contrastaron con OpenAPI; las únicas externas al catálogo son el índice documental auxiliar y las dos lecturas individuales expresamente identificadas como inexistentes. Los conteos y las 377 pruebas de la auditoría previa sirven de línea de base; los resultados posteriores y las diferencias de implementación se describen en la sección superior. No se verificó una base desplegada, SQL productivo, latencia real ni concurrencia entre usuarios.

**Discrepancia del generador, resuelta:** el diagnóstico detectó 23 diferencias de `multipleOf` (`0.00009999999999999999` frente a `0.0001`) al ejecutar `contract:check` en Node 22.20.0. Se corrigió el cálculo decimal en `dev/generate-v1-contract.mjs`; el check vuelve a aprobar sin cambiar OpenAPI, DTOs ni clientes generados. Se conserva el SHA-256 del SQL y la igualdad entre copias frontend/backend.

## Variedades en contratos y entregas — 2026-11-05 · Completo en desarrollo; despliegue pendiente

- **Backend implementado:** migración `1793923200000`, detalle contractual nuevo y reutilización de `entrega_x_fruta_derivada`. Cabeceras y líneas se guardan en una transacción, con bloqueo de campaña/requerimiento/contrato/entrega y relectura bajo bloqueo. Validación de pertenencia, unicidad, kilos positivos con tres decimales, totales derivados y cupos por variedad. Editar sustituye todas las filas, excluye la entrega original y no acumula descuentos. Reducciones contractuales conservan lo programado; eliminar entregas conserva las restricciones de uso y libera sus líneas cuando está permitido.
- **Históricos, decisión del usuario:** no se toman para los cupos actuales. La migración no inventa repartos ni confirma líneas antiguas; añade `desglose_confirmado=false`. Se muestran pendientes hasta un guardado manual completo. Nuevos registros quedan confirmados. No se reserva consumo histórico ni se reparte entre variedades. Esta política permite que histórico más consumo actual exceda el total; el control corresponde a entregas confirmadas.
- **Integración frontend:** los dos modales mantienen su diseño y recuperan las filas persistidas mediante los DTOs/mappers del ámbito activo. Se retiró `campaignVarietiesPreview.store.ts` y sus avisos de simulación; no hay fallback local. SQL de contrato, generador, OpenAPI, copia runtime, clientes y mock están sincronizados. Las rutas de detalle/colección devuelven filas; el contrato incluye saldos y permite `excluirEntregaId`. Las escrituras individuales de líneas de entrega pasan a solo lectura; el reemplazo atómico se hace en la cabecera.
- **Pruebas con base real:** migración aplicada únicamente en `epe_e2e_varieties_20261105`, PostgreSQL local dedicado. Se comprobaron 10,000/5,000 → entrega 1,000/200 → 9,000/4,800; edición 2,000/200 → 8,000/4,800, repetición sin cambios, eliminación de filas y entrega, recuperación con una nueva instancia, rechazo de excesos/duplicados/referencias, restricciones contractuales, rollback provocado en la segunda línea y dos consumos concurrentes del mismo cupo. También se comprobaron la reducción contractual concurrente, referencias/unicidad PostgreSQL, conservación de entregas usadas, confirmación explícita de históricos y compatibilidad de columnas entre las cuatro entidades y la base migrada. Suite e2e completa: 32 pruebas en 4 archivos, incluidas 8 de variedades con PostgreSQL real y un recorrido HTTP de las nuevas respuestas.
- **Verificaciones de proyecto:** frontend 456 pruebas en 70 archivos; backend 118 unitarias en 25 archivos. Tipos, ESLint frontend, build de ambos proyectos, lint backend, `contract:check` e igualdad SHA-256 de las copias OpenAPI aprobados. Persisten las advertencias previas de lint backend y de tamaño de chunks frontend, sin errores.
- **Despliegue:** pendiente en el entorno real. Backend y frontend se publican en la misma ventana tras aplicar la migración. Los clientes externos deben enviar el desglose por variedad para que el backend derive los totales. El recorrido visual en navegador queda pendiente. [Aplicación, verificación y reversión](../../epe-backend/docs/database.md#aplicación-y-verificación-en-el-entorno-real).
- **Revisión 2026-11-07 · Parcial:** se confirmó en el código del frontend el envío y la lectura del desglose por API. Pasaron 11 pruebas enfocadas, incluidas escrituras HTTP con el mock, lectura posterior y edición repetida sin doble descuento. `pnpm contract:check` pasó. El `.env` de este checkout apunta al mock de Vite. La evidencia de PostgreSQL corresponde a la ejecución de desarrollo registrada arriba. La conexión con el despliegue real y la aplicación de la migración en ese entorno siguen sin verificación en este checkout.
- **Antecedente sustituido:** la simulación de sesión del 2026-11-05 (456 pruebas previas) fue reemplazada por esta persistencia. Se conserva esta nota hasta 2027-02-03 para rastrear la transición; no describe el comportamiento vigente.

## Disponibilidad real de adjuntos — 2026-11-05 · Implementada, pendiente verificación productiva

- Las nuevas subidas de adjuntos generales se ordenan por módulo y tipo, como `campanas/lineamientos` y `facturacion/facturas`. Las referencias existentes se consultan con la misma URL protegida.

- El campo compartido de archivos, incluido Lineamientos de campaña, consulta `GET /api/documentos/:id/estado`: verde solo tras verificar metadatos y existencia/tamaño/tipo del objeto; rojo si falta o no coincide; aviso si no pudo verificarse por red o permisos. Un archivo recién elegido queda pendiente de guardar. Se puede volver a verificar y reemplazar/quitar adjuntos faltantes.
- El backend verifica el binario después de subirlo y antes de vincularlo. Un error leyendo el índice deja de simular una lista vacía, evitando sobrescribir vínculos ante fallos de permisos o conectividad. No usa almacenamiento local. Contrato en [API](api/README.md), implementación en el [flujo backend](../../epe-backend/docs/backend-flow.md#41-servicio-general-de-documentos-y-vínculos-en-s3-v1documentos). Esto no confirma el estado de archivos ni el despliegue de un servidor productivo.
- Validación: 107 pruebas backend y 377 frontend aprobadas; contrato generado y copia runtime sincronizados. Las pruebas cubren metadatos presentes con documento faltante, inconsistencias de tamaño/tipo, errores de permisos/red y rechazo de vínculos inválidos. No se hizo una comprobación contra el bucket productivo.

## Desembolso de adelantos de transporte — 2026-11-08 · Completo en desarrollo

- El acuerdo confirmado con adelanto en soles permite registrar desembolsos por fecha, importe y referencia y consultar cuánto se desembolsó y cuánto falta. El documento del acuerdo es opcional y guardar las condiciones pactadas no registra dinero.
- Reutiliza `POST /acuerdos-transporte/{parentId}/adelantos`. Gestión de Compra muestra el saldo aplicable de cada desembolso para la liquidación, omite los ya aplicados a ese documento y sigue guardando pagos de caja y aplicaciones por separado. La fixture del primer acuerdo deja un importe pendiente de desembolso para probar el flujo.
- Pasaron 464 pruebas, incluido el recorrido desde el desembolso hasta la aplicación y el pago en caja, además del rechazo de desembolsos simultáneos que superarían el monto pactado.

## Alta de carga desde Calidad — 2026-11-08 · Completo en desarrollo

- El Administrador puede registrar la carga de una entrega coordinada desde **Cosecha y Control de Calidad → Carga**. El selector muestra pendientes de la campaña y canal, con orígenes coordinados y sin rechazo industrial.
- El alta reutiliza `POST /coordinaciones/{parentId}/cargas` y sus subrecursos, ya publicados para Administrador. La restricción única de la coordinación evita crear otra carga. El portal consulta esa misma carga y conserva sus acciones de despacho. En Industria el rechazo se guarda en la cosecha sin crear carga.
- El mock conserva la unicidad de la coordinación y rechaza el alta sobre una entrega con rechazo industrial. Pasaron 462 pruebas, incluida la consulta desde el portal, el rechazo industrial y un intento simultáneo de alta por Administrador y Chofer. La autorización productiva de alta desde una sesión Chofer conserva la brecha descrita en el apartado de registro móvil.

## Registro móvil de cargas por chofer — 2026-11-05 · Frontend implementado / autorización backend pendiente

- Revisión previa al push: 373 pruebas aprobadas en 65 archivos, ESLint completo y compilación aprobados; contrato generado verificado. El cierre exige guía de salida firmada; los campos y botones respetan la etapa de llegada y la campaña activa. El comando de carga vuelve a validar proveedores asignados, kilos, bultos y gastos antes de enviar. El generador normaliza CRLF para evitar diferencias falsas de contrato en Windows. Los metadatos locales `.vercel/` quedan ignorados. Permisos productivos de alta por Chofer siguen pendientes.
- El usuario confirmó continuar con el flujo del prototipo aunque requiera cambiar el backend. Se incluyeron en la proyección las coordinaciones sin carga con sus proveedores y fincas; la UI ofrece Registrar carga y bloquea el despacho mientras está pendiente. Se retiraron el selector de otro conductor y el enlace a módulos administrativos, y el portal se limita a una columna móvil. El alta utiliza el recurso existente de carga/coordinación y sus subrecursos; los permisos productivos siguen pendientes de actualización y verificación. No se considera terminado el flujo hasta demostrar el alta con una sesión Chofer real.
- El formulario móvil usa variedades del catálogo, selección explícita de Jabas/Bines/Mallas y columnas de cargados/vacíos, con controles deshabilitados al desmarcar. La prueba del proyector verifica entregas pendientes sin inventar kilos, y las pruebas de cargas existentes seleccionan su ID en lugar de asumir que son el primer elemento de la lista.
- Revisión en Brave a 390 × 844: acceso por perfil Chofer, listado de entregas sin carga, registro de una carga de 600 kg con 30 jabas y aparición como `CAR-1-4` con acceso al despacho. Se probaron datos sintéticos del mock local; esto no valida permisos del backend productivo. Las entregas pendientes muestran Por completar, sin avance de despacho; las cargas con salida o guía emitida ya no permiten editar. La navegación inferior móvil sustituye a las pestañas superiores para evitar duplicación y recortes. Se restauró el viewport normal.
- Se recuperaron del bundle `Gt`, `Wn`, `Kn` y `Gn`: Industria exige Sí cumple/No cumple; el rechazo se registra en la cosecha de la entrega sin crear carga y bloquea otro alta. El formulario exige un tipo de bulto por proveedor y no permite exceder kilos programados. Llegada exige evidencia si existe descarte y se guarda solo en etapa Llegada; la guía de salida pide el adjunto y se admite en Llegada/Cierre. Se retiraron de la UI los campos de número, motivo y cantidades de retorno que el prototipo no solicita al adjuntar esa guía, preservando valores históricos en el modelo.
- Se probó en Brave el rechazo industrial: elección explícita, confirmación de rechazo y lista con Rechazada sin carga ni despacho habilitado. Se vinculó el conductor visible a la persona de la sesión y se bloqueó el doble envío de avance, checklist y guía. El usuario autorizó continuar el frontend tomando el prototipo como referencia sin detenerse por el backend; la actualización de permisos y contexto productivos sigue identificada como integración posterior, no como una capacidad comprobada por el mock.
- Verificación final frontend: 372 pruebas aprobadas en 65 archivos, ESLint de los archivos tocados aprobado, registro de Exportación y rechazo de Industria comprobados en navegador. Se conservan mapa de fincas/ruta, historial y la secuencia del despacho; el administrador mantiene consulta/edición de cargas existentes sin entradas de alta. La autorización productiva del recurso de creación conserva la brecha descrita, por decisión del usuario de abordar el backend después.

- Se revisó el portal compilado del prototipo (`dist/assets/index-CwiX453U.js`, componente `Yn`): campañas derivadas de entregas asignadas, lista de cargas pendientes y registradas, ubicación/ruta, registro o edición antes de emisión de guía/salida, checklist, guía de retorno y avance secuencial. El alta está vinculada a una entrega coordinada y al chofer autenticado; no parte de una carga existente.
- La pantalla administrativa Carga ya no ofrece Registrar carga ni un alta desde el estado vacío. Conserva consulta y edición de los registros existentes.
- Diferencia pendiente: OpenAPI autoriza POST `/coordinaciones/{parentId}/cargas` solo a Administrador y GET `/chofer/cargas` únicamente consulta cargas existentes. Se pidió la ubicación del backend para implementar el alta restringida al chofer y consultar coordinaciones asignadas sin carga. No se inventó una ruta ni se reutilizó una sesión administrativa.
- La carpeta de baja fidelidad actual conserva archivos compilados, sin fuentes TSX; el flujo se pudo recuperar del bundle. El portal actual de alta agrupa campañas desde cargas existentes y necesita incluir asignaciones pendientes antes de poder reemplazarlo fielmente.
- Se revisaron las ubicaciones locales `Documents/Proyectos`, `Desktop`, `Downloads`, `OneDrive` y `C:/dev` sin encontrar `epe-backend`. La consulta de ubicación sigue pendiente. El formulario existente de datos del chofer ahora valida fecha, responsable, variedad/kilos por proveedor, cantidades enteras de bultos e importes no negativos; usa el controlador compartido de guardado para evitar duplicados, mostrar errores y bloquear cierre mientras espera la API. No sustituye al alta de una entrega pendiente, que sigue requiriendo el cambio de contrato.

## API V1 backend — Completada · revisión de código 2026-11-03

- Se contrastaron las 252 combinaciones de ruta y método del OpenAPI con los diez controladores NestJS V1, incluido el controlador de catálogos. No hubo operaciones faltantes ni rutas extra.
- Los controladores delegan en servicios V1 que usan `V1DatabaseService`/TypeORM para leer y escribir en PostgreSQL; las reglas de negocio se ejecutan en backend. Se actualizó el contrato para documentar el prefijo real `/api` y eliminar la descripción de backend pendiente. Las fixtures de frontend quedan descritas solo como apoyo de desarrollo local.
- La implementación backend se considera completa, según confirmación del usuario. Verificación de código: `nest build` aprobó en `epe-backend`; el OpenAPI se copió a `dist` y la comparación estática no encontró operaciones faltantes ni rutas extra. Esta nota describe el código, no afirma una comprobación de una instancia productiva.
- El usuario confirma que la parte visual del frontend está completa. El estado de integración funcional por vista se registra en las secciones actuales de este documento; no se debe inferir de los estados históricos inferiores.

## Auditoría final de Facturación y Liquidación — 2026-11-02 · Completo en desarrollo / pendiente validación productiva

- Se contrastaron `sales-campaign-module.tsx`, `purchase-campaign-module.tsx`, `finance.tsx` y `LIQUIDACIONES-IMPLEMENTADAS.md` con las rutas, proyectores, comandos y modales actuales. Se mantienen las decisiones del usuario: kilos reconocidos V1 para liquidar proveedores, números LC/LT propuestos y corregibles, liquidación independiente de pagos y adelantos, y recepción documentada antes de preparar ventas.
- Correcciones: el importe contractual ahora suma cada contrato con su propio precio y separa monedas; la preparación usa la moneda del contrato de la carga, no la del primer contrato del cliente, y el comando rechaza discrepancias. Los adjuntos del detalle de factura se pueden previsualizar. Las campañas de compra terminadas bloquean nuevas liquidaciones, pagos, aplicaciones y edición, incluidos los accesos desde el historial y los comandos. Los modales bloquean cierre durante el guardado.
- «Pagados» incluía cualquier liquidación con un abono: ahora incluye solo saldos totalmente pagados, calcula transporte con el total V1 y permite abrir detalle e historial de cada documento.
- El comando de transporte comprueba el flete pendiente del acuerdo antes de escribir coordinación o gastos; la prueba HTTP rechaza un importe que lo exceda. Verificación: 366 pruebas aprobadas, compilación y tipos aprobados; las pruebas específicas de transporte cubren límite de acuerdo y sustitución de viáticos. Esta auditoría fue de código, contratos y pruebas HTTP; no constituye una validación del despliegue productivo.
- Definición resuelta por el usuario: por ahora solo se permite liquidar transporte con acuerdos en PEN. El disparador y el formulario bloquean otras monedas, y el comando comprueba la moneda del acuerdo antes de escribir flete o gastos. Los documentos históricos mantienen su consulta; no se aplica una conversión implícita.
- Limitación de entrega vigente: los PDF y vouchers se prueban con el servidor ficticio de desarrollo. El frontend utiliza `/api/archivos-locales` y sus vínculos; en este workspace no se pudo comprobar el backend desplegado ni su almacenamiento persistente. Las pruebas del mock no acreditan almacenamiento productivo. Tampoco hay emisión tributaria SUNAT: la pantalla registra una factura emitida externamente. Las diferencias V1 sobre observaciones y numeración están descritas en los hitos correspondientes.

## Selector de módulos del encabezado — 2026-11-02 · Completo

- El breadcrumb centrado se extendía sobre el disparador de módulos y capturaba el clic de ratón en escritorio. El grupo de acciones del encabezado ahora queda por encima del breadcrumb y el encabezado tiene una capa de apilamiento explícita para mostrar el panel sobre el contenido.
- La posición de los paneles de módulos y perfil usa su ancho real limitado por el viewport. En móvil se ocultan las orejas decorativas para no desbordar. Se comprobó con clic físico la apertura y navegación en escritorio, la apertura a 375 y 320 px, el cierre exterior, la ausencia de desplazamiento horizontal y la posición del menú de perfil a 320 px. Se restauró el viewport normal al terminar.

## Liquidación de compra — 2026-11-02 · Completo en V1

- El flujo del prototipo se contrastó con V1: la liquidación de productor usa kilos **reconocidos en recepción** y precio acordado en la participación; V1 requiere un número al guardar y no ofrece un consecutivo. La UI propone `LC-AAAA-NNNN` o `LT-AAAA-NNNN`, editable por el usuario. El precio aplicado se muestra como origen, sin simular su edición en el comprobante.
- Campañas, cargas, proveedores y transportista ya tienen rutas y breadcrumb directos. Cada liquidación tiene una vista de detalle sin banner, con datos de origen, totales e historial. Se revisaron en Brave ambas vistas de detalle y las cinco vistas de Logística; en esta última el breadcrumb de la carga ahora dice «Detalle de carga».
- Se validan importes de pago y adelantos contra el saldo. En transporte, los viáticos de la carga se incorporan si no hay gastos reales; al registrar gastos reales, estos los sustituyen. El total de una liquidación histórica se lee de los importes efectivamente guardados en V1. Las filas de gasto retiradas se eliminan al editar, y las liquidaciones con pagos o adelantos aplicados se bloquean según V1.
- El control UIT toma el parámetro del año de la liquidación, permite consultar años configurados y convierte compras USD a soles con el tipo V1; avisa al 90% y exige reconocer el aviso al alcanzar 75 UIT. Los pagos no ofrecen observaciones porque V1 no las persiste; los pagos en caja exigen referencia aunque no requieran voucher. Se retiró la escritura local alternativa del store: las acciones del módulo usan los comandos V1.
- En Brave se creó una liquidación de productor de S/ 1,560 y un pago parcial de S/ 100; el saldo pasó a S/ 1,460. En transporte se guardó un flete de S/ 500 con S/ 80 de viáticos, después se sustituyeron por S/ 20 de peaje real: el total bajó de S/ 580 a S/ 520. Se aplicaron S/ 100 de adelanto y el saldo quedó en S/ 420, con edición bloqueada después del movimiento. Una prueba HTTP aislada cubre la sustitución de viáticos y gastos reales con los datos sintéticos relacionados de desarrollo.

## Facturación y Cobros — 2026-11-02 · Completo en V1

- Se contrastó el flujo con `sales-campaign-module.tsx` y `finance.tsx` del prototipo. La pantalla anterior de una sola vista se reemplazó por rutas para campañas, clientes con cargas, facturación de un cliente, detalle de factura y cobros. Cada nivel usa el breadcrumb real; el detalle de factura no lleva banner superior. Se retiraron la página, el historial modal y la semilla local anteriores que ya no tenían ruta.
- La preparación se calcula sobre los kilos de recepción disponibles y el precio de contrato, con referencia `LV-` propuesta y solo lectura, descuento, cargos, adjunto opcional y observaciones. El cliente puede preparar más de un documento mientras queden kilos. El proyector y el comando exigen peso, resultado y reporte de recepción; se creó un PDF sintético relacionado con la carga industrial solo en el mock de desarrollo. La emisión registra un comprobante ya emitido fuera del sistema, con PDF y verificación explícita; el cobro permite abonos parciales con referencia y evidencia obligatoria en UI. Las validaciones locales y V1 impiden exceder kilos o saldo, registrar cobros antes de la emisión y repetir un número de factura.
- Los resúmenes de campaña cuentan únicamente facturas emitidas y separan monedas; las preparaciones se muestran como importe «por facturar». Se probó en Brave la secuencia campaña → clientes → cliente → preparación guardada → factura emitida → detalle → historial de cobros y se inspeccionaron los tres modales. Las pruebas del mock verifican la relación comercial, el bloqueo sin reporte, una preparación, emisión con PDF, cobro parcial y rechazo por saldo; también cubren el breadcrumb.
- Brecha V1: `cobro_venta` y la acción de emisión no aceptan observaciones. El prototipo sí las ofrece, pero se retiraron de esos dos formularios para no aparentar una persistencia que el contrato actual no proporciona. Las observaciones de preparación sí se guardan en `factura_venta`.

## Logística y Despacho — 2026-11-02 · Completo

- Las cargas de cada campaña abren cuatro gestiones desde las acciones de su fila: Compras, Recepción y calidad, Jabas y salida, y Documentos y cierre. Cada una tiene ruta, título, contenido y acciones propias; Ver detalle abre una ruta de consulta sin banner. El breadcrumb de las gestiones vuelve directamente a la lista de cargas, sin un nivel «Detalle» que no se visitó.
- Los datos sintéticos exclusivos del mock de desarrollo relacionan tres cargas de Cosecha y Calidad con historial del chofer, compras, recepción y jabas. Los comandos V1 guardan llegada, descarga, evaluación por proveedor, descarte en kg, observación de compra, devolución de jabas, expediente y cierres en los recursos existentes. Las compras ya usadas en liquidaciones se bloquean; la evaluación conserva el JSON de compras cuando los kilos reconocidos no cambian (QA-09).
- El cierre físico exige descarga, evaluación, informe de recepción, guía electrónica emitida y también el PDF de la guía de fruta, según aclaración del usuario. El cierre administrativo exige cierre físico, guía de salida firmada y que el chofer haya cerrado su despacho: V1 bloquea la escritura del checklist después del cierre administrativo. El portal del chofer deriva su etapa del historial propio, no del estado administrativo. Las pruebas del mock verifican relaciones, bloqueo de compras, edición de una compra no liquidada, devolución parcial, rechazo sin PDF, checklist del chofer y secuencia de ambos cierres. Se recorrieron visualmente en Brave el listado, las cuatro gestiones, el detalle, la carga pendiente y los modales de llegada, descarga, descarte y jabas.
- La revisión visual corrigió las horas locales de llegada en la semilla para alinearlas con el historial UTC y la descarga; los modales de registros existentes muestran «Editar», Compras oculta la columna de acciones cuando está bloqueada, Descarte presenta kg una sola vez y el detalle identifica el formulario de llegada del chofer para distinguirlo del evento de llegada del historial.
- El detalle se amplió con una cronología horizontal, variedad, bultos, porcentaje de descarte y expediente; desde allí se abren las cuatro gestiones de la carga. La tabla de cargas muestra solo «Ver detalle», y se retiró el botón inferior «Volver a cargas» del detalle. El breadcrumb y «Regresar» conservan la salida al listado.
- La revisión posterior quitó los cinco modales anteriores sin rutas y sus comandos agregados de compra, recepción, jabas y cierre; las acciones actuales escriben cada etapa por separado. Los seis indicadores del listado se muestran individualmente en una sola fila amplia, sin paginador. El detalle también consulta el checklist de llegada y la guía de salida reportados por el chofer desde `recepcion_planta.checklist`. Se añadieron validaciones V1 de ventana de llegada, horario de descarga y devolución de jabas; las pruebas mantienen las compras liquidadas intactas.
- Después del cierre administrativo, Compras, Recepción, Jabas y Documentos pasan a consulta porque V1 rechaza cualquier actualización de `recepcion_planta`. La acción «Preparar entrega» del prototipo no se replica como alta paralela: en V1 la carga ya se crea en Cosecha y Calidad, y Logística trabaja sobre esa misma carga y su coordinación para conservar un solo registro relacionado.
- La revisión de fidelidad distingue el estado logístico del último reporte del chofer: la tabla muestra la fecha de ese reporte (y su observación cuando existe), mientras el detalle identifica el indicador de cierre como estado logístico. Se retiró la escritura local alternativa de `logistics.store.ts`; las acciones de las vistas usan únicamente comandos V1, también durante las pruebas.
- El checklist documental considera «Llegada registrada» solo cuando existe la hora real de llegada de Logística, como en el prototipo. En la evaluación de una carga con un único proveedor, el peso en planta se asigna a ese proveedor sin pedir un desglose duplicado; para varias participaciones se conserva la captura explícita y la suma obligatoria.
- V1 permite más de una participación de carga para un mismo proveedor. Logística agrupa sus kilos y bultos por proveedor antes de presentar el desglose de recepción, de modo que una sola compra conserva sus kilos reconocidos sin duplicarlos; hay una prueba con dos participaciones del mismo proveedor.

## Guías por carga en Cosecha y Calidad — 2026-11-02 · Completo

- «Ver detalles» abre ahora una ruta propia para la guía, sin banner informativo. La ficha muestra todos los campos del formulario, incluyendo rol de origen, tipo de fruta, peso bruto, bultos, puntos de partida/llegada y observaciones, y vuelve directamente a la lista de guías de esa carga. «Editar guía» abre el formulario con el registro persistido; la generación condicionada de guías sigue disponible desde el detalle. Se comprobó el mapeo V1 de edición y la ruta/breadcrumb con pruebas de integración y tipos.
- «Ver detalles» presenta todos los datos que captura el alta: proveedores con finca, rol, condición y kilos; número, fechas, peso, unidad y bultos; RUC, razón social, MTC y placa; tipo/número de documento, nombres, apellidos y licencia del conductor; UBIGEO, dirección y código de establecimiento de partida y llegada; normas y su texto, u observaciones de Industria. Los datos ausentes se distinguen como no registrados. La prueba V1 edita una guía existente y comprueba que el mapper recupera esos campos, incluyendo normas y MTC, para «Ver» y «Editar».
- Registro MTC: la precarga ahora usa `empresa_transporte_externo.registroMtc` cuando existe y el campo sigue editable, como en el prototipo. La etiqueta dice «condicional», no «opcional»; V1 admite `mtcSnapshot: null` y el prototipo no define una condición automática para exigirlo, por lo que no se inventa una validación basada en el tipo de transportista.
- Auditoría del tramo final contra `remission-editor.tsx`: se retiraron «Código del producto» y «Descripción detallada del bien», que estaban en el estado interno del prototipo pero no en su modal. El estado «Lista para generar» y el bloqueo de emisión ya no dependen de `contenido.productCode`; comprueban los datos efectivos de la guía. Para fruta orgánica, el formulario usa el catálogo V1 de normas, permite seleccionar varias y muestra de solo lectura las frases del prototipo sin repetir emisores. Observaciones se muestra en Industria, según su flujo. Se añadió Pasaporte a los tipos de documento del conductor que ya ofrece el prototipo. El número de guía permanece como entrada manual por el requisito del contrato V1 acordado con el usuario.
- Corrección de la precarga del conductor: el alta toma nombres, apellidos, documento y tipo de documento de `persona` vinculada al chofer V1; `chofer_transporte_externo.nombre` es un nombre completo y no se coloca entero en el campo Nombres. Si no hay persona vinculada, los campos separados quedan vacíos para que el usuario los complete. Las guías sintéticas existentes conservan nombres y apellidos separados en `contenido`.
- Revisión de precargas del alta: una guía nueva inicia sin proveedores ni kilos seleccionados; cada proveedor muestra su rol y condición de fruta derivados del vínculo de campaña y del canal, como en el prototipo. El número lo ingresa el usuario al guardar porque `CreateGuiaRemisionV1.numero` es obligatorio y V1 no expone un consecutivo; se quitó la selección manual de rol/tipo de fruta. La fecha de inicio propone la fecha programada de la entrega y se puede corregir. La fecha real de entrega al transportista inicia vacía y es opcional en V1. La edición conserva los datos previamente guardados.
- Para probar varias guías con la carga `CAR-DEMO-1`, la guía sintética `T001-00000001` asigna 300 kg y 200 kg a sus dos proveedores (500 kg en total, 25 bultos). La carga conserva 1,000 kg; los otros 500 kg quedan disponibles en el mock V1 tras reiniciar Vite. No afecta datos del backend real.
- Ajuste final de la interfaz: la columna Acciones de cargas y guías tiene ancho acotado; Ver, Editar y Eliminar se muestran directamente en la fila cuando corresponden. La página de guías tiene una sola acción principal, «Agregar guía». La generación de borradores se ofrece en el detalle de una guía pendiente y únicamente se habilita si todas las guías están listas y todos los kilos de la carga están distribuidos.
- El modal de alta/edición se contrastó con `remission-editor.tsx` del prototipo: mantiene proveedores y kilos, traslado, transportista, conductor, partida/llegada, bienes, normas orgánicas y observaciones. Se amplió a 900 px con bloques de dos columnas, se retiró el resumen duplicado y la supuesta glosa automática que solo mostraba códigos. Se exige fecha de entrega al transportista, apellidos y RUC de 11 dígitos; MTC queda opcional según el prototipo.
- La gestión Guías de remisión lista cargas de Exportador o Industria, con Ver detalle de carga y Preparar guía/Ver guías en cada fila. El botón superior de registro y el selector global de cargas dejan de formar parte del flujo. Cada carga abre una ruta de gestión propia con título, registro, buscador, filtro de estado y tabla de sus guías; el breadcrumb y Regresar llevan al listado de cargas del mismo canal.
- Registrar y Editar usan el formulario SUNAT existente. Cada guía puede asignar kilos propios a uno o varios proveedores de la carga; los kilos disponibles descuentan las demás guías. La asignación se persiste en `proveedor_guia.kilosAsignados` y se rehidrata para ediciones. Se impide exceder los kilos cargados por proveedor; el peso bruto debe cubrir al menos la fruta asignada. El estado de borrador se deriva de los datos ya guardados en `contenido` y las guías emitidas no se editan. Los datos del formulario que no tienen columna propia (tipo de documento y nombres del conductor, rol, tipo de fruta y denominación) se conservan en el `contenido` JSON ya previsto por V1. Editar no duplica la glosa automática en Observaciones.
- Ver detalles muestra la guía concreta. Eliminar exige confirmación y solo se ofrece a borradores; elimina primero relaciones con proveedores y normas, luego la guía mediante los recursos V1 existentes. Las emitidas permanecen intactas. La prueba de integración de desarrollo cubre dos guías para un proveedor, rechazo de sobreasignación y eliminación de un borrador.
- El formulario guarda borradores. El detalle de una guía pendiente permite Generar guías cuando todos los borradores están completos y la suma de kilos asignados cubre toda la carga; el comando V1 repite esa validación antes de emitir. Para una asignación parcial de proveedor, el número de bultos queda vacío y se captura explícitamente; solo se precarga desde la carga cuando se incluyen todos sus kilos.
- Al seleccionar un proveedor, Calidad propone sus kilos reales disponibles y actualiza el peso bruto. La precarga de bultos suma cargados y vacíos usando los datos que ya devuelve V1. El mock también conserva los kilos y bultos por proveedor al editar la carga desde el portal del chofer.
- En Exportador, la emisión rechaza una finca de la entrega cuyo MTD Ceratitis vigente supera 0.5. El texto del formulario que afirmaba un formato UBL y serie SUNAT específicos se retiró porque no se genera ese documento desde esta vista. Se conservan los campos y la acción V1 de emisión existentes.

## Detalle de carga en Cosecha y Calidad — 2026-11-02 · Completo

- Se revisó el prototipo de Exportador e Industria: Industria abre el detalle de carga en un modal y Exportador lo resume dentro de su operación; no hay una ruta dedicada para cada carga. La acción Ver detalles de la vista Carga conserva un modal propio.
- El detalle ahora muestra kilos cargados frente a programados, inversión total, fecha, destino, transporte y responsable. Desglosa por proveedor y finca la variedad, kilos y tipos de bulto con cantidades cargadas y vacías. Los gastos con importe positivo y las observaciones se muestran solo cuando existen; en Industria se incluye la evaluación y el motivo de rechazo cuando corresponde. Se retiró la repetición de campos de la vista anterior y la guía mantiene su detalle separado.

## Formulario completo de carga por proveedor — 2026-11-02 · Completo

- Se contrastó Registrar carga con `docs/Campaign Management System/src/load-registration.tsx` y `load-expenses.tsx`. El formulario muestra la entrega elegida y su transporte coordinado, evaluación industrial cuando corresponde, fecha de carga actual preseleccionada al registrar y responsable, los proveedores y fincas de esa entrega, variedad, kilos y selección de Jabas/Bines/Mallas con cantidades cargadas y vacías por proveedor. El resumen Total del camión aparece debajo de los proveedores y suma únicamente los tipos marcados.
- Viáticos conserva movilidad e insumos con su total. Gastos de carga conserva Cuadrilla y Anotadores con su total. Observaciones usa `Textarea`. Se usan `AppModal`, `ModalSection`, `FormField`, `InputField`, `InfoField`, `Checkbox` y los selectores compartidos; el DTO y el comando V1 existentes no se ampliaron.
- El contrato V1 persiste cantidades de bultos, sin una marca independiente para el tipo elegido. Por eso cada tipo marcado exige al menos una unidad cargada o vacía; los tipos desmarcados se guardan en cero y no se reactivan al editar. La entrega sin proveedores coordinados no se puede guardar.

## Banner de contexto en Cosecha y Calidad — 2026-11-02 · Completo

- Las gestiones Análisis y revisión, Carga y Guías de remisión muestran el banner superior de su campaña y canal, con estado, fechas, fruta y total de registros. Se reutiliza `ContextBanner` y la imagen de fruta que ya usa la tabla de Calidad, siguiendo el patrón de las sub vistas de Campañas. El resumen de campaña, que funciona como página de detalle, permanece sin banner.

## Ajuste visual de MTD en Análisis — 2026-11-02 · Completo

- El estado conforme del MTD ahora usa la ayuda gris pequeña de `InputField`; una lectura superior a 0.5 conserva un aviso breve rojo debajo del campo. El valor previo de la finca se muestra como ejemplo gris al registrar una muestra y debe ingresarse explícitamente; al editar, el valor real guardado permanece como dato del campo. La evidencia existente se conserva solo si el valor ingresado coincide con la medición previa; otro valor exige una captura nueva.
- La captura del MTD usa la variante horizontal de `FileDropzone` tanto en el formulario como en la lectura de detalles. El valor y la captura siguen en una misma fila en escritorio.
- La etiqueta del campo y la ficha de detalle muestran solo `MTD Ceratitis`, sin el texto de unidad entre paréntesis.

## Ajuste de Análisis, Carga y Guías — 2026-11-02 · Completo

- En el modal de Análisis se retiró la referencia visible de trampa: proviene de una medición MTD existente y no es un dato que el prototipo solicite al registrar el análisis. Al guardar se conserva el valor de la medición seleccionada. La muestra, el control fitosanitario y el resultado de laboratorio están separados; Observaciones es un área de texto.
- El MTD Ceratitis muestra su estado con límite 0.5: hasta 0.5 cumple; por encima se puede registrar el hallazgo y la captura, pero la finca queda restringida para cosecha. La regla se prueba en `qualityAnalysis.utils.test.ts` y coincide con el control existente de preparación de cosecha.
- Las tablas de Análisis, Carga y Guías usan el patrón visual de Campañas: `TableCard`, banda verde, acento de fila, `TableRowLead`, acciones alineadas y tarjetas móviles. Todas las filas filtradas se muestran sin paginador. Los modales de Carga y Guías ya usan `ModalSection` y `Textarea` para observaciones; se conservaron sus campos y flujos.
- Verificación de esta revisión: 334 pruebas aprobadas en 60 archivos, `npx tsc --noEmit -p tsconfig.app.json`, ESLint de archivos tocados y `pnpm build` aprobados. Se comprobó visualmente la tabla sin paginador, el modal por secciones y el aviso para MTD 0.6. La nota de compilación bloqueada en el hito anterior corresponde al estado de ese hito; el build actual sí pasa.

## Vistas operativas de Cosecha y Calidad — 2026-11-02 · Completo

- Análisis y revisión ahora lista muestras por campaña, productor y finca, siguiendo el prototipo de `docs/Campaign Management System`. Registrar, Editar y Ver detalles usan un formulario específico; el resultado y el informe pueden quedar pendientes. El MTD y su evidencia se reutilizan solo para la finca seleccionada; cambiar el valor exige una captura nueva. Se corrigió el envío de `cxpId` redundante en el cuerpo de análisis y se enlaza la evidencia a la medición con el servicio documental existente.
- Carga y Guías tienen título, descripción, registro, buscador primero, filtros y una tabla con orden por fecha, exportación y páginas de ocho filas, en Exportador e Industria. Las filas ofrecen Ver detalles y Editar. Registrar carga selecciona una entrega coordinada sin carga; registrar guía selecciona una carga existente. Los formularios muestran errores de guardado y bloquean envíos duplicados; validan kilos, envases y gastos. Las guías permiten seleccionar proveedores y usan el catálogo real de normas.
- Las gestiones no muestran banners ni indicadores superiores. El resumen conserva sus métricas; se retiraron del componente de resumen las tablas y formularios operativos duplicados que ya no se utilizaban.
- Datos sintéticos exclusivos del middleware de desarrollo: `json/quality-demo.json`, aplicado explícitamente desde el plugin de Vite, con 12 análisis, tres cargas, dos guías y entregas disponibles en ambos canales. Conserva relaciones con los proveedores, fincas, clientes, contratos y transporte existentes. No inserta datos en la base real ni agrega respaldos ficticios a las vistas. Los adjuntos del mock conservan nombre y contenido en memoria para permitir previsualización después del guardado.
- Verificación: 332 pruebas aprobadas en 59 archivos, incluyendo tres nuevas pruebas del flujo completo con fixtures de calidad; ESLint aprobado. Para ejecutar las pruebas históricas se sustituyó `VITE_API_BASE_URL` solo en el proceso por `http://localhost:3000/`, porque el `.env` local con `/mock-api/` activa V1 también en esas pruebas. Recorrido visual de análisis, edición y guardado de muestra pendiente, cargas y selección de entrega en Industria.
- Compilación final bloqueada por un cambio concurrente fuera del módulo: `src/shared/layout/ModuleLauncher.tsx:5` conserva el import `cn` sin uso (TS6133); una comprobación anterior detectó `enabled` en `Hint`, ya retirado por el cambio concurrente. No se modificaron esos archivos compartidos. La comprobación de tipos del módulo había pasado antes de ese cambio concurrente; no se declara aprobado el build global.

## Breadcrumb breve de Cosecha y Calidad — 2026-11-01 · Completo

- Las rutas propias muestran solo el nombre de la vista en el último nivel: Análisis y revisión, Carga, Guías de remisión o Resumen de campaña. El canal Exportador/Industria sigue en la URL y en el contexto de la página, sin repetirse en el breadcrumb.
- Se mantienen el enlace al listado y el regreso directo; no cambian rutas, datos ni formularios.

## Vistas independientes de Cosecha y Calidad — 2026-11-01 · Completo

- Las acciones de campaña del listado abren rutas propias: Exportador tiene Análisis y revisión, Carga y Guías de remisión; Industria tiene Carga y Guías de remisión. Ver detalles abre un resumen separado, sin pestañas operativas ni banner superior.
- Cada gestión tiene título, botón de registro y tabla. Los botones de registro eligen una entrega o carga existente y reutilizan los formularios V1; Guías de remisión ahora lista las guías en tabla en lugar de tarjetas por carga. No se agregaron campos ni endpoints.
- El breadcrumb y el respaldo de Regresar llevan directamente al listado de Cosecha y Calidad, sin insertar Detalle como paso ficticio. Las rutas inválidas y Análisis en Industria muestran error de página.

## Botón superior para completar entregas — 2026-11-01 · Completo

- Se restauró Completar datos de entrega en el encabezado de Gestión de Entregas. Abre un formulario con selector de entregas programadas que todavía no tienen datos de transporte, proveedores y fincas; se deshabilita cuando no hay ninguna disponible.
- Las acciones de cada fila siguen siendo solo Ver detalles y Editar. La tabla y el detalle no muestran un estado de coordinación. Editar abre directamente la entrega seleccionada y conserva sus datos si ya fueron guardados.
- Se reutiliza el guardado V1 existente; el selector del botón superior es un control del formulario y no una acción adicional de fila.

## Edición de entregas de campaña sin estado visual — 2026-11-01 · Completo

- Gestión de Entregas muestra solo Ver detalles y Editar por fila, tenga o no datos de transporte. Se retiraron la acción Completar datos, el botón superior, la columna y las etiquetas de Coordinación, y el contador de entregas por completar.
- Editar abre directamente la entrega elegida: si aún no tiene transporte, proveedores ni fincas, el formulario inicia vacío; si ya se guardaron, carga esos datos para modificarlos. Se eliminó el selector de entregas y su campo de validación porque ya no existe un flujo de alta separado.
- Ver detalles conserva la información programada y muestra los datos operativos registrados cuando existen, sin presentar un estado de coordinación. El contrato y los endpoints V1 permanecen iguales.

## Datos ficticios para completar entregas — 2026-11-01 · Completo

- Se agregaron dos entregas programadas sin coordinación al contrato 2 de Mango 2026 en `json/v1-demo/entrega_programada.json`: 600 kg y 900 kg, dentro de los 1,500 kg acordados. El mock V1 de desarrollo las muestra como pendientes en Gestión de Entregas para probar Completar datos.
- Los datos se cargan solo con `/mock-api/` durante `pnpm dev`; no se añadió respaldo ficticio a la vista conectada ni se modificó el contrato del backend.

## Precarga de coordinación al elegir una entrega — 2026-11-01 · Completo

- La entrega de la captura estaba marcada `Completa`: ya tenía una fila en `coordinacion_entrega` con transportista, camión, chofer y fechas, más orígenes con proveedor y finca. Esos datos se proyectan a `delivery.coordinacion`; no provienen de los campos de programación (fecha, kilos, destino y observaciones).
- El modal de Completar permitía elegir entregas completas y cargaba su coordinación existente. Ahora ofrece únicamente pendientes; al seleccionarlas, transporte, fechas y proveedores permanecen vacíos para captura manual. Las completas se consultan o modifican desde las acciones Ver detalles y Editar de su fila.
- El botón superior se deshabilita cuando no hay pendientes, y la acción de una fila pendiente se llama Completar datos. La edición de una entrega ya coordinada conserva la precarga legítima de sus datos guardados.

## Banner en páginas de detalle — 2026-11-01 · Completo

- Retirado `CampaignContextBanner` de `/campaigns/:id/clients/:clientLinkId`, la página abierta por Ver detalles en Gestión de Clientes. Su ficha y métricas ya aportan contexto suficiente.
- Auditadas las demás páginas con ruta propia abiertas por Ver detalles: campaña, proveedor de campaña, proveedor global, cliente comercial y transportista. No montan `ContextBanner`. Las sub-vistas de gestión conservan sus banners de contexto.
- `docs/design-system.md` ahora prohíbe explícitamente el banner superior en cualquier futura página de Ver detalles con ruta propia, incluso cuando la ruta está anidada.

## Auditoría transversal de rutas y navegación — 2026-11-01 · Parcial

- Revisadas todas las rutas registradas en `App.tsx`, sus breadcrumbs, destinos de `Regresar`, accesos directos desde tablas y enlaces de las páginas de campaña, proveedores, transporte y gestión comercial. Los breadcrumbs de fincas/certificados, exámenes/entrevistas, vehículos/choferes y secciones de campaña ya omitían los detalles intermedios; el defecto adicional estaba en el respaldo de `Regresar` al abrir una URL directa.
- Ajustado ese respaldo para que las secciones de campaña vuelvan al listado de campañas, exámenes/entrevistas al listado de proveedores de campaña y fincas/certificados al listado global de proveedores. Con historial de navegación se conserva el regreso a la vista realmente visitada. Los estados de error de esas sub-vistas y de certificaciones de campaña ofrecen el mismo destino de listado; el programa semanal ahora ofrece regreso en error.
- Corregido el botón Programa semanal de Entregas de la Campaña: apuntaba a `/weekly-program`, ruta no registrada, y ahora usa `/weekly-delivery-program`. Pruebas de rutas cubren accesos directos, breadcrumb sin niveles ficticios y regreso con/sin historial. Auditoría de código; queda pendiente recorrido visual por cada módulo en navegador.

## Auditoría del breadcrumb de contratos y entregas — 2026-11-01 · Completo

- La ruta de Contratos se abre directamente desde Gestión de Clientes, sin pasar por Detalle. El breadcrumb anterior insertaba Detalle por la forma de la URL y mostraba un paso que el usuario no recorrió; se retira de Contratos y Entregas. Detalle conserva su breadcrumb cuando se abre su página propia.
- El regreso con historial sigue volviendo a la vista realmente visitada. Al abrir Contratos por URL directa, el destino de respaldo vuelve a Gestión de Clientes; desde Entregas vuelve a Contratos. Se actualizaron las pruebas de rutas para ambos casos.

## Detalle de cliente en campaña — 2026-11-01 · Parcial

- `Ver detalles` en Gestión de Clientes abre `/campaigns/:id/clients/:clientLinkId`, una página independiente con ficha comercial, datos del vínculo, documentos, resumen de contratos y entregas y acceso a sus vistas de gestión. La edición del vínculo permanece disponible en su modal.
- La página usa la relación cargada por `getClientesNegocioCampana`, el catálogo de campaña y las proyecciones de contratos/entregas ya existentes. No se agregaron campos ni endpoints y no se usa demo como respaldo de V1.
- Se añadieron la ruta y su breadcrumb propios. Contratos se mantiene como acceso directo desde Gestión de Clientes, y Entregas desde Contratos. Falta recorrido visual en navegador y comprobación contra backend activo.

## Cotización al vincular transportista — 2026-11-01 · Parcial

- En el modal de transportistas de campaña se retiró el bloque de ubicación y contacto que aparecía al elegir un transportista. Se añadió el selector y la vista previa de la cotización.
- Por elección del usuario, en V1 el archivo seleccionado es solo local y el formulario lo advierte: el vínculo se guarda sin archivo. No se amplió el backend ni se modificó la restricción general de adjuntos; `FileDropzone` permite esta selección local únicamente mediante una propiedad explícita.
- La cotización se exige antes de vincular en ambos modos. En legacy se conserva en el almacén local en memoria. La persistencia del archivo en V1 queda pendiente de contrato de subida y asociación al acuerdo.

## Regreso al selector de módulos sin recrear imágenes — 2026-11-01 · Parcial

- El selector se desmontaba al salir de `/modules`; la precarga durante la bienvenida no conservaba sus nodos de imagen. Se mueve la portada al layout autenticado dentro de `Activity` de React: visible en `/modules` y oculta en las demás rutas, conservando su DOM durante la sesión. Su Suspense queda aislado del contenido operativo.
- La ruta `/modules` deja de montar una segunda portada. El selector permanece fuera de `FrontendDataBoundary`, por lo que mostrarlo no depende de las solicitudes operativas. Se conserva la configuración sin caché ni Service Worker y no se modifican consultas ni datos de negocio.
- Verificado en Brave: selector → Campañas → Mango 2026 → Gestión de Clientes → selector mediante el logo. Las diez imágenes de la portada permanecieron en el DOM bajo ancestros ocultos durante la navegación y estaban completas, con dimensiones naturales válidas, al regresar. Captura visual revisada. No se midieron tiempos de pintado ni tráfico de red; no se garantiza el comportamiento bajo presión de memoria del navegador.
- Pruebas: 280 aprobadas en 53 archivos; tipos y ESLint de `App.tsx` aprobados. El cambio conserva la portada en memoria mientras siga montada la sesión autenticada; no evita la carga inicial de una pestaña nueva o una recarga completa.

## Cierre de acuerdo de transporte con adelanto — 2026-11-01 · Sin cambios / requiere definición

- El usuario solicita recuperar Marcar saldo como pagado solo para acuerdos con adelanto y bloquear su edición y nuevos adelantos al finalizar.
- El contrato V1 de acuerdo admite BORRADOR/CONFIRMADO; no incluye cierre manual ni un campo saldoPagado persistible. La proyección actual calcula saldoPagado con pagos reales y `settleAgreement` rechaza explícitamente el cierre manual, remitiendo a Liquidación de compra.
- Requiere definir si la acción registra un pago real del saldo o constituye un cierre administrativo independiente, y ajustar el contrato/backend correspondiente. No se reactivó un botón sin persistencia ni se simuló un pago o cierre local.

## Breadcrumb y regreso de gestiones de transporte — 2026-11-01 · Completo

- Corregida la jerarquía de las páginas independientes: Transporte → Vehículos y Transporte → Choferes, sin el nivel Detalle. El enlace Transporte lleva a `/transportistas`.
- Regresar desde ambas gestiones lleva directamente al listado `/transportistas`, tanto con historial de navegación como al abrir/recargar una URL directa. Las demás vistas mantienen su comportamiento de regreso.
- Pruebas de regresión cubren ambas páginas, con/sin historial y conservación del comportamiento fuera de estas rutas. Comprobación automatizada; sin recorrido manual en navegador en esta corrección.

## Páginas independientes de vehículos y choferes — 2026-10-31 · Parcial

- Por corrección expresa del usuario, se revierte la restauración de pestañas globales descrita abajo: `CarriersPage`, cotizaciones, solicitud de transporte y sub-vistas globales vuelven al estado del pull. El historial inferior registra el trabajo anterior, no la interfaz vigente.
- Añadidas `CarrierVehiclesPage` (`/transportistas/:id/vehiculos`) y `CarrierDriversPage` (`/transportistas/:id/choferes`). Las acciones Vehículos y Choferes del listado abren estas páginas independientes; Ver detalles conserva la ficha del pull.
- Cada página muestra contexto del transportista, título de gestión, botón Agregar, buscador y tabla propia. Se reutilizan las tablas y formularios actuales del detalle, sin las pestañas ni los padrones globales antiguos. Altas, ediciones y eliminaciones usan los servicios existentes de `carrier.api`, incluida su conexión V1; se mantienen validación, confirmación de borrado y errores reales sin fallback mock.
- Registradas ambas rutas en breadcrumbs y escalera de regreso. Las tablas conservan su marco al cargar o fallar y ofrecen reintento. La edición de vehículo precarga su volumen explícito.
- Verificación: 277 pruebas aprobadas en 53 archivos, tipos y ESLint sin hallazgos. Build aprobado usando `VITE_API_BASE_URL=http://localhost:3000` solo en el proceso, sin modificar `.env`; permanece el aviso de tamaño de chunk. Pendiente recorrido en navegador y persistencia contra backend activo. Los cambios locales previos en `dev/mock-api.ts` y `navigationItems.ts` se conservan.

## Restauración de gestiones de transporte — 2026-10-31 · Parcial

- Restauradas en `/transportistas` las sub-vistas Vehículos, Choferes y Requerimientos y cotizaciones. Las acciones de cada transportista abren los padrones independientes con filtro por empresa (`?tab=vehiculos&carrier=:id` / `?tab=choferes&carrier=:id`); Ver detalles conserva la ficha general.
- Los padrones reutilizan `carrier.api` y los recursos V1 existentes para altas, edición y eliminación. Incluyen confirmación al eliminar, bloqueo de eliminaciones repetidas y estados de carga/error con reintento. La edición de vehículo conserva su volumen independiente de las dimensiones.
- Eliminada la generación ficticia de DNI/licencias del padrón: documento indica No disponible y licencia usa `numeroLicencia` de la API, si existe. No se agregaron campos de escritura ni endpoints.
- Recuperado el registro de solicitudes con selección de destinatarios dentro del modal y las respuestas de cotización mediante los comandos V1 existentes. El guardado muestra errores y evita envíos duplicados. La asignación de unidades continúa en la coordinación de entregas de la campaña, según el contrato vigente.
- Adjuntos y correo siguen pendientes de soporte; la UI no presenta el registro de una invitación como un correo enviado. No se verificó persistencia contra un backend en ejecución ni se realizó recorrido en navegador.
- Verificación: 278 pruebas aprobadas en 53 archivos, tipos y ESLint de los archivos modificados aprobados. Build aprobado usando `VITE_API_BASE_URL=http://localhost:3000` solo en el proceso de compilación, sin cambiar `.env`; la configuración local de mock no admite build productivo. Permanece la advertencia de tamaño de chunk.

## Auditoría de navegación de transportistas — 2026-10-31 · Sin cambios

- El reflog local confirma que el pull de `master` pasó de `7589cef` a `60c1a5a`. Dentro de ese rango, `4414ac0` retiró de `CarriersPage` las pestañas globales Vehículos, Choferes y Requerimientos y cotizaciones. Sus componentes `CarriersGlobalVehiclesSubView`, `CarriersGlobalDriversSubView` y `CarriersQuotationsSubView` siguen presentes, pero no tienen consumidores en `src`.
- Ese mismo commit sustituyó las acciones de fila Registrar vehículo / Registrar chofer (modales directos) por Vehículos / Choferes, que navegan al detalle `/transportistas/:id?tab=vehiculos` o `?tab=choferes`.
- En el historial disponible no se encontraron páginas de ruta eliminadas dentro de `src/modules/carriers/pages`: las gestiones globales eran sub-vistas en `components`, no páginas adicionales. Las pestañas globales existían antes de `4414ac0`, aunque no estaban aún en el checkout local previo al pull (`7589cef`).
- Auditoría de código e historial; no se restauraron vistas ni se alteraron flujos o contratos.

## Plan de cierre funcional — 2026-11-01 · Completo

1. **Roles (`Administrador` y `Chofer`)** — Completo: `AuthService.seedDefaultRolesAndUsers`, esquemas SQL (`03_schema_total.sql`, `05_seed_reference_catalogs_production.sql`) y `V1DatabaseService.list('rol')` restringidos exclusivamente a `Administrador` y `Chofer`. Cuenta compartida de chofer configurada como `chofer` (`DRIVER_SHARED_USERNAME=chofer`), vinculando conductores activos y nuevos.
2. **Fincas y múltiples variedades** — Completo: cada proveedor puede registrar múltiples fincas y cada finca conserva su variedad directamente en `agro.finca.fruta_derivada_id` (sin tabla intermedia `finca_variedad` ni vistas adicionales). Adaptados los flujos de campaña (`campaignCommands.interview`), calidad (`QualityLoadFormModal.tsx`, `qualityCommands.saveLoad`) y portal del chofer (`DriverLoadDataModal.tsx`, `PATCH /api/chofer/cargas/:id/datos`).
3. **Documentos obligatorios (`*`) y almacenamiento local** — Completo: servicio local autenticado (`/api/archivos-locales` y `/api/archivos-locales/vinculos`) con almacenamiento en `epe-backend/uploads`. Validación obligatoria (`*`) aplicada en formularios y validadores de requerimiento de transporte (`CarrierSendRequirementModal.tsx`), exámenes de laboratorio con resultado (`campaignExam.ts`), emisión de factura (`BillingIssueInvoiceModal.tsx`) y cierre documental de logística (`LogisticsDocumentsClosureModal.tsx`).
4. **API sin versionado (`/api/...`)** — Completo: frontend (`usesV1() => true`) y backend unificados en `/api/...` con validación JWT y permisos por rol (`Administrador` / `Chofer`). Añadido `GET /api/auth/usuarios/:id` para resolver el nombre completo del responsable de campaña en edición (`CampaignFormModal.tsx`) incluso cuando pertenece a otro usuario.
5. **Monedas (`PEN` y `USD`) y columnas anulables de conteo/kilos** — Completo: soporte de `PEN` y `USD` validado en código de aplicación (backend `V1BusinessService` y frontend, sin restricciones `CHECK (moneda ...)` en base de datos) en participaciones de compra, acuerdos de transporte, cotizaciones de transporte (`CarriersQuotationsSubView.tsx`, `quotationCommands.respond`), contratos comerciales, certificaciones, facturas y liquidaciones, bloqueando monedas distintas (`INVALID_CURRENCY`) y mezclas de moneda con el documento origen (`CURRENCY_MISMATCH`), y calculando UIT en código con conversión `S/ 3.70` por USD. Las columnas `capturas`, `trampas` y `dias_exposicion` en `agro.medicion_mtd` y `kilos_iniciales` en `agro.certificado_campana` son anulables (`NULL`) sin `CHECK` de base de datos. El [SQL fuente del contrato](api/contract-schema.sql) y el OpenAPI generado reflejan esa estructura.
6. **Correo con Resend (solicitudes de transporte y recuperación de contraseña)** — Completo:
   - **Recuperación de contraseña**: el flujo de contraseña temporal fue sustituido el 12/11/2026 por el enlace de un solo uso. Consulta el [contrato vigente](api/README.md#recuperación-de-contraseña).
   - **Solicitudes e invitaciones de transporte**: `TransporteV1Service.createInvitacion` (`POST /api/solicitudes-transporte/:id/invitaciones`) conectado a `ResendService` con clave de idempotencia y reversión automática de la invitación si falla el envío. En `CarriersPage.tsx` se habilitaron selección de empresas, botón y modal `"Enviar requerimiento"` con adjunto obligatorio (`*`) y pestaña `"Solicitudes y cotizaciones"`.
   - **Estado del proveedor Resend**: verificado `GET https://api.resend.com/domains` con `RESEND_API_KEY` configurada (HTTP `200`, remitente `Agro Exportaciones <agroexportadores@adkventurie.com>`, 2 dominios registrados).
7. **Verificación integral de cierre**:
   - **Frontend (`epe-web`)**: **55 archivos / 281 pruebas aprobadas** (`vitest run`), `tsc -b && vite build` aprobado y `eslint .` aprobado con **0 errores y 0 advertencias**.
   - **Backend (`epe-backend`)**: **24 archivos / 91 pruebas unitarias aprobadas**, **3 archivos / 23 pruebas E2E aprobadas** en base aislada temporal `epe_e2e_cierre_20261101` (creada y eliminada automáticamente sin tocar `desarrolloEPE`), `nest build` aprobado y `oxlint` con **0 errores**.

## Responsable de campaña asociado a una cuenta — 2026-11-01 · Completo

- En el contrato actual, el alta envía `responsableUsuarioId` con el administrador de la sesión; la edición conserva el responsable guardado y consulta `GET /api/auth/usuarios/:id` cuando difiere del usuario en sesión para mostrar su nombre completo.
- Verificación: pruebas unitarias, integración V1 (`dev/frontend-v1.test.ts`) y E2E (`test/v1-api.e2e-spec.ts`) aprobadas.

## Responsable libre de campaña — 2026-11-08 · Integrado en frontend

- **Interfaz:** el alta envía el nombre opcional a la API. El detalle y la consulta dentro de Editar campaña muestran el nombre guardado. Si está vacío, muestran el usuario asociado o «Sin asignar».
- **Demo:** el servidor ficticio aplica el mismo recorte y admite `null`. Los datos de ejemplo existentes incluyen el campo con valor `null`.
- **Verificación:** la prueba de integración con la API local simulada cubre el alta, una lectura posterior y una edición de otro campo. La escritura en un despliegue real queda por verificar. [Contrato y ejemplo](api/README.md#responsable-libre-de-campaña).

## Carga de datos por vista — 2026-10-30 · Parcial

- El selector `/modules` ya no inicia la carga del contexto operativo; tampoco espera a que termine una carga anterior. La inicialización del contexto evita ejecutarse dos veces por el montaje de StrictMode.
- Las demás rutas V1 todavía dependen del contexto operativo global: al entrar en una de ellas se consultan recursos de varios dominios y se vuelven a consultar tras operaciones remotas. Separar esas dependencias por vista requiere adaptar las proyecciones y comandos que comparten `operationsContext`; no se considera resuelto el objetivo completo de solicitudes por vista.

## Verificación de calidad ISO/IEC 25010 — 2026-10-30 · Parcial

**Alcance:** frontend y backend V1 locales. El usuario confirma que probó el flujo completo y que funciona; se acepta esa validación funcional y no se requiere repetir el recorrido como pendiente de esta revisión. Las pruebas técnicas de autenticación de ambos perfiles se detallan abajo. SUNAT real queda fuera del alcance; S3 no se volvió a probar mientras falten permisos. Los resultados siguientes no constituyen una certificación ISO ni una aceptación integral de producción.

- **Navegación:** en Chrome y con una sesión de administrador existente se abrieron en modo lectura las ocho pantallas principales: proveedores, campañas, comercial, transporte, calidad, logística, liquidación y facturación. Se observaron sus listas y navegación sin crear, editar, pagar ni borrar registros. Esto no repite el ciclo completo ni verifica el portal del chofer después de la carga diferida.
- **Accesibilidad:** a 390 × 844 se inspeccionaron el selector y campañas. Los campos compartidos de búsqueda y fecha carecían de nombre accesible; se añadieron etiquetas y se comprobó en el árbol de accesibilidad que se anuncian la búsqueda y las fechas. La tecla Tab avanzó desde búsqueda a Fecha inicio. No se realizó auditoría completa de WCAG, contraste, lector de pantalla o todas las vistas móviles.
- **Pruebas:** frontend 274/274 pruebas aprobadas en 52 archivos; build, tipos y ESLint aprobados. Backend 71/71 pruebas aprobadas en 19 archivos, incluidas cinco de integración de autenticación; E2E 14/14 en dos archivos y build aprobado. Oxlint terminó sin errores, con 11 advertencias `unicorn/no-thenable` sobre las opciones `then` de Joi en `app.module.ts`. La suite V1 fue actualizada para obtener JWT de administrador y chofer y la prueba de autorización comprueba que una cabecera `x-role` no eleve el perfil del chofer. El entorno E2E usa contraseñas de prueba y exige una base cuyo nombre empiece por `epe_e2e_`.
- **Base y migración:** se creó PostgreSQL `epe_e2e_iso_20261030_a`, se instaló el SQL total y se aplicó la migración `AddMtdCountDetails1793400000000` directamente en QA; se verificaron `capturas`, `trampas` y `dias_exposicion`. Esto no equivale a ejecutar toda la cadena de migraciones ni acredita una base desplegada.
- **Respaldo y recuperación:** con `pg_dump` y `pg_restore` se restauró esa base en la base nueva `epe_e2e_iso_restore_20261030_a`; ambas tenían 3 campañas, 4 proveedores y 6 usuarios en el momento de comparación. El archivo temporal se eliminó; se conservaron ambas bases QA. No se comparó cada fila ni se probó la recuperación productiva, tiempos de restauración o respaldos externos.
- **Desempeño:** backend local en puerto temporal 3019 con base QA, 100 consultas GET autenticadas de `/v1/campanas`, 10 concurrentes: 0 errores, p50 44 ms, p95 327 ms, máximo 361 ms, duración total 673 ms. Es una muestra pequeña, local y de solo lectura; no representa tráfico sostenido, escritura concurrente, red remota ni volumen de producción.
- **Pendiente:** medición ampliada de rendimiento, accesibilidad y seguridad; restauración y monitoreo en un entorno operativo; prueba real S3. En Calidad se observan etiquetas «Guías SUNAT» aunque no se implementa integración SUNAT: evitar interpretar el registro interno como emisión aceptada por SUNAT.

## Calidad y verificaciones — 2026-10-30 · Parcial

- El usuario confirma que probó los flujos completos y que funcionan. El informe histórico de QA más abajo conserva las observaciones de su propia ejecución y no invalida la posterior confirmación del usuario.
- Frontend: se actualizó el fixture MTD con los tres campos de conteo nullable y se dividieron las páginas por ruta con carga diferida. El archivo JavaScript principal de producción pasó de 1.831,67 kB a 562,30 kB sin comprimir; el navegador puede descargar además módulos compartidos y los de la pantalla visitada. Permanece la advertencia de tamaño de Vite; esto no mide tiempos reales de carga.
- Backend: las pruebas unitarias de autenticación se alinearon con los guards actuales. El guard JWT consulta la cuenta en cada solicitud protegida y deniega el acceso si está inactiva o cambió su usuario o rol; por tanto, la afirmación histórica inferior sobre la desactivación y vigencia del acceso ya no describe el código actual.
- Verificación tras los cambios: frontend 274 pruebas aprobadas en 52 archivos, comprobación de tipos y build aprobados; backend 66 pruebas unitarias aprobadas en 18 archivos y build aprobado. La prueba de integración de autenticación requiere una base aislada y no se ejecutó; las pruebas unitarias reportadas la excluyen.
- S3 sigue pendiente de permisos y validación real. SUNAT no forma parte del alcance. No se han acreditado pruebas de carga, accesibilidad integral, recuperación de respaldos ni una nueva regresión integral en base QA.

## Archivos y almacenamiento S3 — 2026-10-30 · Parcial: certificado conectado; permisos AWS de escritura denegados

- Prueba real de solo lectura/escritura con las credenciales configuradas: AWS reconoce al usuario IAM `LuchitoBotS3`, pero `s3:PutObject` fue denegado por la política de identidad para el bucket `backend-epe-documentos-685538570703-us-east-1`. No se creó ningún objeto de prueba. `HeadBucket` también respondió 403; no se interpreta como prueba de credenciales inválidas, ya que AWS identificó el principal y devolvió la acción y recurso denegados en `PutObject`.
- El flujo de certificados de proveedor sí implementa el ciclo URL prefirmada → PUT directo → confirmación por `HeadObject` → descarga prefirmada y borrado. Hasta habilitar permisos S3, la carga directa fallará aunque se genere la URL. Deben revisarse permisos para `s3:PutObject`, `s3:GetObject` (incluye `HeadObject`), `s3:ListBucketVersions`, `s3:DeleteObject` y `s3:DeleteObjectVersion`, limitados al prefijo `certificados-proveedor/*` cuando corresponda. La consulta de configuración CORS fue denegada; falta verificar en la consola AWS que el origen web y `PUT` estén permitidos.
- El helper transversal `src/shared/api/uploadDocument.ts` sigue lanzando `FileUploadUnavailableError`: contratos y otros adjuntos que dependen de él no se guardan con archivo. No hay contrato general de archivos disponible para conectar estos componentes sin definir endpoints/campos. En modo V1, `FileDropzone` se deshabilita de forma intencional según el alcance documentado.
- Las suites automatizadas no pudieron ejecutarse en esta sesión porque NVM informa que no hay una versión de Node activa o instalada; `pnpm test` quedó sin salida y se interrumpió. La auditoría S3 se hizo con AWS CLI sin revelar credenciales.

## Autenticación y acceso por perfil — 2026-10-30 · Parcial: defaults definidos; falta iniciar API y confirmar creación en base

- El inicio de sesión consume `POST /api/v1/auth/login`; el perfil y la vigencia del JWT se comprueban con `GET /api/v1/auth/me`. El token queda en `sessionStorage` y el cliente HTTP adjunta Bearer en las llamadas privadas.
- La interfaz limita Administrador al área de módulos y Chofer al portal de conductor. El backend exige JWT globalmente, restringe las rutas legacy a Administrador y valida los permisos por operación V1 contra `x-roles` del contrato; sin regla explícita, V1 queda reservado a Administrador.
- En desarrollo se provisionan `admin` y `chofer` con credenciales predeterminadas documentadas en `epe-backend/README.md`. Producción requiere credenciales y datos personales propios para ambas cuentas por variables de entorno; no acepta las credenciales de desarrollo. Falta iniciar la API para confirmar la creación en la base configurada.
- El token dura una hora por defecto; la desactivación de una cuenta no revoca tokens ya emitidos antes de su expiración. La recuperación de contraseña por correo continúa deshabilitada.

---

## Recorrido E2E normal Administrador + Chofer — 2026-10-30 · Parcial: ciclo completado con observaciones

### Revisión correctiva de calidad y preparación de base — 2026-10-30 · Pendiente

- Al auditar el dato persistido de campaña 6 se encontró que CAR-6-5 permanecía **Pendiente de revisión**: solo había un análisis de laboratorio y el MTD estaba guardado como valor escalar sin capturas/trampas/días. Cosecha y carga llegaron al estado final mediante un bypass de la UI. Ese E2E histórico no se acepta como ciclo de negocio completo.
- Corregido el flujo para impedir guardar/cerrar cosecha y abrir captura de carga si Calidad no aprobó. El asistente exige MTD completo por finca, valor dentro del límite, dos tipos de análisis distintos (incluyendo Maduración o Materia seca) y todos Apto. También se agregó la misma regla de aprobación en el backend.
- Añadida persistencia `capturas`, `trampas` y `dias_exposicion` en contrato, esquema de instalación y migración `AddMtdCountDetails1793400000000`. Los registros antiguos quedan con conteos `NULL`; el backend los bloquea para nuevas aprobaciones hasta que se registre un conteo válido.
- Regresión de códigos de establecimiento de guía: se intentaron guardar campos vacíos; la UI mostró error de cuatro dígitos y no envió el guardado.
- **No se puede cerrar QA aún:** el chequeo TypeScript de ambos proyectos pasó y el contrato regenerado desde SQL pasó su verificación; el empaquetado Vite no arrancó porque el runtime no resolvió `rolldown/parseAst`. Faltan suites backend/frontend, aplicar la migración en una base QA nueva y repetir E2E completo con datos nuevos. El API local dejó de responder durante la regresión de navegador. No se modificó ni limpió el conjunto histórico QA.
- **Estado para Infraestructura:** el esquema/migración y el seed de catálogos están versionados para implementar, pero la base no tiene aún aprobación QA final ni evidencia de migración aplicada. No comunicar “base lista y validada” hasta ejecutar esa verificación. SUNAT real está fuera de alcance actual y S3 queda para una fase posterior.

La evidencia detallada se registra en [resultado E2E](evidence/qa-2026-10-30.md).

## Historial del E2E inicial — ejecución observada, no aceptación final

- En Chrome sobre `http://localhost:5173/modules` se completó campaña 6 (`QA E2E Orden Correcto 20261030`) desde el alta hasta **Terminado**, con 1,500 kg, recepción, cobro y liquidaciones registrados. El perfil de Chofer se usó después de cerrar sesión de Administrador; se registraron los cinco eventos, checklist y guía de salida, y luego se volvió a Administrador para el cierre.
- La evidencia por módulo, identificadores y valores queda en [resultado E2E](evidence/qa-2026-10-30.md). Los registros de QA se conservaron.
- La integración de vista/comando/persistencia se comprobó para las operaciones de ese recorrido. La emisión electrónica real de SUNAT, pagos bancarios y carga de adjuntos no fue verificada; los botones de adjuntos estaban deshabilitados y logística permitió cerrar con 2/6 documentos y 0/6 archivos.
- Se corrigió en el formulario de guía la obligatoriedad de los dos códigos de establecimiento (cuatro dígitos), según respuesta requerida por el backend. También se cambió el paso 5 del asistente para guardar la cosecha y abrir `Datos de carga (Anotador)` antes de la guía; una entrega temporal sin carga ahora lleva al formulario de carga. Ambas correcciones se incorporaron tras el E2E y requieren regresión específica en navegador.
- Estado: el ciclo de negocio disponible en la app pasó con observaciones. Para aprobación de producción faltan validar con negocio el requisito de documentos de cierre y certificar las integraciones externas correspondientes.

## Catálogos V1, sembrado QA y guía operativa — 2026-10-30 · Completo para alcance probado

### Correcciones aplicadas

- Añadida una migración idempotente para completar catálogos de referencia faltantes en bases `agro` ya instaladas: roles, normas, frutas, variedades y parámetros UIT 2025/2026. No modifica ni borra filas existentes; la instalación nueva conserva sus propios datos iniciales.
- Alineados los fixtures V1 con el SQL inicial: fruta Banano, 17 variedades, nombre GLOBALG.A.P./GRASP, UIT 2025 y códigos de entrevista válidos (`FVV-MANGO-n`). Las variedades agregadas incluyen sus marcas `createdAt` y `updatedAt` requeridas por OpenAPI.
- Endurecido el sembrador E2E: exige una base cuyo nombre sea `epe_e2e_*`, valida los códigos FVV antes de truncar y carga fixtures en una transacción. El script ya no oculta fallas por tablas faltantes.
- Documentado qué entidades sin CRUD son catálogos de solo lectura y cuáles se generan mediante operaciones. Se publicaron dos manuales V1 independientes, uno para Administrador y otro para Chofer, con rutas de pantalla y opciones textuales; el índice común enlaza ambos.

### Verificación

- Contrato OpenAPI: **57 recursos, 117 rutas y 60 tablas fuente**, generado y verificado.
- Backend: build aprobado; **51 pruebas unitarias** en 14 archivos y **14 pruebas E2E** en 2 archivos aprobadas; oxlint sin hallazgos.
- Frontend: TypeScript, build de producción y ESLint aprobados; **274 pruebas** en 52 archivos aprobadas. La primera ejecución detectó variedades sin campos de auditoría en los fixtures y se corrigieron antes de repetir la suite. Permanece la advertencia existente del chunk principal de 1.83 MB.
- Recorrido integrado en QA aislado: alta y relaciones de campaña, proveedor, finca, entrevista y cliente, además de despacho del chofer, contra servicios locales V1. La suite de backend se ejecutó con `DB_DATABASE=E2E_DB_NAME=epe_e2e_20261030`; no se usó la base de desarrollo.
- El alcance no certifica autenticación productiva ni módulos que la navegación mantiene como **En construcción**. Los usuarios/contraseñas y los movimientos internos no reciben valores iniciales ficticios.

---

## Correcciones y observaciones del usuario — 2026-10-29 · Completo: correcciones implementadas y verificadas en QA

Esta sección actualiza el resultado de la auditoría anterior; las secciones inferiores conservan el historial original. Se implementaron las observaciones de Sin título-2026-10-13-1630.excalidraw y las aclaraciones del usuario.

### Observaciones implementadas

| Observación | Resultado |
|---|---|
| Programa semanal | Kilos realmente cargados y fecha real de carga; excluye entregas solo programadas. Cada celda detalla su variedad y el total diario abre los clientes de ese día. No se duplican los totales de cargas con varias variedades. |
| Orden | Proveedores → Campañas → Gestión comercial → Transporte → Cosecha y calidad → Logística → Liquidación de compra → Facturación y cobros. |
| Gestión comercial | Solo Clientes; contratos dentro de su ficha y filtrados por ID. Nueva opción Vincular a campaña. Cantidad se rotuló como estimación; los kilos exactos siguen en contratos. |
| Transporte | Retiradas pestañas globales de vehículos, choferes, requerimientos y cotizaciones y envío de requerimientos. El menú de cada transportista abre sus vehículos o choferes; desde esa ficha se registra. |
| Transportistas de campaña | Vincular no exige cotización. Camión y chofer provienen de coordinaciones reales de esa campaña, sin usar el primer vehículo o datos de otra campaña. Acceso a asignación desde entregas. Quitados Requerimientos y cotizaciones y Marcar saldo como pagado de la última captura. |
| Proveedor de campaña | Retirado Fruta convencional estimada (Acopio) del formulario, sin borrar datos históricos existentes. |
| Certificaciones | Kilos iniciales propone la suma de productores seleccionados; una edición manual deja de recalcularse y se conserva al guardar y recargar. Total propio nullable, sin redistribuir kilos autorizados por productor. |
| Diagramas negros | Referencia de flujos de aplicación según aclaración del usuario. Estados de despacho de consulta en Logística; reporte de etapas en portal del chofer. No se afirma implementar autenticación o RBAC real. |

### Defectos corregidos

- QA-02, QA-07: UIT desde parámetros, sin límite monetario fijo; acumulados sin sumar dos veces el documento persistido; edición por año del documento. Sin parámetros se muestra indisponibilidad.
- QA-03: etiquetas de filtros legibles. Las vistas globales de transporte también quedaron retiradas del flujo principal.
- QA-04: validación de correo y mensaje explícito de servicio no habilitado. Recuperación efectiva pendiente del contrato de autenticación.
- QA-05, QA-06: guías envían IDs reales de proveedores y proponen datos registrados de transporte, conductor y carga. Datos legales no disponibles quedan vacíos.
- QA-08: accesos corregidos a programa semanal, calidad y facturación.
- QA-09: recepción preserva el JSON de compras y evidencias; no reescribe referencias de liquidaciones. Detectado además ISO UTC incompatible con datetime-local: ahora se presenta en formato local y conserva el instante al guardar.
- QA-10, QA-11, QA-17: clientes únicos, cargas creadas y campañas/contratos propios por entidad; proveedor muestra campañas reales y enlaces específicos.
- QA-12–QA-16: MTD sin observaciones inventadas, coordenadas obligatorias en V1 con errores por campo, catálogo/plurales de variedades, unidades agronómicas sin duplicación y kilos del viaje por finca. Sin desglose suficiente se informa ausencia de datos.
- QA-01: antecedente de configuración; se verificó con instancia temporal V1 y base QA, sin sobrescribir .env ni reiniciar el servidor original.

### Persistencia y migración

- Nueva migración backend: src/database/migrations/1793232000000-AddCertificateInitialKilos.ts. Añade agro.certificado_campana.kilos_iniciales numeric(14,3), nullable y no negativo.
- SQL de instalación, OpenAPI, DTO generado, fixture y diagrama ER sincronizados. Certificados anteriores con null conservan la suma de cobertura como valor inicial de lectura.
- Migración aplicada y columna verificada solamente en epe_manual_qa_20261029. En otros entornos debe aplicarse la migración y reiniciarse el backend actualizado. No se ejecutó en desarrolloEPE.

### Verificación y evidencia

- Última ejecución completa aprobada: frontend **52 archivos / 274 pruebas**; backend **14 archivos / 51 pruebas**. Builds de ambos aprobados. Permanece la advertencia conocida del tamaño del bundle.
- Tras cambios de asignaciones por campaña y formato de horas: integración frontend **15 pruebas aprobadas**. Una ejecución anterior de ESLint terminó sin errores ni advertencias; contrato generado verificado.
- La revisión automática tuvo una interrupción por límite de uso; después del restablecimiento se repitieron correctamente las **274 pruebas**, el **build** y **ESLint sin errores ni advertencias**. También se corrigió una clave React duplicada al repetir una medición MTD en más de una entrega.
- Manual con PostgreSQL QA: nueva guía T001-00000002 guardada; certificación a **1777.125 kg** conservada tras recargar y total negativo rechazado con 422; cliente QA vinculado a Mango (de cero a una campaña y cero contratos); transportista vinculado a Palta sin adjuntos; lista de choferes desde su transportista; contratos dentro del cliente limitados a sus relaciones; recepción liquidada guardada manteniendo 580/380 kg y horas editadas mediante teclado.
- Evidencias: [semana real](C:/Users/luisl/.codex/visualizations/2026/10/29/01a1891a-c764-71d3-b9d3-901a0bffcbbd/qa-semana-cargas-reales.jpg), [certificación persistida](C:/Users/luisl/.codex/visualizations/2026/10/29/01a1891a-c764-71d3-b9d3-901a0bffcbbd/qa-certificacion-kilos-persistidos.jpg), [guía guardada](C:/Users/luisl/.codex/visualizations/2026/10/29/01a1891a-c764-71d3-b9d3-901a0bffcbbd/qa-guia-corregida.jpg), [cliente vinculado](C:/Users/luisl/.codex/visualizations/2026/10/29/01a1891a-c764-71d3-b9d3-901a0bffcbbd/qa-cliente-vinculado.jpg).
- Se detuvieron los servidores temporales 3001 y 5174 y se retiraron los archivos auxiliares de verificación. El servidor original se conservó.
- Datos modificados solo en QA. No se acredita CRUD exhaustivo con borrado por cada dominio ni autenticación, adjuntos o emisión tributaria real.

---
## Auditoría manual V1 — 2026-10-29 · Parcial: recorrido ejecutado con defectos abiertos

**Se recorrieron los 28 tipos de ruta de la aplicación actual (27 protegidas y `/login`), sus vistas principales y los formularios detallados abajo. No equivale a aprobar todos los CRUD ni todas las combinaciones de las 62 fichas del prototipo.** La revisión encontró bloqueos e indicadores incorrectos; el sistema no queda aprobado para un flujo integral de operación.

### Entornos y protección de los datos

1. La primera pasada utilizó `5173 → 3000`, legacy, y encontró colecciones `public` vacías. Su evidencia se conserva más abajo como fase inicial.
2. Al revisar `epe-backend`, se comprobó que V1 sí existe en código y en `dist`, y que PostgreSQL `desarrolloEPE` contiene el esquema `agro` con 3 campañas, 5 frutas, 2 proveedores, 1 cliente y 1 carga. El proceso original de 3000 no exponía esas rutas. Se inició una instancia temporal en **3001** y Vite en **5174**, con `VITE_API_CONTRACT=v1`, mediante variables de proceso, sin editar `.env` ni detener los servidores originales.
3. Contra `desarrolloEPE` se ejecutaron principalmente lecturas. Única edición reversible: ubicación del cliente 1, `Lima, Perú → QA MANUAL 2026-10-29 → Lima, Perú`. La persistencia y la restauración se verificaron recargando la página tras cada guardado; `updated_at` puede reflejar esta prueba.
4. Para probar escrituras y cierres se creó la base **`epe_manual_qa_20261029`**, se instaló el SQL del backend y se ejecutó `seed-v1.mjs` **solo en esa base nueva**: 100 registros de ejemplo. Luego se reinició exclusivamente el backend temporal de 3001 sobre QA; Vite 5174 siguió apuntando a él. No se truncó ni migró `desarrolloEPE`.
5. Al reanudar, `.env` de la instancia original 5173 ya apuntaba a `/mock-api/`, cambio ajeno a esta auditoría. Los resultados V1 siguientes pertenecen a **5174 → 3001 → PostgreSQL**, no a los mocks.

### Cobertura V1 efectivamente ejecutada

| Área / fichas de referencia | Recorrido y resultado manual |
|---|---|
| Acceso y módulos · V01–V02 | Logout, redirección de ruta protegida sin sesión, ingreso/confirmación locales sin credenciales reales, recuperación vacía y selector de ocho módulos. Sesión simulada es una limitación acordada. |
| Comercial · V03–V08 | Directorio con cliente real, detalle, edición persistida/restaurada, requerimientos de campaña, menú Contratos, contrato 1 y sus dos entregas (1,000 y 500 kg). En QA se creó **QA Manual 20261029**, cliente 2; sobrevivió a recarga. Sus contadores revelaron QA-17. |
| Campañas · V09–V11 | Listado V1 con 3 campañas; pestaña En ejecución; detalle de Mango 2026; resumen modal de proveedores; productores/acopiadores; detalle de participación 1. Indicadores de clientes/cargas inconsistentes (QA-10). |
| Entrevistas y exámenes · V12–V13 | Entrevista por finca con código FVV, detalle agronómico; examen M-001, estado Pendiente de envío y detalle sin adjunto. Unidades mal presentadas en entrevista (QA-15). No se enviaron muestras reales. |
| Certificaciones · V14–V16 | Certificación con 2 productores, 2,000 kg iniciales + 500 ampliados; detalle con ampliación y pago de S/ 500 sobre S/ 2,000. Formulario de ampliación vacío rechaza kilos/fecha; formulario de pago muestra saldo S/ 1,500. No se registró un pago real. |
| Transporte de campaña y entregas · V17–V20 | Dos transportistas, acuerdo con adelanto; entregas coordinadas con vehículo/chofer y dos orígenes; edición de coordinación abre con datos; programa semanal muestra 1,500 kg en dos días. Acceso desde detalle roto (QA-08), aunque la ruta correcta abre. |
| Proveedores · V21–V24 | Padrón 2 proveedores/2 fincas/20.5 ha de cultivo; buscar María filtra a 1 y Limpiar restaura; detalle de proveedor; fincas, formulario de alta/edición; certificados. Guardar finca sin coordenadas muestra error conservando modal, pese a marcarlas opcionales (QA-13); se canceló sin modificar la finca. |
| Transporte · V25–V30 | Directorio público/privado, detalle, pestañas Vehículos y Choferes, requerimiento SOL-DEMO-1 y su detalle con cotización S/ 1,000. Formularios vacíos y botones sin transportistas ya probados en primera fase. No se envió un requerimiento/correo a terceros ni se registró una cotización nueva. |
| Calidad · V31–V37 | Campañas, espacio de Mango 2026, cuatro pestañas, revisión MTD/análisis y asistente de cinco pasos (revisión, organización, avances 600+400 kg, cierre, guía). Listado de guías, formulario de guía existente y nueva. Borrador y emisión fallan por QA-05. Se comprobó QA-06 en una guía nueva. Industria con datos y emisión tributaria real no probadas; FC14 continúa diferido. |
| Logística · V38–V40 | Resumen de campaña, carga CAR-DEMO-1, detalle de entrega con 600/400 kg en campo y 580/380 kg reconocidos, menú de acciones, recepción/descarga y documentos/cierre. Se reprodujo QA-09. Con preparación limitada de fixture por API, el cierre físico se guardó por UI. |
| Facturación · V41–V44 | Campaña, clientes, cargas/facturas, documento emitido parcial y preparación pendiente; historial: total USD 1,495, cobrado USD 100, saldo USD 1,395; Cobrar deshabilitado en factura no emitida. No se emitieron facturas ni cobraron importes reales. |
| Liquidación · V45–V51 | Campaña → carga → Proveedor; pendientes y editor con 580 kg reconocidos × S/ 2 = S/ 1,160; Control UIT con 3 personas; Transportista con S/ 510 total, S/ 150 abonado, S/ 360 saldo y S/ 100 adelanto disponible; historial distingue pago de caja y aplicación de adelanto. Errores de UIT QA-02/QA-07. No se ejecutaron pagos ni aplicaciones nuevas. |
| Cierre de campaña · V52 | Formulario de motivo y envío en QA: backend rechaza correctamente con **«Hay entregas sin completar»**. La campaña sigue en proceso; no se certifica cierre positivo de campaña. |
| Chofer · V53–V62 | Mis campañas, Mis cargas, mapa/fincas, datos de carga, Mi despacho, checklist/recepción, campos condicionales de descarte y guía de salida. En QA: bloqueo sin guía emitida; luego Salida → En camino → Llegada; bloqueo por falta de cierre físico; guardado de checklist 960 kg y guía QA-SALIDA-20261029 con retorno de 50 envases; tras cierre físico, **Cierre** persistió después de recargar y el historial contiene cinco eventos. No se cerró la carga original. |
| Adaptación móvil | Portal sin datos y despacho con datos, **390×844**. Barra inferior y estados legibles; `clientWidth=scrollWidth=390`, sin desbordamiento horizontal en esa vista. Se restauró el tamaño de escritorio. No se afirma auditoría móvil de todas las pantallas. |

**Preparación de QA que no cuenta como éxito manual del flujo:** ante QA-05 se emitió internamente la guía de ejemplo con `POST /v1/guias/1/emitir`. Ante QA-09 se completaron por `PATCH /v1/cargas/1/recepciones/1` únicamente horarios de descarga y resultado `Aceptada`, preservando compras/kilos. A partir de ahí se probaron manualmente cierre físico y cierre del chofer. No hubo comunicación con SUNAT ni con servicios financieros.

### Defectos V1 reproducidos y evidencia

Los IDs QA-01–QA-04 permanecen en la primera fase. QA-01 fue un bloqueo de configuración/proceso, superado para las pruebas mediante instancias temporales; QA-02 y QA-03 también se observan con V1.

| ID | Prioridad | Reproducción y evidencia | Resultado esperado |
|---|---|---|---|
| **QA-05** | **P1** | Calidad → Mango 2026 → Guías → Configurar o Agregar → Guardar borrador/Emitir: **«Selecciona los proveedores de la guía»**, aunque los dos proveedores aparecen. `QualityRemissionGuideModal.tsx:161` envía nombres; `quality-commands.api.ts:104` filtra por IDs numéricos convertidos a texto. Bloquea borrador, emisión y salida posterior del chofer. | Usar el identificador del proveedor de extremo a extremo. |
| **QA-06** | **P1** | Agregar guía nueva para CAR-DEMO-1 precarga **Carlos Alberto Mendoza Ríos**, documento y RUC fijos, aunque el chofer real es Miguel Torres y el RUC de Transportes del Norte es distinto. También precarga MTC, ubicación, producto, normas y observaciones de ejemplo. `QualityRemissionGuideModal.tsx:119–143` no condiciona estos defaults a legacy/demo. Se canceló; no se guardaron identidades falsas. | Derivar snapshots de los registros reales y pedir los datos faltantes. |
| **QA-07** | **P1** | Control UIT muestra acumulado S/ **2,320** para persona 1; SQL agregado confirma **un documento de S/ 1,160**. Persona 4 muestra S/ 1,520 para un documento de S/ 760. `settlement-screen-data.ts` ya incluye las liquidaciones en `acumuladoAnualPen`; `SettlementUitControlModal.tsx:50–69` suma otra vez `prov.total`. El editor también proyecta de nuevo la liquidación al editarla. | Contar una sola vez cada documento y excluir/reemplazar el actual al proyectar una edición. |
| **QA-08** | **P2** | Campaña 1 → **Programa semanal**, **Ir a calidad**, **Ver facturas**: los tres terminan en `/modules`. Navegan respectivamente a `/campaigns/1/weekly-program`, `/control-calidad`, `/facturacion`, rutas ausentes. Las registradas son `/campaigns/1/weekly-delivery-program`, `/calidad`, `/facturacion-cobros`. | Abrir las rutas registradas y conservar el contexto pertinente. |
| **QA-09** | **P2** | En QA, Logística → Recepción y calidad → completar horarios/responsable sin cambiar 580/380 kg → Guardar: **«Los reconocidos ya fueron aplicados a liquidaciones»**. El comando reconstruye todo `compras` con referencias/observaciones vacías; el backend protege ese JSON completo por tener liquidaciones. Un PATCH solo de horarios sí funciona. Impide completar la descarga desde la UI en este escenario. | Conservar compras sin cambios y enviar únicamente los datos editados; mantener la protección de los reconocidos. |
| **QA-10** | **P2** | Detalle Mango 2026 informa **2 clientes y 2 cargas**; SQL confirma **1 cliente distinto, 2 requerimientos y 1 carga**. Logística muestra correctamente 1 carga. `CampaignDetailsPage.tsx` cuenta requerimientos como clientes y elementos proyectados de coordinación como cargas. | Distinguir cliente, requerimiento, entrega coordinada y carga creada en indicadores y etiquetas. |
| **QA-11** | **P2** | Proveedor 1 → detalle: «2 campañas activas» y «Campaña Mango Kent Exportación 2026» están fijados en `ProviderDetailsPage.tsx:198,208`, y «Ver campaña» abre el listado general. No derivan de sus relaciones reales. | Mostrar la participación real y navegar a la campaña correspondiente. Los 580 kg y MTD de esta pantalla sí se derivan; no se clasifican como fijos. |
| **QA-12** | **P2** | Calidad → Análisis y revisión: MTD **0.0100**, pero tabla dice **0 moscas / 0 trampas / 0 d**. `quality-screen-data.ts:23` rellena esas tres cantidades con cero aunque V1 solo aporta valor/límite. | Mostrar cantidades no disponibles como tales y conservar el MTD registrado, sin inventar observaciones de campo. |
| **QA-13** | **P2** | Finca → Editar → vaciar latitud/longitud, ambas **(Opcional)** → Guardar: **«Completa las coordenadas de la finca antes de guardar»**. El modal conserva el error y se pudo cancelar; no se alteró la finca. | Marcar como obligatorias en V1 y validar por campo conforme al contrato acordado. |
| **QA-14** | **P3** | Programa semanal de Mango 2026 muestra «1 variedades» y **«De 0 variedades registradas en campaña»**, mientras la matriz incluye Mango Kent y el detalle muestra Kent/Edward. | Consistencia de catálogo y número de variedades entre vistas. |
| **QA-15** | **P3** | Entrevista → detalle: **«5 x 4 m m»** y **«Cada tres días /día»**; tabla deja «plantas/ha» sin valor. | Evitar sufijos duplicados y no añadir una frecuencia numérica a un texto libre. |
| **QA-16** | **P3** | Chofer → Ubicación y ruta: **2,000 kg estimados**, 1,000 por finca, para viaje de 1,000 kg con desglose 600/400. `driver-screen-data.ts:12` usa la cantidad total de participación de campaña en cada finca. | Etiquetar claramente que es estimación de campaña o usar los kilos correspondientes al viaje/origen. |
| **QA-17** | **P2** | Cliente **QA Manual 20261029**, recién creado en QA sin vínculos, muestra **«1 campaña activa · 2 contratos»** tras recargar. `ClientsTable.tsx:55–59` calcula campañas con `(id % 2)+1` y asigna el total global de contratos a cada cliente. | Calcular campañas y contratos propios del cliente; el recién creado debe mostrar cero. |

**Ampliación QA-02 en V1:** el backend carga UIT S/ 5,500 y límite S/ 412,500, pero el pie sigue diciendo S/ 401,250. Es una contradicción entre parámetros y texto, sin afirmar validación de la norma tributaria aplicable. **QA-03** (`all` en filtros) sigue reproducible en V1.

### Verificación, evidencias y límites finales

- En la primera parte de esta sesión: **52 archivos / 266 pruebas automatizadas aprobadas**, y **build aprobado** (incluye tipos), con advertencia de tamaño de bundle. No sustituyen la validación manual ni afirman que QA-05–QA-17 estén cubiertos por tests. Sin cambios de código funcional durante la auditoría; no se repitieron las pruebas por editar solo este documento.
- Evidencias locales: [guía bloqueada](C:/Users/luisl/.codex/visualizations/2026/10/29/01a1891a-c764-71d3-b9d3-901a0bffcbbd/qa-guia-bloqueada.jpg), [nueva guía con datos fijos](C:/Users/luisl/.codex/visualizations/2026/10/29/01a1891a-c764-71d3-b9d3-901a0bffcbbd/qa-guia-datos-fijos.jpg), [cliente recién creado con contadores](C:/Users/luisl/.codex/visualizations/2026/10/29/01a1891a-c764-71d3-b9d3-901a0bffcbbd/qa-cliente-nuevo-contadores.jpg), [despacho QA cerrado](C:/Users/luisl/.codex/visualizations/2026/10/29/01a1891a-c764-71d3-b9d3-901a0bffcbbd/qa-despacho-cerrado.jpg).
- La base QA se conserva para reproducir el escenario. Contiene el cliente sintético y los cambios de guía, checklist, retorno, recepción y estados descritos. No representa operaciones reales. Al finalizar se detuvieron exclusivamente los procesos temporales de backend 3001 y frontend 5174; los servidores originales siguieron activos. Se verificó en `desarrolloEPE` que cliente 1 conserva `Lima, Perú` y que el padrón mantiene un solo cliente.
- Pendientes de cobertura: CRUD completo con borrado por dominio, pagos/cobros nuevos, todos los caminos de Industria, cierre positivo de campaña, errores de desconexión/CORS durante mutaciones y matriz móvil de las demás vistas. Adjuntos, autenticación y emisión tributaria real se mantienen fuera del alcance contratado. No se presentan estos pendientes como aprobados.
- La revisión es de testing y reporte: **los defectos no fueron corregidos**. Su prioridad de corrección empieza por QA-05, QA-06 y QA-07.

---

## Primera fase manual — 2026-10-29 · Antecedente: bloqueo de entorno superado en la segunda fase

**Resultado:** no se acredita el funcionamiento integral de las 62 fichas V01–V62. Se recorrieron con Chrome las pantallas principales, pestañas accesibles y formularios indicados abajo, contra `http://localhost:5173` y el backend real configurado en `http://localhost:3000/`. No se activaron mocks, no se modificó código funcional, no se ejecutaron seeds ni se crearon/eliminaron registros de negocio. La sesión local se cerró y se restauró mediante el acceso de demostración.

### Entorno comprobado

- `.env` tiene `VITE_API_BASE_URL=http://localhost:3000/` y no define `VITE_API_CONTRACT=v1`; `usesV1()` selecciona legacy.
- Lecturas reales: `GET /campanas`, `/frutas`, `/proveedores`, `/clientes-negocio` y `/empresas-transporte-externo`: HTTP 200 con `[]`. CORS de los cuatro últimos permite `http://localhost:5173`.
- `GET /v1/campanas`: HTTP 404. Hay implementación V1 en el árbol de trabajo del backend, pero su presencia en disco no acredita que el proceso del puerto 3000 la esté sirviendo.
- El catálogo de frutas vacío impide crear una campaña desde el formulario. Sin campaña, participaciones, contratos, fincas y unidades no se pueden recorrer los procesos dependientes con datos válidos.
- La documentación histórica de este archivo no es evidencia de pruebas del servidor actual. La afirmación anterior de que la API aún no estaba implementada corresponde a un corte previo, no al código backend actual.

### Cobertura manual y pendientes

| Fichas / vista | Resultado observado | Cobertura pendiente |
|---|---|---|
| V01 · Acceso | Cierre de sesión con confirmación; una ruta protegida redirige a `/login`; administrador permite Ingresar y Confirmar con credenciales/código vacíos, conforme a sesión simulada documentada. Recuperación abre formulario; Recuperar vacío no muestra avance ni error visible. | Acceso de chofer, recuperación completa y autenticación real (esta última fuera del contrato actual). |
| V02 · Módulos | Selector muestra los ocho módulos; navegación a proveedores desde su tarjeta correcta. | No se afirma prueba exhaustiva de cada control transversal. |
| V03, V05 · Comercial | Clientes vacío; alta abre y valida todos los obligatorios sin cerrar; Cancelar cierra. Pestaña Contratos con indicadores y lista vacíos. | Alta válida, edición, persistencia, exportación con datos. |
| V04, V06–V08 · Cliente, participación, contratos y entregas | **Bloqueado; no ejecutado** por ausencia de registros relacionados. | Todos los flujos con datos. |
| V09 · Campañas | Indicadores y listado vacíos; alta abre; envío vacío muestra errores en nombre, kilos, fechas y fruta. Selector informa «No hay frutas registradas». Cancelar cierra. | Creación válida, filtros con resultados, estados, edición y persistencia. |
| V10 · Detalle de campaña | URL abierta inicialmente `/campaigns/2` muestra «No se pudo cargar la campaña»; Volver a campañas lleva al listado vacío. | Detalle válido y reintento después de recuperar datos. |
| V11–V20, V52 · Operación y cierre de campaña | **Bloqueado; no ejecutado**: proveedores, entrevistas, exámenes, certificación/ampliación/pagos, transportistas, entregas, coordinación, programa semanal y cierre requieren campaña válida y relaciones. | Todos los flujos con datos. |
| V21 · Proveedores | Listado e indicadores vacíos; Registrar proveedor abre; envío vacío valida obligatorios y adjunto de identidad; Cancelar cierra. | Alta válida, persistencia, búsquedas con resultados. |
| V22–V24 · Detalle, fincas y certificados | **Bloqueado; no ejecutado** por ausencia de proveedor. | CRUD, validaciones completas y adjuntos según alcance FC14. |
| V25, V27–V29 · Transporte | Listado vacío; alta abre y valida campos obligatorios. Pestañas globales Vehículos, Choferes y Requerimientos/cotizaciones abren vacías. Nuevo vehículo/chofer y Enviar requerimiento deshabilitados sin transportistas. | CRUD válido, edición, persistencia, cotizaciones y asignaciones. |
| V26, V30 · Detalle y solicitud | **Bloqueado; no ejecutado** por ausencia de transportistas. | Todos los flujos con datos. |
| V31 · Calidad | Alcance Exportador vacío; Agregar campaña abre; selector indica «No hay campañas en proceso pendientes por agregar»; envío deshabilitado. | Alcance Industria y operación con campaña elegible. |
| V32–V37 · Calidad interna | **Bloqueado; no ejecutado**: resumen, análisis/revisión, cargas, detalle y guías necesitan campaña y entregas. | Todos los flujos con datos. |
| V38 · Logística | Resumen e indicadores vacíos, sin error de renderizado visible. | Filtros con datos y exportación. |
| V39–V40 · Cargas y entrega | **Bloqueado; no ejecutado** por ausencia de cargas. | Recepción, estados, desglose y envases. |
| V41 · Facturación | Listado de campañas vacío, sin error de renderizado visible. | Búsqueda con resultados. |
| V42–V44 · Facturas y cobros | **Bloqueado; no ejecutado** por ausencia de campaña/clientes/cargas. | Facturas, ajustes, cobros y persistencia. |
| V45, V49 · Liquidación y UIT | Campañas vacías; Control UIT abre con cero personas; parámetros y texto contradictorios (QA-02). | Acumulados y límites con datos válidos. |
| V46–V48, V50–V51 · Liquidaciones y pagos | **Bloqueado; no ejecutado** por ausencia de cargas/proveedores/transportistas. | Liquidaciones, adelantos y pagos. |
| V53–V62 · Chofer | `/chofer` muestra «Registra un chofer y coordina una entrega para utilizar el portal» en escritorio y en 390×844; estado vacío legible y sin desbordamiento visible en móvil. | Mis campañas/cargas, mapa, carga, despacho, recepción, descarte, guía y cierre no ejecutados. |

### Hallazgos reproducibles

| ID | Prioridad | Pasos y resultado actual | Resultado esperado / siguiente verificación |
|---|---|---|---|
| QA-01 | P1 · Bloqueo del testing V1 | Abrir configuración y consultar `/v1/campanas`: falta selección V1 y el servidor devuelve 404. Las colecciones legacy comprobadas están vacías. | Identificar la instancia V1 que se desea probar y disponer de un escenario de prueba coherente. No cambiar a V1 mientras el endpoint siga ausente. |
| QA-02 | P2 · Inconsistencia funcional visible | Liquidación de Compra → Control UIT por proveedor: «Valor UIT 2026: S/ 0», «Límite máximo (0 UIT): S/ 0», pero título y pie indican 75 UIT y el pie S/ 401,250. | Cargar parámetros coherentes o mostrar indisponibilidad explícita. No presentar cero como parámetro válido. Evidencia de código: `purchaseSettlement.models.ts` inicializa los tres valores a cero; `SettlementUitControlModal.tsx` combina variables con texto fijo. No se verificó normativa tributaria; se reporta la contradicción de la propia UI. |
| QA-03 | P3 · Etiquetas de filtros | Comercial → Contratos: filtros campaña y cliente muestran `all`; el desplegable de campaña sí ofrece «Todas las campañas». Transporte → Vehículos, Choferes y Requerimientos repite `all`. | Mostrar las etiquetas españolas de las opciones seleccionadas. Evidencia visual y árbol accesible coinciden; revisar `SelectValue` y el mapeo de opciones. |
| QA-04 | P3 · Retroalimentación | Acceso → ¿Olvidó su contraseña? → Recuperar con correo vacío: permanece en el formulario sin error visible. | Validación explícita del obligatorio o señal de indisponibilidad del flujo simulado. No se envió correo ni se cambió contraseña. |

No se consideran defectos nuevos la sesión simulada ni FC14, pues son límites documentados. El detalle `/campaigns/2` no acredita una campaña existente: se registró su manejo del error, no una pérdida de datos.

### Verificación complementaria

- `pnpm test`: **52 archivos / 266 pruebas aprobadas**. Son pruebas automatizadas, no sustituyen el recorrido manual ni acreditan persistencia contra este servidor.
- `pnpm build`: **aprobado**, incluidos tipos; advertencia de bundle principal de aproximadamente 1.87 MB sin comprimir (530 KB gzip).
- Las primeras ejecuciones restringidas fallaron al resolver pnpm por DNS; las ejecuciones posteriores con acceso autorizado completaron correctamente.
- Sin archivos de código modificados, no corresponde ESLint sobre fuentes tocadas. Cambios de esta auditoría limitados a este documento.

**Para completar el encargo:** confirmar URL/proceso que sirve V1 y habilitar en ese entorno un conjunto de datos de prueba con campaña, proveedores/fincas, clientes/requerimientos/contratos, entregas, transportistas/vehículos/choferes y cargas en diferentes etapas. No se ejecutó `seed-v1.mjs`: contiene truncado de tablas y no procede usarlo como preparación automática sobre la base del usuario.

---

## 4.1. Integración V1 de las pantallas — 2026-10-29

**Completo para el consumo HTTP del contrato desde el modo local de desarrollo.** Con `VITE_API_BASE_URL=/mock-api/` las pantallas consumen la API ficticia y `json/v1-demo/`. Para el backend real, configurar su origen y `VITE_API_CONTRACT=v1`; el backend NestJS sirve las operaciones bajo `/v1`. El estado de implementación del backend de este hito es histórico; ver la auditoría del 2026-11-03. `legacy` explícito mantiene la compatibilidad anterior.

| Pantallas | Consumo V1 implementado | Límites vigentes |
|---|---|---|
| Campañas, proveedores y clientes | CRUD, catálogos, participaciones, varios requerimientos por cliente, contratos, entregas, coordinación y cierre con motivo | Participación sin finca; finca y origen se eligen al coordinar. Campos visuales sin columna no se persisten. |
| Proveedores, fincas, certificados, entrevistas y exámenes | Identificadores servidor, variedad única por finca, coordenadas obligatorias, código FVV del servidor y etapas reales del examen | Certificados guardan metadatos; adjuntos diferidos. |
| Certificaciones y transporte | Coberturas, ampliaciones, pagos, acuerdos, solicitudes/invitaciones, cotizaciones, vehículos y choferes | Se conserva el límite visual de una certificación por campaña. Trámite derivado; sin envío real de correo. CGN sin columna no editable en V1. |
| Calidad | Alcances de campaña, revisión, análisis por participación/finca, cosecha, carga, proveedores/orígenes y guías | La carga nace de una entrega coordinada. MTD consume valor y límite registrados; no inventa capturas/trampas/días. |
| Logística y chofer | Carga compartida, recepción/desglose manual, historial de estados, checklist, envases y cierres | Destino textual; sin coordenadas ficticias. Sesión y selección de chofer siguen siendo locales. |
| Liquidación y facturación | Kilos reconocidos, precio de origen, personas y UIT; liquidaciones, pagos, aplicaciones de adelanto, facturas y cobros | PEN para compra/transporte; ventas según contrato. FC14 no incluye archivos ni emisión tributaria real. |

`FrontendDataBoundary` carga el contexto remoto antes de las pantallas. Cada dominio transforma sus DTOs y publica un estado coherente; los componentes no leen JSON ni agregan demos como fallback. Una mutación espera HTTP y recarga los recursos relacionados antes de confirmar éxito. Errores se muestran en el modal o en la vista. Operaciones compuestas sobre varios endpoints pueden completar parte del trabajo; el refresco reconcilia el estado aun si una petición falla. No se promete atomicidad de esos comandos.

La carga inicial recorre las colecciones paginadas y sus hijos. Es adecuada para este escenario de desarrollo; un backend con volumen real necesitará lecturas por pantalla sin cambiar los DTOs públicos. No se agrega caché, service worker, autenticación ni subida de archivos. Los modelos y servicios legacy permanecen aislados por selección explícita; las demos antiguas no alimentan las vistas V1.

Validación: pruebas HTTP del router y de los adaptadores/almacenes del frontend, comprobación del contrato generado, TypeScript, ESLint y build con URL real. El mock se excluye del bundle; compilar apuntando a `/mock-api/` está bloqueado.

### Matriz histórica de la API actual sin versión (consolidación 2026-10-25)

| Módulo / Vista (Ruta) | Estado Actual | Operaciones Conectadas (`epe-backend`) | Brecha / Operaciones en Memoria (`// TODO(api)`) |
| :--- | :--- | :--- | :--- |
| **Acceso (`/login`)** | **Sin cambios** (2026-09-20) | Ninguna (backend sin módulo de auth/JWT). | Sesión local en IndexedDB (`shared/offline/session.ts`). |
| **Selector (`/modules`)** | **Completo** (2026-10-12) | Navegación pura (`navigationItems.ts`, 8 módulos). | No requiere API. |
| **Campañas (`/campaigns`)** | **Parcial** (2026-10-03) | `GET/POST/PATCH/DELETE /campanas`, catálogo `GET /frutas` y `GET /frutas/:id/derivadas`. KPIs y tendencias calculados sobre campañas reales (`campaignStats.utils.ts`). | El adjunto `lineamientos` en el modal pasa por `uploadDocument.ts` (pendiente servicio de archivos). |
| **Detalle de Campaña (`/campaigns/:id`)** | **Parcial** (2026-10-12) | `GET /campanas/:id`, `GET /frutas/:id/derivadas`, resumen de proveedores (`GET /campanias-proveedores/campania/:id`) y clientes (`GET /campanas/:id/clientes-negocio`). | Tarjeta de cosecha (`CampaignHarvestCard`) sin API en backend. Resumen de certificaciones lee de `campaignCertificates.store.ts` para coincidir con su vista de gestión. |
| **Proveedores de Campaña (`/campaigns/:id/providers` y detalle `:cxpId`)** | **Parcial** (2026-10-16) | `GET/POST /campanias-proveedores`, `GET .../campania/:id`, `PATCH/DELETE .../:cxpId`, catálogo `GET /proveedores` (con reconciliación ante fallos de red). `mtdCeratitis` retirado de la UI por decisión de producto. | `precioEstimado`, `moneda` y `observacionesParticipacion` del borrador visual aún no están en el DTO del backend. |
| **Entrevistas de Campaña (`/campaigns/:id/providers/:cxpId/interviews`)** | **Parcial · Solo local** (2026-10-11) | Lee contexto real de campaña (`GET /campanas/:id`), vínculo y fruta. | CRUD de entrevistas por finca y secuencia de código `FYV` viven en memoria (`campaignInterview.utils.ts` + `providerLocalData.store.ts`, demo en DEV). |
| **Exámenes de Campaña (`/campaigns/:id/providers/:cxpId/exams`)** | **Parcial · Solo local** (2026-10-12) | Lee exámenes previos del proveedor (`GET /proveedores/:id/examenes`). | Flujo por etapas (`pendiente` → `enviado` → `con resultado`) y archivo adjunto viven en `campaignExams.store.ts` (demo en DEV). |
| **Clientes de Campaña (`/campaigns/:id/clients`)** | **Parcial** (2026-10-12) | `GET /campanas/:id/clientes-negocio`, `PATCH/DELETE .../:clienteNegocioCampanaId` (edición sin cambio de archivo y baja conectadas). | `CampaignLinkClientModal` fue rediseñado (variedades, destino, ventana de entrega) y quedó como borrador validado (`// TODO(api)`) esperando ampliación del DTO `POST` y `uploadDocument.ts`. |
| **Contratos y Entregas de Cliente en Campaña (`.../contracts` y `.../deliveries`)** | **Parcial · Solo local** (2026-10-12) | Contexto de campaña y cliente real. | CRUD de contratos por vínculo (`campaignClientContracts.store.ts`) y entregas por contrato (`campaignContractDeliveries.store.ts`) viven en memoria (demo en DEV). |
| **Certificaciones de Campaña (`/campaigns/:id/certifications`)** | **Parcial · Solo local** (2026-10-16) | Productores cubiertos se leen de `GET /campanias-proveedores/campania/:id` (kilos iniciales calculados automáticamente de `cantidadProveedor`). | Límite de 1 certificación por campaña, vigencia automática, ampliaciones de kilos y pagos viven en `campaignCertificates.store.ts` (demo en DEV). El backend solo tiene `certificado-campana` plano. |
| **Transportistas de Campaña (`/campaigns/:id/carriers`)** | **Parcial · Solo local** (2026-10-17) | Catálogo de transportistas lee de `GET /empresas-transporte-externo`. Reemplazó a la vista retirada `CampaignCarrierPaymentsPage`. | Vínculo transportista-campaña, cotización y acuerdo de pago (único o con adelanto) viven en `campaignCarriers.store.ts` (demo en DEV). |
| **Entregas de Campaña (`/campaigns/:id/deliveries` y `weekly-delivery-program`)** | **Parcial · Solo local** (2026-10-19) | Lee transportistas/vehículos/choferes reales y proveedores de la campaña. | Coordinación de entregas vive en memoria (`campaignContractDeliveries.store.ts`). `CampaignWeeklyDeliveryProgramPage` está **Sin cambios / requiere definición**. |
| **Proveedores (`/proveedores` y `/proveedores/:id`)** | **Parcial** (2026-10-11) | `GET/POST /proveedores`, `GET/PATCH/DELETE /proveedores/:id`. Servicios listos en `provider-subresources.api.ts` para frutas, exámenes y certificados S3. | En el detalle y formulario de proveedor, el estado de sanidad, las frutas con variedades (`providerCatalogo.ts`), las fincas y los certificados leen de `providerLocalData.store.ts` (demo en DEV). Adjunto de identidad usa `uploadDocument.ts`. |
| **Fincas de Proveedor (`/proveedores/:id/fincas`)** | **Parcial · Solo local** (2026-10-12) | Contexto del proveedor lee de `GET /proveedores/:id`. | Padrón de fincas de 13 campos (SENASA, catastro, ubicación, cultivos/variedades, hectáreas) vive en `providerLocalData.store.ts` (backend sin `/fincas`). |
| **Certificados de Proveedor (`/proveedores/:id/certificados`)** | **Parcial · Solo local** (2026-10-11) | Contexto `GET /proveedores/:id`. Cliente S3 completo y probado en `provider-subresources.api.ts` (`subida` → `PUT S3` → `confirmacion DISPONIBLE` → `POST/PATCH` con `documentoArchivoId` y `descarga`). | La UI guarda actualmente en `providerLocalData.store.ts` porque el entorno local no expone `/certificados/documentos/subida` (404). Al activar S3 en el entorno, basta cambiar las llamadas del store a `provider-subresources.api.ts`. |
| **Gestión Comercial (`/planificacion-comercial` y `/:id`)** | **Completo CRUD / Detalle Parcial** (2026-10-12) | `GET/POST/PATCH/DELETE /clientes-negocio` conectados con validación de los 7 campos del DTO. Servicio `GET /clientes-negocio/:id/contratos` implementado en `cliente-negocio-contratos.api.ts`. | Revisar en `ClientDetailsPage.tsx` la visualización de la tabla de contratos del cliente y uso de endpoint individual. |
| **Gestión de Transporte (`/transportistas` y `/:id`)** | **Parcial** (2026-10-12) | `GET/POST/PATCH/DELETE /empresas-transporte-externo`, `/vehiculos-externos` y `/choferes-transporte-externo` conectados. | Tipo (`público`/`privado`), documento, MTC, CGN y ubicación viven en `carrierExtras.store.ts` (backend hoy exige `ruc` de 11 dígitos y solo guarda 4 campos). "Enviar requerimiento" es local. |
| **Trazabilidad de Transporte (Endpoints Backend sin Vista)** | **Pendiente de definición UI** (2026-09-27) | Backend expone `/trazabilidades-transporte` (por `cxpId`), `/asignaciones-transporte` (chofer/vehículo por rango de fechas) y `/detalles-trazabilidad`. | No existe pantalla en frontend que provea `cxpId` dentro de `/transportistas/:id`. Pausado hasta decisión de producto. |
| **Cosecha y Control de Calidad (`/calidad`)** | **Parcial · Solo local** (2026-10-21) | El modal `QualityAddCampaignModal` consulta campañas en proceso desde `GET /campanas`. | Alcances Exportador/Industria, tabla y acciones (`Análisis`, `Carga`, `Guías`) viven en `quality.store.ts` y `qualityAnalysis.store.ts` (demo en DEV). |
| **Logística, Facturación y Liquidación (`/logistica-despacho`, `/facturacion-cobros`, `/liquidacion-compra`)** | **Sin cambios · En construcción** (2026-10-12) | Rutas registradas en `App.tsx` y `navigationItems.ts` con `ModuleUnderConstructionPage`. | Sin diseño ni API todavía. |

---

## 4.2. Historial Compacto de Auditorías y Decisiones

- **2026-10-29 · Completo (conexión de pantallas a V1):** adaptadores de lectura y comandos HTTP por dominio, hidratación y refresco de almacenes, formularios asíncronos con errores visibles, eliminación de fallbacks demo en V1 y pruebas de integración del frontend. La fuente del contrato se conserva en `docs/api/contract-schema.sql` para regenerarlo desde un clon independiente. Las limitaciones de adjuntos, sesión local, campos sin columna y operaciones compuestas quedan identificadas arriba.

- **2026-10-29 · Completo en ese corte (contrato y fixtures locales; conexión de pantallas pendiente):** contrato V1 documentado en `api/business-rules.md` y OpenAPI en `api/openapi.json`, derivados del SQL fuente. El catálogo de endpoints que se generaba por separado se retiró por duplicar el OpenAPI. Fixtures separadas en `json/v1-demo/`; middleware local `/mock-api/` y clientes/DTOs tipados por módulo en `api/v1.*`. Esta entrada conserva el estado histórico de octubre; el avance y la conexión actuales están registrados en las auditorías superiores.
- **2026-10-29 · Completo (modo ficticio de desarrollo):** API local de Vite activada explícitamente con `VITE_API_BASE_URL=/mock-api/`. Fixtures editables en `json/` para los recursos consumidos por los servicios actuales; lecturas, CRUD en memoria y relaciones sin modificar páginas, mappers ni el cliente HTTP. Reiniciar Vite restaura las fixtures. Backend real sigue siendo el modo predeterminado y conserva sus errores sin fallback. Build bloqueado si apunta a la API ficticia; archivos/S3 fuera de la simulación. Los almacenes y demos locales sin API mantienen su comportamiento previo.
- **2026-10-25:** Consolidación de toda la documentación en `docs/` (entonces `architecture-and-solid.md`, `ui-and-design-system.md`, `agent-workflow-and-constraints.md` e `integration-status.md`; ahora `architecture.md`, `design-system.md`, `development.md` e `integration-status.md`), unificando los antiguos reportes de conexión, backend y entidades por vista.
- **2026-10-21:** Implementación de `QualityPage` (`/calidad`) con alcances Exportador e Industria sobre `quality.store.ts` (`// TODO(api)`).
- **2026-10-19:** Implementación de `CampaignDeliveriesPage` (`/campaigns/:id/deliveries`) con coordinación en memoria y ruta placeholder `CampaignWeeklyDeliveryProgramPage`.
- **2026-10-17:** Reemplazo de `CampaignCarrierPaymentsPage` (eliminada) por `CampaignCarriersPage` (`/campaigns/:id/carriers`) con acuerdo de pago local (`campaignCarriers.store.ts`). Creación de 4 transportistas de ejemplo en BD local.
- **2026-10-16:** Límite de 1 certificación por campaña y cálculo automático de kilos iniciales en `CampaignCertificationsPage`. Retiro del campo `mtdCeratitis` de la UI en `CampaignLinkProviderModal`.
- **2026-10-14:** Alineación del payload de `campanias-proveedores` (omitiendo los 12 campos legacy de finca) y habilitación de datos demo (`*.demo.ts` solo en `DEV && MODE !== "test"`) para todos los almacenes sin API.
- **2026-10-12:** Registro único de 8 módulos en `navigationItems.ts`. Nuevas vistas de gestión para clientes de campaña (`/campaigns/:id/clients`), contratos (`.../contracts`), entregas (`.../deliveries`), exámenes (`.../exams`), detalle de proveedor en campaña (`.../providers/:cxpId`), detalle de cliente (`/planificacion-comercial/:id`) y tipos público/privado en transporte (`carrierExtras.store.ts`). Integración del flujo S3 en `provider-subresources.api.ts`.
- **2026-10-11:** Nuevas vistas de detalle de proveedor (`/proveedores/:id`), fincas (`/proveedores/:id/fincas`) y certificados (`/proveedores/:id/certificados`), más entrevistas por finca de campaña (`/campaigns/:id/providers/:cxpId/interviews`) con código `FYV` en memoria. Retiro de `ProviderAgronomicoModal`.
- **2026-10-03:** Restauración del diseño con `FileDropzone` pasando por `uploadDocument.ts`. Unificación del gestor de paquetes en `pnpm`. Conexión de CRUD de transporte (`carrier.api.ts`).
- **2026-09-20 a 2026-09-27 (FE01–FE07):** Conexión y pruebas Vitest de CRUD de clientes (`FE02`), CRUD de proveedores (`FE03`), subrecursos de proveedor con `validator@13.15.35` (`FE04`), edición de relación cliente-campaña y certificados (`FE05`), y lectura de contratos de cliente (`FE06`).
- **2026-09-08:** Primera auditoría general de vistas (`Campana`, `Fruta`, `CampaniaProveedor`, `Proveedor`, `ClienteNegocio`, `CertificadoCampana`) y acuerdo de mantener `/login` simulado hasta que el backend implemente autenticación.

## Correcciones tras la auditoría de flujos · 2026-11-09 · Verificación local

- Calidad conserva el ID del proveedor de carga al cambiar de variedad. En el alta administrativa, los recursos nuevos se revierten si falla el detalle y la API permite completar desde Calidad una cabecera que haya quedado sin kilos. Una cabecera vacía no se proyecta como carga operativa en Chofer, Logística, Liquidación o Facturación. La reversión usa el contrato V1 existente. Una garantía transaccional para el alta administrativa requeriría un comando del servidor que cubra todo el guardado.
- El chofer ve las variedades de las fincas coordinadas para cada proveedor. Facturación agrupa por cliente y campaña, conserva las URLs de los requerimientos históricos y respeta el contrato de cada carga. Campañas indica que las fincas se vinculan desde Entrevistas.
- Se comprueba contra el mock V1 con recargas en frío, fallos simulados del detalle y datos con varios requerimientos del mismo cliente. Los registros históricos con filas duplicadas requieren contraste con sus datos de origen antes de corregir cantidades.

## Portal compartido del chofer · 2026-11-09 · Parcial

Frontend, API y simulación incluyen el listado de entregas coordinadas para el rol Chofer. El alta de carga usa una transacción y conserva los vínculos de la coordinación. Queda pendiente verificar el flujo completo con una sesión Chofer contra PostgreSQL y desplegar ambos proyectos.

El visor de recojo se sirve desde el mismo origen que el portal y envía ese origen al solicitar las imágenes de OpenStreetMap. En una prueba local con Chrome se comprobó el encabezado y el aviso cuando el servidor de imágenes responde con HTTP 403. La corrección del mapa se distribuye con el frontend.
