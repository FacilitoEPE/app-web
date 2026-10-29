![Agro Exportaciones F.V. — Software de gestión](public/image/banner.png)

<p align="center">
  <strong>El centro de operaciones digital de Agro Exportaciones F.V.</strong><br>
  Campañas agrícolas, relaciones comerciales y seguimiento operativo en una misma experiencia web.
</p>

<p align="center">
  <img src="public/image/stack.svg" width="920" alt="React 19 · TypeScript 6 · Vite 8 · Tailwind CSS 4 · shadcn/ui · pnpm">
</p>

<p align="center">
  <a href="#el-sistema">El sistema</a> ·
  <a href="#modulos">Módulos</a> ·
  <a href="#inicio-local">Inicio local</a> ·
  <a href="#arquitectura">Arquitectura</a> ·
  <a href="#identidad-visual">Identidad visual</a>
</p>

---

<a id="el-sistema"></a>
## 🌱 Del origen agrícola a la gestión digital

**Agro Exportaciones F.V.** reúne en este frontend la planificación de campañas, la información de proveedores y el seguimiento de clientes. La campaña funciona como punto de encuentro: fechas, fruta, variedades, requerimientos comerciales, cosecha, certificaciones y participantes se presentan en una vista de detalle.

La experiencia combina tablas y tarjetas, filtros, formularios en modales y una identidad visual inspirada en el campo. El objetivo es facilitar la lectura de la operación y mantener una navegación coherente entre áreas.

> **Estado del proyecto · Frontend en desarrollo**
>
> La integración con el backend está en curso: campañas, relaciones de campaña y listados de proveedores/clientes consumen algunas APIs; el CRUD de transporte también quedó conectado. Otras vistas siguen parciales o usan datos de demostración. El acceso aún simula una sesión en IndexedDB y no valida credenciales contra el backend. Consulta el [mapa de integración frontend/backend](docs/integration-status.md) para ver el estado por vista y lo pendiente.

<a id="modulos"></a>
## 🧭 Un sistema organizado por áreas

| Área | Qué encontrarás | Estado actual |
| :--- | :--- | :--- |
| 🌾 **Gestión de campañas** | Campañas, fruta/derivadas, relaciones con proveedores/clientes y certificados. | Integración parcial; pagos a transportistas sin API backend |
| 🤝 **Gestión de proveedores** | Directorio, filtros, detalle y entrevista. | Listado conectado; CRUD, certificados, exámenes y frutas pendientes |
| 🏢 **Gestión comercial** | Directorio y gestión de clientes/contratos. | Listado API parcial; edición y vistas comerciales pendientes |
| 🚚 **Gestión de transporte** | Empresas, vehículos, choferes y pagos. | CRUD de empresas/vehículos/choferes conectado; trazabilidad pendiente; pagos sin API backend |
| 🛡️ **Gestión de calidad** | Certificaciones de campañas y proveedores. | Certificados de campaña parcialmente conectados; certificados/exámenes de proveedor pendientes |

### Una campaña, varias perspectivas

<table>
  <tr>
    <td width="33%" valign="top">
      <strong>📅 Planificar</strong><br><br>
      Fechas, duración, fruta, variedades y requerimiento comercial para contextualizar cada campaña.
    </td>
    <td width="33%" valign="top">
      <strong>🌿 Dar seguimiento</strong><br><br>
      Kilos estimados y cosechados, avance de cosecha y vigencia de certificaciones.
    </td>
    <td width="33%" valign="top">
      <strong>🔗 Conectar</strong><br><br>
      Proveedores, clientes, contactos y pagos relacionados con la operación.
    </td>
  </tr>
</table>

Los recursos visuales de campaña se adaptan a **mango, palta, arándano, fresa, banana y maracuyá**. Si la fruta no se identifica, se utiliza una imagen agrícola de respaldo.

<details>
<summary><strong>🗺️ Explorar las rutas de la aplicación</strong></summary>

Las rutas de trabajo requieren la sesión local de demostración.

| Ruta | Vista |
| :--- | :--- |
| `/login` | Acceso, confirmación y recuperación de cuenta en la interfaz |
| `/modules` | Selector de áreas |
| `/campaigns` | Gestión de campañas |
| `/campaigns/:id` | Detalle de una campaña |
| `/campaigns/:id/providers` | Proveedores de una campaña |
| `/campaigns/:id/carrier-payments` | Pagos a transportistas |
| `/proveedores` | Directorio de proveedores |
| `/planificacion-comercial` | Directorio de clientes |

</details>

<a id="inicio-local"></a>
## ⚡ Ejecutar en local

