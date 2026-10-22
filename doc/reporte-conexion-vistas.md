# Reporte de conexión de vistas al backend — epe-web

## Actualización 2026-10-21 — nuevo módulo de Cosecha y Control de Calidad

| Vista/componente | Estado — fecha | Alcance y operaciones |
|---|---|---|
| `QualityPage` (`/calidad`) y modales `QualityAddCampaignModal` | **Parcial — 2026-10-21 / solo local, API faltante** | Implementación del módulo de Cosecha y Control de Calidad en alta fidelidad. Dispone de selector segmentado entre alcances **Exportador** e **Industria**, filtros por Campaña, Estado de campaña y búsqueda, y tabla con ordenación, paginación y exportación (CSV y PDF). Acciones contextuales por alcance: para Exportador incluye «Análisis y revisión», «Carga» y «Guías de remisión»; para Industria incluye «Carga» y «Guías de remisión». Los registros y vinculaciones viven en memoria (`quality.store.ts`, `// TODO(api)`) con datos de demostración solo en desarrollo (`quality.demo.ts`). Las acciones individuales quedan declaradas listas para conectar vistas y modales una vez detalladas por producto. |

## Actualización 2026-10-17 — transportistas por campaña con acuerdo de pago (reemplaza «Pagos a transportistas»)

| Vista/componente | Estado — fecha | Alcance y operaciones |
|---|---|---|
| `CampaignCarriersPage` (`/campaigns/:id/carriers`) y modales `CampaignLinkCarrierModal`, `CampaignCarrierAgreementModal`, `CampaignCarrierDetailsModal` | **Parcial — 2026-10-17 / solo local, API faltante** | Los transportistas se leen de Gestión de Transporte (`GET /empresas-transporte-externo`, conectado). El vínculo transportista–campaña, su cotización y el acuerdo de pago (pago único o con adelanto; registrar, editar, marcar saldo como pagado y consulta) viven en estado local en memoria (`campaignCarriers.store.ts`, `// TODO(api)`) porque el backend aún no tiene servicio de transportistas por campaña. Con datos de demostración solo en desarrollo (`campaignCarriers.demo.ts`). El pago efectivo se registra en Liquidación de compra (fuera de esta vista). |
| `CampaignDeliveriesPage` (`/campaigns/:id/deliveries`) y modales `CampaignDeliveryCoordinationModal`, `CampaignDeliveryDetailsModal` | **Parcial — 2026-10-19 / solo local, API faltante** | Lista las entregas programadas en los contratos de los clientes de la campaña (`campaignContractDeliveries.store.ts`, local) y permite completar y editar su coordinación: transportista vinculado, camión y chofer (de Gestión de Transporte, conectado), proveedores de la campaña (`GET /campanias-proveedores/campania/:id`) con al menos una finca cada uno (fincas locales, `providerLocalData.store.ts`), fechas del viaje, condiciones de la carga y observaciones. La coordinación se guarda en memoria (`// TODO(api)`), con datos de demostración solo en desarrollo. |
| `CampaignWeeklyDeliveryProgramPage` | **Sin cambios — 2026-10-19 / requiere definición** | Solo existen la ruta, el archivo y la opción del menú; sin diseño ni datos hasta que gestión defina la vista. |
| `CampaignCarrierPaymentsPage` y sus modales de pago (registrar pago, adjuntar boleta, completar adelanto, detalle) | **Retirada — 2026-10-17** | Se eliminaron por decisión de gestión: el pago al transportista ya no se registra en la campaña; se maneja como acuerdo de pago por transportista vinculado. Las entradas anteriores se conservan abajo como historial. |
| Datos de demostración de Gestión de Transporte | **Nota — 2026-10-17** | En la BD de desarrollo local se crearon por la API 4 transportistas de ejemplo (SUTRIMEX, FIXGROM, TRANSPACK y el independiente José Ramírez, ids 2–5), con vehículos y choferes. El backend actual exige RUC de 11 dígitos incluso para el independiente (se usó un RUC de persona natural). Tipo, MTC y ubicación siguen en `carrierExtras.demo.ts` (solo desarrollo). |

## Actualización 2026-10-16 — certificación única y cálculo automático de kilos iniciales

| Vista/componente | Estado — fecha | Alcance y operaciones |
|---|---|---|
| `CampaignCertificationsPage` y `CampaignCertificationFormModal` | **Parcial — 2026-10-16 / certificación única y cálculo de kilos** | Se limitó a un máximo de 1 certificación por campaña: el botón «Registrar certificación» se oculta apenas exista una registrada y solo permite editar la existente. En el modal, los «Kilos iniciales» se convirtieron en un campo de solo lectura calculado automáticamente a partir de la suma de kilos estimados (`cantidadProveedor`) de los productores seleccionados, recalculándose dinámicamente si se agregan o quitan productores. |
| `CampaignLinkProviderModal` y operaciones de `campanias-proveedores` | **Parcial — 2026-10-16 / campo mtdCeratitis retirado** | Se retiró el campo `mtdCeratitis` del modal de vinculación de proveedores (`CampaignLinkProviderModal`) y de sus validaciones obligatorias, ya que el dato no vendrá del backend. Los DTO y mapeos de creación/actualización tratan `mtdCeratitis` como opcional. Se retiró la columna de la exportación de proveedores y se protegieron las lecturas en vistas de detalle y directorios. Sigue pendiente la gestión de entrevistas/fincas con APIs propias. |

## Actualización 2026-10-14 — contrato de productor de campaña sin finca

| Vista/componente | Estado — fecha | Alcance y operaciones |
|---|---|---|
| `CampaignLinkProviderModal` y operaciones de `campanias-proveedores` | **Parcial — 2026-10-14 / contrato de escritura alineado** | Los payloads de creación y actualización conservan `campaniaId`, `proveedorId`, `tipoProveedor`, `cantidadProveedor`, `mtdCeratitis` y `frutaConvencionalEstimado`; omiten los doce campos legacy de finca/perfil que el endpoint ya no almacena. Los DTO aceptan `fincaId` opcional para consumidores que ya tengan ese dato; esta vista no agrega selector ni consultas automáticas de fincas y su UI no cambia. Sigue pendiente que la gestión de entrevistas/fincas de campaña tenga APIs propias; el cambio no las conecta. |

