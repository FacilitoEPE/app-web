# AGENTS.md — epe-web

Guía rápida de arquitectura para agentes que trabajen en este proyecto (React + Vite + TypeScript).

## Screaming Architecture

- `src/modules/<domain>/{components,pages}` — un módulo por feature de negocio (`auth`, `campaigns`, `users`).
- `components/` es **plano**: sin anidamiento atomic-design (`molecules`/`organisms`). Se descartó deliberadamente por ser indirección innecesaria.
- Cada módulo es autocontenido: sus páginas importan sus propios componentes vía `@/modules/<domain>/components/...`.

## `src/shared/`

Todo lo transversal / no-dominio vive aquí:

- `shared/components/ui/` — catálogo shadcn vendorizado. Se trae con `npx shadcn@latest add`, pero **es código nuestro y se personaliza ahí mismo**: estilos por defecto de la app, variantes (`cva`) y la lógica propia del control (estado interno, accesibilidad) van dentro del componente.
  - **No envolver un componente de `ui/` en otro archivo solo para darle estilo o lógica.** Ese envoltorio duplica la API, obliga a mantener dos piezas y esconde el componente real. Si a un `Input` le falta algo, se le agrega a `ui/input.tsx` y se usa `<Input>` directo.
  - Un componente propio en `shared/components/` se justifica cuando compone **varias** piezas en un patrón nuevo (p. ej. `AppModal`, `RowActions`), no cuando reexporta una sola con clases encima.
  - Lo que sí queda fuera: lógica de negocio/dominio. Eso vive en el módulo.
  - Campos de formulario: nunca armar a mano el trío `Field` + `FieldLabel` + control + error, ni crear wrappers locales (`UnitField`, `IconField`, `AmountField`, `RequiredField`, `InterviewInput`…).
    - Texto o número: `InputField`. Lo que cambia de un campo a otro es una prop: `unit` (insignia a la derecha), `leading` (ícono o prefijo como "S/" a la izquierda), `required`/`optional`, `readOnly`, `hint`, `type`, `inputMode`, `variant="compact"` (etiqueta chica en mayúsculas), `className` (columnas de la grilla), `inputClassName`.
    - Selector, `Combobox`, fecha, área de texto o archivo: `FormField` (etiqueta + control + ayuda/error) con el control adentro. Sin etiqueta ni control, `<FormField error={…} />` muestra un error general del formulario.
    - Valor de solo lectura (no editable): `InfoField`, no un `Input` deshabilitado ni una caja armada a mano.
    - El error (con ícono y animación de entrada) y su espaciado salen siempre de `FormField`. Si falta una variante, se agrega a `InputField`/`FormField`/`ui/input.tsx`, no se duplica.
    - Fuera de esto quedan solo los formularios de `modules/auth` (login), que tienen su propio diseño.
  - Unidad o sufijo dentro de un campo (KG, ha, m, /año…): `unit`, tanto en `InputField` como en `<Input unit="ha" />`. Es el único estilo (recuadro verde de marca a la derecha, como el de tipo `date`); no dibujar la unidad a mano con un `<span>` posicionado.
  - Subtítulos de sección dentro del cuerpo de un modal: usar siempre `ModalSection` (texto en mayúsculas verde + línea degradada que remata en trazos; `aside` para un contador, "Opcional" o una acción chica). Es el único subtítulo de modal: no crear `<h3>` sueltos ni variantes locales, y no repetir ícono en círculo por sección (ese patrón es de la cabecera de `AppModal`). Los subtítulos son a rasgos generales y la mayoría de modales no los necesita: un formulario que registra o vincula una sola cosa (campaña, cliente, examen, vínculo) va sin subtítulos aunque tenga muchos campos; no se parte un registro en "periodo", "fruta", etc. Solo se usan cuando el modal junta bloques de distinta naturaleza: un formulario y la lista de lo ya registrado, los datos de un registro y sus relaciones (contratos, exámenes), o bloques realmente independientes (identificación vs. ubicación de una finca).
  - Modales: siempre `AppModal`, con `icon` (obligatorio) y `size` (`sm` · `md` · `lg` · `xl` · `2xl`, ver `AppModalSize`); no se fija el ancho con `className="sm:max-w-…"`. Si el modal guarda contra la API, pasa `busy={saving}`: `AppModal` bloquea el cierre (X, Escape, clic afuera) mientras guarda; no armar ese bloqueo a mano en cada modal. El error general del formulario va con `<FormField error={…} />`, nunca con un `Alert`.
  - Valores de solo lectura en un modal de detalle: `InfoField` (`variant="plain"` para un badge, píldoras o una lista; `multiline` para observaciones). No armar etiquetas en mayúsculas a mano.
  - Banner informativo en escalera (`ContextBanner`): toda vista que sale de otra lleva arriba el banner del **nivel inmediato anterior** (campaña → proveedores/clientes/certificaciones/pagos con `CampaignContextBanner`; proveedor en la campaña → entrevistas/exámenes con `CampaignProviderContextBanner`; cliente en la campaña → contratos con `CampaignClientContextBanner`; contrato → entregas con `CampaignContractContextBanner`; proveedor → fincas/certificados con `ProviderContextBanner`). Cada módulo lo alimenta con un envoltorio fino; nunca se copia el marcado del banner en la página. Las vistas principales de un módulo y las vistas de detalle completas **no** llevan banner. Si el dato del banner llega aparte de la vista, se reserva su lugar con `ContextBannerPlaceholder`.
  - Piezas comunes de las vistas (no se rearman en la página):
    - Carga o error de una vista que no puede dibujarse sin su entidad (un detalle, los contratos de un cliente): `PageLoading` / `PageError` de `shared/components/PageState.tsx`, siempre con `back` (la vista anterior) y `onRetry` cuando reintentar tiene sentido. Las vistas de lista no los usan: su carga y su error van dentro de `TableCard` (estado vacío), para no esconder filtros ni encabezado.
    - Tarjeta principal de un detalle: `EntityOverviewCard` (cada módulo con un envoltorio fino: `ProviderOverviewCard`, `ClientOverviewCard`, `CarrierInfoCard`) junto a `MetricCards`, en la grilla `lg:grid-cols-[1.95fr_1fr]`. Los detalles llevan "Editar …" en el encabezado.
    - Conteos: `TableCountPill` recibe `singular` y `plural`; fuera de ella, `plural()` de `shared/utils/plural.ts`. Nunca un plural fijo.
    - Cifras y fechas: `formatKg`, `formatMoney`, `formatDecimal` y `formatDisplayDate` de `shared/utils/format.ts`; no crear un `Intl.NumberFormat` ni un `displayDate` por archivo. Paginación de tablas: `paginate(items, page)` de `shared/utils/paginate.ts` (8 filas, `TABLE_PAGE_SIZE`).
    - Sombras: `shadow-card`, `shadow-card-hover`, `shadow-glow` y `shadow-danger` (tokens de `index.css`); no escribir sombras con valores sueltos.
    - Acciones de fila, siempre en este orden: Ver detalles · Editar · Eliminar/Desvincular; lo demás va en "más opciones".
    - Exportar: `TableExportMenu getData={…}` con un `TableExport` (`shared/utils/exportTable.ts`): Excel baja un CSV y PDF abre la impresión con la tabla formateada.
    - Breadcrumb y botón "Regresar" son independientes (ambos en `shared/layout/breadcrumbRoutes.ts`). El breadcrumb muestra la ruta de la vista actual (`getBreadcrumbLevels`). "Regresar" (`useGoBack`) vuelve a la vista de la que realmente se vino —la lista, el detalle o una notificación—; solo si se entró directo a la URL, sin historial, sube un nivel por la escalera `getParentHref` (reemplazando la entrada del historial, para no hacer bucles). Una vista nueva se agrega en el breadcrumb y en la escalera.
