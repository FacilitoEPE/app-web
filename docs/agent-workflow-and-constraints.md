# 3. Flujo de Trabajo de Agentes IA y Restricciones Técnicas

## 3.1. Reglas Operativas para Agentes de IA

> [!CAUTION]
> **Alcance Cerrado — Cero Invención:**
> Todas las decisiones de producto, vistas y campos ya están definidas por el usuario. Está **prohibido** inventar endpoints, agregar o quitar campos de formularios por cuenta propia, o usar mocks como fallback silencioso en vistas ya conectadas al backend.

### Protocolo paso a paso en cada tarea
1. **Rama `developer` (Hook `.claude/settings.json`):** Al iniciar sesión en `developer`, leer [`docs/integration-status.md`](./integration-status.md) para identificar qué vistas o contratos están pendientes y priorizarlos.
2. **Ante una ambigüedad de contrato (Backend vs. UI):**
   - Si falta el endpoint en `epe-backend/src`, si un DTO exige campos que la UI no tiene, o si el mapeo de negocio no es evidente: **detenerse y preguntar al usuario**.
   - Mientras el usuario responde, registrar la vista en `docs/integration-status.md` como `Sin cambios — YYYY-MM-DD / requiere definición`.
3. **Ciclo TDD y Verificación Obligatoria:**
   - Lógica de negocio, validaciones y mappers se prueban con Vitest (`pnpm test`).
   - Antes de dar por terminada cualquier tarea, ejecutar y aprobar:
     - `pnpm test`
     - `npx tsc --noEmit -p tsconfig.app.json` (o `pnpm build`)
     - `npx eslint <archivos-tocados>`
4. **Reporte de Integración Único:**
   - Cualquier auditoría o cambio de conexión API↔Vista se documenta **únicamente** en [`docs/integration-status.md`](./integration-status.md) indicando fecha ISO (`YYYY-MM-DD`) y estado (`Completo`, `Parcial`, `Sin cambios`), conservando el historial. Prohibido crear archivos de reporte paralelos.

---

## 3.2. Flujos sin API (`*.store.ts`) y Datos Demo (`*.demo.ts`)

Cuando el diseño de una vista ya está aprobado pero `epe-backend` aún no tiene el endpoint:

1. **En Vistas Conectadas a la API:** Prohibido usar datos mock o fixtures como fallback si la API falla o devuelve vacío. Mostrar lo que tenga la base de datos o el estado de error/vacío real.
2. **En Flujos de Diseño sin Endpoint (`// TODO(api)`):**
   - El flujo funciona en alta fidelidad usando **estado local en memoria** (se pierde al recargar).
   - Validaciones y tipos van en `<tema>.utils.ts` (con pruebas en `<tema>.utils.test.ts`).
   - El almacén en memoria va en `<tema>.store.ts` usando `useSyncExternalStore` y marcado con `// TODO(api)`. Nunca simular que el backend persistió el dato.
3. **Datos de Demostración Exclusivos de Desarrollo (`*.demo.ts`):**
   - Todo almacén local (`.store.ts`) sin endpoint arranca con datos de `<tema>.demo.ts` **únicamente bajo la condición exacta**:
     ```ts
     const useDemoData = import.meta.env.DEV && import.meta.env.MODE !== "test";
     ```
   - En producción (`pnpm build`) y en tests (`pnpm test`), los almacenes arrancan vacíos.
   - Las fechas relativas y el PDF de muestra se importan siempre de `src/shared/utils/demoData.ts`. Al conectar el endpoint real, se borran el `.demo.ts` y el `.store.ts`.

---

## 3.3. Limitaciones y Restricciones Técnicas Intencionales

Ningún agente debe alterar estas configuraciones sin orden explícita del usuario:

| Área | Restricción Vigente | Archivos Clave |
| :--- | :--- | :--- |
| **Sin Caché ni Service Worker** | Caché deshabilitado en dev y prod. `apiClient` envía `Cache-Control: no-store`. Al arrancar, `main.tsx` desregistra `/sw.js` y borra la caché `epe-shell-v1`. **Prohibido** volver a registrar `public/sw.js` (aunque el archivo se conserva en `public/`). | `src/service-worker-cleanup.ts`, `src/shared/api/client.ts` |
| **Vite HMR Configurable** | HMR va encendido por defecto. Quien abra la web desde otro dispositivo sin soporte WebSocket define `VITE_DISABLE_HMR=true` en su `.env`. **Prohibido** fijar `hmr: false` en `vite.config.ts`. | `vite.config.ts`, `.env.example` |
| **Autenticación y sesión** | El acceso consume la API de autenticación V1. La sesión se guarda en `sessionStorage`, el cliente envía el token Bearer y el backend comprueba el usuario y sus permisos. Mantener la interfaz alineada con los contratos existentes. | `src/shared/offline/session.ts`, `src/modules/auth/api/auth.api.ts` |
| **Subida General de Archivos (`uploadDocument.ts`)** | El diseño usa siempre `FileDropzone` (nunca inputs de texto para pegar URLs). Como el backend general solo guarda strings URL y aún no hay servicio tipo Cloudinary transversal, los formularios llaman a `uploadDocument(file)`, que lanza `FileUploadUnavailableError` con aviso claro sin guardar datos corruptos. | `src/shared/api/uploadDocument.ts` |
| **Subida S3 de Certificados de Proveedor** | Único recurso con contrato S3 real en backend (`certificado_proveedor`): valida PDF/JPEG/PNG/WebP ≤ 10MB → pide URL prefirmada (`POST .../documentos/subida`) → `PUT` directo a S3 (**sin header Authorization**) → confirma estado `DISPONIBLE` (`POST .../confirmacion`) → guarda con `documentoArchivoId`. Descarga vía URL efímera (`GET .../descarga`). | `src/modules/providers/api/provider-subresources.api.ts` |
| **Paridad de Validaciones (`validator`)** | `epe-web` fija `validator@13.15.35` (misma versión exacta de `class-validator` en `epe-backend`) para validar URLs (`require_protocol: true`) y formatos sin regex caseras discrepantes. | `package.json`, `src/types/validator.d.ts` |
| **Sin TanStack Query / SWR** | Decisión explícita (YAGNI). Las lecturas y mutaciones usan `apiClient` + hooks locales de React. No instalar librerías de caché de estado servidor. | `src/shared/api/client.ts` |
| **CORS por lista explícita** | `epe-backend` acepta una lista separada por comas en `CORS_ORIGIN`. En desarrollo también admite `localhost`, `127.0.0.1` y `::1` por cualquier puerto para cubrir el puerto alternativo de Vite. En producción solo acepta los orígenes configurados. Para IP LAN o dominio, agrega el origen exacto. | `docker-compose.yml`, `.env.example` |
