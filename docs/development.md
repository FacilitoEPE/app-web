# Desarrollo local y restricciones técnicas

## 3.1. Reglas Operativas para Agentes de IA

### Disponibilidad de Ponytail

- Ponytail es una recomendación opcional para entender dependencias, reutilizar soluciones y reducir complejidad en tareas de implementación, depuración, refactorización o revisión. No se aplica por rutina a consultas, textos, ajustes visuales simples ni documentación.
- El flujo de cambios de vistas, reglas de negocio y mock funciona con las reglas del proyecto, aunque Ponytail no esté instalado. Su ausencia no bloquea el trabajo ni reduce las verificaciones o la comunicación de implicaciones al desarrollador.
- Si decides usarlo, comprueba que esté disponible y lee la skill `ponytail` (`ponytail:ponytail` en entornos con plugins). Respeta el alcance y las decisiones del desarrollador; usa `full` como referencia inicial salvo otra indicación. No afirmes que lo usaste si no cargaste la skill.
- Si falta y resulta útil, puedes recomendar su instalación desde el gestor de plugins/skills del entorno y continuar con las reglas del proyecto. Instálalo solo si se solicita o existe autorización para ello. No inventes repositorios ni comandos ni lo añadas a `package.json`: es una herramienta del agente, no una dependencia de la aplicación.

> [!CAUTION]
> **Cambios guiados por la solicitud:**
> Los agentes pueden modificar vistas, campos, reglas de negocio y datos simulados para cumplir lo pedido por el desarrollador. Resuelven detalles menores con los patrones existentes y consultan solo decisiones funcionales que falten. No amplían el producto por iniciativa propia ni usan mocks como fallback silencioso en vistas conectadas al backend.

### Cambios de vistas, reglas de negocio y mock

1. **Entender el cambio:** identifica la vista y el resultado pedido; revisa la regla vigente y los flujos que dependen de ella. Una solicitud concreta autoriza los ajustes necesarios sin otra aprobación.
2. **Actualizar el comportamiento:** ajusta campos, acciones, validaciones, cálculos, estados y permisos afectados. Mantén coherentes las pantallas relacionadas; un cambio solo visual no exige cambiar reglas ni datos.
3. **Actualizar la simulación:** para V1, revisa `json/v1-demo/` y `dev/v1-mock.ts`; ajusta los registros y el comportamiento HTTP que cambien. Usa `dev/mock-api.ts`, otros JSON o `*.demo.ts` solo si el flujo afectado realmente los consume. Conserva identificadores, relaciones, fechas, estados y totales coherentes; incluye casos válidos y de rechazo relevantes. No basta cambiar el JSON si el mock sigue aceptando una operación ahora prohibida. Añade o ajusta pruebas del comportamiento afectado.
4. **Separar regla solicitada de implementación real:** comprueba si el backend admite el cambio. Cuando esté dentro del alcance, actualiza servicios, contrato y migraciones que correspondan, además de sus consumidores. Si el trabajo se limita a interfaz/mock, registra la adaptación backend pendiente en `integration-status.md` y en la regla afectada; conserva el contrato publicado hasta implementar esa adaptación. No envíes campos incompatibles a la API real ni anuncies guardados que no ocurrieron. Si el flujo necesita un contrato nuevo, consulta su definición antes de implementarlo y continúa el trabajo independiente.
5. **Mantener la documentación:** actualiza `api/business-rules.md` para reglas funcionales, la guía de usuario si cambian sus pasos y `../../docs/business/processes.md` si cambia un proceso compartido. Distingue lo implementado en API real, lo disponible solo en mock y lo pendiente. Actualiza índices y resúmenes solo cuando su información cambie; evita reportes paralelos.
6. **Explicar el impacto:** cierra con 3–5 viñetas cortas: cambio visible, regla y simulación ajustadas, implicación para el desarrollador y verificación/pendientes. Indica, cuando aplique, si habrá que adaptar el backend, completar datos anteriores o revisar otra pantalla. Ejemplo: «Ahora cada entrega requiere un chofer. Los ejemplos ya lo incluyen y la simulación rechaza entregas sin chofer. Para usarlo con datos reales, falta exigirlo también en el backend y completar las entregas existentes. Se verificó el flujo en modo simulado».