- `shared/layout/` — chrome de la app: `Sidebar.tsx`, `TopNavBar.tsx`, `DashboardLayout.tsx`, `NotificationsMenu.tsx` (notificaciones, almacén en `shared/notifications/`) y `SettingsModal.tsx` (preferencias del equipo).

## Gestor de paquetes

- Solo **pnpm** (`pnpm install --frozen-lockfile`, `pnpm dev`, `pnpm test`, `pnpm build`). La versión está fijada en `packageManager` de `package.json`.
- La única referencia de dependencias es `pnpm-lock.yaml`. No generar ni versionar `package-lock.json` (ya está en `.gitignore`): un segundo lockfile desincroniza versiones entre quienes usan npm y pnpm, y el `Dockerfile` y el workflow de CI instalan con `--frozen-lockfile`.

## Comprobación de tipos

- El `tsconfig.json` de la raíz solo tiene referencias: `tsc -p .` **no comprueba nada**. Usar `pnpm build` (que corre `tsc -b`) o `npx tsc --noEmit -p tsconfig.app.json`.

## Convención de imports

- Usar el alias `@/` para todo import interno (`@/modules/...`, `@/shared/...`, `@/lib/...`).
- Los imports relativos (`./`, `../`) quedan reservados **exclusivamente** para archivos dentro de `shared/components/ui/` (convención propia de shadcn, se deja intacta para no divergir del upstream).

