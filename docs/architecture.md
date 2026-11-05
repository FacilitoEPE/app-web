# Arquitectura frontend y principios SOLID

## 1.1. Screaming Architecture (`src/`)

Las carpetas de primer nivel en `src/modules/` representan dominios de negocio agroexportador, nunca capas técnicas.

```text
src/
├── modules/<domain>/               # auth, campaigns, providers, commercial-planning, carriers, quality, logistics, billing, purchase-settlement, users
│   ├── api/                        # Crear SOLO cuando el dominio consuma backend (no especulativamente)
│   │   ├── <recurso>.dto.ts        # Espejo exacto del JSON crudo del backend
│   │   ├── <recurso>.mapper.ts     # Transformación pura DTO ↔ Modelo de Frontend
│   │   ├── <recurso>.api.ts        # Llamadas con apiClient; devuelve SIEMPRE el modelo mapeado
│   │   └── <recurso>.validation.ts # Validación pura de formulario / esquemas Zod
│   ├── components/                 # PLANO (prohibido crear subcarpetas atoms/molecules/organisms)
│   ├── pages/                      # Vistas de ruta enlazadas en App.tsx
│   ├── <tema>.utils.ts             # Lógica pura del dominio, cálculos y filtros (con su .test.ts)
│   ├── <tema>.store.ts             # Estado local en memoria (useSyncExternalStore) para flujos sin API // TODO(api)
│   └── <tema>.demo.ts              # Datos de prueba cargados SOLO en import.meta.env.DEV && MODE !== "test"
└── shared/                         # Código transversal SIN lógica de negocio (prohibido importar de modules/)
    ├── api/                        # client.ts (Axios único) y uploadDocument.ts (conversión File → URL)
    ├── components/                 # Compuestos (AppModal, InputField, FormField, InfoField, TableCard, PageState...)
    │   └── ui/                     # Primitivas shadcn/ui vendorizadas y editadas in-situ
    ├── hooks/                      # useModalForm, useFormSubmit, useGoBack, useTheme, useImagesReady
    ├── layout/                     # DashboardLayout, TopNavBar, PageHeader, breadcrumbRoutes.ts, navigationItems.ts
    ├── utils/                      # format.ts, paginate.ts, plural.ts, exportTable.ts, inFlightGuard.ts, demoData.ts
    └── validation/                 # api-form-errors.ts (mapeo de errores Zod y 400 Bad Request de NestJS)
```

### Reglas de Frontera (Árbol de Decisión)
1. **¿Es de un dominio de negocio?** → `src/modules/<domain>/`.
2. **¿Es reutilizable por 2+ módulos sin lógica de negocio?** → `src/shared/`.
3. **¿A un control de `shared/components/ui/` le falta una variante o estilo?** → **No crear wrappers**. Editar directamente `src/shared/components/ui/<control>.tsx`.
4. **¿Un módulo necesita leer un catálogo de otro dominio (ej. frutas, proveedores, transportistas)?** → Importar únicamente desde la carpeta `api/` del módulo dueño canónico (`@/modules/providers/api/proveedor.api`). Prohibido importar `components/` o `pages/` entre módulos distintos.

---

## 1.2. Reglas SOLID de Implementación

| Principio | Regla Dura en `epe-web` | Referencia Canónica |
| :--- | :--- | :--- |
| **S · Single Responsibility** | **Páginas** orquestan carga/filtros/modales. **Componentes** dibujan props y emiten eventos. **Utils/Validation** concentran cálculos y reglas puras fuera del `.tsx`. | `src/modules/campaigns/campaignStats.utils.ts` |
| **O · Open/Closed** | Extender componentes vía props (`unit`, `leading`, `variant`, `size`) o `cva` en `ui/`, nunca clonando archivos para cambiar 2 clases. | `src/shared/components/InputField.tsx` |
| **L · Liskov Substitution** | Las funciones de `.store.ts` (locales) y `.api.ts` (remotas) exponen modelos de dominio equivalentes para que conectar la API no rompa la vista. En React 19 `ref` es prop normal (**no usar `forwardRef`**). | `src/modules/providers/providerLocalData.store.ts` |
| **I · Interface Segregation** | Los payloads de escritura (`create`/`update`) proyectan y hacen `trim()` **únicamente** de los campos editables del DTO, excluyendo `id`, `createdAt`, `updatedAt` o relaciones. | `src/modules/clients/api/cliente-negocio.validation.ts` |
| **D · Dependency Inversion** | **Prohibido** importar `apiClient` o un `*Dto` crudo en `pages/` o `components/`. Todo cambio de nombres del backend (`documentUrl` vs `documentoUrl`) se absorbe en `.mapper.ts`. | `src/modules/campaigns/api/campaign.mapper.ts` |

---

## 1.3. Convenciones Técnicas Estándar

