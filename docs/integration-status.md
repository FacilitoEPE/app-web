# 4. Estado de Integración Frontend ↔ Backend (`epe-web`)

> **Único archivo oficial de seguimiento.** Toda auditoría o conexión de vistas/APIs debe actualizarse aquí indicando fecha ISO (`YYYY-MM-DD`) y estado (`Completo`, `Parcial`, `Sin cambios`), conservando el historial en la sección inferior.

---

## Auditoría manual — 2026-10-29 · Parcial / bloqueada por entorno

**Resultado:** no se acredita el funcionamiento integral de las 62 fichas V01–V62. Se recorrieron con Chrome las pantallas principales, pestañas accesibles y formularios indicados abajo, contra `http://localhost:5173` y el backend real configurado en `http://localhost:3000/`. No se activaron mocks, no se modificó código funcional, no se ejecutaron seeds ni se crearon/eliminaron registros de negocio. La sesión local se cerró y se restauró mediante el acceso de demostración.

### Entorno comprobado

- `.env` tiene `VITE_API_BASE_URL=http://localhost:3000/` y no define `VITE_API_CONTRACT=v1`; `usesV1()` selecciona legacy.
- Lecturas reales: `GET /campanas`, `/frutas`, `/proveedores`, `/clientes-negocio` y `/empresas-transporte-externo`: HTTP 200 con `[]`. CORS de los cuatro últimos permite `http://localhost:5173`.
- `GET /v1/campanas`: HTTP 404. Hay implementación V1 en el árbol de trabajo del backend, pero su presencia en disco no acredita que el proceso del puerto 3000 la esté sirviendo.
- El catálogo de frutas vacío impide crear una campaña desde el formulario. Sin campaña, participaciones, contratos, fincas y unidades no se pueden recorrer los procesos dependientes con datos válidos.
- La documentación histórica de este archivo no es evidencia de pruebas del servidor actual. La afirmación anterior de «backend futuro todavía no implementado» debe entenderse como antecedente, no como evaluación del código backend actual.

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

**Completo para el consumo HTTP de datos y operaciones soportadas por el contrato; backend futuro todavía no implementado.** Con `VITE_API_BASE_URL=/mock-api/` las pantallas consumen automáticamente `/mock-api/v1` y `json/future/`. Con una URL real, activar `VITE_API_CONTRACT=v1`; sin esa opción se conserva la API actual. `legacy` explícito mantiene la compatibilidad anterior.

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

- **2026-10-29 · Completo (conexión de pantallas a V1):** adaptadores de lectura y comandos HTTP por dominio, hidratación y refresco de almacenes, formularios asíncronos con errores visibles, eliminación de fallbacks demo en V1 y pruebas de integración del frontend. Snapshot de fuentes en `docs/reference/` para regenerar el contrato desde un clon independiente. Las limitaciones de adjuntos, sesión local, campos sin columna y operaciones compuestas quedan identificadas arriba.

- **2026-10-29 · Completo (contrato y mocks futuros; migración de pantallas pendiente):** contrato V1 documentado en `future-api-contract.md`, OpenAPI en `future-api.openapi.json` y catálogo `future-api-endpoints.md`, derivados del SQL objetivo de `app/docs/agro-schema/03_schema_total.sql` y acuerdos vigentes. Fixtures separadas en `json/future/`; middleware `/mock-api/v1` y servicios/DTOs por módulo en `api/future.*`. Se conservan servicios sin versión y almacenes actuales; no se afirma conexión de pantallas a V1 ni backend desplegado. Diferencias de fincas/variedades, certificaciones, tipos, cardinalidades y documentos identificadas en la guía. Las vistas de Logística, Facturación, Liquidación y Chofer sí existen en el código actual con almacenes locales; la fila anterior que las declaraba en construcción es un antecedente desactualizado.
- **2026-10-29 · Completo (modo ficticio de desarrollo):** API local de Vite activada explícitamente con `VITE_API_BASE_URL=/mock-api/`. Fixtures editables en `json/` para los recursos consumidos por los servicios actuales; lecturas, CRUD en memoria y relaciones sin modificar páginas, mappers ni el cliente HTTP. Reiniciar Vite restaura las fixtures. Backend real sigue siendo el modo predeterminado y conserva sus errores sin fallback. Build bloqueado si apunta a la API ficticia; archivos/S3 fuera de la simulación. Los almacenes y demos locales sin API mantienen su comportamiento previo.
- **2026-10-25:** Consolidación de toda la documentación en `docs/` (`architecture-and-solid.md`, `ui-and-design-system.md`, `agent-workflow-and-constraints.md`, `integration-status.md`), unificando los antiguos `reporte-conexion-vistas.md`, `backend-api-integration.md` y `entidades-vistas.md`.
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