## Actualización 2026-10-12 — registro único y rutas de módulos

| Vista/componente | Estado — fecha | Alcance y operaciones |
|---|---|---|
| `navigationItems` + `ModulesGrid` + selector de módulos de `TopNavBar` | **Completo — 2026-10-12 / navegación** | La portada y el selector superior dejaron de mantener listas independientes: ambos consumen un único registro de ocho módulos con título, descripción, icono, imagen, ruta y estado. Los cuatro módulos existentes conservan sus rutas funcionales. |
| Calidad, Logística y Despacho, Facturación y Cobros, Liquidación de Compra | **Sin cambios — 2026-10-12 / módulos en construcción** | Se añadieron rutas principales reales (`/calidad`, `/logistica-despacho`, `/facturacion-cobros`, `/liquidacion-compra`) y páginas de estado en construcción. No consumen API ni simulan operaciones; quedan preparadas para sustituirse por sus vistas funcionales cuando se definan. |

## Actualización 2026-10-12 — entregas por contrato de cliente

| Vista/componente | Estado — fecha | Alcance y operaciones |
|---|---|---|
| `CampaignContractDeliveriesPage` + `CampaignContractDeliveryModal` (`/campaigns/:id/clients/:clientLinkId/contracts/:contractId/deliveries`) | **Parcial — 2026-10-12 / solo local, API pendiente** | La acción «Entregas» del menú de cada contrato abre una vista propia con banner de contrato, cliente y campaña. Incluye tabla con todos los datos disponibles (fecha, kilos programados, destino y observaciones), además de registro, edición y eliminación; no se añadió un detalle redundante. Permite múltiples entregas por contrato. Los registros viven únicamente en memoria en `campaignContractDeliveries.store.ts`, sin datos precargados, y se pierden al recargar. Pendiente reemplazar el almacén marcado `TODO(api)` cuando exista el servicio. |

## Actualización 2026-10-12 — contratos por cliente de campaña

| Vista/componente | Estado — fecha | Alcance y operaciones |
|---|---|---|
| `CampaignClientContractsPage` + `CampaignClientContractModal` (`/campaigns/:id/clients/:clientLinkId/contracts`) | **Parcial — 2026-10-12 / solo local, API pendiente** | La acción «Contratos» del menú de cada cliente abre una vista propia con contexto conjunto de cliente y campaña, tabla, estado vacío y operaciones de registro, consulta, edición y eliminación. El formulario conserva únicamente precio por kg, moneda, cantidad propuesta, condiciones de pago, condiciones de entrega, observaciones y archivo de contrato; `FileDropzone` se usa también en consulta y reemplazo. Los contratos se guardan por vínculo solo en memoria en `campaignClientContracts.store.ts` y se pierden al recargar; no hay datos precargados ni confirmación de backend. Pendiente reemplazar el almacén marcado `TODO(api)` cuando exista el contrato del servicio. |

## Actualización 2026-10-12 — nuevo borrador visual de participación de clientes

| Vista/componente | Estado — fecha | Alcance y operaciones |
|---|---|---|
| `CampaignLinkClientModal` | **Parcial — 2026-10-12 / conexión de escritura retirada por rediseño** | Por decisión del responsable visual, el modal ya no ejecuta `POST /campanas/:id/clientes-negocio`, no sube documentos y no muestra confirmación de persistencia. Conserva lecturas de catálogo para seleccionar clientes/campañas y variedades reales. El borrador contiene únicamente cliente, campaña, cantidad, fecha de registro, ficha técnica, variedades requeridas, destino solicitado, ventana de entrega y observaciones; se eliminaron del formulario `documentoUrl` y `kilosAcordados`. El botón valida y cierra el borrador visual. Marcado `TODO(api)` para que el nuevo contrato backend conecte posteriormente la escritura sin alterar la composición del modal. |

## Actualización 2026-10-12 — rediseño pendiente del vínculo cliente-campaña

| Vista/componente | Estado — fecha | Alcance y operaciones |
|---|---|---|
| `CampaignLinkClientModal` | **Sin cambios — 2026-10-12 / requiere definición** | La nueva ficha solicitada conserva cliente, campaña, cantidad, fecha de registro y ficha técnica, pero reemplaza campos que hoy son obligatorios en `POST /campanas/:id/clientes-negocio` (`documentoUrl`, `kilosAcordados`) e incorpora datos que el contrato actual no acepta: variedades requeridas, destino solicitado, ventana de entrega y observaciones. No se implementa un guardado parcial ni campos ficticios. Pendiente confirmar si el backend será ampliado y si `documentoUrl`/`kilosAcordados` dejan de ser obligatorios o deben mantenerse en el nuevo diseño. |

## Actualización 2026-10-12 — gestión de clientes de campaña

| Vista/componente | Estado — fecha | Alcance y operaciones |
|---|---|---|
| `CampaignClientsPage` (`/campaigns/:id/clients`) | **Parcial — 2026-10-12** | Sustituye el modal `CampaignManagementClientsModal` y recibe las entradas «Vincular clientes» de la tabla de campañas y «Ver todos» del detalle. Sigue la composición de gestión de certificaciones: cabecera de campaña, título con acción, tabla con contador, estado vacío y acciones. Lee `GET /campanas/:id` y `GET /campanas/:id/clientes-negocio`; permite consultar el detalle del vínculo. «Vincular cliente» reutiliza `CampaignLinkClientModal` y `POST /campanas/:id/clientes-negocio`. La edición del vínculo usa `PATCH /campanas/:id/clientes-negocio/:clienteNegocioCampanaId`; desvincular usa `DELETE` de esa misma ruta. La ficha global del cliente no se edita aquí. La creación y el reemplazo de documentos siguen pendientes del servicio `uploadDocument(file)`: sin él se muestra error y no se envía el POST/PATCH con archivos. La edición de cantidades/fecha sin reemplazar archivos sí usa la API real. |


