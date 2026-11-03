# Catálogo de la API V1

Generado por `pnpm contract:generate`. Las rutas se sirven bajo `/api` en el backend NestJS y leen/escriben en PostgreSQL. `parentId` es la PK de la tabla padre indicada.

`R`: GET lista y detalle. `CRUD`: además POST colección, PATCH/DELETE detalle. `A`: GET lista/detalle y POST colección; los movimientos no se editan ni eliminan. Todas las listas usan `{items,total,page,pageSize}`.

| Módulo | Ruta de colección | Padre | Operaciones | DTO de respuesta | Tabla física |
|---|---|---|---|---|---|
| campaigns | `/frutas` | — | R | `Fruta` | `fruta` |
| campaigns | `/frutas/{parentId}/variedades` | fruta | R | `FrutaDerivada` | `fruta_derivada` |
| quality | `/normas` | — | R | `Norma` | `norma` |
| auth | `/roles` | — | R | `Rol` | `rol` |
| purchase-settlement | `/parametros-uit` | — | R | `ParametroUit` | `parametro_uit` |
| providers | `/personas` | — | CRUD | `Persona` | `persona` |
| providers | `/proveedores` | — | CRUD | `Proveedor` | `proveedor` |
| providers | `/proveedores/{parentId}/personas` | proveedor | CRUD | `ProveedorXPersona` | `proveedor_x_persona` |
| providers | `/proveedores/{parentId}/frutas` | proveedor | CRUD | `ProveedorXFruta` | `proveedor_x_fruta` |
| providers | `/proveedores/{parentId}/variedades` | proveedor | CRUD | `ProveedorXFrutaDerivada` | `proveedor_x_fruta_derivada` |
| providers | `/proveedores/{parentId}/fincas` | proveedor | CRUD | `Finca` | `finca` |
| providers | `/proveedores/{parentId}/certificados` | proveedor | CRUD | `CertificadoProveedor` | `certificado_proveedor` |
| clients | `/clientes-negocio` | — | CRUD | `ClienteNegocio` | `cliente_negocio` |
| campaigns | `/campanas` | — | CRUD | `Campana` | `campana` |
| campaigns | `/campanas/{parentId}/proveedores` | campana | CRUD | `CampaniaXProveedores` | `campania_x_proveedores` |
| campaigns | `/participaciones/{parentId}/entrevistas` | campania_x_proveedores | CRUD | `EntrevistaExtencion` | `entrevista_extencion` |
| providers | `/proveedores/{parentId}/examenes` | proveedor | CRUD | `ExamenProveedor` | `examen_proveedor` |
| campaigns | `/campanas/{parentId}/certificaciones` | campana | CRUD | `CertificadoCampana` | `certificado_campana` |
| campaigns | `/certificaciones/{parentId}/cobertura` | certificado_campana | CRUD | `CertificadoCampanaXProveedor` | `certificado_campana_x_proveedor` |
| campaigns | `/certificaciones/{parentId}/ampliaciones` | certificado_campana | A | `AmpliacionCertificadoCampana` | `ampliacion_certificado_campana` |
| campaigns | `/certificaciones/{parentId}/pagos` | certificado_campana | A | `PagoCertificadoCampana` | `pago_certificado_campana` |
| campaigns | `/campanas/{parentId}/requerimientos` | campana | CRUD | `ClienteNegocioCampana` | `cliente_negocio_campana` |
| campaigns | `/requerimientos/{parentId}/variedades` | cliente_negocio_campana | CRUD | `ClienteNegocioCampanaXFrutaDerivada` | `cliente_negocio_campana_x_fruta_derivada` |
| commercial-planning | `/requerimientos/{parentId}/contratos` | cliente_negocio_campana | CRUD | `ContratoVenta` | `contrato_venta` |
| commercial-planning | `/contratos/{parentId}/entregas` | contrato_venta | CRUD | `EntregaProgramada` | `entrega_programada` |
| commercial-planning | `/entregas/{parentId}/variedades` | entrega_programada | CRUD | `EntregaXFrutaDerivada` | `entrega_x_fruta_derivada` |
| carriers | `/transportistas` | — | CRUD | `EmpresaTransporteExterno` | `empresa_transporte_externo` |
| carriers | `/transportistas/{parentId}/vehiculos` | empresa_transporte_externo | CRUD | `VehiculoExterno` | `vehiculo_externo` |
| carriers | `/transportistas/{parentId}/choferes` | empresa_transporte_externo | CRUD | `ChoferTransporteExterno` | `chofer_transporte_externo` |
| carriers | `/campanas/{parentId}/solicitudes-transporte` | campana | CRUD | `SolicitudTransporte` | `solicitud_transporte` |
| carriers | `/solicitudes-transporte/{parentId}/invitaciones` | solicitud_transporte | CRUD | `InvitacionTransporte` | `invitacion_transporte` |
| carriers | `/invitaciones-transporte/{parentId}/cotizaciones` | invitacion_transporte | CRUD | `CotizacionTransporte` | `cotizacion_transporte` |
| carriers | `/campanas/{parentId}/transportistas` | campana | CRUD | `AcuerdoTransporte` | `acuerdo_transporte` |
| purchase-settlement | `/acuerdos-transporte/{parentId}/adelantos` | acuerdo_transporte | A | `AdelantoTransporte` | `adelanto_transporte` |
| campaigns | `/entregas/{parentId}/coordinaciones` | entrega_programada | CRUD | `CoordinacionEntrega` | `coordinacion_entrega` |
| campaigns | `/coordinaciones/{parentId}/origenes` | coordinacion_entrega | CRUD | `OrigenEntrega` | `origen_entrega` |
| quality | `/entregas/{parentId}/cosecha` | entrega_programada | CRUD | `Cosecha` | `cosecha` |
| quality | `/participaciones/{parentId}/analisis-calidad` | campania_x_proveedores | CRUD | `AnalisisCalidad` | `analisis_calidad` |
| quality | `/participaciones/{parentId}/mediciones-mtd` | campania_x_proveedores | A | `MedicionMtd` | `medicion_mtd` |
| quality | `/coordinaciones/{parentId}/cargas` | coordinacion_entrega | CRUD | `Carga` | `carga` |
| quality | `/cargas/{parentId}/proveedores` | carga | CRUD | `ProveedorCarga` | `proveedor_carga` |
| quality | `/proveedores-carga/{parentId}/origenes` | proveedor_carga | CRUD | `OrigenCarga` | `origen_carga` |
| quality | `/cargas/{parentId}/gastos` | carga | CRUD | `GastoCarga` | `gasto_carga` |
| quality | `/cargas/{parentId}/guias` | carga | CRUD | `GuiaRemision` | `guia_remision` |
| quality | `/guias/{parentId}/proveedores` | guia_remision | CRUD | `ProveedorGuia` | `proveedor_guia` |
| quality | `/guias/{parentId}/normas` | guia_remision | CRUD | `GuiaXNorma` | `guia_x_norma` |
| driver-portal | `/coordinaciones/{parentId}/historial-chofer` | coordinacion_entrega | A | `HistorialChofer` | `historial_chofer` |
| logistics | `/cargas/{parentId}/recepciones` | carga | CRUD | `RecepcionPlanta` | `recepcion_planta` |
| purchase-settlement | `/cargas/{parentId}/liquidaciones-proveedor` | carga | CRUD | `LiquidacionProveedor` | `liquidacion_proveedor` |
| purchase-settlement | `/cargas/{parentId}/liquidaciones-transporte` | carga | CRUD | `LiquidacionTransporte` | `liquidacion_transporte` |
| purchase-settlement | `/cargas/{parentId}/gastos-transporte` | carga | CRUD | `GastoTransporte` | `gasto_transporte` |
| purchase-settlement | `/liquidaciones-transporte/{parentId}/aplicaciones-adelanto` | liquidacion_transporte | A | `AplicacionAdelanto` | `aplicacion_adelanto` |
| purchase-settlement | `/liquidaciones-proveedor/{parentId}/pagos` | liquidacion_proveedor | A | `PagoProveedor` | `pago_proveedor` |
| purchase-settlement | `/liquidaciones-transporte/{parentId}/pagos` | liquidacion_transporte | A | `PagoTransporte` | `pago_transporte` |
| billing | `/cargas/{parentId}/facturas` | carga | CRUD | `FacturaVenta` | `factura_venta` |
| billing | `/facturas/{parentId}/cobros` | factura_venta | A | `CobroVenta` | `cobro_venta` |
| driver-portal | `/chofer/cargas` | Identidad autenticada | R | `Carga` | `carga` |

## Acciones

- `POST /campanas/{id}/cerrar` → `Campana`.
- `POST /guias/{id}/emitir` → `GuiaRemision`.
- `POST /facturas/{id}/emitir` → `FacturaVenta`.

Los cuerpos exactos, propiedades obligatorias/opcionales, filtros y errores están en [OpenAPI](api-v1.openapi.json). Las reglas están en [la guía](api-v1-contract.md).
