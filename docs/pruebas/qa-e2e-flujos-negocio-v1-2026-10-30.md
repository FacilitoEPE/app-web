# Resultado E2E de negocio V1

**Fecha:** 2026-10-30  
**Frontend:** `http://localhost:5173/modules` (Chrome)  
**Alcance:** recorrido normal de administrador y chofer, con persistencia observada al recargar y volver a iniciar sesión. Los datos QA se conservaron en la aplicación; no se borraron.

## Resultado

El recorrido operativo/financiero disponible en la aplicación llegó a campaña **Terminado**. Se comprobó la persistencia de los registros principales al volver a consultar las pantallas. La prueba demuestra que las vistas y comandos del flujo recorrido se comunican con el backend del entorno local.

Esto no certifica conexión real con SUNAT, bancos ni almacenamiento de adjuntos. Las opciones de emisión y pago guardaron el estado y las referencias ingresadas en la aplicación; los servicios externos no se validaron.

## Recorrido ejecutado

| Área | Acción ejecutada | Resultado observado |
|---|---|---|
| Campaña | Se creó `QA E2E Orden Correcto 20261030`, campaña 6, fruta Arándano, meta 1,500 kg. | Quedó disponible para vincular operaciones. |
| Proveedor y finca | Se vinculó `QA E2E Productor` (proveedor 5), estimado 1,500 kg a S/ 4.50/kg; se registró entrevista para `QA E2E Fundo 20261030`. | Participación y datos agronómicos disponibles para cosecha/calidad. |
| Comercial | Se vinculó `QA E2E Cliente Exportador 20261030 S.A.C.`, contrato 05, 1,500 kg a USD 6.25/kg, entrega 05 con destino Rotterdam. | Contrato/entrega vinculados a la campaña. |
| Transporte | Se vinculó `QA E2E Transportes 20261030 S.A.C.`, acuerdo por S/ 1,200, unidad QA-1234 y chofer QA E2E. | Se coordinó entrega de campaña. |
| Calidad | Se incorporó la campaña; se registró muestra apta y autorización de cosecha. | Se pudo continuar al flujo de cosecha. |
| Cosecha y carga | Se registraron 10 trabajadores, 375 cajas, herramientas/materiales; se cerró cosecha por 1,500 kg. Se creó carga CAR-6-5: 1,500 kg, 375 cajas y costos operativos registrados. | Cosecha cerrada y carga consultable. |
| Guía de traslado | Se emitió en la app `EG07-000006`, con transporte, chofer, origen/destino, 1,500 kg y 375 bultos. | El registro persistió. No se comprobó envío/aceptación de SUNAT. |
| Recepción | Se guardó recepción de 1,500 kg aceptados, Brix 8.4°, y distribución al proveedor. | Información de recepción disponible en logística. |
| Chofer | Cerrada sesión de administrador, se ingresó con el perfil Chofer QA. Se guardaron los cinco eventos del viaje en orden, checklist de llegada de 1,500 kg y guía de salida `EG01-000006` con 375 envases vacíos. | La recarga mostró eventos, checklist y guía persistidos; el último evento completó el despacho. |
| Cierres logísticos | Administrador confirmó cierre físico antes del último evento del chofer; luego, tras el cierre del conductor, confirmó cierre administrativo. | Logística llegó a etapa 5/5 y quedó cerrada. |
| Facturación/cobranza | Se generó preparación `PREP-QA-20261030-01`, factura `F001-000006` por USD 9,375, y se registró cobranza total `SWIFT-QA-20261030-01`. | Saldo 0 y estado Cobrado. No se validó una pasarela o banco real. |
| Liquidación de productor | Liquidación `LC-2026-000006`, 1,500 kg × S/ 4.50 = S/ 6,750; pago total con referencia BCP QA. | Estado pagado; no se validó operación bancaria real. |
| Liquidación de transporte | Liquidación `LT-2026-000006`, flete total S/ 1,200; pago con referencia BCP QA. | Estado pagado; no se validó operación bancaria real. |
| Cierre de campaña | Se ingresó motivo de cierre y se confirmó el cierre de campaña 6. | Estado final **Terminado**. |

## Hallazgos y límites

1. **Guía antes de crear la carga:** inicialmente, el asistente permitía abrir la guía desde un ID temporal `entrega-*`; el comando respondía que no encontraba una carga real. La interfaz se corrigió después del recorrido: el paso del asistente guarda la cosecha y abre **Datos de carga (Anotador)**; el acceso a guía para una entrega todavía sin carga también lleva primero al formulario de carga. Tras guardar la carga, la guía se abre desde su fila. Esta corrección requiere regresión E2E en navegador.
2. **Códigos de establecimiento de la guía:** la pantalla no los marcaba obligatorios, pero el backend rechazó el guardado si estaban vacíos. Se corrigió el formulario para requerir exactamente cuatro dígitos, validar antes de enviar y mostrar el error junto al campo. La corrección se incorporó después del recorrido y no se volvió a ejecutar una emisión con el código vacío.
3. **Adjuntos de logística:** la vista mostró 2/6 elementos de la lista documental y 0/6 archivos. Los botones de adjuntar estaban deshabilitados, aunque el sistema permitió el cierre físico y administrativo. La prueba no acreditó un expediente documental completo; el criterio de cierre debería aclarar si los cuatro elementos faltantes bloquean o no el cierre.
4. **Servicios externos:** “Emitir” y “pagar” guardaron estados y referencias en la app; no se validó SUNAT, una entidad bancaria ni un servicio de firma/almacenamiento.
5. **Datos generados:** quedó además una campaña QA anterior (#5) cerrada con motivo de escenario parcial, y otros registros QA de pruebas anteriores. Se dejaron en la app según la instrucción del usuario; no eliminar ni reutilizar como datos productivos.

## Conclusión QA

**Flujo principal de negocio en la app: aprobado con observaciones.** Administrador y chofer completaron el ciclo disponible y los estados/operaciones consultados persistieron en el backend del entorno de prueba. Antes de considerar el flujo listo para producción, hay que resolver o aceptar explícitamente el requisito documental 2/6 y verificar integraciones reales de SUNAT, bancos y adjuntos. La validación de códigos obligatorios ya quedó reflejada en la UI, pero está pendiente de una nueva ejecución específica posterior al cambio.