## Config de shadcn

`components.json` define `aliases.ui` y `aliases.components` apuntando a `@/shared/components(/ui)`. Por eso `npx shadcn@latest add` ya coloca los componentes nuevos en el lugar correcto sin ajustes manuales.

## Integración con backend (API)

- Cliente HTTP único: `shared/api/client.ts` (axios, `baseURL` desde `VITE_API_BASE_URL`). Ningún módulo crea su propia instancia de axios.
- Por dominio, en `modules/<domain>/api/` (crear solo cuando ese dominio empiece a consumir el backend, no especulativamente):
  - `<domain>.api.ts` — llamadas axios usando el cliente compartido, funciones `get<Domain>()`, `create<Domain>(dto)`, etc. Reciben/devuelven DTOs.
  - `<domain>.dto.ts` — tipos que espejan la forma cruda del backend.
  - `<domain>.mapper.ts` — funciones `to<Domain>(dto)` que transforman DTO → modelo de frontend.
- Regla dura: componentes y páginas **nunca** importan un DTO ni el cliente axios directamente — solo consumen el modelo de frontend ya mapeado, vía `<domain>.api.ts`. Un cambio de forma en el backend se absorbe en el mapper de ese dominio, sin tocar componentes.
- Sin TanStack Query / SWR por ahora (decisión explícita, YAGNI) — si más adelante hace falta caché/refetch automático, ese es el upgrade natural.
- Variable de entorno `VITE_API_BASE_URL` documentada en `.env.example`.

## Documentación del proyecto

- Existe una única carpeta de documentación: `doc/` (se consolidó `docs/` dentro de `doc/`). No recrear `docs/`.
- Cuando un agente realice la tarea de "revisar vistas sin conexión a backend", el **único** archivo que debe crear o editar para reportar el estado es `doc/reporte-conexion-vistas.md` (o el nombre que ya exista si la tarea se re-ejecuta — se reutiliza el mismo archivo, nunca se crea uno nuevo). Ningún otro archivo de `doc/` debe tocarse como parte de ese reporte.
- Ese reporte debe indicar, por vista: si está conectada al backend o no; si no lo está, si la conexión es obvia (y qué se hizo) o ambigua (y qué falta decidir/preguntar al usuario).
- Regla dura: si no es obvio cómo conectar una vista al backend (falta contrato de API, el dato no existe, o requiere una decisión de producto), el agente **nunca** debe inventar datos ni endpoints — debe preguntarle al usuario antes de escribir código, y mientras tanto dejar esa vista listada como pendiente/ambigua en el reporte.
- Cada vez que se trabaje en la rama `developer`, el agente debe revisar `doc/reporte-conexion-vistas.md` y `doc/entidades-vistas.md` para identificar qué vistas/documentos quedaron pendientes de avanzar y priorizar continuarlos. Existe un hook de `SessionStart` (configurado en `.claude/settings.json`) que ya inyecta automáticamente la rama actual en cada sesión, así que esta regla se cumple **incluso sin que el usuario lo recuerde**.

### Seguimiento por fecha de integración de APIs y vistas (obligatorio)

