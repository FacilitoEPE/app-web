# Guía de usuario V1 — Administrador

**Actualizado:** 2026-11-11

**Formato:** se indican rutas y opciones de pantalla; esta guía no usa capturas.

## 1. Acceso

1. Abra `/login`.
2. En **Perfil de acceso**, escoja **Administrador**.
3. Complete **Usuario** y **Contraseña** y elija **Ingresar**.
4. En el selector de módulos, abra el módulo que necesita.

Use el selector de módulos de la cabecera para cambiar de módulo. Mantenga a mano la campaña y el código de la carga para encontrar el mismo registro en Calidad, Logística y Facturación. Para operar el despacho como Chofer, cierre la sesión y elija ese perfil en `/login` con una cuenta habilitada. [Manual del chofer](driver.md) · [Flujo de navegación en Archify](../../../docs/business/flows/operacion-agro.html)

## 2. Preparar los datos de operación

Antes de crear una campaña, registre o verifique estos datos:

- **Gestión de Proveedores** (`/proveedores`): **Nuevo Proveedor**. Complete identidad, documento, contacto y zona. En el detalle asigne fruta y variedad. En **Fincas**, seleccione departamento, provincia y distrito en ese orden, y registre coordenadas, hectáreas, cultivo y variedad.
- **Gestión Comercial** (`/planificacion-comercial`): **Nuevo Cliente**. Complete empresa, RUC, tipo de cliente, contacto y ubicación.
- **Gestión de Transporte** (`/transportistas`): **Registrar transportista**. Seleccione departamento, provincia y ciudad en el catálogo de ubigeo. En el detalle agregue sus vehículos y choferes y revise placa, capacidad, documento y licencia.

En **Empresas**, el selector **Tipo de transporte** permite filtrar por **Todos**, **Público** o **Privado**. En **Solicitudes y cotizaciones**, cada solicitud de flete aparece en una sola fila, con el total de transportistas invitados y respuestas recibidas. Abra **Ver detalle** para consultar los destinatarios y registrar o editar la cotización de cada uno.

Frutas, variedades, normas, roles y parámetros UIT son catálogos de referencia; se seleccionan, no se crean desde estos formularios. Use datos reales y verificados en operaciones productivas.

**Dirección:** `Módulos > Gestión de Proveedores / Gestión Comercial / Gestión de Transporte`.  
**Opción:** escoja la fruta y variedad que correspondan al proveedor; registre el vehículo y el chofer bajo el transportista correcto.

## 3. Crear una campaña y vincular proveedores

1. Abra **Gestión de Campaña** (`/campaigns`) y elija **Nueva Campaña**.

En **Lineamientos**, elegir un archivo solo lo deja pendiente; se envía al crear/guardar la campaña. Al consultar un adjunto guardado, verde indica documento verificado, rojo indica que falta o no coincide con sus metadatos: quítelo y vuelva a adjuntarlo. Si aparece «No se pudo verificar», revise la conexión o solicite revisar los permisos del almacenamiento y pulse **Volver a verificar**. La vista previa se deshabilita para documentos confirmados como faltantes o inconsistentes.

2. Ingrese nombre, fruta, meta en kilogramos y fechas. Si lo desea, escriba un **Responsable**. Elija **Crear Campaña** y revise su estado. Con fecha de inicio futura queda en planificación. Pasa automáticamente a ejecución desde el día de inicio y a terminado cuando pasa la fecha de fin, según la fecha de Lima. Planifique los vínculos de productores antes del inicio.
3. Abra el detalle de campaña, sección **Proveedores**. En planificación elija **Vincular proveedor**. En ejecución elija **Vincular acopiador**.
4. Seleccione al proveedor, ingrese kilos estimados y guarde. En planificación elija el rol **Productor** o **Acopiador**. En ejecución, la ficha de un productor ya vinculado sigue disponible en su pestaña.
5. Después de guardar la participación de un productor, abra **Ver detalles > Entrevistas > Vincular finca**. Seleccione una finca existente o registre una nueva eligiendo su departamento, provincia y distrito. Complete los datos agronómicos de esta campaña y guarde la entrevista.