## Actualización 2026-10-11 — entrevista por finca de campaña

| Vista/componente | Estado — fecha | Alcance y operaciones |
|---|---|---|
| `CampaignInterviewsPage` + `CampaignInterviewModal` | **Parcial — 2026-10-11** | Mantiene las lecturas reales `GET /campanas/:id` y `GET /campanias-proveedores/campania/:id`; si la campaña no incluye el nombre de la fruta, consulta `GET /frutas` para identificarla. El formulario permite seleccionar una finca del padrón local del proveedor o crear una nueva con los campos de `ProviderFincaModal`, además de registrar densidad, distanciamiento, riego y aplicaciones por finca/campaña. El código FYV se asigna al guardar con secuencia compartida entre todos los productores de esa campaña en **memoria**; editar no cambia el código y una finca ya entrevistada no se vuelve a registrar en la misma relación. La finca nueva se agrega al almacén local del proveedor y la entrevista al almacén local de campañas. No hay GET/POST/PATCH de entrevistas ni secuencia persistente/atómica en el backend: la unicidad solo está garantizada dentro de esta sesión del navegador; entre usuarios o recargas requiere un servicio de backend. Pendiente definir contrato/API de finca de campaña y generación de código. |
| `ProviderAgronomicoModal` (proveedor general) | **Sin cambios de integración — 2026-10-11 / modal retirado** | Se eliminó el modal que ya no se usaba en el módulo de proveedores; sus cinco campos agronómicos ahora forman parte del registro de entrevista en campañas. Los utilitarios y el almacén histórico del proveedor permanecen por sus pruebas, sin UI activa. |

## Actualización 2026-10-11 — gestión de entrevistas de campaña

| Vista/componente | Estado — fecha | Alcance y operaciones |
|---|---|---|
| `CampaignProvidersPage` → `CampaignInterviewsPage` (`/campaigns/:id/providers/:cxpId/interviews`) | **Parcial — 2026-10-11** | La acción del productor ahora abre una vista de gestión. El contexto de campaña y vínculo se consulta con `GET /campanas/:id` y `GET /campanias-proveedores/campania/:id`. Registrar, consultar y corregir entrevistas reutiliza `CampaignInterviewModal`; los registros se guardan por vínculo solo en memoria en `campaignInterview.utils.ts`, sin datos precargados ni confirmación del backend, y se pierden al recargar. El nombre de finca se introduce manualmente en el modal porque todavía no hay una API de fincas/entrevistas vinculadas a esta campaña. Pendiente: endpoints de lectura, creación y edición de entrevistas, y contrato de asociación de finca/código FYV. |

> **Actualización de estados vacíos: 2026-09-20.** Los selectores alimentados por API para frutas, proveedores y clientes muestran ahora un mensaje explícito cuando la lista no contiene opciones (`No hay ... registrados/disponibles`); las opciones informativas son deshabilitadas y no seleccionables.

> **Actualización de validaciones: 2026-09-20.** Se agregaron esquemas Zod y visualización de errores `400 Bad Request` debajo de los campos correspondientes en formularios que escriben vía API: crear/editar campañas, crear/editar clientes y vincular clientes/proveedores a campañas. Esto mejora validación de formularios; no cambia las operaciones API disponibles ni los estados de integración indicados en la auditoría.

> **Actualización de auditoría: 2026-09-20.** Esta entrada complementa, no reemplaza, los estados históricos de 2026-09-08 que siguen abajo. En esta iteración se conectaron clientes (listar/crear/editar/eliminar e historial de contratos) y derivados de fruta en detalle de campaña, se reemplazaron KPIs de muestra por conteos de campañas reales y se deshabilitaron funciones sin API. Se conservan sus archivos fixture; las vistas activas no deben leerlos.

## Actualización 2026-10-11 — registro de fincas del proveedor