- **Gestor de paquetes:** Exclusivamente `pnpm` (`pnpm install --frozen-lockfile`, `pnpm test`, `pnpm build`, `pnpm lint`). Prohibido `package-lock.json`.
- **Typecheck real:** `tsc -p .` no comprueba nada. Usar `npx tsc --noEmit -p tsconfig.app.json` o `pnpm build`.
- **Imports:** Usar siempre `@/` (`@/modules/...`, `@/shared/...`). Los imports relativos (`./`, `../`) están reservados **exclusivamente** para archivos dentro de `src/shared/components/ui/`.
- **Fechas calendario (`YYYY-MM-DD`):** Nunca hacer `new Date("2026-10-15")` directo (causa desfase de -1 día en `UTC-5`). Usar `parseFecha` / `formatFecha` (`src/modules/campaigns/api/fecha.util.ts`) y `formatDisplayDate` (`src/shared/utils/format.ts`).
- **Formateo y plurales:** Prohibido crear `Intl.NumberFormat` sueltos o plurales fijos. Usar siempre `formatKg`, `formatMoney`, `formatDecimal` (`src/shared/utils/format.ts`) y `plural` (`src/shared/utils/plural.ts`).
- **Estándar único de formularios en modal:**
  - Usar siempre la dupla `useModalForm` + `useFormSubmit` (`src/shared/hooks/`).
  - Previene doble clic con `useRef` sincrónico, reinicia el estado al abrir/cerrar sin `setState` manuales en `useEffect`, valida antes de enviar y ubica los errores `400 Bad Request` del backend bajo cada campo con `getBadRequestFieldErrors` (`src/shared/validation/api-form-errors.ts`).
- **Concurrencia en páginas:** Usar `createInFlightGuard()` (`src/shared/utils/inFlightGuard.ts`) para bloquear eliminaciones duplicadas y contador de secuencia (`++loadSequence.current`) o bandera `let active = true` en lecturas asíncronas.
- **Datos por vista:** `modules/operations/api/operations-resources.ts` declara los recursos, padres y grupos de cada ruta. `FrontendDataBoundary` carga ese ámbito con todas las páginas necesarias y descarta respuestas de rutas/sesiones abandonadas. El contexto es estado de la vista activa, no una copia completa del sistema ni una caché entre rutas. Un POST/PATCH/DELETE V1 integra la respuesta confirmada por PK y padre; `commitRemote` reproyecta ese estado sin otra descarga. Solo errores parciales/inciertos o el reintento explícito reconcilian la lectura. Al agregar una ruta o un dato visible, declarar sus dependencias y cubrirlas con `dev/scoped-requests.test.ts`; no volver al contexto global como fallback.
- **Rutas y navegación (`src/shared/layout/breadcrumbRoutes.ts`):** Toda vista nueva agregada en `App.tsx` debe registrarse simultáneamente en `getBreadcrumbLevels` (ruta visual) y en `BACK_LADDER` (`getParentHref`, escalera del botón "Regresar" con `useGoBack`).

---

## 1.4. Deuda Técnica Detectada (Observaciones Senior Pendientes de Refactorizar)

> [!WARNING]
> **No replicar estos antipatrones en código nuevo.** Son incoherencias históricas identificadas para corrección:

1. **Dominio de Clientes partido en dos módulos:** `src/modules/clients/` tiene solo `api/` y `src/modules/commercial-planning/` tiene solo `pages/` y `components/`. Deben unificarse dentro de `src/modules/commercial-planning/`.
2. **Hook fuera de `shared/`:** `src/hooks/use-mobile.ts` debe moverse a `src/shared/hooks/use-mobile.ts`.
3. **Acoplamiento en `carriers/api/carrier.api.ts`:** Concentra DTOs, mappers y llamadas Axios en un solo archivo e importa tipos desde `carriers.data.ts`. Debe separarse en `carrier.dto.ts`, `carrier.mapper.ts` y `carrier.api.ts`.
4. **Formularios legacy sin `useFormSubmit`:** `CampaignFormModal.tsx` y `ProviderFormModal.tsx` usan efectos/controladores manuales en vez del estándar `useModalForm` + `useFormSubmit`.
5. **Transformadores y datos demo inline en vistas:**
   - `CampaignDetailsPage.tsx` (líneas 35–90) define 4 adaptadores inline que pertenecen a `campaignDetails.utils.ts`.
   - `QualityAddCampaignModal.tsx` tiene `DEMO_ACTIVE_CAMPAIGNS` dentro del `.tsx` (debe ir en `quality.demo.ts` con `import.meta.env.DEV && import.meta.env.MODE !== "test"`) y un `setIsLoading(true)` sincrónico en `useEffect` que rompe ESLint.
   - `ClientDetailsPage.tsx` descarga toda la lista con `getClientesNegocio()` para buscar un ID en vez de usar el endpoint por ID, y omitió la tabla de contratos del cliente (`getContratosByClienteNegocio`).
6. **Tooling y configuración:**
   - `eslint.config.js` necesita `globalIgnores(['dist', '.agents', '.claude'])` para no fallar escaneando plantillas externas.
   - `src/App.tsx` tiene 18 imports relativos (`./modules/...`) que deben pasar a `@/modules/...`.
   - `README.md` de la raíz aún menciona como activo el Service Worker y solo lista 5 módulos.
