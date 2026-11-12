# Reglas para agentes de epe-web

Respeta las decisiones de producto y los contratos publicados. No inventes vistas, campos ni endpoints. Si código y documentación no resuelven una ambigüedad funcional, consúltala antes de cambiarla.

## Decisiones del desarrollador y alcance de los cambios

- El desarrollador (usuario) define el resultado deseado y toma la decisión final. Una solicitud de cambio autoriza modificar las vistas, campos e interacciones necesarios para cumplirla, usando los patrones visuales existentes y resolviendo detalles menores con criterio propio. Consulta solo decisiones de producto pendientes que cambien el alcance o el significado del flujo; no pidas otra aprobación de lo ya solicitado.
- En lógica de negocio, el desarrollador define los requisitos y acepta las propuestas. Puedes analizar los flujos y proponer mejoras o soluciones; implementa las decisiones aceptadas y consulta las reglas funcionales que falten, sin inventarlas. Una solicitud concreta autoriza su implementación dentro del alcance indicado, sin pedir otra aprobación de lo ya definido.
- Resuelve los detalles técnicos con criterio de frontend senior: buenas prácticas, nomenclatura clara y consistente, separación de responsabilidades, arquitectura existente, principios SOLID y patrones de diseño adecuados al problema. Evita abstracciones y complejidad innecesarias.
- Una nueva regla solicitada puede cambiar el comportamiento anterior. Actualiza conjuntamente la vista, la lógica, la documentación y el mock afectado según el [flujo de cambios](docs/development.md#cambios-de-vistas-reglas-de-negocio-y-mock). Contrasta con el backend: si el alcance lo incluye, implementa lo necesario; si queda pendiente, identifica la diferencia sin presentar la simulación como integración real. Las validaciones del frontend complementan las del backend y no sustituyen su autoridad.
- Al cerrar, explica en 3–5 viñetas breves qué cambió para el usuario, qué regla y datos simulados se ajustaron, qué implica para el desarrollador y qué se verificó o queda pendiente. Usa lenguaje cotidiano; menciona detalles técnicos solo si hacen falta para actuar. Si no hay impacto en backend o datos existentes, dilo en una frase.

## Integración y entregas

- Usa `master` como única rama principal. Parte de una revisión actualizada, crea una rama corta por cambio y abre un PR con el resultado esperado y cómo lo verificaste. Integra con squash merge y CI verde. El evento `push` del workflow verifica el commit integrado.
- Escribe los nombres de ramas, los mensajes de commit y los títulos de PR en inglés. Nombra la rama por el resultado concreto, por ejemplo `ci/publish-docker-images-on-version-tags`. Usa Conventional Commits para los mensajes y títulos, por ejemplo `ci: publish Docker images on version tags`. Usa el título del PR como asunto del squash.
- Reserva `!` en el asunto del commit o `BREAKING CHANGE:` en su cuerpo para incompatibilidades con contratos publicados. Si detectas una, explica qué contrato cambia y a quién afecta. Pide confirmación al desarrollador responsable antes de marcarla en el commit o en el título del PR que se usará para el squash.
- El autor elige Ship, Show o Ask. Con Ship puede fusionar su PR cuando pase CI. Con Show también avisa a `luis-keny`. Con Ask solicita su revisión y espera su aprobación antes de fusionar. Usa Ask cuando necesites validar cambios de contrato, permisos, migraciones o publicación. Cuando `luis-keny` es el autor, decide si necesita otra revisión. Vincula los PR que afecten web y backend y verifica la compatibilidad de la pareja.
- Distribuye guías, reglas y skills internas al fusionar su PR. Si una regla aplica a ambos repositorios, enlaza los PR y deja la instrucción esencial en ambos `AGENTS.md`. Antes de seguir una tarea afectada, sincroniza la rama y relee las reglas. Para skills instaladas aparte, indica la revisión y cómo actualizarla y verificarla.
- Distingue la verificación de cambios de la publicación Docker. En el flujo acordado, las imágenes de entrega se generan al preparar una release de EPE. Los cambios exclusivamente de guías, instrucciones o skills internas se registran por commit y PR, sin generar imagen ni incrementar `vX.Y.Z`. Consulta la [guía de integración y entregas](../epe-backend/docs/integracion-y-entregas.md).

## Qué documentación consultar

- Usa [docs/README.md](docs/README.md) como mapa, sin leer todos los documentos por defecto.
- Cambios de módulos o límites técnicos: [arquitectura](docs/architecture.md).
- Cambios visuales: [sistema de diseño](docs/design-system.md).
- Comandos, fixtures, configuración o restricciones de desarrollo local: [desarrollo](docs/development.md).
- Cambios de API o integración: [estado de integración](docs/integration-status.md) y [documentación de API](docs/api/README.md).
- Cambios de acciones disponibles para usuarios: guía correspondiente en `docs/guides/`.
- `docs/evidence/` contiene resultados fechados, no instrucciones operativas. Verifica su vencimiento antes de reutilizarlos.

## Reglas de implementación

- Se recomienda Ponytail como apoyo opcional al implementar, depurar, refactorizar o revisar código cuando ayude a entender dependencias, reutilizar soluciones o evitar complejidad innecesaria. Su uso e instalación no son requisitos para cumplir el flujo de cambios de vistas, reglas de negocio y mock. No lo apliques por rutina a consultas, textos, ajustes visuales simples o documentación. Si decides usarlo, consulta las [recomendaciones de uso](docs/development.md#disponibilidad-de-ponytail).
- Las recomendaciones de Ponytail deben respetar las decisiones del desarrollador, la arquitectura y los contratos con el backend. Simplificar no autoriza cambios visuales o funcionales no solicitados, ni eliminar validaciones, manejo de errores, seguridad, accesibilidad o pruebas necesarias.
- Este es el único AGENTS general de `epe-web`; no agregues reglas por módulo o subcarpeta.
- Usa `pnpm` para comandos del proyecto. Para comprobar tipos sin build: `npx tsc --noEmit -p tsconfig.app.json`.
- Usa imports `@/`, salvo dentro de `src/shared/components/ui/`, donde se permiten relativos de shadcn.
- No envuelvas componentes `src/shared/components/ui/*` solo para estilarlos. Usa tokens de `src/index.css`; no agregues colores fijos ni paletas grises/verde de Tailwind.
- Componentes y páginas no importan `apiClient` ni DTOs crudos. No agregues fallbacks mock a vistas conectadas.
- La fuente del OpenAPI se mantiene en `docs/api/contract-schema.sql`. Genera con `pnpm contract:generate` y verifica con `pnpm contract:check`; sincroniza la copia runtime backend en el mismo cambio.
- Al cambiar contrato, datos o flujo compartido, actualiza los documentos afectados de `epe-backend` y `../docs/` según sus AGENTS. No es requisito consultar documentación fuera del alcance de la tarea.
- Si la tarea afecta una vista conectada, el contrato web–API o un flujo compartido, consulta el [estado de integración](docs/integration-status.md) desde la rama en que estés trabajando.
