# Contrato de APIs futuras — Agro Exportaciones F.V.

Versión técnica **1.0.0**, preparada el **2026-10-29** para coordinar la implementación de `epe-backend` y la evolución de `epe-web`.

Este documento diseña las rutas HTTP futuras solicitadas por el usuario. No afirma que estén implementadas en el backend. El mock local y los clientes TypeScript adjuntos sí implementan el intercambio descrito. No modifica el SQL objetivo ni ejecuta migraciones. Las pantallas existentes consumen V1 cuando se activa el modo ficticio o `VITE_API_CONTRACT=v1`. Los adaptadores por dominio conservan sus modelos de presentación y convierten las respuestas HTTP; no importan fixtures en el navegador. La API actual sin versión conserva el modo `legacy`.

## 1. Archivos que debe recibir el agente backend

1. Esta guía: responsabilidades, reglas, migración y límites.
2. [OpenAPI 3.1](future-api.openapi.json): rutas, métodos, filtros, cuerpos de escritura, respuestas, nulabilidad, enums, decimales y errores. Es el contrato HTTP verificable.
3. [Catálogo de endpoints](future-api-endpoints.md): índice por módulo con tabla física y padre de cada ruta.
4. [SQL objetivo](reference/agro-schema/03_schema_total.sql) y sus [datos iniciales](reference/agro-schema/04_datos_iniciales.sql): referencia de persistencia, no instrucciones para reemplazar una base existente.
5. [Fixtures futuras](../json/future/): escenario de negocio ficticio; no deben confundirse con datos iniciales de producción.

Los nombres de las rutas, la versión HTTP, la paginación y la distribución de DTOs son decisiones técnicas de esta propuesta. Las reglas de negocio proceden de las fuentes siguientes. No convertir una propuesta documentada en un backend supuestamente desplegado.

### Precedencia de fuentes

