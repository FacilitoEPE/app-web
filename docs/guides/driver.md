# Guía de usuario V1 — Chofer

**Actualizado:** 2026-11-11
**Formato:** se indican rutas y opciones de pantalla; esta guía no usa capturas.

## 1. Ingresar al portal

1. Abra `/login`.
2. En **Perfil de acceso**, escoja **Chofer**.
3. Ingrese su **Usuario** y **Contraseña** asignados.
4. Elija **Ingresar al Portal del Chofer**.

El portal muestra todas las entregas coordinadas. La cuenta puede consultarlas y operar el despacho aunque no esté vinculada a un conductor. Cada carga muestra el chofer y la placa de su coordinación.

Si estaba en los módulos administrativos, cierre esa sesión antes de ingresar con la cuenta habilitada para Chofer. [Manual del administrador](administrator.md) · [Flujo de navegación en Archify](../../../docs/business/flows/operacion-agro.html)

**Dirección:** `/login > Perfil de acceso: Chofer`.
**Opción:** use las credenciales de su cuenta de chofer y revise la placa al consultar el viaje.

## 2. Revisar el viaje

Las entregas coordinadas que aún no tienen carga aparecen como **Por completar**. Abra **Registrar carga**, compruebe los proveedores y fincas asignados y elija una variedad de esas fincas para cada proveedor. Ingrese los kilos y marque cada tipo de bulto utilizado para completar cargados y vacíos. Registre fecha, responsable, viáticos, gastos y observaciones. Guarde y anote el código de carga para compartirlo con el Administrador. El registro usa la misma carga que consulta **Cosecha y Control de Calidad**. Si ve **Pendiente en Calidad**, el Administrador debe completar ese registro antes de habilitar el despacho.

El chofer no puede cambiar de conductor desde el portal. La edición de datos de carga se habilita durante **En carga**, en una campaña en ejecución y antes de emitir una guía.

En Industria, elija primero **Sí cumple** o **No cumple**. La segunda opción guarda el rechazo de la entrega sin exigir kilos ni crear una carga; el registro queda disponible para consulta y no habilita el despacho.

1. En **Campañas**, abra la campaña de la entrega.
2. En **Cargas**, elija la carga que va a operar.
3. Revise código, cliente/destino, fecha, placa, kilos y bultos.
4. Use **Ubicación y ruta** para elegir la finca. Pulse **Usar mi ubicación** o **Marcar salida en el mapa**, luego **Ver ruta**. Revise **Datos de carga** antes de iniciar.

**Usar mi ubicación** requiere conceder acceso a la ubicación en el navegador y abrir el portal por HTTPS o desde `localhost` durante el desarrollo. En pruebas desde otro equipo o un celular, una dirección HTTP de la red local impide usar el GPS. En ese caso, elige **Marcar salida en el mapa**.

**Ver ruta** dibuja el recorrido y estima tiempo y distancia cuando la instalación tiene un servicio OSRM operativo. Si el servicio no está configurado o falla, muestra una línea recta de referencia. **Abrir ruta de recojo en Google Maps** permite consultar el trayecto por carretera desde el punto de salida elegido.

Si el mapa base no carga, el visor muestra un aviso. Usa **Abrir ruta de recojo en Google Maps** para consultar la ubicación de la finca.

**Dirección:** `/chofer > Campañas / Cargas > seleccionar carga`.
**Opción:** verifique la carga, el chofer, la placa, el origen y el destino antes de operar.

## 3. Registrar las etapas de transporte

En **Despacho**, seleccione la carga y registre cada evento cuando suceda:

1. **En carga:** confirme que la carga se está preparando.
2. **Salida de finca:** registre la salida real del origen.
3. **En camino:** registre el inicio del trayecto.
4. **Llegada a planta:** registre la llegada real al destino.

En cada etapa, elija la acción que aparece como siguiente estado y añada una observación concreta si hace falta. La aplicación exige el orden indicado.

Para registrar **Salida de finca**, la carga debe contar con una guía de remisión emitida en **Cosecha y Control de Calidad**. Si falta, pida al Administrador que revise la guía de la carga y vuelva a abrir el despacho.

**Dirección:** `/chofer > Despacho > seleccionar carga > siguiente etapa`.
**Opción:** avance un estado por vez; no registre eventos antes de que ocurran.

## 4. Guardar el checklist de llegada

1. En **Checklist de llegada a planta**, ingrese los kilos leídos en la balanza.
2. Marque **¿Hubo fruta de descarte?** si corresponde. Ingrese cantidad y motivo y adjunte la evidencia. El peso en planta debe ser mayor que cero y hasta los kilos cargados.
3. Añada observaciones de recepción y elija **Guardar checklist de llegada**.
4. Confirme el aviso y vuelva a abrir el despacho para revisar los datos guardados.

**Dirección:** `/chofer > Despacho > Checklist de llegada a planta`.
**Opción:** registre el peso verificado en planta; no estime kilos ni los reparta por proveedor.

## 5. Guardar la guía de salida del vehículo

1. Después de confirmar la llegada, abra **Guía de salida del vehículo**.
2. Adjunte la guía de salida firmada; puede reemplazar un documento anterior.
3. Añada observaciones si corresponde y elija **Guardar guía de salida**.
4. Vuelva a abrir el panel y compruebe que el archivo figure como **Documento verificado**. Avise a Logística que el checklist y la guía están disponibles. El Administrador tiene un campo separado para la guía de salida firmada del expediente de cierre.

**Dirección:** `/chofer > Despacho > Guía de salida del vehículo`.
**Opción:** compruebe el documento adjunto y su vínculo con la entrega.

## 6. Coordinar el cierre del despacho

Cuando haya llegado a planta, complete el checklist y guarde la guía de salida. El Administrador registra recepción y descarga, guarda el expediente y confirma el **Cierre físico** en Logística. Después de esa confirmación, vuelva a **Despacho**, seleccione la misma carga y elija **Cerrar despacho** para registrar el último evento del viaje.

**Dirección:** `/chofer > Despacho > carga > Cerrar despacho`.
**Opción:** realice este último paso solo cuando el Administrador confirme que el cierre físico está listo.

Confirme que el historial muestre **Cierre** y avise al Administrador para que registre el **Cierre administrativo** en Logística. Si **Cerrar despacho** sigue deshabilitado, revise el checklist y la guía de salida, confirme con Logística el cierre físico y actualice la vista.

## 7. Salir y cambiar de perfil

- Elija **Salir** en el portal para cerrar su sesión local.
- Si debe regresar a la vista de administrador, cierre la sesión del chofer y acceda nuevamente por `/login` con el perfil correcto.
- Si un evento, checklist o guía no aparece tras volver a consultar, informe al Administrador el código de carga, la etapa y la hora aproximada.

## 8. Límites conocidos de la V1

- Si la cuenta no permite ingresar, confirme con el Administrador que está habilitada para el perfil **Chofer**.
- Si un archivo sigue en **Pendiente de guardar**, guarde el formulario antes de salir. Si la verificación falla, use **Volver a verificar** y reporte el problema con el código de carga.
- No registre información falsa ni incluya datos personales innecesarios en observaciones.
