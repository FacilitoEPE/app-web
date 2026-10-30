# Documentación de epe-web

Índice para la aplicación y su integración con el backend. El historial de cambios de pantallas y conectores se conserva en `integration-status.md`.

## V1 y operación

- Manuales de usuario V1: [Administrador](manuales/guia-administrador-v1.md) · [Chofer](manuales/guia-chofer-v1.md)
- [Resultado E2E de negocio V1](pruebas/qa-e2e-flujos-negocio-v1-2026-10-30.md)
- [Catálogos predeterminados y SQL seguro de producción](../../epe-backend/docs/default-data.md)
- [Estado de integración por vista](integration-status.md)
- [Contrato HTTP OpenAPI](future-api.openapi.json)
- [Reglas del contrato frontend/backend](future-api-contract.md)
- [Catálogo de endpoints](future-api-endpoints.md)

## Arquitectura y experiencia de uso

- [Arquitectura y límites de módulos](architecture-and-solid.md)
- [Sistema visual y accesibilidad](ui-and-design-system.md)
- [Flujo de trabajo y restricciones](agent-workflow-and-constraints.md)
- [Acuerdos de referencia](reference/README.md)

## Mantenimiento documental

- Cambios de integración o auditorías de vistas: actualizar `integration-status.md` con fecha ISO y estado, sin crear reportes paralelos.
- Cambios del contrato: actualizar OpenAPI, clientes y fixtures con `pnpm contract:generate`; validar con `pnpm contract:check`.
- Guía de usuario: mantener la ruta de pantalla y el texto visible de cada opción. No asumir que una vista en construcción está lista para operación.
- Los manuales canónicos V1 viven en `manuales/`; los resultados E2E fechados, en `pruebas/`.
