# Agent Browser Cookbook — QA manual

Guía corta para repetir en el navegador el flujo **De la campaña al cobro**, siguiendo el [Archify](../../../docs/business/flows/operacion-agro.html). El agente recorre las vistas; el usuario ayuda cuando se requieren credenciales, documentos o una confirmación final.

## Cómo iniciar

Basta con pedir **“Realiza un test en QA”** y compartir este cookbook. Si quieres, indica también el PR, módulo, flujo o entorno; puedes elegir el alcance en tus propias palabras. Si falta un dato necesario para empezar, el agente te preguntará antes de avanzar.

## Garantía de datos ficticios y aislamiento

Todo dato, usuario, documento, referencia, pago y comprobante usado por las pruebas automáticas o manuales debe ser ficticio y pertenecer al entorno controlado de QA. Ninguno debe representar información real ni relacionarse de ninguna manera con SUNAT, bancos u otras integraciones externas que puedan causar problemas legales o de seguridad grave. El agente debe detener la etapa si detecta que una acción enviaría datos o ejecutaría operaciones fuera de la aplicación QA. Un estado «emitido» dentro de la app solo acredita el registro interno de prueba; nunca debe describirse como emisión SUNAT.

## Antes de empezar

- Comprueba que frontend y backend son las ramas/PR que se quieren probar y que el frontend apunta al backend local correcto.
- Abre la app en el navegador y confirma el entorno/base QA. Anota ramas, commits, URL y base para el informe.
- Usa una campaña preparada. Si falta una campaña o carga de prueba, pregunta antes de crear registros nuevos.
- Sigue un solo código de carga. PDFs de QA se adjuntan desde la vista; espera a que aparezcan como verificados y guardados.

## Recorrido por vistas

| Paso | Rol y vista / módulo | Qué hace el agente | Qué debe quedar visible |
|---|---|---|---|
| 1. Preparar campaña | Administrador · Proveedores, Comercial, Transporte y Campañas | Comprueba productor/finca, cliente, transportista/vehículo/chofer y campaña en ejecución. Usa los datos existentes de QA. | Recursos vinculados y campaña disponible. |
| 2. Contrato y coordinación | Administrador · Contratos / Entregas de campaña | Crea o abre contrato; registra entrega y coordina productor, finca, transportista, vehículo, chofer, fecha y horario. | Contrato y entrega guardados; asignación visible en detalles. |
| 3. Calidad y cosecha | Administrador · Cosecha y Control de Calidad | Registra MTD y análisis requeridos; aprueba para cosecha; registra/cierra cosecha con kilos y envases. | Calidad aprobada y cosecha asociada a la entrega. |
| 4. Carga y guía | Administrador · Carga / Guías de remisión | Crea carga desde la entrega y emite su guía desde la vista. Anota el código de carga. | Carga y guía emitida para el mismo contrato/entrega. |
| 5. Viaje | Chofer · Mis entregas | Avanza en orden: **En carga → Salida → En camino → Llegada**. Completa checklist y adjunta guía de salida firmada. | Historial, kilos y documento visibles en el mismo código de carga. |
| 6. Recepción y documentos | Administrador · Logística / Documentos y cierre | Registra llegada, descarga, responsable, peso y evaluación. Adjunta guía, informe de recepción y documento firmado; guarda y espera verificación. | Recepción y adjuntos aparecen guardados/verificados tras recargar. |
| 7. Cierres | Administrador → Chofer → Administrador | Registra cierre físico; cambia a Chofer y cierra despacho; vuelve a Administrador y registra cierre administrativo. | Los tres cierres aparecen registrados en ese orden. |
| 8. Liquidación del productor | Administrador · Liquidación de Compra | Abre el productor de la carga, revisa monto, registra liquidación y voucher QA. | Liquidación, pago/historial y saldo visible. |
| 9. Liquidación del transporte | Administrador · Liquidación de Compra / Transportista | Revisa flete asignado y gastos. Registra liquidación; para pagar, presenta importe y referencia al usuario. | Liquidación, movimiento de pago, comprobante y saldo visible. |
| 10. Factura y cobro | Administrador · Facturación y Cobros | Prepara factura con los kilos recibidos, registra la factura QA y abre su detalle para cobrar el saldo. | Factura de la misma carga, cobro/historial y saldo cero. |

## Cuando el agente necesite ayuda

Deja la vista abierta y pregunta solo por la acción necesaria. Si el usuario proporciona credenciales ficticias para QA, úsalas para cambiar al perfil correspondiente; no inventes ni pruebes otras credenciales. Si el acceso falla o no hay credenciales disponibles, pregunta si el usuario ya inició sesión con la autenticación correspondiente y espera su confirmación antes de continuar con ese rol. No guardes contraseñas en esta guía ni en el informe. Usa una pregunta breve con casillas, por ejemplo:

- **Cambio de usuario o perfil:** `No pude entrar al perfil Chofer. ¿Ya iniciaste sesión con la autenticación correspondiente? [ ] Sí, ya ingresé y veo Mis entregas`
- **Documento PDF obligatorio:** pregunta solo cuando la vista exija ese PDF. Usa una pregunta de confirmación sencilla: `Adjunta el PDF QA obligatorio. [ ] Ya lo subí`. Continúa cuando el archivo aparezca en la vista; después verifica el guardado y la persistencia.
- **Vista inaccesible:** `Abre <módulo/vista> en el navegador. [ ] Ya estoy en esa vista`

El usuario autoriza el recorrido QA interno con datos ficticios. Registra los cobros y pagos de prueba directamente en la aplicación si el entorno está aislado y no realiza transferencias bancarias ni llama servicios externos. No pidas confirmación adicional para esos registros internos. Si detectas que una acción alcanza un banco, SUNAT, correo u otro servicio externo, detén ese paso y explica el destino y el motivo. No marques el paso como terminado hasta confirmar el resultado y su persistencia en la aplicación.

Si una vista da error, captura el mensaje y la URL, marca esa etapa **Falla** y las dependientes **Bloqueadas**. Continúa con etapas independientes solo si no requiere inventar datos ni cambiar el escenario. Si falta una campaña/carga elegible, registra el bloqueo y pregunta antes de crear otra.

## Informe que debe entregar por chat

Al completar o detener el recorrido, informa en texto por el chat; no generes otro archivo salvo que el usuario lo solicite. Incluye:

1. **Estado general:** Completo, Incompleto o Bloqueado; PR/ramas probadas y entorno.
2. **Recorrido:** cada uno de los 10 pasos como Pasa, Falla, Bloqueado o No ejecutado, con una frase de evidencia.
3. **Trazabilidad:** campaña y código de carga; guía, liquidaciones, factura y referencias creadas.
4. **Pendientes:** qué no se pudo probar, motivo y acción concreta para continuar.
5. **Ayuda del usuario:** documentos/sesiones/confirmaciones que completó o que aún faltan.
6. **Límites:** aclarar si se verificó solo el registro de la app o también algún servicio externo.

**Pasa** significa que el resultado esperado se ve y, para los cambios guardados, permanece tras recargar. **Falla** significa que la aplicación hizo algo distinto y hay evidencia. **Bloqueado** significa que falta una precondición o acción humana. **No ejecutado** significa que se omitió; nunca equivale a Pasa.

## Referencias

- Pruebas automatizadas del PR web: [e2e/qa.spec.ts](../../e2e/qa.spec.ts).
- Flujo de extremo a extremo con backend: [e2e/full-stack.spec.ts](../../e2e/full-stack.spec.ts).
- Pasos de cada rol: [Administrador](../guides/administrator.md) y [Chofer](../guides/driver.md).
