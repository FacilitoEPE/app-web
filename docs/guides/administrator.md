# Guía de usuario V1 — Administrador

**Actualizado:** 2026-10-30  
**Formato:** se indican rutas y opciones de pantalla; esta guía no usa capturas.

## 1. Acceso

1. Abra `/login`.
2. En **Perfil de acceso**, escoja **Administrador**.
3. Complete **Usuario** y **Contraseña** y elija **Ingresar**.
4. En el selector de módulos, abra el módulo que necesita.

La sesión V1 utiliza el mecanismo de acceso disponible en este despliegue. No asuma permisos productivos hasta que autenticación y autorización estén habilitadas para el entorno.

## 2. Preparar los datos de operación

Antes de crear una campaña, registre o verifique estos datos:

- **Gestión de Proveedores** (`/proveedores`): **Nuevo Proveedor**. Complete identidad, documento, contacto y zona. En el detalle asigne fruta y variedad; en **Fincas**, registre ubicación, hectáreas, cultivo y variedad.
- **Gestión Comercial** (`/planificacion-comercial`): **Nuevo Cliente**. Complete empresa, RUC, tipo de cliente, contacto y ubicación.
- **Gestión de Transporte** (`/transportistas`): **Registrar transportista**. En el detalle agregue sus vehículos y choferes; revise placa, capacidad, documento y licencia.

Frutas, variedades, normas, roles y parámetros UIT son catálogos de referencia; se seleccionan, no se crean desde estos formularios. Use datos reales y verificados en operaciones productivas.

**Dirección:** `Módulos > Gestión de Proveedores / Gestión Comercial / Gestión de Transporte`.  
**Opción:** escoja la fruta y variedad que correspondan al proveedor; registre el vehículo y el chofer bajo el transportista correcto.

## 3. Crear una campaña y vincular proveedores

1. Abra **Gestión de Campaña** (`/campaigns`) y elija **Nueva Campaña**.

En **Lineamientos**, elegir un archivo solo lo deja pendiente; se envía al crear/guardar la campaña. Al consultar un adjunto guardado, verde indica documento verificado, rojo indica que falta o no coincide con sus metadatos: quítelo y vuelva a adjuntarlo. Si aparece «No se pudo verificar», revise la conexión o solicite revisar los permisos del almacenamiento y pulse **Volver a verificar**. La vista previa se deshabilita para documentos confirmados como faltantes o inconsistentes.

2. Ingrese nombre, fruta, meta en kilogramos y fechas; elija **Crear Campaña**. Verifique que figure como **Planificado**.
3. Abra el detalle de campaña, sección **Proveedores**, y elija **Vincular proveedor**.
4. Seleccione al proveedor, indique si participa como **Productor** o **Acopiador**, ingrese kilos estimados y guarde.
5. Para un productor, abra **Ver detalles > Entrevistas > Vincular finca**. Seleccione la finca y complete los datos agronómicos de esta campaña.

**Dirección:** `/campaigns > Nueva Campaña`; luego `/campaigns/:id/providers`.  
**Opción:** **Productor** cuando el abastecimiento proviene de fincas; **Acopiador** para una relación de acopio. Vincule una finca de la fruta de la campaña.

## 4. Vincular el cliente y su entrega

1. En el detalle de campaña, abra **Clientes** y elija **Vincular cliente**.
2. Seleccione el cliente y complete kilos, variedades solicitadas, destino y fechas de entrega.
3. Abra **Ver detalles** para revisar cantidades, precios, moneda y entregas programadas.

**Dirección:** `/campaigns/:id/clients > Vincular cliente`.  
**Opción:** indique la moneda, precio, variedad y destino que figuran en el acuerdo comercial confirmado.

En **Contratos > Registrar/Editar contrato** y **Entregas > Registrar/Editar entrega**, la fruta se muestra desde la campaña. Seleccione una variedad, ingrese sus kilos y use **Agregar variedad** para añadir otra; no puede repetir una variedad. La cantidad se habilita al elegirla. Quite una fila con **×** y revise **Total acordado** o **Total de la entrega**. Los demás campos conservan su uso habitual.

Complete y guarde las variedades y kilos en **Editar contrato** antes de programar entregas. El servidor guarda el desglose y calcula el total; al recargar o volver a entrar se recuperan las filas. Un contrato no admite reducir ni quitar variedades con kilos ya programados.

