# Recorridos con datos sintéticos

Los ejemplos se cargan al abrir el prototipo. Los cambios se mantienen durante la sesión; al recargar se recuperan los datos iniciales. Las fechas son relativas al día actual para mantener campañas planificadas y en proceso.

| Recorrido | Dónde comenzar | Qué revisar |
|---|---|---|
| Planificación | Gestión de campaña → Planificado → Palta | Proveedores, entrevista con fincas, exámenes, certificado único por campaña con kilos automáticos y ampliaciones; clientes de Industria y Exportación con contratos y entregas programadas sin coordinación. |
| Contratos y entregas | Gestión comercial → Contratos → Mango actual → SUTRIMEX o Batimix | Tres contratos por cliente en Mango; registro de entregas programadas con fecha, kilos y destino. Su coordinación se completa en Campaña → En proceso → Entregas. |
| Industria: carga nueva | Cosecha y control de calidad → Industria → Mango actual → Cargas por entrega | Registrar datos de carga, seleccionar una entrega, marcar Sí cumple y completar kilos/bultos por proveedor; o No cumple para guardar el rechazo. |
| Industria: guía pendiente | Industria → Mango actual → Guías de remisión | Carga de 580 kg pendiente de guía y carga de 480 kg con guía generada. Se recuperan datos de la entrega. |
| Industria: rechazo | Industria → Mango actual → Cargas por entrega | Entrega rechazada sin registrar kilos, bultos ni guía. |
| Exportación | Cosecha y control de calidad → Exportador | Entrega vinculada con varios proveedores/fincas; muestreo pendiente (EXP-MAN-001), materia seca pendiente (EXP-MAN-002), cosecha terminada de 480 kg con análisis completos, recibos y compra para generar la guía (EXP-MAN-003). |
| Transporte | Gestión de transporte | Empresas e independiente con MTC/CGN, vehículos y choferes; solicitudes pendientes, con cotización y confirmadas. |
| Coordinación de entregas | Campaña → En proceso → Mango → Entregas | Completar cada entrega programada con transporte, camión, chofer, varios proveedores y fincas. Solo las entregas listas aparecen al registrar cargas. |
| Acuerdos de pago | Campaña → En proceso → Mango → Transportistas | Acuerdo público con adelanto y acuerdo independiente pendiente. |
| Logística | Logística y despacho | Cargas preparadas, en ruta, en espera y en recepción; compra, descarga, descarte y devolución de jabas. |
| Facturación y cobros | Facturación y cobros | Factura pendiente, parcialmente cobrada, cobrada y vencida. Cada factura tiene campaña, cliente, contrato y entrega logística. |
| Liquidación | Liquidación de compra | Productor con pago parcial, acopiador pagado; transporte con adelanto, pendiente vencido y liquidado. |
| Cierre | Gestión de campaña → Finalizado → Mango cerrada | Carga recibida, documentos y movimientos financieros históricos vinculados. |
| Segunda fruta en ejecución | Campaña en proceso → Arándano | Proveedor Lucía Vega, finca Fundo Azul, contrato de Batimix, carga de 760 kg, guía y entrega preparada. |

Los documentos adjuntos son nombres de archivos simulados. Las guías se pueden generar y consultar dentro del prototipo. Los correos usan el dominio de ejemplo y no se realizan envíos ni pagos reales.

El listado principal permite elegir solo Exportador o Industria y muestra una sola fila por campaña en cada canal. Los análisis de Exportación se comparten por campaña; sus cargas se registran en Cargas por entrega. Industria reúne todas sus cargas y rechazos en la misma campaña. Cada entrega se selecciona una sola vez para registrar su carga; después deja de aparecer en nuevas cargas. Los estados Aprobada, Rechazada y Pendiente pertenecen a las cargas, y el listado principal muestra el estado de la campaña.