| Vista/componente | Estado — fecha | Qué cambió |
|---|---|---|
| "Gestionar certificaciones" (menú ⋮ de `CampaignTable` → `/campaigns/:id/certifications`, `CampaignCertificationsPage` + `CampaignCertificationFormModal` / `ViewModal` / `ExpansionModal` / `PaymentModal`; acceso directo desde la tarjeta de certificaciones del detalle de campaña) | **Parcial — 2026-10-12 / solo local, API faltante** | Vista propia que reemplaza al modal anterior: tabla (certificación, vigencia automática, productores, kilos, trámite/pago), detalle, edición, ampliaciones de kilos y pagos. El backend solo guarda nombre, documento, recibo, costo, vencimiento y vigencia (`certificado-campana.dto.ts`); el resto no tiene endpoint, así que todo vive en memoria por campaña (`campaignCertificates.store.ts`, se pierde al recargar) y **el detalle de campaña ya no lee las certificaciones de la API**, sino de ese almacén, para que ambas vistas coincidan. Los productores cubiertos salen de los proveedores vinculados a la campaña (`GET` real). **Solo en desarrollo** (`import.meta.env.DEV`) el almacén arranca con datos de `campaignCertificates.demo.ts` para las campañas 1–12; producción y pruebas arrancan vacías. El estado de vigencia se calcula del periodo (`getVigenciaAutomatica`) y el de pago, del costo y los pagos. |
| "Ver detalles" (acción de la fila de `ProvidersTable` → `/proveedores/:id`, `ProviderDetailsPage` + `ProviderOverviewCard` + `ProviderMetricCards` + `ProviderLinkedCard`) | **Parcial — 2026-10-11** | Reemplaza al modal `ProviderViewModal` (eliminado). Los datos del proveedor vienen de `GET /proveedores/:id` (real). Fincas, certificados y la sección "Información productiva" (estado de sanidad y frutas con variedades, `providerProduccion.utils.ts`) salen del almacén local (`providerLocalData.store.ts`) y no de la API: el detalle de proveedor del backend no trae frutas y devuelve la sanidad como `estadoExamenSanidadAgraria` (el front usa `estadoSanidadAgraria`), así que sus cifras y listas se pierden al recargar, y los botones "Gestionar" llevan a sus vistas. Ya no muestra frutas ni exámenes (`ProviderSubresources` quedó sin uso) ni datos agronómicos. **Solo en desarrollo** (`import.meta.env.DEV`) el almacén local arranca con datos de demostración de `providerLocalData.demo.ts` para los proveedores 1–24 (con casos vacíos, de una finca y de muchas); producción y pruebas arrancan vacíos. |
| "Gestión de fincas" (menú ⋮ de `ProvidersTable` → `/proveedores/:id/fincas`, `ProviderFincasPage` + `ProviderFincasTable` + `ProviderFincaModal`) | **Parcial — 2026-10-11 / solo local, API faltante** | Antes: modal "Registrar finca" dentro de la tabla de proveedores. Ahora es una vista propia con la lista de fincas del proveedor y el botón "Registrar finca". El proveedor sí se lee de `GET /proveedores/:id`; las fincas no tienen servicio (`GET /fincas`, `/proveedores/:id/fincas` y variantes responden 404), así que se guardan en memoria (se pierden al recargar), sin datos precargados, y no se permite repetir el nombre de una finca del mismo proveedor. Solo lista y registro: editar y eliminar fincas no están definidos. Modelo y validación en `providers/providerFinca.utils.ts`; el guardado local vive en `providers/providerLocalData.store.ts` (único archivo a reemplazar cuando exista el servicio, marcado `TODO(api)`). **2026-10-12:** el registro de finca pasó a 13 campos en 3 bloques (identificación, ubicación y producción): se agregaron código de lugar de producción SENASA, código catastral, cultivos (una o varias frutas, cada una con sus variedades; selector de dos columnas `FruitVarietyPicker`, con el catálogo `providerCatalogo.ts`, hoy fijo) y edad del cultivo. Siguen solo en memoria; la tabla de fincas ahora resume cultivo, ubicación y superficie, y tiene acciones de ver detalles, editar y eliminar (`updateFinca` / `removeFinca` en el almacén local; las fincas se identifican por su posición en la lista hasta que el backend les dé un id). |
| "Gestión de certificados" (menú ⋮ de `ProvidersTable` → `/proveedores/:id/certificados`, `ProviderCertificadosPage` + `ProviderCertificadosTable` + `ProviderCertificadoModal`) | **Parcial — 2026-10-11 / solo local, API no conectada a propósito** | Vista propia (no modal). Por ahora es solo visual: los certificados se guardan en memoria por proveedor (se pierden al recargar), sin datos precargados, y el documento elegido se conserva como `File` y se previsualiza con el propio `FileDropzone` (modo `readOnly`). El proveedor sí se lee de la API. Cuando se conecte, reemplazar `addCertificado` / `updateCertificado` / `useProviderLocalData` en `providerLocalData.store.ts` por las rutas S3 de `provider-subresources.api.ts` (`createCertificadoProveedorWithFile`, `updateCertificadoProveedorWithFile`, `getCertificadoProveedorDownloadUrl`). El backend local aún no expone la subida S3 (`/certificados/documentos/subida` responde 404). |
| "Agregar / Actualizar datos agronómicos" (`ProviderAgronomicoModal`; **2026-10-11: ya no está en el menú ⋮ de `ProvidersTable`**, el modal se conserva como referencia para otro módulo) | **Parcial — 2026-10-11 / solo local, API faltante** | Nuevo flujo. El backend no expone datos agronómicos por proveedor (`/proveedores/:id/datos-agronomicos` y variantes responden 404; los campos equivalentes existen solo en `campania-proveedor`, para la entrevista de campaña). Un registro por proveedor, validado y guardado en memoria (se pierde al recargar), sin datos precargados. La primera vez la acción dice "Agregar" y, una vez guardados, "Actualizar": el formulario abre cargado y todos los campos son editables. Modelo, validación y conversión en `providers/providerAgronomico.utils.ts` (con pruebas); el guardado local vive en `providers/providerLocalData.store.ts` (`TODO(api)`). Pendiente: entidad y endpoints. |

## Actualización 2026-10-03 — diseño restaurado y flujos sin API

Esta entrada complementa los estados de 2026-09-20 que siguen abajo (se conservan como historial; los que cambiaron se indican acá). Se restauró el diseño original de campañas, proveedores, clientes y transporte sobre la lógica de integración existente, y por decisión del responsable de diseño los flujos sin endpoint funcionan con **estado local en memoria** (se pierde al recargar, sin datos inventados que simulen al backend). Regla en `AGENTS.md` → "Excepción — flujos de diseño sin endpoint".

