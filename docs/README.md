# Documentación de epe-web

Índice breve para personas y agentes. Consulta únicamente la guía relacionada con el cambio; las reglas generales están en [AGENTS.md](../AGENTS.md).

Las referencias a documentación compartida y al backend usan el workspace con `docs`, `epe-web` y `epe-backend` como carpetas hermanas.

| Si la tarea afecta… | Consulta… |
|---|---|
| SOLID, patrones y criterios de calidad del cambio | [Criterios compartidos](../../docs/criterios-de-calidad.md) |
| Módulos, capas o límites de código | [architecture.md](architecture.md) |
| Componentes, tokens o interacción visual | [design-system.md](design-system.md) |
| Comandos, fixtures o configuración local | [development.md](development.md) |
| Cambiar vistas, reglas de negocio y mock, y explicar sus implicaciones | [Flujo de cambios](development.md#cambios-de-vistas-reglas-de-negocio-y-mock) |
| Variables e imágenes Docker para S3 y diferencias del despliegue | [Diagnóstico compartido](../../epe-backend/docs/diagnostico-s3-despliegue.md) |
| Integración disponible por vista | [integration-status.md](integration-status.md) |
| Peticiones por pantalla y actualización tras escrituras | [Optimización implementada](integration-status.md#optimización-de-peticiones-por-vista--2026-11-05--implementada-en-desarrollo-y-revisada) y [referencia de diseño](integration-status.md#plan-de-consumo-api-por-vista--2026-11-05--referencia-de-diseño) |
| Rutas, payloads o reglas API | [api/README.md](api/README.md) |
| Nombre libre del responsable de campaña | [Contrato y ejemplo](api/README.md#responsable-libre-de-campaña) |
| Pasos visibles para un usuario | [guides/](guides/) |
| Resultado de pruebas con alcance y fecha | [evidence/](evidence/) |
| Riesgos y controles pendientes de seguridad | [Auditoría de seguridad](auditoria-seguridad.md) |

El estado de integración es el registro operativo por vista. Las guías de usuario describen acciones disponibles, y los informes de `evidence/` son cortes fechados con vigencia limitada.

La disponibilidad y los colores de los adjuntos se describen en [integración](integration-status.md#disponibilidad-real-de-adjuntos--2026-11-05--implementada-pendiente-verificación-productiva) y el [contrato de disponibilidad](api/business-rules.md#disponibilidad-de-adjuntos).

Los contratos y entregas guardan variedades y cantidades mediante una escritura atómica. Consulte el [contrato y compatibilidad HTTP](api/README.md#desglose-de-contratos-y-entregas) y el [estado de integración](integration-status.md#variedades-en-contratos-y-entregas--2026-11-05--completo-en-desarrollo-despliegue-pendiente).