### Pruebas de navegador

Instala Chromium con `pnpm exec playwright install chromium` y ejecuta
`pnpm test:e2e`. Playwright abre la aplicación con la API de demostración en
el puerto 4174. Los escenarios verifican cobro y voucher, cierre logístico,
acceso del chofer y persistencia de la cotización tras recargar. Para la
persistencia en PostgreSQL, ejecuta la suite E2E del backend.
Para ejecutar el recorrido con Nest y PostgreSQL, coloca `epe-backend` junto
a `epe-web` y usa la rama que incluye los datos de prueba del backend.
Compila el backend y aplica sus migraciones a una base PostgreSQL dedicada
`epe_e2e_*`. Desde el frontend, configura `DB_HOST`, `DB_PORT`,
`DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` y `E2E_DB_NAME` en el entorno.
Las dos últimas variables deben indicar la misma base de prueba. El arranque
del escenario vuelve a cargar sus datos.

```powershell
$env:EPE_E2E_FULL_STACK = '1'
pnpm test:e2e
```

El escenario usa los puertos 4174 y 4175. Prepara el contrato, la entrega,
Calidad y el borrador de la guía mediante HTTP. Continúa en el navegador con
la emisión de la guía, el despacho, la recepción, el expediente, los cierres
y la facturación y el cobro. La ampliación verifica examen, entrevista,
certificación y cotización con la misma API.
Los endpoints de documentos son los del backend y el almacenamiento externo
se reemplaza por memoria durante la prueba.

### Protocolo paso a paso en cada tarea

1. **Contexto de la tarea.** Parte de `master` actualizada para tareas nuevas y aplica las [reglas de integración](../AGENTS.md#integración-y-entregas). Si vas a tocar una vista conectada, el contrato web–API o un flujo compartido, consulta el [estado de integración](integration-status.md) para conocer los pendientes relacionados.
2. **Ante una ambigüedad de contrato (Backend vs. UI):**
   - Contrasta la solicitud con `epe-backend/src` y el contrato. Una diferencia conocida no exige volver a aprobar lo solicitado: aplica el flujo anterior y consulta solo la definición funcional o de contrato que falte, continuando las partes independientes.
   - Registra en `docs/integration-status.md` qué parte funciona con API real, cuál solo en mock y qué definición o adaptación queda pendiente; no marques toda la vista como `Sin cambios` si hubo avances.
3. **Ciclo TDD y Verificación Obligatoria:**
   - Lógica de negocio, validaciones y mappers se prueban con Vitest (`pnpm test`).
   - Antes de terminar cambios de código, ejecutar y aprobar:
     - `pnpm test`
     - `npx tsc --noEmit -p tsconfig.app.json` (o `pnpm build`)
     - `npx eslint <archivos-tocados>`
   - Para cambios únicamente documentales, revisa coherencia, referencias y enlaces; no hace falta ejecutar pruebas, tipos ni lint de código.
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
| **Sin TanStack Query / SWR** | Decisión explícita (YAGNI). Las lecturas y mutaciones usan `apiClient` + hooks locales de React. El contexto de la ruta conserva su estado y recibe DTOs confirmados; al entrar a otra ruta se carga su ámbito de nuevo. No instalar librerías de caché de estado servidor. | `src/shared/api/client.ts`, `src/modules/operations/api/operations-context.api.ts` |
| **CORS por lista explícita** | `epe-backend` acepta una lista separada por comas en `CORS_ORIGIN`. En desarrollo también admite `localhost`, `127.0.0.1` y `::1` por cualquier puerto para cubrir el puerto alternativo de Vite. En producción solo acepta los orígenes configurados. Para IP LAN o dominio, agrega el origen exacto. | `docker-compose.yml`, `.env.example` |