| Vista/componente | Estado — fecha | Qué cambió respecto de 2026-09-20 |
|---|---|---|
| Entrevistas en `CampaignProvidersPage` (`CampaignInterviewModal`, pestaña "Entrevista" del detalle) | **Parcial — 2026-10-03 / solo local, API faltante** | Antes: deshabilitadas. Ahora el informe se registra con validación, se puede consultar/corregir ("Ver entrevista") y se muestra en el detalle del proveedor, guardado solo en memoria. Pendiente: servicio de entrevistas. Modelo y validación en `campaigns/campaignInterview.ts`. |
| "Registrar examen" en `CampaignProvidersPage` (`CampaignExamModal`) | **Parcial — 2026-10-03 / solo local** | Antes: éxito simulado sin guardar nada. Ahora el examen se valida y aparece en el detalle del proveedor junto a los que ya existen en el backend. El backend sí tiene `POST /proveedores/:id/examenes`, pero exige la URL del documento y este formulario adjunta un archivo (no hay almacenamiento): pendiente decidir si el campo pasa a URL. Ver `campaigns/campaignExam.ts`. |
| `campaigns/pages/CampaignCarrierPaymentsPage.tsx` y modales de pago | **Parcial — 2026-10-03 / solo local, API faltante** | Antes: **Sin cambios / deshabilitada** (historial 2026-09-20). Ahora funciona con estado local: registrar pago (completo o adelanto, con empresa de transporte elegida del catálogo real `getCarriers()`), confirmar pendiente con boleta, cerrar adelanto con boleta, filtros por fecha. Reglas en `campaigns/carrierPayments.utils.ts` (con pruebas). La lista inicial son los datos de muestra históricos de `carrierPayments.data.ts` (decisión del responsable de diseño). Pendiente: entidad y endpoints de pagos al transportista. |
| `campaigns/components/CampaignStatsOverview.tsx` | **Parcial — 2026-10-03** | Antes: tendencias quitadas por falta de históricos. Ahora cada tarjeta muestra la variación contra el mes anterior calculada con `fechaInicio`/`fechaFin` de las campañas que ya devuelve `GET /campanas` (`campaigns/campaignStats.utils.ts`, con pruebas). No hay endpoint de históricos. |
| Transporte (`carriers/*`) | **Parcial — 2026-10-03** | Conectado a `carrier.api.ts` (empresas, vehículos, choferes: listar/crear/editar/eliminar). Placeholder del buscador corregido a "empresa de transporte" (filtra por nombre de empresa). **Decisión pendiente:** el diseño original mostraba "Chofer asignado" en vehículos y "Vehículo" en choferes; el backend modela esa relación por rango de fechas dentro de la trazabilidad de transporte (no hay vínculo directo), así que la tabla de choferes muestra "Asignación: Por trazabilidad" y la de vehículos no tiene esa columna. "Enviar requerimiento" sigue simulando éxito (no hay API). |
| Transporte — tipo y datos nuevos (`carriers/carrierProfile.utils.ts`, `carrierExtras.store.ts`) | **Parcial — 2026-10-12 / solo local, API faltante** | El registro/edición distingue **Público · Transportista** (RUC, MTC) y **Privado · Independiente** (documento de identidad, CGN, RUC opcional); ambos con teléfono, correo, departamento, provincia y ciudad. El backend (`/empresas-transporte-externo`) solo guarda `nombreCompleto`, `ruc`, `correo`, `numero`: tipo, MTC, CGN, documento y ubicación viven en memoria por id (se pierden al recargar). **Pendiente backend:** modelar esos campos y hacer `ruc` opcional para el independiente (hoy la API responde 400 si falta). Al conectar, `carrierExtras.store.ts` se elimina y `CarrierDto`/`CarrierInput` los llevan. |
| `campaigns/pages/CampaignProviderDetailsPage.tsx` (`/campaigns/:id/providers/:cxpId`) | **Parcial — 2026-10-12 / datos locales** | Detalle del proveedor en la campaña rediseñado con el mismo esquema que el detalle de proveedor: banner de campaña, tarjeta de datos de registro, cuatro indicadores (cantidad estimada y MTD Ceratitis de la relación `campania-proveedor`, exámenes y fincas entrevistadas) y resúmenes de exámenes y entrevistas con acceso a su gestión. **Se quitó la pestaña/vinculación de fincas:** las fincas de la campaña salen de las entrevistas. Los exámenes nuevos y las entrevistas viven en memoria (ver filas de exámenes y entrevistas). |
| `commercial-planning/pages/ClientDetailsPage.tsx` (`/planificacion-comercial/:id`) | **Conectado — 2026-10-12** | Detalle del cliente como vista propia (antes un modal): datos de registro, indicadores (contratos, kilos acordados, campañas, último contrato) y la tabla con **todos** sus contratos con campañas, de `GET /clientes-negocio/:id/contratos`. Desde acá se edita el cliente y se añade un contrato (flujo existente de vincular cliente a campaña). La tabla de clientes quedó con lo esencial: cliente (RUC), tipo, contacto y ubicación. |
| `campaigns/pages/CampaignExamsPage.tsx` (`/campaigns/:id/providers/:cxpId/exams`) | **Parcial — 2026-10-12 / solo local, API faltante** | Vista propia de exámenes de laboratorio de un proveedor vinculado: lista (muestra, tipo, fechas, estado), registrar, editar, ver detalles y eliminar. Un examen avanza por etapas (pendiente de envío → enviado → con resultado). Lee los exámenes existentes con `GET` de exámenes del proveedor (solo lectura); los nuevos viven en memoria (`campaignExams.store.ts`, por proveedor) porque el backend exige la URL de un documento y aún no hay carga de archivos. Pendiente backend: campos de etapa, identificación de muestra y fecha de envío en la entidad `examen-proveedor`. |
| Transporte — modales de vehículo, chofer y transportista | **Actualizado — 2026-10-12** | El **volumen del vehículo ya no se calcula**: es un dato que se ingresa y se envía tal cual en `volumen` (`POST/PATCH /vehiculos-externos`). Los botones de guardar no se desactivan por el contenido (solo mientras guarda): la revisión previa marca vacíos y formatos bajo cada campo, y los 400 del backend se ubican bajo su campo con `useFormSubmit` (mismo flujo que campañas). Obligatorios hoy — vehículo: placa, ancho, altura, profundidad, volumen, peso neto y bruto (> 0; bruto ≥ neto); chofer: nombre, teléfono y correo; transportista: ver fila anterior. **Pendiente backend:** confirmar si algún campo es opcional y los límites de cada DTO. |
| Documentos adjuntos: `CampaignLinkClientModal` (requerimientos/contrato y ficha técnica, también como "Añadir contrato"), `CampaignManagementClientsModal` (editar vínculo) y `CampaignCertificationsModal` (recibo y documento) | **Parcial — 2026-10-03 / bloqueado por servicio de archivos** | Antes: campos de URL. Ahora vuelven las zonas de subir archivo del diseño original; al guardar, cada archivo pasa por `shared/api/uploadDocument.ts` para obtener la URL que exige el backend. Hasta que exista el servicio de archivos (se integraría uno tipo Cloudinary) esa función falla con un aviso claro y **no se guarda nada**: crear contratos y certificaciones de campaña desde la UI queda bloqueado hasta entonces. Al editar, los archivos son opcionales (si no se elige uno se conserva la URL actual). Siguen como campos de URL, por no existir en el diseño original: documento de identidad en `ProviderFormModal` y documentos de exámenes/certificados en `ProviderSubresources`. |
| Interfaz base (`shared/components/ui/*`) | **Sin cambios de integración — 2026-10-03** | Se repararon ~250 clases de Tailwind deformadas por un reemplazo masivo del 2026-09-19 (p. ej. `minh-[-60vh]` → `min-h-[60vh]`, `hasdata-[-icon=…]` → `has-data-[icon=…]`). Es un cambio de estilos, no de datos. |
| Gestor de paquetes | **Sin cambios de integración — 2026-10-03** | Se unificó en pnpm: se eliminó `package-lock.json`, el workflow de CI instala con `pnpm install --frozen-lockfile` y se restauró el script `dev:network` que documenta el README. |