Necesitas **Node.js 22.12 o superior** y **pnpm** compatible con el lockfile v9 del repositorio. El proyecto utiliza `pnpm-lock.yaml` como referencia de dependencias.

Desde la raíz del proyecto:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Abre la dirección que indique Vite en la terminal, normalmente `http://localhost:5173`.

**Recorrido de demostración:** entra en `/login`, pulsa **Ingresar** y luego **Confirmar**. El flujo actual permite explorar los módulos sin credenciales reales; los campos de usuario y código aún no se verifican con un servicio.

### Configuración de API

Copia [`.env.example`](.env.example) como `.env` para apuntar el cliente HTTP al backend local:

```dotenv
VITE_API_BASE_URL=http://localhost:3000/
```

La variable alimenta al [cliente Axios compartido](src/shared/api/client.ts). Si abres la web desde otro dispositivo, reemplaza `localhost` por la IP de red del equipo que ejecuta la API, por ejemplo `http://192.168.1.25:3000/`. **Reinicia Vite después de cambiar `.env`** para que cargue el nuevo valor. Las variables `VITE_*` se incluyen en el frontend: no deben contener secretos.

### Datos ficticios sin backend

Para desarrollar el backend objetivo y preparar su consumo desde el frontend, consulta la [guía de APIs futuras](docs/future-api-contract.md), el [contrato OpenAPI V1](docs/future-api.openapi.json) y el [catálogo de endpoints](docs/future-api-endpoints.md). Los servicios tipados `src/modules/*/api/future.api.ts` consumen `/v1`; los datos futuros se editan en `json/future/`. Es un contrato separado de los servicios actuales y todavía requiere migrar sus pantallas mediante mappers del dominio.

Para trabajar en el frontend con la API local de prueba, cambia una sola variable en `.env`:

```dotenv
VITE_API_BASE_URL=/mock-api/
```

Ejecuta `pnpm dev` (o `pnpm dev:network`). No necesitas iniciar el backend ni PostgreSQL. Para volver al backend usa `VITE_API_BASE_URL=http://localhost:3000/` o su URL real. Reinicia Vite al cambiar `.env`.

Los datos se editan en [`json/`](json/), con un archivo por recurso y los nombres de campos del backend. Hay campañas en distintos estados, 24 proveedores, 8 clientes, 5 transportistas, vehículos, choferes y vínculos entre recursos. Conserva los IDs y sus referencias para que los detalles y las demos locales sigan coincidiendo. Puedes dejar un archivo como `[]` para revisar estados vacíos, retirando también sus referencias de los otros archivos.

La API ficticia admite las lecturas y operaciones CRUD que consumen los servicios actuales; las relaciones se calculan sobre los registros en memoria. Crear, editar o eliminar no modifica los JSON. Los cambios duran mientras Vite esté ejecutándose y se comparten entre las pestañas conectadas al mismo servidor. Reinicia Vite para volver a cargar los archivos, restaurar los datos o aplicar ediciones de JSON.

Este modo es exclusivo del servidor de desarrollo: el build se detiene si todavía apunta a `/mock-api/`. Los JSON quedan fuera del bundle de producción. El frontend utiliza automáticamente el contrato V1: carga el escenario de `json/future/` por HTTP y actualiza las vistas relacionadas después de guardar. Los almacenes actúan como estado de presentación de las respuestas; no agregan datos demo si la API falla. No se simulan subidas/descargas S3 ni el servicio general de archivos: los enlaces `example.com` de las fixtures son ilustrativos. La API de prueba no sustituye las validaciones completas del backend; protege IDs, referencias y aislamiento de recursos anidados, y devuelve errores JSON para rutas desconocidas.

### Contrato V1 y futuro backend

La configuración `VITE_API_BASE_URL=/mock-api/` conecta las pantallas a `/mock-api/v1`; no debes agregar `/v1` a la variable. Para conectar el backend futuro, configura su URL real y `VITE_API_CONTRACT=v1`. Una URL real sin esa opción conserva la API actual; `VITE_API_CONTRACT=legacy` permite seleccionarla explícitamente.

El agente backend debe recibir [la guía V1](docs/future-api-contract.md), [OpenAPI](docs/future-api.openapi.json), [el índice de endpoints](docs/future-api-endpoints.md) y [las fuentes acordadas](docs/reference/README.md), incluidas en este repositorio. Ejecuta `pnpm contract:check` para comprobar que el SQL y los clientes generados coincidan.

