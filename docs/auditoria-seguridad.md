# Auditoría de seguridad de epe-web

**Revisión del 10 de noviembre de 2026.** Alcance parcial sobre el árbol local de `10d9d6a`, con cambios previos en documentación y un DTO. Se aplicó la [skill Security Audit de Cloudflare](https://github.com/cloudflare/security-audit-skill) al cliente React/Vite, la sesión, las exportaciones, el visor de archivos, los perfiles de alojamiento y el flujo de publicación. No se encontraron registros estructurados de auditorías de seguridad previas en el espacio revisado. La ejecución formal queda incompleta porque el entorno no ofreció el aislamiento exigido para ejecutar la aplicación. Las prioridades indican orden de corrección según evidencia estática.

| Prioridad | Hallazgo | Efecto |
|---|---|---|
| Alta antes de usar el Compose | WEB-01 · PostgreSQL publica un puerto con una contraseña predecible por defecto | Una instalación nueva puede quedar accesible desde la red del anfitrión si este permite el tráfico. |
| Media | WEB-02 · Evidencia de recepción con destino externo | Un chofer puede introducir un destino externo que el portal administrativo presenta como evidencia. |

## WEB-01 · Configuración insegura de PostgreSQL en Compose

El Compose documentado en el README publica el puerto de PostgreSQL en todas las interfaces del anfitrión y usa una contraseña predecible si falta `DB_PASSWORD`. La imagen oficial crea el usuario de inicialización con privilegios de superusuario cuando el volumen es nuevo. El alcance real depende del volumen, los valores efectivos y el cortafuegos. [Compose, líneas 20–29](../docker-compose.yml#L20-L29) · [Guía de arranque](../README.md#L156-L187) · [Imagen oficial de PostgreSQL](https://hub.docker.com/_/postgres)

**Corrección.** Quitar el puerto publicado del perfil por defecto. Si se requiere acceso local, limitarlo a `127.0.0.1`. Exigir credenciales explícitas y separar el rol del servicio del usuario de inicialización. El operador debe comprobar el enlace efectivo, el rol de la API y si algún volumen se inicializó con el valor por defecto antes de decidir la rotación.

## WEB-02 · Evidencia de recepción con destino externo

El contrato permite al rol Chofer actualizar evidencias de recepción. El backend restringe los nombres de los campos, pero el valor de `actaDescarte` admite un objeto sin comprobar que el archivo pertenezca a la operación. El frontend proyecta la URL almacenada al enlace de descarga y a la vista previa administrativa. Si los metadatos indican PDF, el visor puede cargar el destino en un iframe. Se requiere una recepción editable y que un administrador interactúe con el adjunto. [Permiso V1, líneas 32261–32285](../../epe-backend/src/common/v1/contract/api-v1.openapi.json#L32261-L32285) · [Validación backend, líneas 226–237](../../epe-backend/src/common/v1/v1-resource.helper.ts#L226-L237) · [Proyección, líneas 9 y 51](../src/modules/logistics/api/logistics-screen-data.ts#L51) · [Documentos administrativos, líneas 76–83](../src/modules/logistics/pages/LogisticsDocumentsPage.tsx#L76-L83) · [Visor, líneas 54–85](../src/shared/components/FilePreviewModal.tsx#L54-L85)

**Corrección.** Al asociar la evidencia, aceptar solo identificadores emitidos por el servidor y comprobar que el solicitante pueda vincular el objeto. En la vista, resolver la descarga autenticada desde el origen de API autorizado, usar el tipo verificado del archivo y restringir los orígenes del visor. El helper de descarga protegida ya comprueba el origen antes de adjuntar la autorización. [Descarga protegida, líneas 38–52](../src/shared/api/uploadDocument.ts#L38-L52)

## Validaciones pendientes y cobertura

| Superficie | Evidencia y comprobación pendiente |
|---|---|
| Exportación CSV | El serializador escapa comillas y conserva el texto de las celdas, incluso cuando una hoja de cálculo podría interpretarlo como fórmula. Confirmar qué datos puede escribir un autor distinto del destinatario y cómo los interpreta el programa utilizado. Exportar como texto los campos de texto sin alterar columnas numéricas. [Serializador](../src/shared/utils/downloadCsv.ts#L7-L11) · [Exportación de proveedores](../src/modules/providers/components/ProvidersTable.tsx#L62-L80) |
| Sesión | El navegador conserva el bearer en `sessionStorage` y lo borra al cerrar sesión. Comprobar requisitos de revocación con el backend y qué scripts se ejecutan bajo el origen de la aplicación. [Almacenamiento](../src/shared/offline/session.ts#L18-L39) · [Cierre de sesión](../src/App.tsx#L177-L180) |
| Cabeceras y Cloudflare | Nginx y Vercel declaran `no-store`. Amplify también declara HSTS, `nosniff` y protección de marcos. Comprobar el perfil real y sus cabeceras, TLS, aislamiento del origen y reglas de caché para `/api`. Si se añade CSP, preservar el iframe del mapa del mismo origen. [Nginx](../nginx.conf#L1-L25) · [Vercel](../vercel.json#L8-L17) · [Amplify](../customHttp.yml) · [WAF](https://developers.cloudflare.com/waf/) |
| Mapas | Leaflet carga con verificación de integridad y el intercambio de mensajes valida origen y emisor. Confirmar qué proveedor de rutas se configura y qué coordenadas se le envían. [Mapa](../public/driver-pickup-map.html#L7-L10) · [Cliente de rutas](../src/modules/driver-portal/components/DriverPickupMap.tsx#L80-L98) |
| Dependencias y publicación | Se revisaron el lockfile y el workflow de imágenes. Las acciones usan etiquetas de versión en un flujo que publica al registro. Fijarlas por SHA completo reduce la confianza en etiquetas mutables. Quedan pendientes la revisión exhaustiva de avisos y el análisis de las imágenes desplegadas. [Workflow](../.github/workflows/docker-publish.yml#L16-L52) |

La cobertura se limita a lectura de fuentes. El [informe del backend](../../epe-backend/docs/auditoria-seguridad.md) trata recuperación, perfiles y operaciones del chofer. La validación del navegador y del entorno publicado queda pendiente.
