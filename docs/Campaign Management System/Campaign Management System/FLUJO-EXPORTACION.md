# Exportación: relación entre entregas, cosecha y calidad

La base es el diagrama Bizagi «Cosecha y Control de Calidad Exportación». La vinculación con las entregas corresponde al diseño del software actualizado.

## Programación y coordinación de entregas

En Planificación de campaña → Clientes → Contratos → Entregas (o Gestión Comercial) se registra la entrega programada: contrato, fecha prevista, kilos, destino y observaciones. No se solicita transporte, camión, chofer, proveedores ni fincas en este momento.

El submódulo Programa semanal de entregas consolida estas entregas por semana y variedad, con columnas de lunes a domingo y totales de kilos. Se consulta desde Planificado y desde En proceso; las placas se completan automáticamente con el transporte asignado. La distribución por variedad se registra en la programación de cada entrega, sin duplicar su cantidad.

En Campaña → En proceso → Entregas, al mismo nivel que Transportistas, se completa cada entrega existente con el transportista vinculado a esa campaña, su camión y chofer, varios proveedores y sus fincas, fechas de viaje, origen y condiciones de carga. La fecha de fin del viaje no reemplaza la fecha programada. No se duplica la entrega: se conserva su identificador y contrato.

Cosecha y calidad, tanto Industria como Exportación, solo ofrece entregas coordinadas y sin carga registrada. Las entregas con carga conservan sus datos para consulta; su programación y coordinación quedan bloqueadas para no alterar la procedencia de la carga y sus guías.

1. **Abrir campaña:** cada campaña aparece una sola vez en Cosecha y control de calidad. Abrir Exportación y entrar a Análisis y revisión; no se crea un control independiente ni se solicita una entrega en esta etapa.
2. **Análisis y revisión:** registrar muestreo, tipo de análisis y finca de origen. Completar los resultados de laboratorio y de maduración / materia seca con sus documentos. Registrar obligatoriamente el MTD y su captura en el modal de análisis para cada productor y finca de esta campaña. El registro y su historial son independientes por finca; no se recuperan datos desde la vinculación de proveedores. MTD mayor a 0.5 impide organizar y cosechar; no se confunde con materia seca.
3. **Cargas por entrega y Preparar cosecha:** registrar una carga con el mismo modal de Industria: seleccionar la entrega de un cliente exportador, fecha y responsable, variedad, kilos y bultos por proveedor, gastos de cuadrilla/anotadores y viáticos. El transporte y la procedencia se recuperan de la entrega. Cada entrega se vincula a una sola carga; una vez registrada, deja de aparecer en el selector de nuevas cargas. La revisión de la carga se calcula automáticamente según los análisis y el MTD; no se elige manualmente ni existe Evaluar carga. Los rechazos históricos se conservan para consulta. Sus tres puntos solo contienen Preparar cosecha, Registrar avances y Cerrar cosecha. Se recuperan cliente, contrato, cantidades, proveedores, fincas y viaje. Se verifican los análisis de las fincas seleccionadas antes de completar jefe de cuadrilla, movilidad del personal, insumos, confirmación de transportista y cuadrilla, llegada y capacitación. Las notificaciones del prototipo son simuladas.
4. **Registrar avances:** registrar avances por proveedor y finca: fecha, kilos reales, jabas, responsable y evidencia. No se convierten jabas a kilos automáticamente. El total no puede superar lo programado en la entrega.
5. **Cerrar cosecha:** confirmar que terminó la cosecha, registrar fecha e informe final, solicitudes y recibos de pago de personal y movilidad, y registro de compra de fruta. El peso real puede ser menor que lo programado; antes de cerrar, los kilos registrados en la carga deben coincidir con sus avances por proveedor. Si cambiaron, actualízalos desde el lápiz de la carga. El cierre no finaliza la campaña.
6. **Guía:** preparar y generar la guía con la entrega vinculada y los kilos reales cosechados. Incluye todos los proveedores y fincas. No se vuelve a registrar camión, chofer, cliente o contrato.
7. **Logística y despacho:** continuar al módulo para recepción, compra, evaluación, descarte, jabas y cierre de la entrega logística.

## Ejemplos disponibles

- **EXP-MAN-001:** análisis pendientes; permite registrar y completar muestras.
- **EXP-MAN-002:** materia seca pendiente; falta completar el informe para continuar.
- **EXP-MAN-003:** análisis completos, MTD y captura registrados por productor y finca, cuadrilla confirmada, cosecha finalizada de 480 kg y documentos listos para generar la guía.

Los tres pasos de cada carga tienen vistas independientes: Preparar cosecha, Registrar avances y Cerrar cosecha, con botones Anterior / Continuar. Análisis y revisión y Guías de remisión se consultan desde sus propios submódulos de campaña. El avance se habilita según los datos guardados. Antes de vincular la entrega, el muestreo utiliza las fincas de los productores de la campaña; después se comprueban las fincas incluidas en la entrega. El MTD se registra únicamente en Análisis de Exportación por campaña, productor y finca; siempre requiere una captura y conserva su historial.

La cotización se gestiona en Gestión de transporte → Requerimientos y cotizaciones: requerimiento, propuestas, selección y confirmación. El acuerdo de pago de la campaña registra las condiciones y fechas de pago del transportista seleccionado; no sustituye las cotizaciones. En Preparar cosecha se utiliza el viaje ya asignado a la entrega.

Los análisis se consultan y actualizan por campaña, no se duplican al crear cargas. Cada carga conserva su organización, avances, cierre y guía. Las cargas rechazadas no habilitan la cosecha ni la guía. Los kilos de la carga no pueden superar la entrega. El bloque Viáticos registra movilidad e insumos del personal en soles, con total automático y consulta desde el detalle de carga.