En el registro de finca, **Ver ubicación en el mapa** muestra un marcador con la latitud y longitud ingresadas.

**Dirección:** `/campaigns > Nueva Campaña`; luego `/campaigns/:id/providers`.  
**Opción:** **Productor** cuando el abastecimiento proviene de fincas; **Acopiador** para una relación de acopio. Vincule una finca de la fruta de la campaña.

## 4. Vincular el cliente y su entrega

1. En el detalle de campaña, abra **Clientes** y elija **Vincular cliente**.
   El selector muestra los clientes disponibles. Si ya existe un vínculo, abra sus detalles para gestionar los contratos.
2. Seleccione el cliente y guarde su requerimiento con las variedades y cantidades solicitadas.
3. Abra **Ver detalles > Contratos**. Registre las variedades, los kilos, el precio y la moneda del acuerdo. Desde el contrato, abra **Entregas** y programe las variedades, los kilos, el destino y la fecha.

**Dirección:** `/campaigns/:id/clients > Vincular cliente`.  
**Opción:** indique la moneda, precio, variedad y destino que figuran en el acuerdo comercial confirmado.

En **Contratos > Registrar/Editar contrato** y **Entregas > Registrar/Editar entrega**, la fruta se muestra desde la campaña. Seleccione una variedad, ingrese sus kilos y use **Agregar variedad** para añadir otra; no puede repetir una variedad. La cantidad se habilita al elegirla. Quite una fila con **×** y revise **Total acordado** o **Total de la entrega**. Los demás campos conservan su uso habitual.

Complete y guarde las variedades y kilos en **Editar contrato** antes de programar entregas. El servidor guarda el desglose y calcula el total; al recargar o volver a entrar se recuperan las filas. Un contrato no admite reducir ni quitar variedades con kilos ya programados.

En **Ver detalles** de un contrato o entrega, consulte los kilos de cada variedad. Si el registro histórico tiene el desglose pendiente, la ficha lo indica. En el listado de entregas del contrato también puede abrir la ficha sin editar.

En cada variedad de la entrega verá **Disponible de la variedad**, **En esta entrega** y **Quedaría de la variedad**. Por ejemplo, Hass con 10,000 kg menos 1,000 kg muestra 9,000 kg; Fuerte con 5,000 kg menos 200 kg muestra 4,800 kg. Escribir, cambiar de variedad o quitar una fila actualiza únicamente el contador correspondiente. Una variedad no puede usar el saldo de otra. Al guardar y volver a editar se recuperan las filas sin descontarlas dos veces. Reducir una cantidad, quitar una fila o eliminar una entrega libera ese consumo cuando el flujo permite la operación. Los históricos pendientes se identifican y no afectan los cupos actuales, por decisión del desarrollador; completarlos y guardarlos los incorpora al cálculo. No se les asignan kilos automáticamente.

## 5. Vincular transporte y coordinar la entrega

1. En el detalle de campaña, abra **Transportistas** y vincule al transportista.
2. Registre o confirme el acuerdo de transporte y su importe. Si el acuerdo es **Con adelanto** en soles, abra **Ver acuerdo de pago → Registrar desembolso del adelanto** después de entregar el dinero. Ingrese fecha, importe y referencia. Puede registrar varios desembolsos hasta completar el monto acordado.
3. Abra **Entregas > Coordinar entrega**. Seleccione la entrega programada, el acuerdo, el proveedor/finca de origen, el vehículo y el chofer compatibles.
4. Complete fechas, horarios y observaciones, y guarde la coordinación.

En **Programa semanal de entregas**, consulte los kilos programados por cliente y filtre por fecha, variedad o placa. Al abrir una celda verá el desglose y la unidad asignada.

Use **Ver detalles** en el transportista vinculado para abrir la cotización adjunta. En **Certificaciones**, abra **Ver detalles** y busque la evidencia en el historial del pago correspondiente.

**Dirección:** `/campaigns/:id/carriers` y `/campaigns/:id/deliveries`.  
**Opción:** use el vehículo y chofer pertenecientes al transportista vinculado y asigne una entrega real de la campaña.