## Estado por vista/componente — revisión 2026-09-20

| Vista/componente | Estado — fecha | Alcance verificado / pendiente |
|---|---|---|
| `campaigns/pages/CampaignsPage.tsx` y campaña CRUD | **Parcial — 2026-09-20** | Campañas conectadas (lectura/crear/editar/eliminar según historial). Revisar operaciones de entidades relacionadas; fruta es catálogo de solo lectura. |
| `campaigns/pages/CampaignDetailsPage.tsx` | **Parcial — 2026-09-20** | Campaña y certificados consultados; Derivados consulta `GET /frutas/:frutaId/derivadas` según la fruta de la campaña (lectura solamente). Crear certificado sigue sin flujo claro de URL de documento; cosecha no tiene API. |
| `campaigns/pages/CampaignProvidersPage.tsx` / gestión de proveedores de campaña | **Parcial — 2026-09-20** | Relación campaña-proveedor conectada; contrato aún no cubre explícitamente todos los PATCH/DELETE y asignaciones posibles desde la vista. |
| `campaigns/pages/CampaignCarrierPaymentsPage.tsx` y modales de pago | **Sin cambios / deshabilitada — 2026-09-20 / API faltante** | No hay entidad ni endpoint de pagos/transportistas. La página muestra aviso y no monta tabla, filtros ni operaciones simuladas. Se conserva `campaigns/carrierPayments.data.ts` como referencia; no se usa desde esta vista. |
| `providers/pages/ProvidersPage.tsx` / `ProvidersTable.tsx` | **Parcial — 2026-09-20** | Lista real `GET /proveedores`; acción de entrevista deshabilitada por falta de API. CRUD y subrecursos existentes todavía no se exponen completamente. `ProviderViewModal.tsx` tiene datos de ejemplo y no está conectado a la tabla actual. |
| `commercial-planning/pages/CommercialPlanningPage.tsx` y componentes de clientes | **Parcial — 2026-09-20** | Lista, alta, edición y eliminación usan `/clientes-negocio`; detalle consulta `GET /clientes-negocio/:id/contratos`. Falta integrar “Añadir contrato”: la UI tiene archivos locales pero no hay API de almacenamiento; la asociación requiere campaignId y URLs para documento/ficha técnica. |
| `auth/pages/AdminLoginPage.tsx` | **Sin cambios — 2026-09-20 / decisión previa vigente** | Backend carece de autenticación; conservar mock hasta definir auth. |
| `campaigns/components/CampaignStatsOverview.tsx` | **Parcial — 2026-09-20** | KPIs de cantidades por estado calculados con `getCampanas()`. Se quitaron las tendencias porcentuales de muestra porque el backend no expone históricos/variaciones. |
| Entrevistas en `CampaignProvidersPage` y `ProvidersTable` | **Sin cambios / deshabilitadas — 2026-09-20 / API faltante** | No hay API de entrevistas; no se presenta contenido de ejemplo ni se simula guardado. |
| Certificados de campaña / certificados de proveedor | **Parcial — 2026-09-20** | APIs de certificados están disponibles; campaña permite listar/eliminar según historial. El formulario mostrado como cotizaciones no corresponde inequívocamente a certificado de proveedor/campaña. |
| `campaigns/components/CampaignHarvestCard` (bloque de avance) | **Sin cambios — 2026-09-20 / API faltante** | Backend no modela cosecha/kilos/progreso. Confirmado: esperar API específica y mantener documentada esta brecha. |
| Derivados de fruta en detalle de campaña | **Parcial — 2026-09-20** | Confirmado: listar derivados de la fruta asociada a la campaña; no hay vínculo separado. Implementado con `GET /frutas/:frutaId/derivadas`; no es una vista de administración CRUD. |
| `users/pages/UsersModulesPage.tsx` | **Sin cambios — 2026-09-20 / no aplica** | Navegación pura; no representa registros de negocio. |

## Inventario de APIs backend revisadas — 2026-09-20

Los controladores actuales exponen:

| Recurso | Rutas/operaciones | Correspondencia frontend observada |
|---|---|---|
| `campanas` | CRUD `/campanas` | `campaigns`; presente API CRUD. |
| `frutas` | CRUD `/frutas`; derivadas GET/POST/GET individual `/frutas/:frutaId/derivadas...` | Catálogo GET conectado en formularios de campaña; detalle de campaña lista derivadas de su `frutaId`. Administración de fruta/derivadas no tiene vista confirmada. |
| `proveedores` | CRUD `/proveedores` | Listado conectado; alta/edición/baja requieren revisar formulario vigente. |
| `proveedores/:proveedorId/examenes` | CRUD de exámenes | No integrado en vista de proveedor observada. |
| `proveedores/:proveedorId/certificados` | CRUD de certificados | Sin correspondencia inequívoca con las cotizaciones de certificación de UI. |
| `proveedores/:proveedorId/frutas` | GET/asignar POST/quitar DELETE | No integrado en la vista de proveedor observada. |
| `campanias-proveedores` | CRUD; filtro GET `/campanias-proveedores/campania/:campaniaId` | Relación vinculada a vistas de proveedores de campaña; verificar cobertura de actualización y baja en UI. |
| `campanas/:campaniaId/clientes-negocio` | CRUD | Modal de vínculo campaña-cliente tiene cobertura parcial según historial. |
| `clientes-negocio` | CRUD y GET `/:clienteNegocioId/contratos` | Cliente CRUD e historial conectados a Gestión Comercial. Alta de contrato por vínculo campaña-cliente no se puede completar hasta definir selección de campaña y URLs de documentos/storage. |
| `campanas/:campaniaId/certificados` | CRUD | Consulta/baja conectadas según historial; alta espera definición para `documentUrl`/subida. |
| `health` | GET `/health`, `/health/cicd` | APIs técnicas, sin vista de negocio asociada; no aplica integrarlas a una pantalla funcional. |

