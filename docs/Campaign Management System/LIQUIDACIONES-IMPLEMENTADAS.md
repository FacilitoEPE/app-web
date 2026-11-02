# Liquidaciones del prototipo

Venta: Liquidación de Venta muestra cada entrega logística, su carga exacta, contrato, kilos cargados, guía, kilos recibidos disponibles, precio y moneda del contrato. Solo se habilita guardar con recepción respaldada por reporte y resultado. Los documentos y cobros anteriores se conservan. Los nuevos documentos se guardan en invoices para reutilizar el historial de cobros y saldos.

Compra: Productores y acopiadores muestra una fila por carga y proveedor. Conserva proveedor, finca(s), entrega y servicio. Lee el precio de su participación en campaña. En cargas compartidas exige un desglose documental revisado que coincida con el total recibido; no prorratea diferencias ni gastos. Una liquidación antigua sin proveedor/carga explícitos se conserva y bloquea nuevas duplicaciones ambiguas.

Los formularios toman kilos, precio, moneda y soporte de los registros existentes. El usuario registra número, fecha, vencimiento y ajustes con motivo. Los precios o pesos faltantes se completan en origen. No se crean precios, recepciones, facturas, pagos, tipos de cambio ni repartos automáticamente al desplegar.

Transportistas sigue usando su acuerdo por campaña. Adelanto acordado y pago efectivo son distintos. Los saldos se calculan por moneda y documento con movimientos reales. El API verifica las mismas reglas y evita sobrepagos, referencias duplicadas y sustitución de documentos con movimientos.

Pruebas: pnpm test:finance (escenarios de cálculo y API con almacenamiento aislado; sin modificar datos de Vercel).

Ver pendientes abre el registro de origen de la carga, campaña/proveedor o contrato. Los precios, recepción, desglose y guías se reevalúan al guardarse, regresando a Por liquidar. El ojo mantiene el detalle y permite elegir un pendiente específico. Los kilos recibidos por proveedor se registran expresamente en Logística y despacho (recognizedQuantity), sin sobrescribir los kilos originales de compra ni prorratear el peso total. Los documentos finalizados y sus movimientos conservan sus importes históricos.

## Control UIT de compra

Referencia consultada el 21/10/2026: 75 UIT por proveedor y año calendario, Reglamento de Comprobantes de Pago, artículo 6.1.3 (https://www.sunat.gob.pe/legislacion/comprob/regla/capituloII.pdf). UIT 2026 S/5500, DS301-2025-EF (https://www.gob.pe/institucion/mef/normas-legales/7540449-301-2025-ef). UIT 2025 S/5350. Otros años quedan sin configurar; no se reutiliza un valor anual por defecto.

Control interno: suma por identidad del proveedor (tipo/documento, o ID si no hay documento), todas las campañas del mismo año, usando kilos por precio antes de gastos y adelantos. Excluye flete, cobros y pagos. Avanza a Cerca del límite al 90% (alerta preventiva del prototipo); desde 75 UIT requiere confirmar el aviso al guardar. No bloquea la compra por una regla tributaria de emisión ni pretende autorizar una LCE. La norma exige consultar la información de SUNAT al día anterior y restringe la emisión desde el día siguiente al exceso; este prototipo no tiene conexión con SOL ni conoce ventas a otros compradores.

Las nuevas compras en moneda extranjera registran tipo de cambio a PEN y referencia de la cotización. Los documentos anteriores pueden registrar su conversión en metadatos del proveedor sin alterar importes, moneda ni pagos del documento. Sin conversión o sin proveedor inequívoco se muestra acumulado incompleto. Una operación compartida no se asigna a su proveedor principal. Los años se reinician sin perder el historial. Los avisos se recalculan también en servidor con control de concurrencia y reintentos idempotentes.


## Actualización: liquidación y pago independientes

Para proveedores y transportistas, Guardar liquidación únicamente registra el documento con saldo pendiente. Mantiene las series automáticas LC y LT. Registrar pago abre un segundo modal con total, pagado, saldo, fecha, monto propuesto (saldo completo, editable para abono), medio y comprobante para pagos no efectivos. Cada pago actualiza el saldo sin modificar la liquidación. El servidor valida de nuevo el saldo en cada escritura concurrente y mantiene idempotencia por comando. Las liquidaciones y los pagos anteriores se conservan; no se recalculan ni se eliminan.


## Adelanto distribuido por carga y saldo de empresa

El flete asignable conserva el total contratado: el adelanto no disminuye el presupuesto de servicios. Un adelanto puede aplicarse solo si existe un desembolso real registrado, recuperado del historial anterior de la misma empresa/campaña o registrado expresamente como nuevo adelanto. El monto acordado por sí solo no crea dinero disponible.

Las aplicaciones son movimientos vinculados por `advanceSourceId` al pago original. Cubren el saldo de la carga pero no constituyen dinero adicional entregado. En cada escritura concurrente se validan origen, empresa, campaña, monto disponible de cada origen, saldo de la carga e historial inmutable. Un mismo origen no puede financiar más de su monto. Aplicar adelanto requiere una acción y confirmación independientes. Guardar liquidación nunca aplica adelantos ni registra pagos; el servidor rechaza un comando de liquidación que incluya un adelanto distinto de cero.

Saldo de carga = flete + gastos reales - adelanto aplicado - pagos posteriores. Saldo de empresa/campaña = flete contratado + gastos reales liquidados - dinero efectivamente pagado (incluye adelantos; excluye sus aplicaciones). El saldo de empresa incluye fletes aún no liquidados, mientras el saldo de cargas liquidadas refleja solo documentos emitidos. Registrar adelanto y registrar pagos siguen siendo operaciones independientes de la liquidación.


El flete por liquidar es el total contratado menos los fletes de las liquidaciones por carga. No descuenta adelantos, pagos ni gastos reales. El formulario muestra el pendiente actual y el que quedará al guardar.

Prueba solicitada: se respaldaron y retiraron de la operación activa la liquidación LT-000001 y su aplicación separada de S/ 1,000. Los originales se conservan en el respaldo local de la revisión 20 y en prototypeMaintenance del snapshot. Se asignaron S/ 1,000, S/ 1,000, S/ 1,000 y S/ 1,200 a las cuatro primeras cargas de Mango 2026, sincronizando sus entregas de origen. No se modificaron proveedores, el adelanto original de S/ 1,200 ni otros pagos.


Actualización de flujo: el precio del flete de cada carga se ingresa vacío dentro de Liquidar. Las asignaciones previas se conservan como datos históricos pero no se precargan ni reservan el acuerdo. Guardar liquidación registra atómicamente flete, observación y gastos; no crea pagos ni aplica adelantos. El presupuesto compara únicamente fletes ya liquidados y exige observación para exceder el acuerdo, con nueva validación en cada reintento concurrente. Se retiraron los campos de flete en coordinación y el botón Editar flete del resumen.


Viáticos automáticos: al guardar sin detalle de gastos reales, el servidor toma movilidad e insumos registrados en la carga y los suma al flete, guardando ambos conceptos como transportExpenses. Si se ingresan gastos reales, esos conceptos sustituyen el importe automático para evitar duplicidad. El formulario usa la misma función de cálculo. Sin viáticos registrados se suma cero. Las liquidaciones previas no se recalculan sin una edición explícita y las que ya tienen movimientos se mantienen bloqueadas.
