# Reglas para agentes de epe-web

Respeta las decisiones de producto y los contratos publicados. No inventes vistas, campos ni endpoints. Si código y documentación no resuelven una ambigüedad funcional, consúltala antes de cambiarla.

## Qué documentación consultar

- Usa [docs/README.md](docs/README.md) como mapa, sin leer todos los documentos por defecto.
- Cambios de módulos o límites técnicos: [arquitectura](docs/architecture.md).
- Cambios visuales: [sistema de diseño](docs/design-system.md).
- Comandos, fixtures, configuración o restricciones de desarrollo local: [desarrollo](docs/development.md).
- Cambios de API o integración: [estado de integración](docs/integration-status.md) y [documentación de API](docs/api/README.md).
- Cambios de acciones disponibles para usuarios: guía correspondiente en `docs/guides/`.
- `docs/evidence/` contiene resultados fechados, no instrucciones operativas. Verifica su vencimiento antes de reutilizarlos.

## Reglas de implementación

- Este es el único AGENTS general de `epe-web`; no agregues reglas por módulo o subcarpeta.
- Usa `pnpm` para comandos del proyecto. Para comprobar tipos sin build: `npx tsc --noEmit -p tsconfig.app.json`.
- Usa imports `@/`, salvo dentro de `src/shared/components/ui/`, donde se permiten relativos de shadcn.
- No envuelvas componentes `src/shared/components/ui/*` solo para estilarlos. Usa tokens de `src/index.css`; no agregues colores fijos ni paletas grises/verde de Tailwind.
- Componentes y páginas no importan `apiClient` ni DTOs crudos. No agregues fallbacks mock a vistas conectadas.
- La fuente del OpenAPI se mantiene en `docs/api/contract-schema.sql`. Genera con `pnpm contract:generate` y verifica con `pnpm contract:check`; sincroniza la copia runtime backend en el mismo cambio.
- Al cambiar contrato, datos o flujo compartido, actualiza los documentos afectados de `epe-backend` y `../docs/` según sus AGENTS. No es requisito consultar documentación fuera del alcance de la tarea.
- Al iniciar trabajo en la rama `developer`, consulta el estado de integración para priorizar tareas abiertas.