Las escrituras se esperan antes de mostrar éxito. Un fallo HTTP muestra el error y conserva el formulario. Los comandos que abarcan varios recursos pueden guardar parcialmente: se recargan los datos para mostrar el estado confirmado por el servidor. La API real debe definir las transacciones necesarias. El acceso mantiene la sesión local existente y los adjuntos permanecen diferidos (FC14).

### Comandos del proyecto

| Comando | Función |
| :--- | :--- |
| `pnpm dev` | Inicia Vite con recarga durante el desarrollo |
| `pnpm dev:network` | Inicia Vite accesible por LAN e imprime la URL de red |
| `pnpm build` | Comprueba TypeScript y genera el bundle en `dist/` |
| `pnpm preview` | Sirve el resultado de una compilación local |
| `pnpm lint` | Ejecuta ESLint sobre el proyecto |

### 🐳 Ejecutar con Docker

Docker Compose levanta **solo el backend y PostgreSQL**. La web se ejecuta con Vite en modo desarrollo para que los cambios se vean al instante. Necesitas Docker Desktop con Compose y Node.js 22.12+ con pnpm. Desde `epe-web/`, instala dependencias una sola vez:

```bash
pnpm install --frozen-lockfile
```

Luego, en una terminal inicia backend y base de datos; en otra, inicia la web:

```bash
docker compose up -d --build
```

```bash
pnpm dev:network
```

Vite mostrará las direcciones disponibles. En la misma computadora abre:

- Web: <http://localhost:5173>
- API: <http://localhost:3000>
- PostgreSQL: `localhost:5432` (usuario `postgres`, base `backend_epe`)

`--host 0.0.0.0` hace que Vite imprima además la URL de red (por ejemplo `http://192.168.1.25:5173`) para abrir la web desde otro dispositivo. Usa exactamente el origen de la URL que abras en el navegador al configurar CORS. `VITE_API_BASE_URL` es la dirección de la API a la que el navegador hará solicitudes; `CORS_ORIGIN` es el origen de la web que el backend permite. Para uso en la misma computadora los valores predeterminados son `http://localhost:3000/` y `http://localhost:5173`. El Compose reutiliza el Dockerfile existente de `../epe-backend`; no inicies por separado los otros Compose del proyecto. Para detener Vite pulsa `Ctrl+C`; para detener API y base: `docker compose down`. Para borrar también los datos locales: `docker compose down -v`.

Para cargar los registros de ejemplo del backend, con los servicios levantados ejecuta:

```bash
docker compose exec api node scripts/seed-examples.mjs
```

El comando se puede repetir: el script evita duplicar registros que ya existen. Al borrar el volumen con `docker compose down -v`, se elimina la base y tendrás que ejecutar el seed otra vez. Estos datos están en la API; las pantallas web aún usan datos de demostración/locales y no están conectadas a los dominios de negocio del backend.

Para cambiar el origen permitido por CORS (por ejemplo, si usas la URL de red en vez de localhost), agrega `CORS_ORIGIN=http://192.168.1.25:5173` en `epe-web/.env` usando el origen exacto que Vite imprimió y recrea solo la API:

```bash
docker compose up -d --force-recreate api
```

No necesitas reconstruir la imagen del backend para este cambio: `CORS_ORIGIN` se lee al iniciar el contenedor. El backend actualmente permite un solo origen por vez. Para trabajar desde la misma computadora normalmente basta el valor predeterminado `http://localhost:5173`.

Los puertos predeterminados son `3000` (API) y `5432` (base). Si alguno ya está ocupado, crea `epe-web/.env` y sobrescribe `API_PORT` o `DB_PORT_HOST`. También puedes establecer `DB_PASSWORD` y `DB_DATABASE` ahí. La contraseña predeterminada solo es para desarrollo local; cámbiala si expones servicios fuera de tu máquina. Si cambias el puerto de la API, configura `VITE_API_BASE_URL` para la web y vuelve a iniciar Vite.

#### Solo el contenedor web

La imagen usa dos etapas: Node compila la aplicación y Nginx sirve los archivos estáticos. La configuración de Nginx incluye fallback para las rutas de React Router.

Construye la imagen pasando la URL del backend:

```bash
docker build --build-arg VITE_API_BASE_URL=https://api.ejemplo.com -t epe-web .
```

Ejecuta el contenedor:

```bash
docker run --rm -p 8080:80 epe-web
```

Abre `http://localhost:8080`.

> `VITE_API_BASE_URL` queda incorporada en el bundle durante `docker build`; cambiar variables al ejecutar el contenedor no modifica una imagen ya construida. Para otro backend, vuelve a construir la imagen.

