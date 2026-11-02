# 2. Sistema de Diseño, Catálogo UI y Reglas de UX

## 2.1. Componentes Obligatorios por Patrón Visual

**Regla dura:** Nunca crear envoltorios sobre `src/shared/components/ui/*` solo para pasar clases, ni rearmar patrones a mano en las páginas.

| Necesidad en UI | Componente Obligatorio (`@/shared/components/...`) | Prohibiciones Estrictas |
| :--- | :--- | :--- |
| **Input de texto, número o fecha** | `InputField` (`unit="KG"`, `leading="S/"`, `required`, `optional`, `readOnly`, `hint`, `variant="compact"`) | Prohibido armar `Field` + `Label` + `Input` a mano o crear `UnitField` / `AmountField`. Prohibido dibujar unidades con `<span>` manual. |
| **Select, Combobox, Textarea, FileDropzone, SegmentedControl** | `FormField` envolviendo el control con `label`, `required`/`optional`, `hint`, `error` | Prohibido mostrar errores de campo fuera de `FormField`. |
| **Error general de formulario (`_form`)** | `<FormField error={errors._form} />` (sin `label` ni `children`) | Prohibido usar `<Alert>` dentro de un modal para errores de validación o guardado. |
| **Dato de solo lectura en ficha/modal** | `InfoField` (`variant="plain"` para badges/listas; `multiline` para observaciones) | Prohibido usar `<Input disabled />` o etiquetas en mayúsculas hechas a mano. |
| **Cualquier ventana modal** | `AppModal` con `icon` obligatorio, `size` (`sm`·`md`·`lg`·`xl`·`2xl`) y `busy={saving}` | Prohibido fijar ancho con `className="sm:max-w-..."` o programar bloqueo de cierre manual (lo hace `busy`). |
| **Subtítulo dentro de un modal** | `ModalSection` (`title`, `aside` opcional) | Prohibido usar `<h3>` sueltos o repetir íconos en círculo por sección. **No usar `ModalSection`** si el formulario registra una sola entidad simple. |
| **Vista de listado con tabla/grilla** | `PageHeader` + Filtros + `TableCard` (`TableToolbar`, `TableCountPill`, `TableExportMenu`, `TablePagination` con `paginate` de 8 filas) | Prohibido desmontar toda la página de lista con `PageLoading`/`PageError` (la carga y el error van dentro de `TableCard`). |
| **Acciones de fila en tabla** | `RowActions` en este orden exacto: **1. Ver detalles · 2. Editar · 3. Eliminar/Desvincular · 4. Más opciones (⋮)** | Prohibido alterar el orden de las acciones o deshabilitar el botón de guardar de un modal por campos vacíos. |
| **Vista de detalle de entidad con ruta propia** | Carga/error con `PageLoading` / `PageError` (siempre con `back` y `onRetry`). Grilla superior `lg:grid-cols-[1.95fr_1fr]` con `EntityOverviewCard` + `MetricCards`. Acción en header: `"Editar ..."` | Toda vista abierta por **Ver detalles** en una página aparte, incluso si su URL está dentro de una campaña, va **sin `ContextBanner` ni banner informativo superior**. La ficha y el resumen de la entidad son su encabezado visual. |

### Escalera de `ContextBanner` en Sub-vistas
Las **sub-vistas de gestión** que salen de otra llevan arriba el banner del **nivel inmediato anterior** (y reservan espacio con `ContextBannerPlaceholder` si cargan aparte). Esta regla no se aplica a páginas de **Ver detalles** con ruta propia:
- `/campaigns/:id/{providers,clients,certifications,carriers,deliveries}` → `CampaignContextBanner`
- `/campaigns/:id/providers/:cxpId/{interviews,exams}` → `CampaignProviderContextBanner`
- `/campaigns/:id/clients/:clientLinkId/contracts` → `CampaignClientContextBanner`
- `/campaigns/:id/clients/:clientLinkId/contracts/:contractId/deliveries` → `CampaignContractContextBanner`
- `/proveedores/:id/{fincas,certificados}` → `ProviderContextBanner`

---

## 2.2. Tokens de Color y Tema Claro / Oscuro (`src/index.css`)