## Definiciones que necesito antes de continuar integraciones ambiguas

1. **Gestión Comercial / clientes — respondido:** esta vista representa clientes y contratos. Cliente CRUD e historial integrados; creación de contrato queda pendiente por falta de almacenamiento de archivos y de seleccionar campaña en el flujo actual.
2. **Certificaciones — ubicación:** no hay página independiente activa de certificaciones en `App.tsx`. Existe tarjeta Certificaciones en `Campañas` → detalle de campaña, asociada a `certificado-campana`. No equivale necesariamente a una vista de cotizaciones descrita en documentación histórica; no se identificó una ruta activa para esa vista.
3. **Derivados — respondido e implementado:** listar los derivados de la fruta asociada a la campaña, sin vínculo independiente; usa `GET /frutas/:frutaId/derivadas`.
4. **Pagos y cosecha — respondido:** esperar APIs específicas. En el backend actual no existen endpoints para pagos a transportistas ni cosecha.
5. **Ficha de proveedor:** está en `Proveedores` → `Gestión de Proveedores` → acción **Ver detalles** (icono ojo), archivo `providers/components/ProviderViewModal.tsx`. Se recomienda agregar ahí frutas/exámenes/certificados. El modal aún usa datos mock y no se cambió porque el destino de estos bloques no ha sido confirmado.

Pagos, cosecha y entrevistas permanecen deshabilitados hasta que existan APIs específicas. La acción “Añadir contrato” no debe simular éxito: el backend exige campaignId, URLs de documento/ficha técnica y kilos; no hay API de almacenamiento. Confirmar si se acepta ingresar URLs manualmente y elegir campaña, o si se espera a crear API de almacenamiento. Los archivos de muestra se conservan; no deben usarse como fallback de API.

> Único archivo a editar para este proceso (ver regla en `AGENTS.md` → "Documentación del proyecto"). Se reutiliza en cada re-ejecución de la auditoría, no se crea uno nuevo.

**Última actualización:** 2026-09-08
**Backend de referencia:** `epe-backend` (NestJS), `VITE_API_BASE_URL=http://localhost:3000/`

## Resumen ejecutivo

Se auditaron todas las vistas de `epe-web`. De las vistas sin conexión a backend, las que tenían un endpoint real y evidente ya quedaron conectadas. Las que dependían de un dato o concepto de negocio que **no existe en el backend actual** se dejaron documentadas como pendientes — sin inventar datos ni endpoints — a la espera de decisión de producto/backend, confirmando con el usuario en cada caso.

| Estado | Cantidad |
|---|---|
| ✅ Conectadas al backend | 9 |
| ⏸️ Pendientes / ambiguas (documentadas, no tocadas) | 6 |
| ➖ No aplica (vista de navegación pura) | 1 |

## ✅ Vistas conectadas

| Vista | Ruta | Conectado vía | Notas |
|---|---|---|---|
| `campaigns/pages/CampaignsPage.tsx` (`CampaignTable.tsx`) | `/campaigns` | `getCampanas()` | Ya estaba conectada; se corrigió un bug: el contador "Mostrando X de X" usaba un array mock residual (`data.length`) en vez de `campaigns.length`. Array mock eliminado. |
| `campaigns/pages/CampaignDetailsPage.tsx` | `/campaigns/:id` | `getCampana(id)` + `getCertificadosCampana(id)` | Ahora lee `:id` con `useParams()`. Nombre, estado, fechas y días de duración (calculado real desde fechaInicio/fechaFin) vienen del backend. Certificaciones reales con estado vigente/por vencer/vencida. |
| `campaigns/pages/CampaignProvidersPage.tsx` | `/campaigns/:id/providers` | `getCampaniaProveedoresByCampania(id)` | Lee `:id` con `useParams()`. Filtra por tipo de proveedor (productor/acopio) según tab. |
| `campaigns/components/CampaignManagementProvidersModal.tsx` | modal (desde `CampaignDetailsPage`) | `getCampaniaProveedoresByCampania(campaniaId)` | `campaniaId` ahora se pasa correctamente desde `CampaignDetailsPage`. |
| `campaigns/components/CampaignLinkProviderModal.tsx` | modal (desde `CampaignProvidersPage`) | `getProveedores()` + `createCampaniaProveedor()` | Selector con catálogo real de proveedores; guarda vínculo real al confirmar. |
| `clients/pages/ClientsPage.tsx` (`ClientsTable.tsx`) | `/clientes` | `getClientesNegocio()` (dominio `clients/api/` creado desde cero) | Dominio no tenía capa `api/` — se creó completa (`.api.ts`/`.dto.ts`/`.mapper.ts`) siguiendo el patrón del proyecto. |
| `providers/pages/ProvidersPage.tsx` (`ProvidersTable.tsx`) | `/proveedores` | `getProveedores()` (dominio `providers/api/` creado desde cero) | `getProveedores()` vivía "prestada" dentro de `campaigns/api/campania-proveedor.api.ts`; se movió a `providers/api/proveedor.api.ts` como dueño canónico, y `campaigns` ahora importa desde ahí (sin duplicar código). Columnas "Fruta"/"Categoría de Fruta"/"Estado" no existen en el modelo `Proveedor` base — quedan como `—`, ver pendientes. |
| `campaigns/components/CampaignManagementClientsModal.tsx` | modal (desde `CampaignDetailsPage`) | `getClientesNegocioCampana(campaniaId)` (dominio `campaigns/api/cliente-negocio-campana.*` creado desde cero) | Reutiliza el modelo `ClienteNegocio` de `clients/api/` (no lo duplica). `campaniaId` ya cableado. |
| `campaigns/components/CampaignLinkClientModal.tsx` | modal (desde `CampaignTable.tsx`) | `getClientesNegocio()` + `createClienteNegocioCampana()` / `deleteClienteNegocioCampana()` | `campaniaId` ya cableado. El campo `documentoUrl` (requerido por el backend) no tiene endpoint de subida de archivos — se implementó como input de URL de texto, no como upload real (ver pendientes). |