En cada variedad de la entrega verá **Disponible de la variedad**, **En esta entrega** y **Quedaría de la variedad**. Por ejemplo, Hass con 10,000 kg menos 1,000 kg muestra 9,000 kg; Fuerte con 5,000 kg menos 200 kg muestra 4,800 kg. Escribir, cambiar de variedad o quitar una fila actualiza únicamente el contador correspondiente. Una variedad no puede usar el saldo de otra. Al guardar y volver a editar se recuperan las filas sin descontarlas dos veces. Reducir una cantidad, quitar una fila o eliminar una entrega libera ese consumo cuando el flujo permite la operación. Los históricos pendientes se identifican y no afectan los cupos actuales, por decisión del desarrollador; completarlos y guardarlos los incorpora al cálculo. No se les asignan kilos automáticamente.

## 5. Vincular transporte y coordinar la entrega

1. En el detalle de campaña, abra **Transportistas** y vincule al transportista.
2. Registre o confirme el acuerdo de transporte y su importe.
3. Abra **Entregas > Coordinar entrega**. Seleccione la entrega programada, el acuerdo, el proveedor/finca de origen, el vehículo y el chofer compatibles.
4. Complete fechas, horarios y observaciones, y guarde la coordinación.

**Dirección:** `/campaigns/:id/carriers` y `/campaigns/:id/deliveries`.  
**Opción:** use el vehículo y chofer pertenecientes al transportista vinculado y asigne una entrega real de la campaña.

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
4. En **Más opciones > Datos de carga (Anotador)**, cree y guarde la carga real. Registre los kilos por proveedor/finca, cajas y costos operativos.
5. Vuelva a la fila de carga y abra **Más opciones > Preparar guía SUNAT**. Complete fechas, transportista, vehículo, chofer, origen/destino y los códigos reales de establecimiento de cuatro dígitos. Guarde o emita la guía desde el formulario.

**Dirección:** `/calidad > cosecha > cerrar`; luego `Cargas > Más opciones > Datos de carga (Anotador)` y `Preparar guía SUNAT`.  
**Opción:** la carga debe existir y contener sus proveedores antes de preparar la guía. Los dos códigos de establecimiento son obligatorios.

## 8. Recepción en planta y despacho del chofer

1. Abra **Logística y Despacho** (`/logistica-despacho`) y seleccione la carga.
2. Registre recepción de planta: kilos recibidos, aceptación/rechazo, Brix y observaciones.
3. Distribuya los kilos aceptados al proveedor correspondiente.
4. El chofer registra las etapas del viaje, el checklist de llegada y la guía de salida del vehículo desde su sesión. No cierre físicamente el despacho hasta revisar la información del conductor.
5. En logística, confirme **Cierre físico** y guarde el expediente. El chofer vuelve a su sesión y realiza **Cerrar despacho**. Regrese a la sesión de administrador, confirme **Cierre administrativo** y guarde el expediente final.

**Dirección:** `/logistica-despacho > Recepción en planta / Documentos y cierre`.  
**Opción:** cierre físico antes del evento final del chofer; cierre administrativo después de que el chofer complete ese evento.

## 9. Facturación, cobranza y liquidaciones

- **Facturación y Cobros** (`/facturacion-cobros`): prepare la facturación de la campaña, revise cliente, kilos, precio y moneda, emita el registro de factura y registre la cobranza con referencia, fecha e importe.
- **Liquidación de Compra** (`/liquidacion-compra`): liquide al proveedor según kilos aceptados y precio pactado; revise retenciones/alertas del límite UIT y registre el pago con referencia bancaria.
- **Liquidaciones de Transporte** (desde la sección operativa correspondiente): revise flete y costos de ruta y registre el pago con referencia.

**Dirección:** `Módulos > Facturación y Cobros / Liquidación de Compra / Logística`.  
**Opción:** verifique que saldo, importes y estados coincidan con los documentos y pagos reales.

## 10. Seguimiento de campaña

En **Gestión de Campaña**, abra la campaña para consultar su avance integral, programa semanal de entregas y estado operativo. La edición de datos está habilitada exclusivamente mientras la campaña permanece en estado **Planificado**.

## 11. Límites conocidos de la V1

- La guía y la factura que aparecen como emitidas son registros del flujo de la aplicación; esta prueba no verificó conexión con SUNAT ni con bancos.
- Algunos flujos de Facturación y Logística ofrecen adjuntar archivos; su prueba disponible usa el servidor ficticio de desarrollo. Verifique que el archivo quede asociado al registro antes de tratarlo como persistido. No hay emisión directa a SUNAT ni conexión bancaria documentada.
- Los catálogos de referencia se mantienen por migración/semilla; revise [semillas](../../../epe-backend/docs/seed-data.md) antes de preparar una base nueva.
- Si una operación no se conserva al volver a abrir la pantalla, reporte módulo, ruta, identificador y acción. No incluya contraseñas ni datos personales innecesarios.