1. Acuerdos vigentes de [app/docs/README](reference/agreements.md) y apartado **Schema actualizado tras la auditoría de cumplimiento** del [reporte específico](reference/agro-schema/01_reporte_especifico.md#schema-actualizado-tras-la-auditoría-de-cumplimiento).
2. SQL objetivo y diccionarios de ese mismo reporte. Para tablas/columnas se usa el SQL real, no los conteos antiguos que permanecen en auditorías históricas.
3. [Flujos y relaciones](reference/agro-schema/02_tablas_y_relaciones.md) y prototipo local `app/docs/prototipo/Campaign Management System/src/`, especialmente `store.tsx`, `campaign-lifecycle.ts`, `remission-model.ts` y flujos financieros.
4. [Arquitectura del frontend](architecture-and-solid.md) y [estado de integración](integration-status.md), que describen el código actual y pueden estar por detrás del objetivo.

OpenAPI incluye `x-source.sha256` del SQL utilizado. `pnpm contract:check` detecta cambios en el SQL o archivos generados que exijan revisar el contrato. Este hash acredita procedencia, no aprobación ni despliegue del SQL.

## 2. Alcance y decisiones que se conservan

| Tema | Contrato objetivo |
|---|---|
| Empresa y perfiles | Una agroexportadora; Administrador y Chofer. Sin multempresa ni nuevos perfiles. |
| Participación del proveedor | `campania_x_proveedores` es la única participación; un registro por campaña/proveedor. `cxpId` es su identidad. No recibe `fincaId`. |
| Finca | Una variedad mediante `frutaDerivadaId`; la fruta se obtiene de esa variedad. No guardar la lista multicultivo del formulario actual como otra relación nueva. |
| Entrevista | Une participación y finca del mismo proveedor; solo para productor. Código servidor `FVV-…`, acorde con el SQL. |
| Análisis | Puede existir sin cosecha; participación y finca son obligatorias. |
| Destinos | Texto en entrega y snapshots en guía. No se crea catálogo/CRUD de destinos. |
| Requerimientos | Varios requerimientos del mismo cliente en una campaña; cada uno puede tener contratos. |
| Viaje | Una entrega → una coordinación → una carga. La coordinación es la fuente del viaje. |
| Reservas | Instantes con zona y rangos `[inicio, fin)`; viajes consecutivos permitidos. |
| Compra | Liquidación sobre kilos reconocidos en planta por proveedor. Sin repartir automáticamente pérdidas ni compensar diferencias. |
| Monedas | Compra y transporte PEN; ventas usan PEN/USD/EUR según contrato. |
| Adelantos | Solo transporte; distinguir acordado, desembolsado, aplicado y disponible. Aplicar no es pagar de nuevo. |
| Facturas | Varias por carga con descuento/cargos; suma de kilos dentro de recepción. Varios cobros no equivalen a varias facturas. |
| Documentos | FC14 diferido. Referencias reservadas opcionales; sin crear `archivo`, sin endpoint general de upload, sin binarios/base64 en JSON. |
| Sesiones | No crear `sesion_usuario`. La estrategia de autenticación debe definirse antes de exponer la API real. |

No hay ampliación a tarifas por calidad, adelantos a proveedores, devolución automática de adelantos, multiviaje por entrega, reaperturas, facturación agrupada ni un sistema tributario nuevo.

### Diferencias que no deben resolverse silenciosamente

- La UI actual permite varios cultivos/variedades por finca; el modelo objetivo admite una variedad. El mapper debe detectar registros múltiples y pedir corrección; nunca elegir el primer valor y perder datos.
- IDs locales como `exam-…`, nombres de finca y claves `campaña:vínculo:contrato` deben reemplazarse por PK reales. No enviar esos textos como FK.
- `FYV` de algunas demos no reemplaza el patrón `FVV` del SQL.
- `fruta_derivada` representa variedades en el objetivo. Las fixtures antiguas con «pulpa» o «aceite» no deben reutilizarse para V1.
- La UI de certificaciones limita a una por campaña; el SQL objetivo no tiene esa unicidad. La API devuelve colección y no introduce una restricción de base que no existe. La interfaz conserva su límite visual de una certificación; el backend debe admitir la colección definida.
- Los campos de trámite de certificación de la UI (`estadoTramite`) no tienen una columna equivalente inequívoca en el SQL. No confundir trámite con vigencia ni inventar su persistencia; el control de edición se oculta en V1 y la etiqueta se deriva de las fechas existentes. No se persiste un estado de trámite.
- La UI puede exigir archivos donde el objetivo los difiere. Mantener identificada la diferencia; no crear IDs ficticios ni simular una subida exitosa.
- Coordenadas de finca son obligatorias en el SQL; algunas demos/formularios permiten vacío. El adaptador debe informar el faltante, sin convertirlo en coordenada cero.

Los selectores V1 de finca admiten una variedad; la participación no presenta selección de fincas/variedades porque su origen se especifica en la coordinación. Los adjuntos están deshabilitados mientras FC14 permanezca diferido. Los campos visuales sin columna equivalente se identifican como pendientes y no se envían al backend.

## 3. Convenciones HTTP

### Direcciones y convivencia

- Backend futuro: `/v1`. Ejemplo `http://localhost:3000/v1/campanas`.
- Mock futuro: `/mock-api/v1`. Ejemplo `http://localhost:5173/mock-api/v1/campanas`.
- API actual: rutas sin `/v1`; permanecen independientes. No cambiar las respuestas de los servicios existentes para hacerlas pasar por V1.
- `VITE_API_BASE_URL` contiene el origen/base **sin `/v1`**. Los servicios futuros agregan `/v1`.

```dotenv
# Mock local, tanto para servicios actuales como futuros:
VITE_API_BASE_URL=/mock-api/
# Backend real, cuando implemente V1:
# VITE_API_BASE_URL=http://localhost:3000/
# VITE_API_CONTRACT=v1
```

Reiniciar Vite al cambiar `.env`, OpenAPI o fixtures. Los mocks son exclusivos de `pnpm dev`/`pnpm dev:network`; el build con base ficticia se rechaza. Los datos no se empaquetan para producción.

### Tipos y serialización

- JSON camelCase, tablas SQL conservan snake_case. No exponer entidades TypeORM sin DTO ni relaciones recursivas.
- PK/FK: enteros positivos. Documento, teléfono, RUC, código SENASA, catastro y ubigeo: texto; conservar ceros iniciales.
- `date`: `YYYY-MM-DD`. No convertir una fecha calendario en instante UTC. En React usar los adaptadores de fecha del proyecto.
- `timestamptz`: ISO 8601 con `Z` u offset. El backend normaliza almacenamiento; la vista presenta `America/Lima`.
- Cantidades/importes: números JSON, nunca strings formateados. Escala de cada `numeric(p,s)` representada por `multipleOf` en OpenAPI. Dinero del backend se calcula con decimal/PostgreSQL numeric, no con aritmética binaria de JavaScript.
- Ausencia persistida: `null` cuando el esquema admite nulo. En PATCH omitir conserva; enviar `null` limpia solo un campo nullable. No usar `""` para simular una FK o número.
- Cada GET de detalle devuelve objeto completo con sus campos nullable explícitos. Las relaciones se consultan mediante subrecursos e IDs; la UI no debe asumir entidades anidadas legacy.

### Colecciones

```json
{ "items": [], "total": 0, "page": 1, "pageSize": 20 }
```

`page >= 1`, `1 <= pageSize <= 100`; valores predeterminados 1/20. Orden estable por PK ascendente. `total` cuenta el resultado filtrado antes de paginar. Una colección vacía responde 200; un padre inexistente responde 404. Los filtros disponibles están definidos por operación en OpenAPI; un filtro desconocido es 400. No implementar filtros arbitrarios a columnas o SQL desde el cliente.

En rutas anidadas, `parentId` es la PK de la tabla padre indicada en el catálogo. Ejemplo: `/proveedores/1/fincas/7` debe buscar la finca 7 **del proveedor 1**. Encontrar la finca 7 en otro proveedor sigue siendo 404.

### Escrituras y errores

POST colección → 201 con objeto; PATCH detalle → 200 con objeto; DELETE → 204 sin cuerpo. PATCH exige al menos un campo editable. No se aceptan campos desconocidos, PK, auditoría, snapshots calculados o campos `readOnly` en escrituras. Los DTOs `Create…` y `Update…` de OpenAPI son la lista exacta de entrada.

```json
{
  "statusCode": 422,
  "code": "VALIDATION_FAILED",
  "message": "Revisa los campos enviados.",
  "fieldErrors": { "telefono": "Tipo esperado: string." }
}
```

| HTTP | Uso |
|---|---|
| 400 | JSON, IDs o filtros inválidos. |
| 401/403 | Identidad ausente/permisos insuficientes en el backend real. El mock no implementa seguridad. |
| 404/405 | Recurso/contexto inexistente o método fuera del contrato. |
| 409 | Duplicado, saldo excedido, transición inválida, reserva solapada o historial protegido. |
| 413/422 | Tamaño JSON > 1 MB o cuerpo/referencia inválidos. |
| 500 | Error inesperado; el backend real no debe devolver trazas internas. |

`fieldErrors` usa nombres de entrada; en JSON anidado usa rutas como `compras[0].providerId`. El mapper/formulario traduce esos nombres al control correspondiente. No mostrar un éxito si el servidor rechazó la operación. No reintentar POST financiero automáticamente: referencia repetida por documento responde `DUPLICATE`; consultar el historial antes de repetir.

Todas las respuestas de API llevan `Cache-Control: no-store`. Conservar CORS para el origen configurado; nunca habilitar wildcard como sustituto de configuración.

## 4. Organización del backend

Conservar NestJS, TypeORM y las entidades/tablas actuales que forman parte del objetivo. Agregar módulos por dominio, sin convertir cada tarjeta o pestaña en una tabla ni exigir una reorganización completa para empezar.

```text
src/
  catalogos/              frutas, variedades, normas, roles, parámetros UIT (lectura)
  proveedor/             maestro, personas vinculadas, fincas y certificados
  campana/               campaña y cierre
  campana-proveedor/     participación y entrevistas
  cliente-negocio/       cliente, requerimientos, contratos y entregas
  transporte/            empresas, unidades, choferes, cotizaciones, acuerdos y reservas
  calidad/               análisis, MTD, cosecha, cargas y guías
  logistica/             recepción y cierres por carga
  liquidaciones/         compra, transporte, gastos y aplicaciones
  facturacion/           preparación/emisión de facturas y cobros
  common/                errores, validación y protección de acceso
```

Dentro de cada módulo: `controllers/`, `dto/`, `services/`, entidades y repositorios según las convenciones existentes. Controllers validan transporte HTTP; services aplican reglas y transacciones; repositorios persisten. Serializadores/mappers definen el DTO de salida. Las rutas versionadas deben coexistir con los controladores legacy hasta migrar sus consumidores.

Los datos iniciales SQL son catálogos de referencia. No agregar un CRUD de configuración solo porque exista la tabla: frutas/variedades/normas/roles/UIT son lectura en V1. Tampoco exponer CRUD de `usuario`, hashes de contraseña o las tablas legacy de asignación/trazabilidad como pantallas nuevas. Sus escrituras de compatibilidad son responsabilidad interna del servicio de coordinación.

### Migraciones

`03_schema_total.sql` instala el esquema objetivo nuevo; **no se ejecuta sobre la base actual como si fuera una migración**. El agente debe comparar entidades/columnas, preparar migraciones incrementales y preservar datos:

1. Cambiar documentos/teléfonos/códigos a texto sin perder información; no recuperar ceros ya perdidos inventándolos.
2. Revisar participaciones duplicadas por campaña/proveedor antes de retirar la FK directa a finca; mapear entrevistas, cargas y transportes a `cxpId` conservado.
3. Retirar unicidades legacy incompatibles con requerimientos/facturas múltiples y añadir restricciones del objetivo.
4. Migrar reservas de días a instantes, con zona documentada; no inferir horas históricas sin criterio definido.
5. Incorporar JSONB y defaults por etapas; los documentos con movimientos conservan identidad/importes históricos.
6. Verificar FK compuestas, índices, exclusiones y constraints del SQL. No desactivar constraints para aceptar las demos antiguas.

## 5. Reglas por recorrido

### Maestros y campaña

Proveedor y cliente permiten opcionales del objetivo; no repetir validaciones legacy que exigen siempre correo/archivo. Transportista `EMPRESA` requiere RUC de 11 dígitos; `INDEPENDIENTE` requiere tipo/número de documento y puede tener RUC null. Capacidad y medidas del vehículo son campos distintos; no recalcular `volumen` desde dimensiones.

Una campaña habilitada incluye `planificacion` y `en proceso`. Solo una habilitada por fruta. La fecha de fin no cierra la campaña. Crear/editar permite esos dos estados; `terminado` se obtiene con `POST /campanas/{id}/cerrar`.

Participación: precio simple `precioCompraKg`, PEN y disponibilidad; el padre se toma de la URL. Fincas se vinculan en entrevistas/orígenes. Conservar `entrevistaAplica`; no hacer obligatoria una entrevista para un acopiador ni exigirle el perfil agronómico legacy de productor.

### Exámenes y certificaciones

Examen admite `Pendiente`, `Enviado`, `Con resultado`. Sin resultado inicial; envío requiere fecha; resultado requiere `resultado`. Al volver a una etapa previa se limpian los campos que no corresponden. La evidencia documental sigue diferida, sin hacer pasar `documentoArchivoId` inventado por archivo disponible.

Certificación separa cabecera, cobertura por `cxpId`, ampliaciones y pagos. Cobertura identifica la misma campaña/proveedor de la participación. Los kilos iniciales se obtienen de las participaciones seleccionadas y se preserva el historial de cobertura. Ampliaciones y pagos son movimientos distintos. No interpretar `reciboUrl` como un pago ya realizado. Vigencia deriva de fechas, sin confundirla con trámite. El límite de una certificación de la UI y el campo de trámite requieren la alineación señalada en §2.

### Comercial y coordinación

Requerimiento → contratos → entregas. El precio de contrato puede ser null durante negociación; debe completarse antes de facturar. Variedades elegidas deben pertenecer a la fruta de campaña. El destino es texto obligatorio. Los puentes de variedades representan selecciones reales de requerimiento/entrega; no se recrean los puentes calculables retirados del objetivo.

Un transportista puede vincularse en `BORRADOR`; confirmar exige tipo de pago, importe y fechas. Desembolso de adelanto no se crea por guardar el acuerdo. La coordinación usa un acuerdo confirmado, vehículo y chofer de la misma empresa, y una entrega de esa campaña. La reserva del chofer usa intervalos `[inicio,fin)` y se valida transaccionalmente.

El servicio de coordinación sincroniza las asignaciones/trazabilidad conservadas por compatibilidad. Los orígenes son participaciones/fincas de esa misma campaña y proveedor. Un flete por entrega puede superar la referencia total con observación, como el prototipo; no añadir una aprobación jerárquica. Un flete ya liquidado queda protegido.

### Calidad, cosecha, carga y guía

`campana.calidad` conserva los canales `Exportación`/`Industria`; no se crea otra campaña por pestaña. Análisis/MTD se identifican por participación y finca, incluso antes de crear cosecha.

Cosecha pertenece a entrega y conserva organización, avances, cierre e industria. Carga pertenece a coordinación y desglosa proveedores/variedades, envases, orígenes y gastos. Los avances y orígenes deben corresponder a fincas habilitadas del proveedor; no usar nombres como identidad. Validar sumas y referencias internas del JSON, no solo que sea un objeto.

La guía tiene contenido íntegro y snapshots de salida/llegada/conductor; `proveedor_guia` distribuye kilos y fincas. `guia_x_norma` es la selección persistida. `contenido.standardCodes` se sincroniza con ella; `standardText` conserva la frase histórica. Emisión con `POST /guias/{id}/emitir` congela cabecera, proveedores, fincas y normas. No es emisión electrónica ante un servicio tributario ni subida de PDF.

### Recepción y chofer

El chofer entra por `GET /chofer/cargas` y `GET /chofer/cargas/{id}`. El backend obtiene el chofer de la identidad autenticada, **no de un `driverId` confiado del navegador**. Solo puede registrar sus etapas y datos operativos permitidos. Administrador y Chofer comparten coordinación/carga/recepción, sin duplicar viajes en otra tabla. El mock usa el chofer fijo 1 para esta consulta; eso no representa autenticación ni autorización real.

`historial_chofer` avanza `EN_CARGA → SALIDA → EN_CAMINO → LLEGADA → CIERRE`, con prerequisitos de despacho/recepción del prototipo. El backend decide hora/actor y rechaza saltos y cambios del chofer de otro viaje. El mock no demuestra esos permisos ni la totalidad de prerequisitos documentales.

En recepción, `compras[]` registra `providerId` y `recognizedQuantity`. Cada proveedor es real de esa carga, no repetido; cantidad > 0, <= cargados del proveedor y suma igual al peso de planta con tolerancia de 0,01 kg. No derivar el reparto de una factura ni prorratearlo automáticamente. La diferencia de origen/destino no genera un cargo adicional.

Validar descarte, jabas y horas de descarga. Separar cierre físico y administrativo; ambos tienen prerequisitos y no significan liquidación/pago/cobro. No permitir alterar los reconocidos ya aplicados a una liquidación.

### Liquidación, adelantos y facturación

- Compra: servidor toma kilos reconocidos y precio aplicado; `importeCompra = round(kilosReconocidos × precioKgAplicado, 2)`. El comprador no envía un importe manual que sustituya ese cálculo.
- La persona debe ser titular o vinculada al proveedor. Capturar `personaSnapshot`, valor y límite UIT aplicados al documento. Los cambios posteriores no revalorizan documentos históricos. Valores de fixtures son ficticios y no certifican parámetros vigentes.
- Transporte: flete de coordinación más gastos marcados incluidos. Separar gastos reales/viáticos; proteger el flete liquidado.
- Adelantos: desembolso <= acordado; aplicación <= disponible y saldo de liquidación. Misma empresa/campaña/acuerdo. Disponible = desembolsado − aplicado. Un mismo adelanto/liquidación tiene una aplicación según la unicidad SQL.
- Venta: kilos de factura dentro de recepción; precio/moneda del contrato. `importeVenta = round(kilosFacturados × precioKgAplicado − descuento + cargos, 2)`. Varias facturas de una carga no pueden duplicar sus kilos.
- Preparación no es emisión. `POST /facturas/{id}/emitir` completa número y fechas; cobro solo sobre factura emitida. No agregar un flujo de anulación fiscal/rectificación no definido.
- Pagos/cobros/aplicaciones son históricos append-only en V1. No PATCH/DELETE de movimientos. Un documento con movimientos no se borra ni cambia de origen/importes. La referencia única evita repetir un movimiento.

**Concurrencia del backend:** bloquear filas de documento y adelanto, comprobar saldo e insertar dentro de una transacción; restricciones únicas y FK no se sustituyen por una comprobación previa sin bloqueo. La cola del mock evita doble consumo local, pero no acredita concurrencia PostgreSQL.

### Cierre de campaña

`POST /campanas/{id}/cerrar` recibe `{ "motivoCierre": "Resumen de al menos diez caracteres" }`. Solo campaña en proceso y administrador. Recalcular pendientes en servidor dentro de la transacción: contratos/entregas sin completar, viajes sin cierre del chofer, cosecha/recepción/cierres, guías, liquidaciones, facturación y saldos. Ver `campaign-lifecycle.ts` del prototipo y el reporte objetivo; excluir exigencias de almacenamiento aplazadas por FC14.

Un cierre válido congela el historial y registra fecha/actor/motivo. No liquida automáticamente, no registra pagos y no pone saldos a cero. Con pendientes responde 409 `CAMPAIGN_PENDING`. El mock reproduce comprobaciones centrales; el backend debe implementar y probar la lista completa, permisos y bloqueos. No usar la aceptación del mock como certificación del cierre real.

## 6. Objetos JSONB y DTOs

OpenAPI conserva nombres del prototipo **dentro** de JSONB; las columnas externas se exponen camelCase. Los DTOs generados usan `JsonObject`/`JsonValue` para estos contenedores; esto no exime al backend de sus validaciones de contenido.

| Columna SQL | DTO | Contenido |
|---|---|---|
| `campana.calidad` | `calidad` | Objeto por canal, incorporación/estado/rechazos. |
| `cosecha.organizacion` | `organizacion` | `harvestDate`, `serviceId`, `crewLead`, confirmaciones, capacitación, evidencia, movilidad e insumos. |
| `cosecha.avances` | `avances` | Lista con IDs enteros de proveedor/finca, fecha, kilos, envases y responsable. |
| `cosecha.cierre`, `industria` | `cierre`, `industria` | Objetos closure/industry de QualityOperation del prototipo. |
| `guia_remision.contenido` | `contenido` | RemissionGuideDetails completo, incluyendo standardCodes/standardText. |
| `proveedor_guia.fincas_ids` | `fincasIds` | Lista de PK enteras de las fincas elegidas. |
| `recepcion_planta.compras` | `compras` | `providerId`, `recognizedQuantity`, referencia, cantidad de origen y revisión. |
| `recepcion_planta.logistica` | `logistica` | Ventanas, llegada, espera, reprogramación y estado. |
| `recepcion_planta.checklist`, `documentos` | `checklist`, `documentos` | Confirmaciones y metadatos; sin binarios ni almacenamiento fingido. |
| `liquidacion_proveedor.persona_snapshot` | `personaSnapshot` | Identidad histórica capturada por servidor. |

Los borradores permiten objetos parciales; antes de avanzar/emisión/cierre validar completitud, sumas, referencias y permisos. No descartar propiedades conocidas del prototipo al hacer PATCH. Las arrays enviadas reemplazan la lista completa de ese campo; no se aplica un merge implícito por índice.

## 7. Cómo consumirlo desde el frontend

Se generaron `api/future.dto.ts` y `api/future.api.ts` dentro del módulo dueño. El cliente genérico HTTP está en `shared/api/future-client.ts`; no contiene negocio. Las acciones de emisión/cierre tienen servicios propios.

```ts
// Dentro del servicio/hook del dominio, nunca usar apiClient en una página.
import { campanaV1, clienteNegocioCampanaV1 } from '@/modules/campaigns/api/future.api'
import { proveedorV1, fincaV1 } from '@/modules/providers/api/future.api'

const page = await campanaV1.list({ estado: 'en proceso', page: 1, pageSize: 20 })
const proveedor = await proveedorV1.get(1)
const fincas = await fincaV1(proveedor.proveedorId).list()
const requerimientos = await clienteNegocioCampanaV1(1).list({ clienteNegocioId: 1 })
```

Cada objeto expone `list/get`; CRUD agrega `create/update/remove`; append-only agrega solo `create`. Hay tipos exactos de entrada sin IDs/auditoría. Las páginas deben consumir modelos mapeados del dominio y gestionar carga/error/vacío; estos servicios son la frontera de transporte para construir esos adaptadores.

Migración por módulo:

1. Crear mapper DTO V1 → modelo de vista, con fechas, enums y números explícitos.
2. Cambiar lecturas del almacén por cargas HTTP y `useState`; conservar `useModalForm`/`useFormSubmit`.
3. Guardar por servicio, esperar respuesta y refrescar/reconciliar el listado. No presentar datos solo locales como persistidos.
4. Resolver antes los conflictos de §2; retirar el almacén y `.demo.ts` solo al cubrir sus operaciones reales.
5. Probar con `/mock-api/` y después con el backend manteniendo los mismos servicios/DTOs. Errores reales nunca activan un fallback ficticio.

Resúmenes, KPIs, programa semanal y vistas del chofer se derivan de esas entidades. Por ahora no se fija un endpoint de dashboard adicional: primero implementar el flujo y medir su consumo. No crear tablas para un resumen de pantalla.

## 8. Mocks futuros entregados

`json/future/` contiene un archivo por tabla fuente; algunas tablas legacy internas tienen `[]`. Son un escenario separado de las fixtures anteriores de `json/`. Incluye:

- Proveedores con documentos/teléfonos textuales y ceros iniciales, fincas y variedades.
- Dos requerimientos del mismo cliente/campaña, contrato con precio pendiente y entregas coordinadas.
- Transportista empresa e independiente; acuerdo confirmado y vínculo borrador.
- Análisis sin cosecha, examen pendiente, cosecha y carga multiproveedor.
- 1.000 kg cargados, 960 kg reconocidos: 580/380 por proveedor; compra 580 × 2 = 1.160 para el primero.
- Dos facturas de esa carga, una emitida y otra preparada; descuentos/cargos y cobro parcial.
- Pagos, desembolso/aplicación de adelanto y saldos pendientes para probar rechazos.

Estado en memoria compartido por el servidor Vite; reiniciarlo restaura las fixtures. Las mutaciones no reescriben archivos. Los IDs nuevos crecen sin reutilizar eliminados. Cada petición del mock revierte sus cambios si falla. Un comando del frontend con varias peticiones puede completar algunas antes de fallar; se recargan los datos confirmados para reconciliar la vista. No hay persistencia, seguridad, envío de correos, almacenamiento S3, integración fiscal ni prueba de concurrencia real.

El middleware lee el OpenAPI, valida entradas/salidas, referencia y contexto de padres, nulabilidad, tipos, filtros, varios estados/reglas de negocio y saldos. Las pruebas ejercitan esos comportamientos mediante los servicios reales del frontend. No simula todas las restricciones SQL ni todas las transiciones/validaciones de JSONB: el backend debe implementarlas según §5 y las fuentes.

## 9. Entrega y verificación para el agente backend

Orden sugerido: maestros/catálogos → campañas/participaciones/fincas → requerimientos/contratos/entregas → transporte/coordinación → calidad/cargas/guías → recepción → liquidaciones/facturas/movimientos → cierre y permisos completos.

Por cada módulo exigir:

- Migración incremental y datos existentes preservados; SQL objetivo como referencia.
- Peticiones/respuestas compatibles con OpenAPI y errores sin HTML.
- Validación de padres/FK/JSON, referencias cruzadas y transiciones.
- Autenticación definida, permisos de Administrador/Chofer y aislamiento del chofer por identidad.
- Pruebas de éxito, vacío, borradores, duplicados, pertenencia, historial y rollback.
- Pruebas PostgreSQL de carreras de pago, aplicaciones y reservas; una prueba de mock no basta.
- Prueba de integración del frontend cambiando solo la base de API y usando los adaptadores V1 del módulo migrado.

Desde `epe-web`:

```sh
pnpm contract:check
pnpm test
pnpm build
```

`pnpm contract:generate` regenera OpenAPI, catálogo y clientes/DTOs desde el SQL objetivo y las decisiones HTTP de `dev/generate-future-contract.mjs`. Revisar los diffs antes de integrar. Si cambia una regla/ruta, actualizar guía, generador, fixtures y pruebas en el mismo cambio; no editar los archivos generados a mano. Ninguno de estos comandos migra o desarrolla el backend automáticamente.
