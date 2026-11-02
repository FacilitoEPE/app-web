# Liquidación de venta y liquidación de compra

Revisión del prototipo de Agroexportaciones: 21 de octubre de 2026.

Este documento describe cómo reutilizar los registros actuales. No crea ventas, compras, pagos, descuentos ni conversiones de moneda nuevos. Los módulos financieros actuales todavía requieren los ajustes indicados al final para automatizar todo el flujo.

## Venta: cuánto debe pagar el cliente

Actualmente corresponde al módulo **Facturación y cobros**. No hay un documento independiente denominado «Liquidación de venta».

**Campaña → cliente → contrato → entrega → carga y guía → recepción → factura → cobros → saldo.**

| Dato | Se toma de |
|---|---|
| Campaña, fruta, variedades y cliente | Gestión Comercial y Gestión de Campaña |
| Contrato, precio por kg, moneda y condiciones de pago | Contrato comercial de esa entrega |
| Entrega, destino, transportista, camión y chofer | Coordinación de entregas |
| Kilos cargados por proveedor y bultos | Datos de carga registrados por el chofer |
| Kilos amparados y número de guía | Guía de remisión de la carga exacta |
| Peso de recepción, resultado y descarte | Recepción y calidad de Logística y Despacho |
| Importe documentado, descuentos y cargos | Factura ya registrada |
| Cobros, referencias y comprobantes | Historial de cobros del documento |

1. Seleccionar una entrega y conservar su vínculo exacto con el contrato y el servicio de transporte. No usar solamente campaña o cliente, porque pueden tener varios contratos y cargas.
2. Presentar kilos cargados, kilos de guía y kilos recibidos en columnas diferentes. El peso de la guía no demuestra por sí solo que el cliente haya aceptado todo el producto.
3. Usar como base definitiva el peso reconocido y documentado para esa venta. Si no está identificado, mostrar **Pendiente de recepción/base de liquidación**. No descontar dos veces un descarte ya incluido en el peso reconocido.
4. Leer el precio y moneda del contrato exacto. Si faltan, mostrar **Pendiente de precio de venta**. No tomar el precio de compra del proveedor.
5. Leer descuentos y cargos existentes en la factura. Los gastos del camión no se convierten automáticamente en descuentos al cliente.
6. Calcular el total documentado y descontar exclusivamente los cobros efectivamente registrados.

**Total de venta = kilos documentados × precio de venta − descuentos registrados + cargos registrados.**

**Saldo por cobrar = total de venta − cobros registrados.**

Ejemplo con datos que ya existen: el contrato `contract-r1` tiene precio **USD 2.90/kg** y la factura de ejemplo registra **480 kg**. Su base antes de ajustes es **USD 1,392.00**. El saldo se obtiene restando los cobros asociados a esa factura, no el adelanto mencionado como condición del contrato.

Estados sugeridos para consulta: **Pendiente de recepción**, **Pendiente de precio**, **Lista para revisión**, **Pendiente de cobro**, **Cobro parcial**, **Cobrada** y **Vencida**. El estado se deriva de los documentos y movimientos existentes.

El **Cierre del chofer** termina el seguimiento del viaje. No equivale a recepción aprobada, factura emitida ni venta cobrada.

## Compra: cuánto corresponde a cada proveedor

Corresponde a **Liquidación de Compra → Productores y acopiadores**.

**Campaña → proveedor y finca → participación/precio → carga del proveedor → recepción documentada → liquidación de ese proveedor → pagos → saldo.**

| Dato | Se toma de |
|---|---|
| Nombre, documento y finca | Registro del proveedor y entrega coordinada |
| Fruta y variedad | Detalle de ese proveedor en la carga |
| Kilos entregados y bultos | Detalle de ese proveedor en Datos de carga |
| Precio de compra por kg y moneda | Participación del proveedor en la campaña |
| Kilos recibidos/reconocidos y observaciones | Recepción y soporte de compra, cuando identifican al proveedor |
| Deducciones, adicionales y motivo | Liquidación existente |
| Pagos, referencias y comprobantes | Historial de pagos de esa liquidación |