En el listado de **Choferes** de una empresa transportista, abra **Ver detalles** para consultar el documento y la licencia registrados.

## 6. Calidad y autorización de cosecha

1. Abra **Cosecha y Control de Calidad** (`/calidad`).
2. Incorpore la campaña a **Cosecha y calidad** y escoja el alcance comercial que corresponda (**Exportación** o **Industria**).
3. Por cada proveedor y finca, registre **Moscas capturadas**, **Trampas evaluadas** y **Días de exposición**. El sistema calcula `MTD = capturas ÷ (trampas × días)`; compare el valor calculado con el límite aplicado.
4. Registre dos análisis de tipos distintos, incluyendo **Maduración** o **Materia seca**. Todos los análisis deben quedar **Apto**.
5. Revise los resultados y escoja **Aprobar para cosecha** cuando se cumplan todas las condiciones. La pantalla y el backend bloquean el avance si falta un conteo, un análisis requerido o existe un valor fuera del límite.

**Dirección:** `/calidad > Campañas > incorporar campaña > MTD / Análisis / Autorizar cosecha`.  
**Opción:** apruebe solo con conteos y resultados de laboratorio reales, completos y dentro de sus límites.

## 7. Registrar y cerrar la cosecha

1. Abra el asistente de cosecha de la campaña autorizada y confirme la organización.
2. Registre la cuadrilla, la fecha, las herramientas, los envases y los materiales utilizados.
3. Ingrese los kilos cosechados y los bultos verificados; revise el resumen y elija **Cerrar cosecha**.

### Registrar la carga de una entrega coordinada

1. En **Cosecha y Control de Calidad → Carga**, elija **Registrar carga** y seleccione una entrega coordinada de la campaña y del canal que está viendo. Registre la fecha, el responsable, los kilos y envases por proveedor, y los gastos. Si el chofer ya registró la carga, búsquela en **Cargas registradas**. En Industria, si la fruta no cumple los requisitos, guarde el motivo del rechazo.
2. En **Guías de remisión**, ubique la carga y elija **Agregar guía**. Seleccione los proveedores. El formulario propone el peso con los kilos disponibles de la carga real y suma los bultos cargados y vacíos si incluye todos los kilos de los proveedores seleccionados. Si reparte los kilos de un proveedor entre guías, ingrese los bultos de cada guía. Complete los datos de traslado, guarde y use **Emitir** para habilitar la salida del chofer. Revise número, fechas, origen, destino, unidad y conductor antes de emitir. Una vez emitida, la guía queda en consulta.

**Dirección:** `/calidad > campaña y canal > Carga > Registrar carga`.

**Opción:** la carga debe existir y contener sus proveedores antes de preparar la guía. Los códigos de establecimiento de partida y llegada requieren cuatro dígitos.

Si un registro anterior quedó sin kilos, vuelva a **Registrar carga** y seleccione la entrega marcada **Completar registro**.

## 8. Recepción en planta y despacho del chofer

1. Desde el selector de módulos, abra **Logística y Despacho**, seleccione la campaña y abra el **Detalle de carga**.
2. En **Recepción y calidad**, use **Registrar llegada** para guardar la hora real y la ventana de atención. Use **Registrar descarga** para guardar inicio, término y responsable. Guarde la evaluación con el peso recibido, el resultado y, cuando corresponda, los datos de descarte y su evidencia.
3. Revise la distribución de kilos reconocidos y los soportes en **Compras**. Use **Jabas** para conciliar los envases de la carga y registrar el retorno.
4. Abra **Documentos y cierre**. Adjunte el PDF de la guía de remisión de la fruta y el informe de recepción si aún falta. Adjunte también la **Guía de salida firmada del vehículo** para el cierre administrativo. El documento que guarda el chofer en su portal se consulta en el detalle, mientras que el expediente administrativo tiene su propio campo de guía de salida firmada.
5. Pulse **Guardar documentos** y espere a que termine. Si la tarjeta sigue mostrando **Pendiente de guardar**, vuelva a abrir la vista y compruebe **Documento verificado** antes de confirmar. El cierre físico exige horarios de descarga válidos, peso y resultado de recepción, informe de recepción, guía de fruta emitida y su PDF adjunto.
6. Elija **Registrar cierre físico** y mantenga presionado el botón de confirmación. El chofer registra **Cerrar despacho** desde su cuenta después de guardar su checklist de llegada y contar con la guía firmada. Regrese a **Documentos y cierre** como Administrador, revise el expediente y confirme **Registrar cierre administrativo** cuando esté habilitado.