<details>
<summary><strong>🧩 Notas de ejecución y publicación</strong></summary>

- **Rutas:** la aplicación utiliza `BrowserRouter`. El hosting debe servir `index.html` para las rutas de la SPA.
- **Caché:** se registra el service worker de [`public/sw.js`](public/sw.js), que utiliza una estrategia de caché primero. Si una actualización no aparece en local, elimina la caché del sitio y desregistra el service worker desde las herramientas del navegador.
- **Conectividad:** la app muestra una pantalla al perder conexión y un aviso al recuperarla. Esto no equivale a sincronización de operaciones de negocio sin conexión.
- **Persistencia:** conservar la sesión de demostración no implica guardar en un servidor los cambios realizados en los formularios.

</details>

<a id="arquitectura"></a>
## 🧱 Una base compartida, módulos por dominio

La organización sigue **Screaming Architecture**: las carpetas principales describen las áreas del negocio. Cada módulo mantiene sus páginas, componentes y datos; lo transversal vive en `shared/`.

```text
src/
├── modules/
│   ├── auth/                  Acceso y confirmación
│   ├── campaigns/             Campañas y su operación
│   ├── commercial-planning/   Clientes y planificación comercial
│   ├── providers/             Proveedores y evaluación
│   └── users/                 Centro de módulos
├── shared/
│   ├── api/                   Cliente HTTP único
│   ├── components/
│   │   └── ui/                Catálogo shadcn/ui
│   ├── hooks/                 Comportamientos reutilizables
│   ├── layout/                Navegación y estructura de páginas
│   ├── offline/               Persistencia de sesión local
│   ├── styles/                Degradados de marca
│   └── utils/                 Utilidades, incluida exportación CSV
├── assets/                    Logos, fotografías e imágenes
├── lib/                       Utilidades base
└── index.css                  Tokens e identidad visual

public/image/                 Banner, badges y otros recursos públicos
```

| Capa | Tecnología | Papel en el proyecto |
| :--- | :--- | :--- |
| Interfaz | **React 19 · TypeScript 6** | Componentes tipados y estado de las vistas |
| Desarrollo | **Vite 8 · SWC** | Servidor de desarrollo y compilación |
| Diseño | **Tailwind CSS 4 · shadcn/ui · Base UI** | Estilos, primitivas y componentes reutilizables |
| Navegación | **React Router 7** | Rutas del sistema y acceso a las vistas |
| Integración | **Axios** | Cliente HTTP centralizado para la futura API |
| Recursos visuales | **Lucide · Plus Jakarta Sans** | Iconografía y tipografía del sistema |

### Convenciones que mantienen la coherencia

- **Componentes por dominio:** `modules/<domain>/components` se mantiene plano, junto a sus páginas.
- **Imports internos:** usar `@/`; los relativos se reservan para el catálogo vendorizado de UI.
- **Composición:** `AppModal`, tablas, filtros y estados compartidos permiten mantener el mismo lenguaje visual entre módulos.
- **UI vendorizada:** los componentes de `shared/components/ui/` se actualizan mediante shadcn; la lógica de negocio pertenece a los módulos.
- **Integración futura:** API, DTO y mapper por dominio cuando se conecte al backend. Las páginas consumirán modelos de frontend, sin depender de DTOs ni de Axios directamente.

Consulta [AGENTS.md](AGENTS.md) para las decisiones de arquitectura y las reglas de trabajo del repositorio.

<a id="identidad-visual"></a>
## 🎨 Cultivando confianza, también en la interfaz

El sistema utiliza el **verde de marca**, su degradado principal, superficies claras y acentos agrícolas. Los títulos, controles, tarjetas y microinteracciones comparten esa identidad.

| Recurso | Fuente del proyecto |
| :--- | :--- |
| Colores, superficies y tipografía | [Tokens en `src/index.css`](src/index.css) |
| Degradados y superficies activas | [`brandGradients.ts`](src/shared/styles/brandGradients.ts) |
| Logo de Agro Exportaciones F.V. | [Logo original](src/assets/image/logo_empresa_only.webp) |
| Imágenes por fruta | [Configuración visual de campañas](src/modules/campaigns/campaignFruit.ts) |
| Cabecera del repositorio | [PNG](public/image/banner.png) · [SVG editable](public/image/banner.svg) |

Los gráficos de esta presentación están guardados en el repositorio. El banner presenta el logo real en blanco, centrado sobre un degradado verde de la identidad del sistema.

---

<p align="center">
  <strong>Agro Exportaciones F.V.</strong><br>
  <sub>Cultivando confianza · Del campo al mundo</sub>
</p>