El MTD de Exportación se registra por campaña, productor y finca, con captura obligatoria. Los ejemplos de Mango incluyen cuatro fincas con lecturas independientes (0.20, 0.25, 0.18 y 0.30) y capturas. La vinculación de proveedores no registra MTD.

Cada campaña admite un único certificado. Sus kilos registrados se calculan con los kilos estimados de los productores seleccionados en esa misma campaña; se excluyen acopiadores. Al editar la cobertura se conserva el historial de kilos y las ampliaciones.

## Guías de remisión

Desde Guías de remisión, abrir una carga y usar Preparar guía. Seleccionar uno o varios proveedores de esa entrega y completar remitente, traslado, transporte, direcciones y bienes. Se pueden distribuir los kilos en varias guías sin exceder el peso por proveedor ni el peso real de la carga. Una guía generada conserva una copia de sus datos y se consulta desde el ojo, con descarga e impresión.

En Exportación el selector incluye NOP, RTPO, EU, ROC y GLOBALG.A.P. / GRASP. Cada norma incorpora la frase proporcionada por el Product Owner y sus datos de certificador; se pueden elegir varias normas. En Industria Normas es un campo de texto libre.

Referencia de estructura: modelo público de guía remitente de NubeFact: https://www.nubefact.com/guia/32b6a66d-78dd-48aa-86e0-73f6e1046355.pdf. La cuenta de prueba requiere registro/inicio de sesión; no se realizó ninguna emisión ni integración externa.

## Entregas programadas pendientes para probar el recorrido

Se incluyen ocho entregas adicionales sin transportista, camión, chofer, proveedores, fincas ni fechas de viaje asignados. No tienen carga, rechazo, guía ni despacho registrados.

| Campaña | Cliente / canal | Contrato | Entregas | Kilos por entrega |
|---|---|---|---|---|
| Mango actual, En proceso | SUTRIMEX / Exportación | contract-demo-exportacion-programada.pdf | en-exp-programada-01 y en-exp-programada-02 | 300 |
| Mango actual, En proceso | Batimix / Industria | contract-demo-industria-programada.pdf | en-ind-programada-01 y en-ind-programada-02 | 400 |
| Palta del próximo año, Planificado | SUTRIMEX / Exportación | contract-demo-palta-exportacion.pdf | en-palta-exp-programada-01 y en-palta-exp-programada-02 | 500 |
| Palta del próximo año, Planificado | FIXGROM / Industria | contract-demo-palta-industria.pdf | en-palta-ind-programada-01 y en-palta-ind-programada-02 | 900 |

Para un recorrido inmediato, entra a Mango → En proceso → Entregas → Completar datos de entrega. Selecciona uno de los contratos demo programados. Puedes usar SUTRIMEX como transportista vinculado, camión v2, chofer ch1, y los productores Brayan Gay II y Roberto Palacios con sus distintas fincas. Al guardar la coordinación, la entrega aparece en Cosecha y control de calidad, en el canal del cliente. Mango ya dispone de análisis y MTD sintéticos conformes para esos productores/fincas. Registra la carga de Exportación o la carga de Industria con variedad, kilos y bultos por proveedor. Cada entrega desaparece del selector después de registrar su carga.

Para comenzar desde Planificación, abre Palta → Clientes → los tres puntos de SUTRIMEX o FIXGROM → Entregas. Puedes revisar o modificar la programación. Para probar sin esperar la fecha futura, vuelve al listado y edita la fecha de inicio de Palta al día de hoy: pasa automáticamente a En proceso. Vincula un transportista adjuntando su cotización y completa los datos de las entregas desde el nuevo submódulo. En Exportación, los análisis y el MTD de Palta se registran por separado; se puede guardar la carga pendiente hasta completar su revisión.

Las fechas de las nuevas entregas son relativas al día en que se abre el prototipo. Recargar recupera todos los ejemplos iniciales y elimina los cambios de la sesión.

## Listado de guías de remisión