El tema se aplica con la clase `.dark` en `<html>` (`useTheme.ts`, clave `epe-theme` en `localStorage`, interruptor `ThemeToggle.tsx`).

### Prohibición de Colores Fijos
**Prohibido usar `bg-white`, `text-black`, hexadecimales sueltos (`[#...]`) o paletas fijas de Tailwind (`gray-*`, `slate-*`, `zinc-*`, `green-*`, `emerald-*`).** Usar exclusivamente los tokens de `src/index.css`:

- **Superficies:** `bg-surface-page` (fondo general), `bg-card` (tarjetas/tablas), `bg-popover` (menús/modales), `bg-muted` (fondos secundarios).
- **Texto:** `text-ink` (títulos y cifras fuertes), `text-ink-body` (cuerpo), `text-ink-muted` (secundario/ayuda).
- **Marca (Verde):** `bg-brand`, `text-brand`, `text-brand-dark`, `bg-brand-surface` (velo verde), `border-brand-border`.
- **Estados y Sombras:** `status-warning`, `status-neutral`, `status-highlight` (y sus `-surface` / `-border`), `destructive`, `shadow-card`, `shadow-card-hover`, `shadow-glow`, `shadow-danger`.
- **Degradados sobre imágenes:** Fundir siempre hacia el contenedor (`from-card`), **nunca** `from-white`. `text-white` solo es válido sobre `bg-brand`, `--brand-gradient` o fotografías oscurecidas.

### Jerarquía del Verde en Modo Oscuro
- **Gris neutro (`bg-surface-page`, `bg-card`, `bg-popover`):** Toda la estructura (fondos, cards, inputs, cuerpo de tablas, botones secundarios, texto).
- **Verde lleno (`bg-brand`):** Botones primarios, enlaces, tab/página activa, foco.
- **Velo verde (`bg-brand-surface`):** Cabecera de tablas (`TABLE_HEAD_BG`), hover de filas, círculos de ícono, `TableCountPill`, badges y avisos.
- **Degradado verde (`--brand-gradient` / `.brand-gradient-hover`):** Banners de marca, hero y resplandor `.page-ambient`.

---

## 2.3. Identidad Visual, Voz y Microinteracciones

- **Identidad Agro Exportaciones F.V.:** Corporativa, moderna y orientada a datos ("Del campo al mundo"). Usar solo logos oficiales de `src/assets/image/`. Prohibido incluir nombres personales o marcas ajenas.
- **Tipografía e Iconos:** Fuente `Plus Jakarta Sans Variable` (`tabular-nums` en cifras). Iconos exclusivamente de `lucide-react` (`strokeWidth` `2` a `2.5`; `16–18px` en controles, `20px` en botones `xl`, `22–24px` en cabeceras). Botones de solo icono exigen `aria-label`.
- **Fotografía por fruta (`src/assets/*.webp`):** Configurada en `src/modules/campaigns/campaignFruit.ts` (mango, palta, arándano, fresa, banana, maracuyá; fallback `campo.webp`). Formato WebP `960 × 640` (relación 3:2, calidad 82), luz natural de mañana en campo real, sujeto enfocado al centro-derecha con follaje desenfocado a la izquierda para dar aire al texto, sin texto ni marcas de agua.
- **Ilustraciones propias de UX (`src/assets/ux/*.webp`):** Estilo corporativo minimalista de personajes adultos agrícolas/administrativos, proporciones naturales simplificadas, paleta verde de marca + blanco/crema/tierra, fondo transparente, sin texto incrustado. Familia base: `empty-campaigns.webp`, `empty-search.webp`, `loading-data.webp`, `upload-documents.webp`, `connection-error.webp`, `empty-certifications.webp`, `coming-soon.webp`.
  - **Plantilla de generación con IA:** *"Ilustración corporativa minimalista para Agro Exportaciones F.V., personaje adulto relacionado con agroexportación realizando [acción], formas geométricas suaves, proporciones naturales simplificadas, paleta verde de marca con blanco, crema y tonos tierra discretos, iluminación limpia, sombras difusas, detalles agrícolas sutiles, composición despejada, fondo transparente, sin texto, sin logos inventados, sin marcas de terceros, estilo coherente con un software empresarial premium."*