1. Crear la consulta por **carga y proveedor**, conservando también campaña, operación y finca. Una carga con tres proveedores requiere tres cuentas individuales, no una liquidación del total a un único proveedor.
2. Mostrar los kilos de ese proveedor registrados por el chofer. Compararlos con los kilos reconocidos en el soporte de recepción/compra, si ese soporte contiene el desglose.
3. Cuando la recepción solo tiene un peso total del camión, mostrar **Pendiente de desglose por proveedor** para la liquidación definitiva. No prorratear automáticamente el descarte, la diferencia de peso o los gastos.
4. Leer el precio y moneda de compra del proveedor en la campaña. Si no existe, mostrar **Pendiente de precio de compra**. No usar el precio del contrato del cliente.
5. Aplicar solamente las deducciones y adicionales que ya tengan registro y motivo para ese proveedor. Cuadrilla, anotadores, movilidad e insumos son gastos de carga; no son automáticamente descuentos al proveedor.
6. Sumar los pagos reales asociados a esa liquidación y mostrar el saldo. No descontar dos veces el mismo adelanto.

**Neto de compra = kilos reconocidos del proveedor × precio de compra − deducciones registradas + adicionales registrados.**

**Saldo por pagar = neto de compra − pagos registrados.**

Ejemplos de datos existentes en Mango: Brayan Gay tiene precio de compra **USD 1.80/kg**, Roberto Palacios **USD 2.10/kg** y Brayan Gay II no tiene precio registrado en esa participación. El último debe aparecer como pendiente de precio; no puede liquidarse automáticamente con el precio de otro proveedor.

Estados sugeridos para consulta: **Pendiente de precio**, **Pendiente de recepción/desglose**, **Lista para revisión**, **Pendiente de pago**, **Pago parcial**, **Pagada** y **Vencida**.

## Transportistas

La categoría **Liquidación de Compra → Transportistas** ya usa el acuerdo de pago vinculado a la campaña: transportista, total, moneda, adelanto acordado y vencimiento. Los desembolsos reales se toman del historial de pagos. No se calcula el flete multiplicando kilos de fruta por el precio de compra.

## Ajustes necesarios detectados

- `PurchaseSettlement` guarda `operationId`, pero no `providerId` ni el servicio/carga exactos. También impide una segunda liquidación para la misma operación. Debe permitir una liquidación por proveedor y carga y controlar duplicados con esa combinación.
- El selector de proveedores de compra puede apoyarse en el proveedor principal de la operación y omitir a otros que viajaron en el camión. Debe partir del detalle real de proveedores de la carga.
- El formulario de compra propone el peso total de planta/aceptado/cosechado. Ese total no debe copiarse a cada proveedor cuando la carga es compartida.
- Las recepciones actuales guardan un peso de planta global. No siempre existe el peso reconocido por proveedor necesario para un cierre definitivo sin supuestos.
- Hay participaciones de proveedores sin precio y documentos de demostración con monedas distintas a las de la participación. No se debe copiar un número cambiándole la moneda: sin tipo de cambio registrado, se muestran por separado.
- Las facturas se vinculan al contrato y a una entrega logística, pero el formulario permite elegir entregas del mismo cliente y campaña sin restringir suficientemente el contrato exacto. Se debe usar `sourceDelivery` y `transportServiceId`.
- Los precios de venta, compra y flete corresponden a acuerdos distintos. No son intercambiables.
- Los anexos del prototipo guardan principalmente nombres de archivos. Un nombre no significa que el PDF o la imagen estén subidos al servidor.

Con estos controles, una consulta de liquidaciones puede construirse solo con los datos ya disponibles y señalar explícitamente los casos pendientes. La automatización no debe inventar precios, pesos por proveedor, descuentos, pagos, tipos de cambio o documentos.
