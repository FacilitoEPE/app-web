# Arquitectura de epe-web

## Arquitectura actual y por qué se usa

**Single-Page Application (SPA) · Screaming Architecture.** React permite navegar entre pantallas operativas sin recargar toda la página. La organización por funcionalidad agrupa pantalla, modelo y acceso HTTP en módulos como Campañas, Calidad y Logística. Eso facilita localizar los archivos que cambian juntos. La carga por ruta acota las lecturas. Los datos compartidos todavía pasan por un coordinador transversal.

### Desviaciones de la arquitectura actual

- **Liquidación y Logística dependen de comandos de Calidad para comparar campos.** `hasChanges` es una comparación genérica. Ubicarla en comandos de Calidad obliga a dos módulos a depender de un archivo ajeno a su operación. [Liquidación](../src/modules/purchase-settlement/api/settlement-commands.api.ts) · [Logística](../src/modules/logistics/api/logistics-commands.api.ts)
- **La publicación de datos sigue centralizada.** `frontend-data.ts` importa proyecciones y almacenes de varios módulos. Es el punto de composición actual, aunque cada nuevo conjunto de datos compartidos puede obligar a modificar este archivo además de su módulo. [Coordinador](../src/frontend-data.ts)

### Arquitecturas que no se usan

| Arquitectura o enfoque | Por qué EPE no lo usa |
|---|---|
| **Package by Layer** | Carpetas globales de páginas, modelos y servicios dispersarían los cambios de una misma función. Por ejemplo, cambiar la liquidación de una carga obligaría a buscar en varias carpetas globales. |
| **Clean Architecture o Hexagonal Architecture** | Aplicarlas a toda la web añadiría casos de uso, interfaces y adaptadores también a pantallas simples. Los mappers y hooks ya aíslan la traducción HTTP y el comportamiento reutilizable de los formularios. |
| **Server-Side Rendering (SSR)** | Las pantallas son operativas y autenticadas, por lo que la indexación pública aporta poco. SSR requeriría un proceso de renderizado en servidor y gestionar allí la sesión y la carga inicial de datos. |
| **Micro Frontends** | La web comparte sesión, navegación y diseño. Separar despliegues obligaría a coordinar esas piezas entre aplicaciones. El repositorio actual entrega los módulos como una sola web. |