**Dirección:** `/logistica-despacho > campaña > carga > Recepción y calidad / Documentos y cierre`.

**Opción:** cierre físico antes del evento final del chofer; cierre administrativo después de que el chofer complete ese evento.

El **Detalle de carga** muestra el responsable, las observaciones y la evidencia de descarga. Los motivos de descarte de recepción y del chofer aparecen en sus respectivas secciones.

## 9. Facturación, cobranza y liquidaciones

### Facturación y Cobros

1. Abra **Facturación y Cobros > Ver clientes > Facturar**. Ubique la carga por su código. Para **Preparar factura** se necesita una carga con kilos registrados y una recepción con peso, resultado e informe. Este paso puede avanzar con el cierre administrativo pendiente.
2. Seleccione **Preparar factura**. Revise los kilos disponibles, el precio por kilo y la moneda del contrato. Puede repartir los kilos disponibles en varias preparaciones. Complete los ajustes, sustento u observaciones que correspondan y elija **Guardar preparación**. La preparación reserva los kilos y recibe una referencia.
3. Para un comprobante ya emitido externamente, elija **Registrar factura emitida**. Ingrese número, fecha de emisión y vencimiento, adjunte el PDF y confirme que corresponde al comprobante emitido. Pulse **Guardar factura emitida**. La pantalla registra los datos en el sistema. La emisión y validación ante SUNAT se hacen fuera de este módulo.
4. Elija **Registrar cobro** y complete la fecha, el importe, el medio y la referencia del movimiento. Adjunte el **Voucher o evidencia del movimiento** en su propio campo. El importe debe ser mayor que cero y hasta el saldo pendiente. Guarde y abra **Historial de cobros** para comprobar el movimiento, el adjunto y el saldo. Un cobro completo muestra **Cobrado** y saldo cero.

### Liquidaciones

- **Liquidación de Compra** (`/liquidacion-compra`): liquide al proveedor según kilos aceptados y precio pactado; revise retenciones/alertas del límite UIT y registre el pago con referencia bancaria.
- **Liquidaciones de Transporte**: revise flete y costos de ruta. En **Registrar pago / Aplicar adelanto**, seleccione un desembolso disponible del mismo acuerdo para descontarlo del saldo. Registre cualquier pago en caja por separado.

En el historial de cobros puede buscar por la fecha visible y abrir un voucher desde escritorio o celular. El historial del detalle de liquidación también permite abrir el comprobante de cada pago cuando está registrado.

**Dirección:** `Módulos > Facturación y Cobros / Liquidación de Compra / Logística`.  
**Opción:** verifique que saldo, importes y estados coincidan con los documentos y pagos reales.

## 10. Seguimiento de campaña

En **Gestión de Campaña**, abra la campaña para consultar su avance integral, programa semanal de entregas y estado operativo. La edición de datos está habilitada exclusivamente mientras la campaña permanece en estado **Planificado**.

## 11. Límites conocidos de la V1

- Seleccionar un PDF lo deja pendiente hasta guardar el formulario. En Logística y en el detalle de factura, use **Documento verificado** para confirmar la disponibilidad del adjunto. En **Historial de cobros**, consulte el voucher desde la fila del movimiento.
- En el detalle de una factura cobrada, la tarjeta **Saldo** puede conservar el texto **Pendiente de cobro** aunque indique cero. Confirme el estado y los movimientos en el historial. [Evidencia del QA](../evidence/qa-2026-11-10.md)
- Los catálogos de referencia se mantienen por migración/semilla; revise [semillas](../../../epe-backend/docs/seed-data.md) antes de preparar una base nueva.
- Si una operación no se conserva al volver a abrir la pantalla, reporte módulo, ruta, identificador y acción. No incluya contraseñas ni datos personales innecesarios.
