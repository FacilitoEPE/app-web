# Arquitectura de epe-web

| Decisión | Por qué se mantiene | ISO/IEC 25010:2023 |
|---|---|---|
| **Screaming Architecture** | Campañas, Calidad y Logística ya se organizan por funcionalidad. Conservar esa estructura permite localizar los cambios por dominio sin reorganizar un proyecto avanzado. | Mantenibilidad |
| **Composición de componentes** | Permite reutilizar controles y variar su presentación sin duplicar pantallas. | Mantenibilidad |
| **Mapper** | Si el formato de la API cambia, la traducción queda en la capa API del módulo y la vista conserva su modelo. | Mantenibilidad y compatibilidad |
| **Hooks personalizados** | Extraen comportamiento de React cuando se repite, como el envío de formularios. | Mantenibilidad |
| **Validación en pantalla y autoridad en el backend** | La pantalla orienta al usuario y el backend protege las reglas y permisos para todos los clientes. | Adecuación funcional y seguridad |

**SOLID en revisión.** Separa responsabilidades (S), extiende mediante composición (O), conserva el comportamiento al sustituir una implementación (L), pide solo los datos necesarios (I) y aísla las dependencias externas cuando haga falta sustituirlas (D).

Aplica estos criterios al código nuevo y a los flujos que ya se vayan a modificar.

## Límites y cambios por vista

- **Módulos.** Coloca la lógica de negocio en `src/modules/<dominio>/` y lo transversal en `src/shared/`. `shared` no importa módulos. Para reutilizar un catálogo de otro dominio, usa la API del módulo dueño y conserva sus modelos mapeados. Las páginas y componentes no importan Axios ni DTOs crudos. Consulta las [reglas del repositorio](../AGENTS.md).
- **Datos por ruta.** Al agregar una vista o un dato visible, declara sus dependencias en [operations-resources.ts](../src/modules/operations/api/operations-resources.ts) y cubre el acceso directo en [scoped-requests.test.ts](../dev/scoped-requests.test.ts). El [boundary](../src/FrontendDataBoundary.tsx) carga el ámbito activo. [commitRemote](../src/shared/api/data-contract.ts) conserva las escrituras confirmadas y reconcilia el ámbito ante resultados parciales o inciertos. Consulta el [flujo vigente](integration-status.md#optimización-de-peticiones-por-vista--2026-11-05--implementada-en-desarrollo-y-revisada) antes de añadir recargas.
- **Navegación.** Al registrar una pantalla en [App.tsx](../src/App.tsx), comprueba por separado la ruta visual de `getBreadcrumbLevels` y el destino de **Regresar** mediante `getParentHref`. Actualiza [breadcrumbRoutes.ts](../src/shared/layout/breadcrumbRoutes.ts) si hace falta y prueba el destino al abrir la URL directamente.
- **Formularios y formatos.** Para modales nuevos, reutiliza [useModalForm](../src/shared/hooks/useModalForm.ts) para el estado y [useFormSubmit](../src/shared/hooks/useFormSubmit.ts) para validar, prevenir dobles envíos y mostrar errores de campo. Para eliminar desde una página, reutiliza [createInFlightGuard](../src/shared/utils/inFlightGuard.ts). Usa [parseFecha y formatFecha](../src/modules/campaigns/api/fecha.util.ts) para fechas calendario y las [funciones compartidas](../src/shared/utils/format.ts) para mostrarlas y formatear números.

**Calidad del producto.** Aplica también los [criterios compartidos](../../docs/criterios-de-calidad.md) de simplicidad, seguridad, accesibilidad, pruebas, rendimiento y operación.