Evaluación retrospectiva del diseño actual. [Screaming Architecture](https://blog.cleancoder.com/uncle-bob/2011/09/30/Screaming-Architecture.html)

## Patrones de diseño y prácticas actuales

| Decisión | Por qué EPE la usa | Qué atributo de calidad apoya | Ejemplo concreto |
|---|---|---|---|
| **Component Composition** | Reutiliza controles y permite variar su presentación sin duplicar pantallas. | Maintainability · Reusability | El modal de certificación compone el mismo `Button` para cancelar y guardar, con variantes distintas. [Modal](../src/modules/campaigns/components/CampaignCertificationFormModal.tsx) |
| **Mapper** | Concentra la conversión de formatos HTTP y mantiene estable el modelo de pantalla. | Maintainability · Modifiability | La API de Campañas convierte la respuesta del servidor con `mapCampaignV1` antes de entregarla a la vista. [Adaptador](../src/modules/campaigns/api/v1-screen.api.ts) |
| **Custom Hooks** | Reutilizan comportamientos como mostrar errores de formulario y prevenir envíos dobles. | Maintainability · Reusability | Facturación usa `useFormSubmit` al registrar un cobro y al emitir una factura. [Cobro](../src/modules/billing/components/BillingRegisterCollectionModal.tsx) · [Emisión](../src/modules/billing/components/BillingIssueInvoiceModal.tsx) |
| **Client-Side Validation** | Orienta al usuario antes de enviar. El backend aplica los permisos y las reglas al recibir la petición. | Interaction Capability · User Error Protection | El formulario entrega su función `validate` a `useFormSubmit`, que interrumpe el envío cuando hay errores. [Formulario de cobro](../src/modules/billing/components/BillingRegisterCollectionModal.tsx) · [Hook](../src/shared/hooks/useFormSubmit.ts) |

**SOLID en revisión.** Separa responsabilidades (S), extiende mediante composición (O), conserva el comportamiento al sustituir una implementación (L), pide solo los datos necesarios (I) y aísla las dependencias externas cuando haga falta sustituirlas (D).

Aplica estos criterios al código nuevo y a los flujos que ya se vayan a modificar.

### Patrones que no se usan para estos casos

- **Higher-Order Components (HOCs) o Render Props para formularios.** `useFormSubmit` permite compartir la lógica directamente en los componentes de función, sin añadir un envoltorio ni una función de renderizado. [Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)
- **Uso directo del DTO en pantalla.** Acoplaría los componentes a nombres y formatos HTTP. Algunas vistas necesitan campos derivados o formatos propios, y el mapper mantiene esa conversión en un solo lugar.

## ISO/IEC 25010:2023 y evidencia

| Qué se evalúa | Criterio en EPE | Ejemplo concreto y estado |
|---|---|---|
| **Maintainability · Modifiability y Reusability** | Localizar cambios de formato y reutilizar comportamiento de formulario. | El adaptador de Campañas mapea la respuesta. Cobro y Emisión comparten el hook de envío. Son ejemplos verificables en código. [Adaptador](../src/modules/campaigns/api/v1-screen.api.ts) · [Hook](../src/shared/hooks/useFormSubmit.ts) |
| **Performance Efficiency · Time Behaviour** | Medir la carga de una ruta con un volumen representativo. | La suite verifica qué recursos pide la entrada directa a una pantalla. Para cuantificar la mejora, falta medir el tiempo bajo la carga que se quiera presentar. [Pruebas por ruta](../dev/scoped-requests.test.ts) |
| **Interaction Capability · User Error Protection** | Bloquear envíos dobles y mostrar el error en su campo. | El hook impide enviar mientras hay un guardado activo. En CI web queda pendiente automatizar un recorrido crítico contra NestJS y PostgreSQL. [Hook de envío](../src/shared/hooks/useFormSubmit.ts) · [Playwright](../playwright.config.ts) |

[Criterios compartidos y alcance de la evaluación ISO](../../docs/criterios-de-calidad.md)

## Límites y cambios por vista

- **Módulos.** Coloca la lógica de negocio en `src/modules/<dominio>/` y lo transversal en `src/shared/`. `shared` no importa módulos. Para reutilizar un catálogo de otro dominio, usa la API del módulo dueño y conserva sus modelos mapeados. Las páginas y componentes no importan Axios ni DTOs crudos. Consulta las [reglas del repositorio](../AGENTS.md).
- **Datos por ruta.** Al agregar una vista o un dato visible, declara sus dependencias en [operations-resources.ts](../src/modules/operations/api/operations-resources.ts) y cubre el acceso directo en [scoped-requests.test.ts](../dev/scoped-requests.test.ts). El [boundary](../src/FrontendDataBoundary.tsx) carga el ámbito activo. [commitRemote](../src/shared/api/data-contract.ts) conserva las escrituras confirmadas y reconcilia el ámbito ante resultados parciales o inciertos. Consulta el [flujo vigente](integration-status.md#optimización-de-peticiones-por-vista--2026-11-05--implementada-en-desarrollo-y-revisada) antes de añadir recargas.
- **Navegación.** Al registrar una pantalla en [App.tsx](../src/App.tsx), comprueba por separado la ruta visual de `getBreadcrumbLevels` y el destino de **Regresar** mediante `getParentHref`. Actualiza [breadcrumbRoutes.ts](../src/shared/layout/breadcrumbRoutes.ts) si hace falta y prueba el destino al abrir la URL directamente.
- **Formularios y formatos.** Para modales nuevos, reutiliza [useModalForm](../src/shared/hooks/useModalForm.ts) para el estado y [useFormSubmit](../src/shared/hooks/useFormSubmit.ts) para validar, prevenir dobles envíos y mostrar errores de campo. Para eliminar desde una página, reutiliza [createInFlightGuard](../src/shared/utils/inFlightGuard.ts). Usa [parseFecha y formatFecha](../src/modules/campaigns/api/fecha.util.ts) para fechas calendario y las [funciones compartidas](../src/shared/utils/format.ts) para mostrarlas y formatear números.

**Calidad del producto.** Aplica también los [criterios compartidos](../../docs/criterios-de-calidad.md) de simplicidad, seguridad, accesibilidad, pruebas, rendimiento y operación.
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
