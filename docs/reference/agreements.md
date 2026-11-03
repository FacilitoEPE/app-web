# Documentación y acuerdos del esquema agroexportador

Este repositorio contiene la documentación discutida y el SQL de revisión. El primer commit se identifica con el mensaje **v1**. Se actualizan los mismos archivos; las versiones se conservan mediante Git.

## Documentos vigentes

- El resumen `api-futura.md` se retiró del repositorio central el 03/11/2026. El contrato OpenAPI V1 vigente para los DTOs del frontend se mantiene en [la especificación](../api-v1.openapi.json) y [sus reglas](../api-v1-contract.md); comparar su paridad con el backend antes de cambiarlo.
- [Flujo funcional del sistema y de sus módulos (HTML Archify)](flujo-sistema.html): propósito de la aplicación, recorrido general, flujos internos de los ocho módulos, vista del chofer, reglas de avance y condiciones de cierre, basados en el prototipo local.
- **[Schema actualizado tras la auditoría](agro-schema/01_reporte_especifico.md#schema-actualizado-tras-la-auditoría-de-cumplimiento):** ajustes FC01–FC13 incorporados al SQL, contrato de JSONB, tipos modificados y límites de implementación. FC14 (archivos) continúa diferido. Se prioriza funcionamiento sobre calidad del diseño.
- [Reporte por vista](agro-schema/01_reporte_especifico.md): 62 fichas con navegación, función de cada tabla, atributos, relaciones y decisiones D01–D15.
- [Antecedente: validación de negocio y cuestionario original](agro-schema/01_reporte_especifico.md#validación-de-negocio-y-cuestionario-pendiente): sus 30 preguntas no son requisitos adicionales; las respuestas y el criterio de cumplimiento posteriores determinan el alcance vigente.
- [Respuestas del usuario y alcance limitado al prototipo](agro-schema/01_reporte_especifico.md#respuestas-y-alcance-limitado-al-prototipo): estado vigente del cuestionario, explicación de la duplicidad, reglas encontradas y diferencias por consultar. Los negocios adicionales solo se reportan y quedan fuera del alcance.
- [Esquema general y relaciones Mermaid por vista](agro-schema/02_tablas_y_relaciones.md): mapa de las 60 tablas, flujo funcional y recortes por vista.
- [Datos iniciales SQL](agro-schema/04_datos_iniciales.sql): perfiles, normas, frutas, variedades y parámetros anuales del prototipo; sin usuarios ni movimientos. El SQL total ya los incluye.
- [SQL total de revisión](agro-schema/03_schema_total.sql): instalación nueva en el esquema PostgreSQL `agro`; no es una migración sobre la base existente.
- [Esquema global y relaciones por vista (HTML)](agro-schema/diagramas/esquema-agro-vistas.html): mapa de 60 tablas con sus 685 atributos, tipos, nulabilidad y claves, y diagramas derivados del Mermaid de las vistas V01–V62, con etiquetas de tablas usadas por pantalla/formulario. V02 es navegación sin tablas propias.
- [Resumen Archify (HTML)](agro-schema/diagramas/esquema-agro.html): explicación del modelo con ERD global y recortes de clientes, proveedores y fincas.
- [Auditoría del backend frente al modelo previsto](agro-schema/auditoria-bd-actual-vs-planificada.md): comparación, decisiones confirmadas y pendientes. Se incorpora desde la documentación del backend para que también quede en este historial.
- [Auditoría aplicada a las propuestas frente al prototipo](agro-schema/auditoria-tablas-propuestas-vs-prototipo.md): cinco simplificaciones aplicadas, norma y guia_x_norma conservadas, configuración inicial sin CRUD y 41 propuestas vigentes. Incluida también en el HTML por vistas.
- [DBML inicial aportado](agro-schema/referencias/AGRO_SIMPLIFICADO.dbml): referencia original sin modificar; no representa el modelo objetivo corregido.

## Acuerdos confirmados al 29/10/2026

- La prioridad es cubrir los flujos de la aplicación usando el prototipo como referencia. No se exige normalizar, refactorizar o mejorar arquitectura para avanzar. Los negocios ausentes del prototipo se reportan y quedan fuera del alcance; las contradicciones con respuestas explícitas se mantienen identificadas.
- Esta etapa comprende documentación y SQL para revisión manual; no se modifican entidades TypeORM, migraciones ni bases desplegadas.
- Se incorporaron los ajustes funcionales al SQL: compra sobre kilos reconocidos, varios requerimientos cliente/campaña, varias facturas por carga con ajustes, borradores de exámenes/contratos/transporte y detalle de cosecha/recepción mediante JSONB. El prototipo/web/backend todavía deben adoptar los contratos y cardinalidades actualizados.
- Se conservan los nombres físicos actuales. El modelo revisado incluye 60 tablas: 19 actuales y 46 propuestas. Una propuesta documentada no equivale a aprobación definitiva de implementación.
- `campania_x_proveedores` se mantiene y agrupa al proveedor y sus entrevistas dentro de una campaña. Se retira su vínculo directo a finca en el modelo objetivo.
- Las fincas de esa participación se obtienen mediante `entrevista_extencion`, que reutiliza los datos de finca y agrega los datos de la visita/campaña. Los orígenes de entrega y carga identifican la finca de recojo.
- Cada finca tendrá una sola variedad por ahora. La fruta se obtiene desde `fruta_derivada`; no se añade una tabla de varios cultivos por finca.
- `analisis_calidad` puede registrarse antes de cosecha, por participación y finca. Su vínculo con cosecha es opcional.
- D08 (29/10/2026): no existe CRUD independiente de destinos en el prototipo. Se retira el catálogo propuesto y sus FK; `entrega_programada.destino` guarda texto obligatorio y la guía conserva sus snapshots de dirección/ubigeo/establecimiento de llegada.
- `archivo` queda fuera del SQL y de los diagramas por ahora. Sus 28 referencias documentales quedan opcionales, sin FK y pendientes de relación.
- Se incluyen empresas de transporte, vehículos, choferes y sus asignaciones actuales por compatibilidad. La coordinación es la fuente del viaje; las reservas usan instantes con intervalos [inicio, fin), permitiendo varios viajes sucesivos en el día.
- Administrador y Chofer comparten entidades. Los tableros, resúmenes y pestañas no crean una tabla de negocio independiente por pantalla.

- D17: se retira `sesion_usuario`; se mantienen `usuario` y `rol`. La gestión persistente de sesiones/dispositivos queda fuera del alcance.

## Decisiones pendientes

Las referencias D01–D15 de los reportes describen el estado vigente y las vistas afectadas. La participación queda consolidada en campania_x_proveedores; certificados y cargas referencian cxp_id. La vinculación previa al acuerdo usa BORRADOR; Calidad por canal se conserva en `campana.calidad`; el precio simple vive en la participación. Las validaciones de contenido JSON, permisos, sincronización entre tablas conservadas y cierre completo requieren los servicios del backend. La gestión documental sigue diferida.

Se conserva `campania_x_proveedores`; la cabecera adicional se retiró por decisión del usuario, junto a los dos puentes de variedades calculadas y acuerdo_compra. norma y guia_x_norma se conservan con catálogo inicial y selección por guía. La gestión documental se retomará en otra etapa.

## Evidencias y mantenimiento

La carpeta `agro-schema/.validation` conserva modelos, generadores y resultados de las comprobaciones, incluidos antecedentes del diseño. Los documentos vigentes son los enlazados arriba. Los archivos internos `baseline-*`, `modelo.json`, `modelo_alineado.json` y los generadores antiguos son antecedentes, no el esquema final.

El flujo vigente usa `modelo_revision.py` (con `cumplimiento_modelo.py` y `cumplimiento_reglas.sql`), `verificar_revision.mjs` (entrada de `verificar_cumplimiento.mjs`) y `documentar_revision.py` (con `cumplimiento_documentacion.py`). El resultado actual consta en `resultado_revision.json`: **47 comprobaciones ejecutadas en PGlite**. No acreditan validación de una base desplegada, concurrencia con múltiples conexiones o implementación de toda la aplicación. Se conservan 60 tablas, 134 FK y seis vistas; 173 columnas legacy por nombre, con 35 definiciones modificadas y 73 columnas adicionales en tablas actuales.

La evidencia **estática** complementaria usa `validar_inventario_negocio.mjs` y `auditar_cumplimiento_app.mjs`, con sus resultados JSON. El segundo comprueba ahora la presencia de los ajustes; las incompatibilidades originales quedan como motivación histórica. La instalación y pruebas de comportamiento actuales se ejecutan con `verificar_revision.mjs`.

Cada decisión posterior debe actualizar su ficha, el esquema general, el SQL si corresponde y la auditoría antes del siguiente commit. No ejecutar los generadores históricos para actualizar los documentos vigentes.

## Historial local

Desde esta carpeta:

```sh
git log --oneline
git status
git diff
```

Este repositorio es local. No se configura un remoto ni se publica documentación como parte de su creación.
