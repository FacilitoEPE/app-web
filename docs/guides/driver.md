# Guía de usuario V1 — Chofer

**Actualizado:** 2026-10-30  
**Formato:** se indican rutas y opciones de pantalla; esta guía no usa capturas.

## 1. Ingresar al portal

1. Abra `/login`.
2. En **Perfil de acceso**, escoja **Chofer**.
3. Ingrese su **Usuario** y **Contraseña** asignados.
4. Elija **Ingresar al Portal del Chofer**.

Si no puede ingresar o no aparecen sus viajes asignados, comuníquese con el Administrador para revisar su cuenta y asignación.

**Dirección:** `/login > Perfil de acceso: Chofer`.  
**Opción:** use las credenciales de su cuenta de chofer y revise la placa al consultar el viaje.

## 2. Revisar el viaje

Las entregas coordinadas que aún no tienen carga aparecen como **Por completar**. Abra **Registrar carga**, compruebe los proveedores y fincas asignados, seleccione la variedad, ingrese los kilos y marque cada tipo de bulto utilizado para completar cargados y vacíos. Registre fecha, responsable, viáticos, gastos y observaciones; guarde antes de abrir el despacho. El registro usa la misma carga que consulta Cosecha y Control de Calidad.

El chofer no puede cambiar de conductor desde el portal. La edición de datos de carga se habilita durante **En carga**, en una campaña en ejecución y antes de emitir una guía. La creación en producción requiere que el backend autorice este flujo al chofer sobre sus propias entregas; la validación realizada hasta ahora corresponde al entorno de desarrollo.

En Industria, elija primero **Sí cumple** o **No cumple**. La segunda opción guarda el rechazo de la entrega sin exigir kilos ni crear una carga; el registro queda disponible para consulta y no habilita el despacho.

1. En **Mis campañas**, abra la campaña que corresponde a su viaje.
2. En **Mis cargas**, elija la carga asignada.
3. Revise código, cliente/destino, fecha, placa, kilos y bultos.
4. Use **Ubicación y ruta** para elegir la finca. Pulse **Usar mi ubicación** o **Marcar salida en el mapa**, luego **Ver ruta**. Revise **Datos de carga** antes de iniciar.

El mapa puede dibujar el recorrido y estimar tiempo y distancia cuando la instalación configura un servicio OSRM. **Abrir ruta de recojo en Google Maps** permite consultar el mismo tramo desde el punto de salida elegido.

**Dirección:** `/chofer > Mis campañas / Mis cargas > seleccionar carga`.  
**Opción:** continúe solo con la carga, placa, origen y destino que le asignaron.

## 3. Registrar las etapas de transporte

En **Mi despacho**, seleccione la carga y registre cada evento cuando suceda:

1. **En carga:** confirme que la carga se está preparando.
2. **Salida de finca:** registre la salida real del origen.
3. **En camino:** registre el inicio del trayecto.
4. **Llegada a planta:** registre la llegada real al destino.

En cada etapa, elija la acción que aparece como siguiente estado y añada una observación concreta si hace falta. La aplicación exige el orden indicado.

**Dirección:** `/chofer > Mi despacho > seleccionar carga > siguiente etapa`.  
**Opción:** avance un estado por vez; no registre eventos antes de que ocurran.

## 4. Guardar el checklist de llegada

1. En **Checklist de llegada a planta**, ingrese los kilos leídos en la balanza.
2. Marque **¿Hubo fruta de descarte?** solo si corresponde. Si la marca, ingrese cantidad y motivo.
3. Añada observaciones de recepción y elija **Guardar checklist de llegada**.
4. Confirme el aviso y vuelva a abrir el despacho para revisar los datos guardados.

**Dirección:** `/chofer > Mi despacho > Checklist de llegada a planta`.  
**Opción:** registre el peso verificado en planta; no estime kilos ni los reparta por proveedor.

## 5. Guardar la guía de salida del vehículo

1. Después de confirmar la llegada, abra **Guía de salida del vehículo**.
2. Adjunte la guía de salida firmada; puede reemplazar un documento anterior.
3. Añada observaciones si corresponde y elija **Guardar guía de salida**.
4. Vuelva a abrir el panel para comprobar que los datos quedaron guardados.

**Dirección:** `/chofer > Mi despacho > Guía de salida del vehículo`.  
**Opción:** compruebe el documento adjunto y su vínculo con la entrega.

## 6. Coordinar el cierre del despacho

Cuando haya llegado a planta, complete primero todas las etapas hasta **Llegada a planta**, el checklist y la guía de salida. El Administrador revisa esos datos y confirma el **Cierre físico**. Después de esa confirmación, vuelva a **Mi despacho** y elija **Cerrar despacho** para registrar el último evento del viaje.

**Dirección:** `/chofer > Mi despacho > carga > Cerrar despacho`.  
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