## ⏸️ Pendientes / ambiguas — requieren decisión antes de conectar

Ninguna de estas se tocó con datos inventados. Cada una quedó documentada en código con un comentario `// TODO: pendiente de backend...` donde aplica.

| Vista / bloque | Por qué está pendiente | Decisión del usuario |
|---|---|---|
| `auth/pages/AdminLoginPage.tsx` | El backend (`epe-backend`) no tiene ningún módulo de autenticación: sin `/login`, sin JWT, sin tabla de usuarios. Hoy el login solo guarda una bandera en `localStorage`. | **Confirmado 2026-09-08:** dejar como está (mock local) hasta que el backend defina el mecanismo de auth real. |
| `campaigns/components/CampaignStatsOverview.tsx` (4 KPIs en `CampaignsPage`) | No existe endpoint de resumen/estadísticas en el backend. Los KPIs y sus tendencias (`+33%`, etc.) siguen 100% hardcodeados. | **Confirmado 2026-09-08:** dejar todo el bloque pendiente, sin tocar, hasta definir si se calcula en frontend o se pide endpoint nuevo. |
| `certifications/pages/CertificationsPage.tsx` y `CertificationsCreatePage.tsx` | La tabla muestra "cotizaciones de certificados" con estado y pago. El backend solo tiene `certificado-proveedor` y `certificado-campana`, ninguno con esos campos — no está claro a qué entidad mapea el concepto de negocio. | **Confirmado 2026-09-08:** dejar pendiente, sin crear dominio `api/` para `certifications` hasta aclarar el concepto de negocio. |
| `campaigns/pages/CampaignDetailsPage.tsx` — bloque "Avance de cosecha" (kilos cosechados/estimados, % de progreso) | La entidad `Campana` del backend no tiene esos campos. | **Confirmado 2026-09-08:** dejar como placeholder (`----`/`0%`), documentado con TODO en el código. |
| `campaigns/pages/CampaignProvidersPage.tsx` — badge de "estado" del proveedor (Aprobado/Por aprobar) | No existe campo de estado en `Proveedor` ni en `CampaniaProveedor`. | **Confirmado 2026-09-08:** badge en estado neutro "Sin definir", documentado con TODO en el código. |
| `campaigns/pages/CampaignDetailsPage.tsx` — sección "Derivados de Fruta" (chips tipo "Mango Kent"/"Mango Eduard") | **Hallazgo nuevo durante la implementación** (no estaba en el inventario original): sigue 100% hardcodeada. No se identificó a qué entidad del backend debería mapear. | **Sin confirmar todavía — pendiente de que el usuario indique el origen de este dato.** |

## Deuda técnica menor detectada durante la implementación

- `campaigns/components/CampaignLinkProviderModal.tsx`: el DTO `CreateCampaniaProveedorDto` exige `mtdCeratitis: string`, pero el formulario de UI no captura ese campo todavía. Se envía `"0"` como placeholder con TODO en el código — falta decidir si se agrega un input real al formulario.
- `campaigns/components/CampaignLinkClientModal.tsx`: el campo `documentoUrl` es obligatorio en el backend pero no hay endpoint de subida de archivos; se implementó como input de texto (URL) en vez de un flujo de carga de archivo real — confirmar si se necesita un upload real más adelante.
- `providers/pages/ProvidersPage.tsx`: columnas "Fruta", "Categoría de Fruta" quedan como `—` — el backend expone `GET /proveedores/:proveedorId/frutas` y `GET /proveedores/:proveedorId/examenes`, que permitirían completarlas, pero no se conectaron en esta pasada (fuera del alcance original, quedan como mejora futura obvia).

## Cambios de arquitectura realizados

- **Fusión de carpetas de documentación**: `docs/` se fusionó dentro de `doc/` (ya no existe `docs/`). Regla agregada a `AGENTS.md`.
- **`getProveedores()` reubicado**: de `campaigns/api/campania-proveedor.api.ts` a `providers/api/proveedor.api.ts` (dueño canónico), eliminando duplicación. `campaigns` ahora importa el tipo/mapper desde `providers`.
- **Nuevo dominio `clients/api/`**: `cliente-negocio.api.ts` / `.dto.ts` / `.mapper.ts`, contra `GET /clientes-negocio`.
- **Nuevo dominio `campaigns/api/cliente-negocio-campana.*`**: contra `GET/POST /campanas/:campaniaId/clientes-negocio` y `DELETE .../:id`, reutilizando el modelo `ClienteNegocio` del dominio `clients` (sin duplicar tipos).
- **Hook `SessionStart`** agregado en `epe-web/.claude/settings.json`: detecta la rama git actual y, si es `developer`, inyecta un recordatorio automático de revisar este reporte y `doc/entidades-vistas.md`.
- **Reglas nuevas en `AGENTS.md`**: carpeta única `doc/`, archivo único de reporte, regla de rama `developer`, y checklist de organización de archivos.

## Vistas que no aplican

| Vista | Motivo |
|---|---|
| `users/pages/UsersModulesPage.tsx` | Landing de navegación pura (grid de módulos), no representa datos de negocio que deban salir de un backend. |