Las vistas de Industria y Exportador identifican cada carga por número, entrega y fecha programada, cliente, placa y peso real. Las guías generadas muestran su número de referencia. El ojo abre el detalle de carga o entrega, sin llenar el listado con información extensa.

En Exportador, los botones llevan al paso pendiente: Completar análisis, Preparar cosecha, Registrar avances o Cerrar cosecha. Solo una carga revisada, organizada y cerrada con sus documentos ofrece Preparar guía. Ese botón abre directamente las guías de la carga. En Industria se ofrecen Preparar guía, Continuar guía o Ver guías según los datos existentes. En el espacio de guías, Completar datos de guía abre el formulario; Generar guías aparece cuando están preparados sus datos. Ver guía permite consultar, descargar e imprimir un documento generado.

## Programa semanal de entregas

Disponible en Gestión de campaña → Planificado → tres puntos de la campaña → Programa semanal de entregas. También se consulta en En proceso, al mismo nivel que Transportistas y Entregas. Las filas reúnen cliente, contrato, placa y variedad; las columnas de lunes a domingo muestran los kilos de las entregas para su fecha programada. Hay totales por fila, por día y por semana, filtros de semana/variedad y navegación a semanas adyacentes. Seleccionar una cantidad abre el detalle de las entregas incluidas.

El cuadro usa los contratos y entregas existentes; no crea registros adicionales. La placa muestra Por asignar hasta completar el camión en En proceso → Entregas. Las entregas multivariedad usan Kilos por variedad del formulario de programación. La suma debe coincidir con los kilos de la entrega. Si aún no hay distribución, el saldo aparece como Por distribuir y se contabiliza una sola vez. Las entregas de una única variedad se clasifican automáticamente en ella.

Los ejemplos incluyen cantidades por variedad en Mango y Palta. Para revisar Planificación, abre Palta y selecciona las semanas con entregas; para consultar camiones ya vinculados, abre Mango en En proceso. El programa usa la fecha prevista de la entrega y los kilos programados; conserva esa referencia aunque el viaje o la carga real tengan otras fechas y pesos.

En Exportación, los tres puntos de cada carga ofrecen solamente Preparar cosecha, Registrar avances y Cerrar cosecha. Su navegación tiene tres pasos. Análisis se mantiene a nivel de campaña, y Guías de remisión tiene su propio submódulo. La calidad se deriva de los análisis y MTD de las fincas; no requiere evaluación manual ni selección de aprobación al registrar la carga. Los rechazos históricos permanecen para consulta.

## Registro de carga compartido entre Industria y Exportación

Ambos canales utilizan el mismo modal: entrega de campaña, fecha y responsable, variedad y kilos de cada proveedor, jabas/bines/mallas con conteo de cargados y vacíos, gastos de cuadrilla y anotadores, viáticos de movilidad e insumos, y observaciones. El camión, chofer, proveedores y fincas se toman de la entrega. El total y la inversión se calculan automáticamente. Industria conserva Sí cumple / No cumple. Exportación toma su revisión de los análisis y el MTD, sin repetir una evaluación manual.

En Exportación se conservan Preparar cosecha, Registrar avances y Cerrar cosecha. El lápiz permite actualizar los datos de carga mientras no existan guías generadas. Los kilos por proveedor no pueden reducirse por debajo de sus avances. Antes de cerrar, los kilos registrados deben coincidir con los avances de cada proveedor; si la cantidad real cambió, actualiza la carga desde el lápiz. La guía recupera esos kilos, bultos y proveedores después del cierre. Las guías generadas conservan sus datos.

En Registrar avance de cosecha, el selector Productor de esta carga muestra cada productor una sola vez y solo si está vinculado a esa carga. Después se elige una de sus fincas incluidas en la entrega; si solo tiene una, se asigna automáticamente. Cambiar de productor reinicia la selección de finca. El avance guarda ambos identificadores para conservar la trazabilidad.