- **Voz y Redacción (`es-PE`):** Directa y profesional, con tildes correctas.
  - *Preferir:* `"Aún no hay campañas registradas."`, `"Guardando…"`, `"No se pudieron cargar los proveedores. Inténtalo nuevamente."`
  - *Prohibido:* `"¡Oops!"`, `"Algo mágico está ocurriendo"`, mensajes técnicos crudos o culpar al usuario.
- **Escala de movimiento y curvas (respetando siempre `motion-reduce:*`):**
  - `100–160ms` (Instantáneo: botones, checkbox, hover) · `180–240ms` (Rápido: tooltip, menú, toast, aparición de error, cambio tabla/grilla) · `240–320ms` (Estándar: entrada de página/filtros, popovers) · `350–500ms` (Espacial: accordions, secciones) · `600–800ms` (Estructural: cambio de altura de `AppModal` y revelación de tema).
  - Curvas: entrada `cubic-bezier(0.22, 1, 0.36, 1)`, cambio de tamaño `cubic-bezier(0.45, 0, 0.25, 1)`, salida `cubic-bezier(0.4, 0, 1, 1)`. Evitar desplazamientos > `12px` en UI operativa.
- **Diferenciación obligatoria de estados y feedback:**
  - Estados vacíos compuestos por: 1) Ilustración/icono expresivo, 2) Título descriptivo, 3) Explicación breve, 4) Acción principal lógica.
  - Distinguir siempre entre: *Cargando*, *Sin registros aún*, *Cero resultados por filtros* (con botón `"Limpiar filtros"`), *Error de red* (con botón `"Reintentar"`), *Recurso no encontrado* (nunca redirigir silenciosamente una URL inválida) y *En construcción* (`ModuleUnderConstructionPage`).
  - Feedback: Toast para acciones breves no bloqueantes (exportar, copiar, limpiar filtros); `SuccessModal` para altas/ediciones principales. Los mensajes nunca dependen solo del color (siempre icono + texto).
- **Accesibilidad y Rendimiento Percibido:**
  - Controles interactivos siempre con semántica nativa (`button`, `a`/`Link`), `focus-visible` claro, `aria-hidden` en iconos decorativos, `aria-label` en botones de solo icono y `role="status"` / `aria-live` en cambios de estado. Nunca depender de `hover` para revelar una acción esencial.
  - **Continuidad espacial:** `MotionRouter` coordina enlaces, `navigate`, Regresar e historial con `containerNavigation`; no añadir interceptores de clic/popstate por módulo. Las cards declaran `data-module-path` y las acciones pueden declarar un `data-motion-key` estable para volver a su origen. La superficie de ruta es el viewport de `DashboardLayout`, no la altura completa del documento.
  - **Modales:** `ContainerMotionScope` y las primitivas Dialog/AlertDialog animan una superficie independiente del formulario; no escalar textos ni controles. Si el origen ya no está visible, usar una entrada/salida breve. Con movimiento reducido se omite la transformación; sin View Transitions la navegación sigue funcionando directamente.
  - **Control único del movimiento:** `motionProgress` define el resorte amortiguado compartido; `routeMotion` dirige las capas de navegación y `container-motion` dirige superficie, contenido y backdrop del modal. Invertir el objetivo conserva posición y velocidad. No añadir retrasos o animaciones independientes a esos mismos elementos. La fotografía de una card tiene su propia capa para no ampliar el texto.
  - **Revelación sin recortes:** `surfaceMotion` reserva el tramo central para cambiar posición/tamaño; `contentMotion` revela el formulario en su posición final después de ese movimiento. En rutas, los textos se desvanecen antes del movimiento y aparecen cuando termina; la fotografía puede acompañar el recorrido. No trasladar campos dentro de máscaras móviles ni adelantar el texto de la card durante el regreso.
  - **Confirmaciones y carga:** notificar el éxito cuando confirma la API; el controlador compartido toma la superficie del formulario que está cerrando para abrir la confirmación. No esperar artificialmente al cierre para disparar el éxito. Los temporizadores de `SuccessModal` empiezan tras su llegada. El contenido remoto que llega tarde se revela sin reiniciar la navegación ni bloquear el primer clic.
  - No usar skeletons al filtrar datos que ya están en memoria. Definir dimensiones de imágenes y `loading="lazy"` fuera del primer viewport.