- En toda auditoría o cambio de integración, actualizar el archivo único `doc/reporte-conexion-vistas.md`; no crear reportes paralelos. Registrar la fecha ISO (`YYYY-MM-DD`) de la revisión y por vista/componente un estado explícito: **Completo — YYYY-MM-DD**, **Parcial — YYYY-MM-DD** o **Sin cambios — YYYY-MM-DD**. Añadir el motivo/alcance y las APIs/operaciones cubiertas o pendientes.
- “Completo” significa que las operaciones necesarias y evidentes para el alcance funcional de esa vista consumen la API real; no significa simplemente que exista un `GET`. “Parcial” identifica exactamente qué operaciones están conectadas y cuáles no. “Sin cambios” debe indicar si es intencional/no aplica o si sigue pendiente.
- Mantener historial por fecha: no reescribir entradas anteriores como si hubieran tenido el estado nuevo. Añadir una actualización fechada y conservar el estado anterior como historial cuando cambie.
- Auditar las rutas declaradas por los controladores de `epe-backend/src` y contrastarlas con llamadas reales del frontend, incluyendo operaciones de lectura, creación, edición y eliminación; documentar endpoints backend sin vista como tales, sin inventar una vista destino.
- Antes de implementar una integración ambigua (concepto/dato de negocio sin correspondencia clara, ausencia de endpoint, o decisión de producto), detenerse y consultar al usuario. Registrar la pregunta y dejar esa vista **Sin cambios — fecha / requiere definición** hasta recibir respuesta. No inferir ni fabricar datos o endpoints.
- Al incorporar APIs nuevas o modificadas, repetir el cruce API↔vista, actualizar estados con la fecha actual y revisar las pruebas pertinentes.
- No usar datos de prueba/mock/fixtures del frontend como fallback ni en vistas activas. Si no existe un endpoint backend para una vista/operación, deshabilitar el bloque y mostrar claramente que está pendiente de API; registrar la ausencia con fecha en `doc/reporte-conexion-vistas.md`. Conservar los archivos de datos de prueba como referencia histórica si existen; no borrarlos salvo solicitud explícita del usuario.
- **Excepción — flujos de diseño sin endpoint (confirmado por el responsable de diseño, 2026-10-03):** cuando una operación todavía no tiene API (entrevistas, subida del archivo de un examen, pagos al transportista), el diseño no se deja muerto: el flujo funciona con **estado local en memoria** (se pierde al recargar) y sin datos precargados que simulen respuestas del backend. Cada uno de esos puntos queda marcado con `// TODO(api)` y su lógica separada de la pantalla (`<tema>.utils.ts`, con pruebas), para que quien conecte el backend solo reemplace el guardado local por la llamada. Nunca se muestra como si el backend hubiera confirmado nada y siempre se registra en `doc/reporte-conexion-vistas.md`.
- **Excepción — datos de demostración en desarrollo (pedido del responsable, 2026-10-11):** el almacén local de proveedores (`providerLocalData.store.ts`) arranca con datos de `providerLocalData.demo.ts` **solo con `import.meta.env.DEV`** (nunca en producción ni en pruebas), para revisar fincas y certificados con listas largas, nombres extensos y estados vacíos antes de tener la API. Es el único lugar con datos precargados; se borra el archivo cuando existan los servicios. La misma excepción aplica a las certificaciones de campaña (`campaignCertificates.demo.ts`, `campaignCertificates.store.ts`, 2026-10-12) y, por pedido del responsable (2026-10-14), a todo almacén local sin servicio: exámenes, entrevistas, contratos y entregas de clientes de campaña (`campaignClientContracts.demo.ts`) , los datos nuevos del transportista (`carrierExtras.demo.ts`) y las notificaciones (`shared/notifications/notifications.demo.ts`). Todos siguen el mismo patrón: un `<tema>.demo.ts` que solo carga el `.store.ts` con `import.meta.env.DEV && MODE !== "test"`, y las fechas y PDF de ejemplo salen de `shared/utils/demoData.ts` (no se copian). No extender esta excepción a vistas conectadas a la API: esas muestran lo que tenga la base de desarrollo.
- **Archivos y documentos:** el backend solo guarda URLs, pero el diseño usa `FileDropzone` (subir archivo), no campos de URL. Todo formulario con zona de archivo convierte el archivo en URL justo antes de guardar con `uploadDocument(file)` de `shared/api/uploadDocument.ts`. Ese es el único punto que hay que implementar cuando se integre el servicio de archivos; mientras no exista falla con un aviso claro y no guarda nada. No volver a poner campos de URL en lugar de la zona de archivo.
- **Recarga automática (HMR) de Vite:** va encendida por defecto para que los cambios se vean al guardar. Quien no pueda usar el websocket de Vite (p. ej. al abrir la web desde otro dispositivo) la apaga con `VITE_DISABLE_HMR=true` en su `.env` (documentado en `.env.example`) y reinicia Vite. No fijar `hmr: false` en `vite.config.ts`.
- El cache de la aplicación está deshabilitado intencionalmente en desarrollo y producción: no agregar estrategias cache-first/service-worker para documentos, assets ni llamadas API sin autorización explícita. Si se modifica SW o servidor, preservar `no-store` y verificar que no existan cachés antiguos activos.

