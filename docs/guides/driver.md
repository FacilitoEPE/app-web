# Guía de usuario V1 — Chofer

**Actualizado:** 2026-11-09
**Formato:** se indican rutas y opciones de pantalla; esta guía no usa capturas.

## 1. Ingresar al portal

1. Abra `/login`.
2. En **Perfil de acceso**, escoja **Chofer**.
3. Ingrese su **Usuario** y **Contraseña** asignados.
4. Elija **Ingresar al Portal del Chofer**.

El portal muestra todas las entregas coordinadas. La cuenta puede consultarlas y operar el despacho aunque no esté vinculada a un conductor. Cada carga muestra el chofer y la placa de su coordinación.

**Dirección:** `/login > Perfil de acceso: Chofer`.
**Opción:** use las credenciales de su cuenta de chofer y revise la placa al consultar el viaje.

## 2. Revisar el viaje

Las entregas coordinadas que aún no tienen carga aparecen como **Por completar**. Abra **Registrar carga**, compruebe los proveedores y fincas asignados y elija una variedad de esas fincas para cada proveedor. Ingrese los kilos y marque cada tipo de bulto utilizado para completar cargados y vacíos. Registre fecha, responsable, viáticos, gastos y observaciones; guarde antes de abrir el despacho. El registro usa la misma carga que consulta Cosecha y Control de Calidad. Si ve **Pendiente en Calidad**, el administrador debe completar ese registro antes de habilitar el despacho.

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

**Dirección:** `/chofer > Despacho > seleccionar carga > siguiente etapa`.
**Opción:** avance un estado por vez; no registre eventos antes de que ocurran.

## 4. Guardar el checklist de llegada

1. En **Checklist de llegada a planta**, ingrese los kilos leídos en la balanza.
2. Marque **¿Hubo fruta de descarte?** solo si corresponde. Si la marca, ingrese cantidad y motivo.
3. Añada observaciones de recepción y elija **Guardar checklist de llegada**.
4. Confirme el aviso y vuelva a abrir el despacho para revisar los datos guardados.

**Dirección:** `/chofer > Despacho > Checklist de llegada a planta`.
**Opción:** registre el peso verificado en planta; no estime kilos ni los reparta por proveedor.

## 5. Guardar la guía de salida del vehículo

1. Después de confirmar la llegada, abra **Guía de salida del vehículo**.
2. Adjunte la guía de salida firmada; puede reemplazar un documento anterior.
3. Añada observaciones si corresponde y elija **Guardar guía de salida**.
4. Vuelva a abrir el panel para comprobar que los datos quedaron guardados.

**Dirección:** `/chofer > Despacho > Guía de salida del vehículo`.
**Opción:** compruebe el documento adjunto y su vínculo con la entrega.

## 6. Coordinar el cierre del despacho

Cuando haya llegado a planta, complete primero todas las etapas hasta **Llegada a planta**, el checklist y la guía de salida. El Administrador revisa esos datos y confirma el **Cierre físico**. Después de esa confirmación, vuelva a **Despacho** y elija **Cerrar despacho** para registrar el último evento del viaje.

**Dirección:** `/chofer > Despacho > carga > Cerrar despacho`.
**Opción:** realice este último paso solo cuando el Administrador confirme que el cierre físico está listo.

La aplicación mostrará el despacho como completado. Si la acción todavía no está habilitada, comuníquese con el Administrador; no intente saltar estados.

## 7. Salir y cambiar de perfil

- Elija **Salir** en el portal para cerrar su sesión local.
- Si debe regresar a la vista de administrador, cierre la sesión del chofer y acceda nuevamente por `/login` con el perfil correcto.
- Si un evento, checklist o guía no aparece tras volver a consultar, informe al Administrador el código de carga, la etapa y la hora aproximada.

## 8. Límites conocidos de la V1

- El portal muestra los viajes asociados al perfil seleccionado en este despliegue. El acceso productivo debe estar sujeto a autenticación y permisos habilitados.
- Si **Adjuntar documento** está deshabilitado, el archivo no se ha enviado; reporte el bloqueo al Administrador.
- No registre información falsa ni incluya datos personales innecesarios en observaciones.
