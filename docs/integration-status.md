# 4. Estado de Integración Frontend ↔ Backend (`epe-web`)

> **Único archivo oficial de seguimiento.** Toda auditoría o conexión de vistas/APIs debe actualizarse aquí indicando fecha ISO (`YYYY-MM-DD`) y estado (`Completo`, `Parcial`, `Sin cambios`), conservando el historial en la sección inferior.

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

- Se agregaron dos entregas programadas sin coordinación al contrato 2 de Mango 2026 en `json/future/entrega_programada.json`: 600 kg y 900 kg, dentro de los 1,500 kg acordados. El mock V1 de desarrollo las muestra como pendientes en Gestión de Entregas para probar Completar datos.
- Los datos se cargan solo con `/mock-api/` durante `pnpm dev`; no se añadió respaldo ficticio a la vista conectada ni se modificó el contrato del backend.

## Precarga de coordinación al elegir una entrega — 2026-11-01 · Completo

- La entrega de la captura estaba marcada `Completa`: ya tenía una fila en `coordinacion_entrega` con transportista, camión, chofer y fechas, más orígenes con proveedor y finca. Esos datos se proyectan a `delivery.coordinacion`; no provienen de los campos de programación (fecha, kilos, destino y observaciones).
- El modal de Completar permitía elegir entregas completas y cargaba su coordinación existente. Ahora ofrece únicamente pendientes; al seleccionarlas, transporte, fechas y proveedores permanecen vacíos para captura manual. Las completas se consultan o modifican desde las acciones Ver detalles y Editar de su fila.
- El botón superior se deshabilita cuando no hay pendientes, y la acción de una fila pendiente se llama Completar datos. La edición de una entrega ya coordinada conserva la precarga legítima de sus datos guardados.

## Banner en páginas de detalle — 2026-11-01 · Completo

- Retirado `CampaignContextBanner` de `/campaigns/:id/clients/:clientLinkId`, la página abierta por Ver detalles en Gestión de Clientes. Su ficha y métricas ya aportan contexto suficiente.
- Auditadas las demás páginas con ruta propia abiertas por Ver detalles: campaña, proveedor de campaña, proveedor global, cliente comercial y transportista. No montan `ContextBanner`. Las sub-vistas de gestión conservan sus banners de contexto.
- `docs/ui-and-design-system.md` ahora prohíbe explícitamente el banner superior en cualquier futura página de Ver detalles con ruta propia, incluso cuando la ruta está anidada.

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

La evidencia detallada se registra en [resultado E2E](pruebas/qa-e2e-flujos-negocio-v1-2026-10-30.md).

## Historial del E2E inicial — ejecución observada, no aceptación final

- En Chrome sobre `http://localhost:5173/modules` se completó campaña 6 (`QA E2E Orden Correcto 20261030`) desde el alta hasta **Terminado**, con 1,500 kg, recepción, cobro y liquidaciones registrados. El perfil de Chofer se usó después de cerrar sesión de Administrador; se registraron los cinco eventos, checklist y guía de salida, y luego se volvió a Administrador para el cierre.
- La evidencia por módulo, identificadores y valores queda en [resultado E2E](pruebas/qa-e2e-flujos-negocio-v1-2026-10-30.md). Los registros de QA se conservaron.
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