## Tema claro / oscuro

- El tema se aplica con la clase `dark` en `<html>`. Lo maneja `shared/hooks/useTheme.ts` (sigue al sistema hasta que el usuario elige; se guarda en `localStorage` con la clave `epe-theme`) y el script inline de `index.html` lo aplica antes de pintar para evitar el destello. El interruptor es `shared/components/ThemeToggle.tsx`, en el header.
- Todos los colores salen de los tokens de `src/index.css`, que tienen valor en `:root` y en `.dark`: superficies `bg-card` / `bg-popover` / `bg-muted` / `bg-surface-page`, texto `text-ink` / `text-ink-body` / `text-ink-muted`, marca `brand` / `brand-surface` / `brand-border`, estados `status-*`. **No usar `bg-white`, hex sueltos (`[#...]`) ni paletas fijas de Tailwind (`gray-…`, `slate-…`)**: no cambian con el tema.
- **Criterio del verde en modo oscuro**: verde = identidad de marca, acción o feedback; gris neutro = estructura y contenido.
  - Gris neutro: fondo de página, cards, menús/popovers, inputs, cuerpo de tablas, botones secundarios, divisores, texto.
  - Verde lleno: botones principales, enlaces, pestaña/paginación activa, interruptor de tema, foco.
  - Velo verde (`brand-surface`, `bg-brand/…`): banda del header de tablas (`TABLE_HEAD_BG`), hover de filas (en `ui/table.tsx`), botón activo de vista tabla/grilla, círculos de ícono, píldoras de conteo, badges, recuadros destacados y avisos (p. ej. nota de cosecha).
  - Degradado verde: piezas de marca (banners con lema, hero) y el resplandor tenue de fondo `.page-ambient` del layout.
  - Toque verde en bordes: borde inferior del header y borde de modales (`brand-border`).
- Degradados que funden una imagen con su contenedor terminan en el token del contenedor (`from-card`), nunca en `from-white`.
- Excepciones válidas: texto blanco sobre el degradado o el verde de marca (`text-white`, `bg-white/20`), que se ve igual en ambos temas. Si un acento de color no puede salir de un token, se le da su variante `dark:` en el mismo lugar (o un bloque `.dark …` en el `.css` del módulo).

## Organización de archivos — checklist

Antes de crear un archivo nuevo, decidir en este orden:

1. ¿Es código de un dominio de negocio? → va en `src/modules/<domain>/{components,pages,api}`.
2. ¿Es transversal / sin dominio? → va en `src/shared/`.
3. Si a un componente de `shared/components/ui/` le falta un estilo, variante o lógica, se agrega ahí mismo (ver la regla de `ui/` arriba); no se crea un archivo que lo envuelva.
4. Cuando el dominio empiece a consumir backend, seguir el patrón `<domain>.api.ts` / `<domain>.dto.ts` / `<domain>.mapper.ts` — nunca importar el DTO ni axios directo desde componentes/páginas.
5. Usar siempre el alias `@/`, salvo dentro de `shared/components/ui/` (imports relativos, convención de shadcn).
