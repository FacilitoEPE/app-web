# AGENTS.md — Guía Maestra (`epe-web`)

Frontend de **Agro Exportaciones F.V.** (`React 19 · TypeScript 6 · Vite 8 · Tailwind CSS 4 · shadcn/ui · pnpm`).

> [!IMPORTANT]
> **Alcance cerrado y fuente única (`docs/`):** Todas las decisiones de producto, diseño y flujos ya están definidas. Prohibido inventar vistas, campos o endpoints. Ante cualquier ambigüedad en un contrato del backend, **detente y pregunta al usuario**.

## 📚 Documentación Normativa (`docs/`)

Lee el archivo correspondiente antes de tocar código (4 documentos de alta densidad, cero relleno):

1. **[`docs/architecture-and-solid.md`](./docs/architecture-and-solid.md)** — **Screaming Architecture y SOLID**: estructura `src/modules/<domain>` vs `src/shared/`, reglas de frontera (`DTO → Mapper → API → UI`), estándar único de formularios (`useModalForm` + `useFormSubmit`), fechas/formatos, y **lista de deuda técnica Senior pendiente**.
2. **[`docs/ui-and-design-system.md`](./docs/ui-and-design-system.md)** — **Sistema de Diseño, UI y UX**: uso obligatorio de `InputField`, `FormField`, `InfoField`, `AppModal`, `ModalSection`, `TableCard`, escalera de `ContextBanner`, tokens de color claro/oscuro (`src/index.css`) y voz de marca (`es-PE`).
3. **[`docs/agent-workflow-and-constraints.md`](./docs/agent-workflow-and-constraints.md)** — **Flujo de Agentes IA y Limitaciones**: protocolo en rama `developer`, ciclo TDD (`pnpm test`), almacenes locales (`// TODO(api)` en `.store.ts` + `.demo.ts` solo en `DEV`), caché/SW deshabilitados (`no-store`), `uploadDocument.ts` vs S3 y CORS.
4. **[`docs/integration-status.md`](./docs/integration-status.md)** — **Estado de Integración API ↔ Vistas**: matriz vigente por pantalla, brechas del backend e historial. **Único archivo a actualizar al auditar o conectar vistas.**

## ⚡ Reglas Innegociables en 5 Líneas

- **Comandos:** Solo `pnpm` (`pnpm test`, `pnpm build`, `pnpm lint`). Para comprobar tipos: `npx tsc --noEmit -p tsconfig.app.json` (`tsc -p .` no hace nada).
- **Imports:** Siempre `@/` (`@/modules/...`, `@/shared/...`), salvo dentro de `src/shared/components/ui/` (relativos por shadcn).
- **UI sin wrappers:** Nunca envolver `shared/components/ui/*` solo para dar estilo; editar el control en `ui/`. Nunca usar `bg-white`, hex sueltos ni `gray-*`/`slate-*`.
- **Frontera de datos:** Componentes y páginas jamás importan `apiClient` ni DTOs crudos. Sin fallbacks mock en vistas conectadas.
- **Rama `developer`:** Al iniciar sesión en `developer`, revisar primero `docs/integration-status.md` para priorizar lo pendiente.
