# ESTRUTURA DO PROJETO — ZUARTS SISTEMA DE GESTÃO

Manual técnico de navegación y edición.

Proyecto: `zuarts-conecta-gestao`

Fecha de la auditoría: 08/09/2026

Esta auditoría es solo lectura. No se modificó ningún archivo de código existente.

---

## 1. Visión general

El proyecto es una plataforma SaaS Web + PWA para gestión empresarial.

Nombre técnico: `zuarts-conecta-gestao`.

El frontend es un sitio estático plano (HTML + CSS + JavaScript) sin framework.

El backend es un servidor HTTP Node puro (`api/server.ts`) con Better Auth y Prisma.

La base de datos es PostgreSQL 17 en Docker.

Etapas cubiertas:
- Etapa 00: fundación de la aplicación.
- Etapa 01: PostgreSQL, Prisma y migración inicial.
- Etapa 02: autenticación (Better Auth), Company/tenant, User, Membership y aislamiento multi-tenant.
- Etapa 03: layout visual definitivo, PWA y botón Instalar App.

Estado real del disco al momento de la auditoría:
- El frontend servido es `web/` copiado a `dist/web/`.
- El directorio `src/` es código histórico sin uso (ver secciones 5 y 20).
- La API en ejecución es `api/server.ts` vía `tsx watch` (proceso local en :3001).

---

## 2. Árbol del proyecto

La siguiente es la estructura real. Se omitieron `node_modules/` y `.git/`.

```text
zuarts-conecta-gestao/
├── .dockerignore
├── .env                      (variables de entorno reales; NO se muestran valores)
├── .env.example              (documentación de variables)
├── .gitignore
├── Dockerfile
├── README.md
├── docker-compose.yml
├── eslint.config.js
├── index.html                (scaffold antiguo, sin uso)
├── package-lock.json         (lockfile npm, versión 3)
├── package.json
├── prisma.config.ts
├── tsconfig.json
├── api/
│   ├── auth.ts
│   ├── db.ts
│   ├── server.ts
│   ├── server.test.mjs
│   ├── tenant.ts
│   ├── tsconfig.json
│   ├── generated/            (generado por Prisma)
│   └── dist/                 (compilado por tsc + copia de generated)
├── dist/
│   └── web/                  (build de web/, lo que sirve el servidor)
├── docs/
│   ├── architecture.md
│   ├── current-state.md
│   ├── roadmap.md
│   ├── ESTRUTURA_DO_PROJETO.md      (este documento)
│   └── .env.exemplo_estrutura.md    (consulta rápida)
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│       ├── migration_lock.toml
│       ├── 20260907064256_init/migration.sql
│       ├── 20260907120000_etapa02_auth_company/migration.sql
│       └── 20260907130000_etapa02_constraint_renames/migration.sql
├── scripts/
│   ├── build-web.mjs
│   ├── check-db.ts
│   ├── copy-prisma-client.mjs
│   ├── generate-icons.mjs          (Etapa 03)
│   ├── setup-admin.ts
│   └── verify-isolation.ts
├── src/                     (código histórico sin uso, no se compila)
│   ├── App.tsx
│   ├── main.tsx
│   └── styles.css
└── web/
    ├── app.js
    ├── index.html
    ├── manifest.json                (Etapa 03)
    ├── styles.css
    ├── sw.js                        (Etapa 03)
    └── assets/
        ├── favicon.svg              (Etapa 03)
        ├── icon-192.png             (Etapa 03, provisional)
        ├── icon-512.png             (Etapa 03, provisional)
        ├── icon-maskable-512.png    (Etapa 03, provisional)
        └── logo-oficial.svg         (ARCHIVO CORRUPTO — ver sección 23)
```

---

## 3. Pastas — análisis por carpeta

| Carpeta | Finalidad | Responsabilidad | Fuente o generado | Runtime o build | Quién la usa | Riesgo |
| --- | --- | --- | --- | --- | --- | --- |
| `api/` | Backend HTTP y autenticación | Servidor, Better Auth, tenant, Prisma client | Fuente (`.ts`) y generado (`generated/`, `dist/`) | Runtime | Navegador, scripts, pruebas | CRÍTICO |
| `web/` | Frontend estático servido | Interfaz de usuario, estilos, PWA | Fuente | Build (se copia a `dist/web/`) | Navegador | MÉDIO |
| `dist/web/` | Salida del build de frontend | Copia exacta de `web/` | Generado | Runtime (la sirve `api/server.ts`) | Navegador | MÉDIO |
| `prisma/` | Esquema y migraciones de la base de datos | Modelos, migraciones SQL, lock | Fuente | Build (se genera el client) | Prisma CLI, servidor | CRÍTICO |
| `scripts/` | Herramientas de desarrollo | Build web, check DB, setup admin, aislamiento, íconos | Fuente | Build/dev | Desarrollador, CI | MÉDIO |
| `docs/` | Documentación del proyecto | Arquitectura, estado, roadmap, auditoría | Fuente | — | Desarrollador | BAJO |
| `src/` | Frontend histórico (React) | Código sin uso | Fuente muerta | No se compila, no se sirve | Nadie | BAJO |
| `node_modules/` | Dependencias instaladas | Librerías de terceros | Generado por npm | Runtime/build | Todo el proyecto | — |
---

## 4. Archivos — análisis archivo por archivo

### Raíz

**`package.json`**
- FINALIDADE: define nombre, scripts y dependencias del proyecto.
- RESPONSABILIDAD: orquesta todos los comandos (dev, build, db, lint, test).
- FONTE: fuente. NO generado.
- QUIEN IMPORTA: npm, tsx, eslint, prisma, scripts.
- FUNCIONES IMPORTANTES: scripts `dev`, `dev:web`, `dev:api`, `build`, `build:web`, `build:api`, `db:generate`, `db:migrate`, `db:deploy`, `db:check`, `admin:setup`, `start:api`, `start:web`, `test`, `typecheck`, `lint`.
- DEPENDENCIAS: todas las del proyecto.
- O QUE ACONTECE SI ALTERO: cambia comandos y dependencias.
- REBUILD: no, pero puede necesitar `npm install`.
- REINICIAR: sí (el servidor usa estos scripts).
- RIESGO: MEDIO.
- FONTE DA VERDAD: SÍ.

**`tsconfig.json`**
- FINALIDADE: configuración de TypeScript raíz.
- RESPONSABILIDAD: compilación y type-check.
- FONTE: fuente.
- IMPORTANTE: `include` = `["api", "scripts", "web", "eslint.config.js"]`. **`src/` no está incluido.**
- COMPILA COMO: target ES2022, module ESNext, moduleResolution Bundler, `noEmit: true` (raíz).
- O QUE ACONTECE SI ALTERO: cambia reglas de type-check de todo el proyecto.
- REBUILD: typecheck. REINICIAR: no.
- RIESGO: MEDIO.

**`prisma.config.ts`**
- FINALIDADE: configuración de Prisma 7 (schema, migraciones, datasource).
- RESPONSABILIDAD: le dice a Prisma CLI dónde está el schema y las migraciones; toma `DATABASE_URL` de env.
- FONTE: fuente.
- QUIEN IMPORTA: Prisma CLI.
- O QUE ACONTECE SI ALTERO: cambia rutas de schema/migraciones.
- REBUILD: no. REINICIAR: no.
- RIESGO: ALTO (si se rompe, Prisma no conecta).
- FONTE DA VERDAD: SÍ.

**`eslint.config.js`**
- FINALIDADE: configuración de ESLint.
- FONTE: fuente.
- IGNORA: `dist`, `api/dist`, `node_modules`.
- RIESGO: BAJO.

**`docker-compose.yml`** — ver sección 10.

**`Dockerfile`** — ver sección 10.

**`.dockerignore`** — excluye `node_modules`, `dist`, `api/dist`, `api/generated`, `.git`, `.env`.

**`index.html`** (raíz)
- FINALIDADE: scaffold antiguo con `<div id="root">`.
- RESPONSABILIDAD: ninguna en el estado actual (no lo sirve `api/server.ts`; el servido es `web/index.html`).
- FONTE: fuente histórica. Código muerto.
- RIESGO: BAJO. No editar; candidato a eliminación cuando lo apruebe el usuario.

**`.env`** — ver sección 11. NO se muestran valores.

**`.env.example`** — ver sección 11.

**`.gitignore`** — ignora `node_modules/`, `dist/`, `api/dist/`, `api/generated/`, `.env`, `.env.*` (con excepción de `.env.example`).

**`README.md`** — documento de producto (módulos, planes, ejecución).

**`package-lock.json`** — lockfile npm `lockfileVersion: 3`. Generado por `npm install`. No editar manualmente.

---

### `api/` — backend

**`api/server.ts`**
- FINALIDADE: servidor HTTP del producto.
- RESPONSABILIDAD: enrutamiento de API y entrega de archivos estáticos.
- FONTE: fuente.
- QUIEN IMPORTA: `better-auth/node`, `./auth.js`, `./db.js`, `./tenant.js`.
- FUNCIONES IMPORTANTES: `handleMe`, `handleCompany`, `prismaPing`, `readJson`, `sendJson`, `sendBytes`, `contentType`.
- ROTAS: ver sección 6.
- CLAVE: `const port = Number(process.env.PORT ?? 3001)` y `const distDir = path.resolve(process.cwd(), "dist")`. **El directorio de trabajo (CWD) al iniciar el proceso determina qué `dist` se sirve.**
- O QUE ACONTECE SI ALTERO: cambia rutas, respuestas y comportamiento del servidor.
- REBUILD: `npm run build:api`. REINICIAR: sí.
- RIESGO: CRÍTICO.
- FONTE DA VERDAD: SÍ (para la API).

**`api/auth.ts`**
- FINALIDADE: configura Better Auth.
- RESPONSABILIDAD: email/contraseña, sesiones, adaptador Prisma.
- FONTE: fuente.
- QUIEN IMPORTA: `server.ts`, `tenant.ts`, `scripts/setup-admin.ts`.
- FUNCIONES IMPORTANTES: instancia `auth` de Better Auth.
- DEPENDENCIAS: `@better-auth/prisma-adapter`, `better-auth`, `./db.js`, `dotenv`.
- O QUE ACONTECE SI ALTERO: cambia la autenticación completa.
- REBUILD: `npm run build:api`. REINICIAR: sí.
- RIESGO: CRÍTICO.
- FONTE DA VERDAD: SÍ.

**`api/db.ts`**
- FINALIDADE: crea la instancia de PrismaClient.
- RESPONSABILIDAD: conexión PostgreSQL vía `@prisma/adapter-pg`.
- FONTE: fuente.
- QUIEN IMPORTA: `auth.ts`, `server.ts`, `tenant.ts`, scripts.
- CLAVE: requiere `DATABASE_URL`; sin ella, lanza error.
- REBUILD: `npm run build:api`. REINICIAR: sí.
- RIESGO: CRÍTICO.
- FONTE DA VERDAD: SÍ (para la conexión).

**`api/tenant.ts`**
- FINALIDADE: aislamiento multi-tenant y contexto de usuario/empresa.
- RESPONSABILIDAD: `authenticateUser`, `findContext`, `ensureCompany`, `makeSlug`.
- FONTE: fuente.
- QUIEN IMPORTA: `server.ts`, `scripts/verify-isolation.ts`.
- RIESGO: CRÍTICO (ver sección 8).
- REBUILD: `npm run build:api`. REINICIAR: sí.
- FONTE DA VERDAD: SÍ.

**`api/server.test.mjs`**
- FINALIDADE: prueba mínima de identidad.
- FONTE: fuente.
- QUIEN IMPORTA: `node --test`.

**`api/tsconfig.json`**
- EXTENDS el tsconfig raíz, `noEmit: false`, `outDir: ./dist`, `rootDir: .`, incluye solo `server.ts` (pero compila los imports de auth/db/tenant).

**`api/generated/`** — generado por `prisma generate`. Nunca editar manualmente (ver sección 16).

**`api/dist/`** — generado por `npm run build:api` (`tsc` + copia de generated). Nunca editar manualmente.
---

### `web/` — frontend real

**`web/index.html`**
- FINALIDADE: tela inicial completa (login, cadastro, servicios, PWA).
- RESPONSABILIDAD: estructura y contenido de la interfaz.
- FONTE: fuente. La Etapa 03 lo reescribió por completo.
- QUIEN IMPORTA: el navegador; referencia `/styles.css`, `/app.js`, `/manifest.json`, `/assets/logo-oficial.svg`.
- O QUE ACONTECE SI ALTERO: cambia la tela al hacer rebuild.
- REBUILD: `npm run build:web`. REINICIAR: no.
- RIESGO: MEDIO.
- FONTE DA VERDAD: SÍ, para la tela.

**`web/styles.css`**
- FINALIDADE: estilos completos de la tela (paleta, layout, responsive, botones).
- RESPONSABILIDAD: apariencia visual.
- FONTE: fuente. La Etapa 03 lo reescribió.
- O QUE ACONTECE SI ALTERO: cambian colores, tipografía, espacios, breakpoints.
- REBUILD: `npm run build:web`. REINICIAR: no.
- RIESGO: MEDIO (si se rompe, la tela se ve mal).
- FONTE DA VERDAD: SÍ, para el estilo.

**`web/app.js`**
- FINALIDADE: lógica del navegador (login, registro, logout, sesión, instalación PWA).
- RESPONSABILIDAD: conectar con la API, gestionar vistas, botón Instalar App.
- FONTE: fuente. La Etapa 03 lo modificó.
- QUIEN IMPORTA: el navegador (desde `index.html`).
- DEPENDENCIAS: API en `/api/auth/*`, `/api/me`, `/api/company`; PWA `beforeinstallprompt`, `appinstalled`, `serviceWorker`.
- O QUE ACONTECE SI ALTERO: cambia el comportamiento del cliente.
- REBUILD: `npm run build:web`. REINICIAR: no.
- RIESGO: MEDIO.
- FONTE DA VERDAD: SÍ, para la lógica de cliente.

**`web/manifest.json`** (Etapa 03)
- FINALIDADE: manifesto PWA.
- RESPONSABILIDAD: nombre, short_name, display, start_url, theme_color, íconos.
- FONTE: fuente.
- O QUE ACONTECE SI ALTERO: cambia la identidad de la app instalada.
- REBUILD: `npm run build:web`. REINICIAR: no.
- RIESGO: BAJO.

**`web/sw.js`** (Etapa 03)
- FINALIDADE: service worker con caché de bajo nivel (Cache API).
- RESPONSABILIDAD: responder solicitudes GET desde caché.
- FONTE: fuente.
- CLAVE: usa `caches.open`, `cache.match`, `cache.put` (API estándar).
- O QUE ACONTECE SI ALTERO: cambia la estrategia de caché offline.
- REBUILD: `npm run build:web`. REINICIAR: no (pero hay que re-registrar el SW).
- RIESGO: MEDIO.

**`web/assets/logo-oficial.svg`**
- FINALIDADE: logo de la marca.
- ESTADO: **CORRUPTO**. Ver sección 23.
- O QUE ACONTECE SI ALTERO: cambia la logo al hacer rebuild.
- REBUILD: `npm run build:web`. REINICIAR: no.
- RIESGO: el contenido actual está roto.

**`web/assets/favicon.svg`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`** (Etapa 03)
- FINALIDADE: favicon e íconos PWA.
- Los PNG son provisionales (color institucional sólido sin símbolo de marca).
- Se generan con `scripts/generate-icons.mjs`.
- REBUILD: `npm run build:web`. REINICIAR: no.

---

### `scripts/`

**`scripts/build-web.mjs`**
- FINALIDADE: copia `web/` → `dist/web/`.
- RESPONSABILIDAD: build del frontend (copia recursiva de subcarpetas).
- FONTE: fuente. No se modificó en la Etapa 03.
- SOPORTA `--watch` para desarrollo.
- O QUE ACONTECE SI ALTERO: cambia el proceso de build.
- REINICIAR: no.
- RIESGO: MEDIO.
- FONTE DA VERDAD: SÍ para el mecanismo de build web.

**`scripts/check-db.ts`** — prueba simple de conexión PostgreSQL (`SELECT 1`).

**`scripts/copy-prisma-client.mjs`** — copia `api/generated` → `api/dist/generated` después de `tsc`.

**`scripts/generate-icons.mjs`** (Etapa 03) — genera los PNG provisionales de PWA. No está en los scripts de `package.json` (se ejecuta a mano con `node scripts/generate-icons.mjs`).

**`scripts/setup-admin.ts`** — crea/actualiza el usuario admin y su membership (ADMIN) en la empresa `Zuarts Inova Simples (I.S.)`.

**`scripts/verify-isolation.ts`** — verifica aislamiento multi-tenant creando dos usuarios/empresas temporales y limpiándolos después.

---

### `prisma/`

Ver secciones 9 y 16 en detalle. Resumen:
- `prisma/schema.prisma`: modelos `Company`, `User`, `Membership`, `Account`, `Session`, `Verification` + enum `MembershipRole`.
- `prisma/migrations/`: 3 migraciones aplicables en orden.
- `prisma/migrations/migration_lock.toml`: lock de Prisma (provider postgresql). No editar manualmente.

---

### `docs/`

- `architecture.md`: decisiones de arquitectura (fundación, multiempresa, autenticación, aislamiento, CRM futuro).
---

## 5. Frontend

Estado real, confirmado en el código:

| Pregunta | Respuesta |
| --- | --- |
| ¿Cuál es el frontend real? | `web/` — HTML + CSS + JS estático plano (sin framework). |
| ¿Cuáles archivos son fuente? | `web/index.html`, `web/styles.css`, `web/app.js`, `web/manifest.json`, `web/sw.js`, `web/assets/*`. |
| ¿Cuáles son generados? | `dist/web/*` (copia exacta) y los PNG de PWA (generados por `generate-icons.mjs`). |
| ¿Qué archivo recibe el navegador? | `dist/web/index.html` servido por `api/server.ts` en `GET /`. Internamente carga `/styles.css` y `/app.js`. |
| ¿Se usa `src/`? | **NO.** No hay referencia a `src/App.tsx`, `src/main.tsx` ni `src/styles.css` desde ningún archivo de la API ni de `web/`. El `tsconfig.json` raíz tampoco incluye `src/`. |
| ¿Se usa `web/`? | SÍ, es la fuente real. |
| ¿Existe duplicidad? | SÍ. `src/` es una implementación paralela histórica (React) sin uso. La duplicidad de estilos es visible entre `src/styles.css` y `web/styles.css`. |

**¿Qué archivo editar para cambiar la tela?**

- Estructura y textos: `web/index.html`.
- Estilos, colores, tipografía, espaciado: `web/styles.css`.
- Lógica (login, logout, mostrar/ocultar vistas, Instalar App): `web/app.js`.
- Después de editar: `npm run build:web`.

---

## 6. API — rutas reales

Confirmadas en `api/server.ts` y Better Auth:

| METHOD | PATH | ARQUIVO | FUNCIÓN | AUTH | TENANT | BANCO | FINALIDAD |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GET | `/health` | api/server.ts | inline | no | no | no | estado del servicio |
| GET | `/health/db` | api/server.ts | `prismaPing` | no | no | sí (SELECT 1) | estado de la base |
| POST | `/api/auth/*` | api/auth.ts (Better Auth vía `toNodeHandler`) | — | depende de la ruta | no | sí (sesiones, usuarios) | login, signup, logout, sesión |
| GET | `/api/me` | api/server.ts | `handleMe` | sí (sesión) | sí (`findContext`) | sí (User, Membership, Company) | devuelve usuario, empresa, rol |
| POST | `/api/company` | api/server.ts | `handleCompany` | sí (sesión) | sí (`ensureCompany`) | sí (Company, Membership) | crea/obtiene la empresa del usuario |
| GET | `/` y `/…` estáticos | api/server.ts | inline | no | no | no | entrega archivos de `dist/web/` |

Rutas reales de Better Auth usadas por el frontend (`web/app.js`):
- `POST /api/auth/sign-in/email`
- `POST /api/auth/sign-up/email`
- `POST /api/auth/sign-out`

`GET /api/me` devuelve `{ ok, user, company, role }`. La role proviene de `Membership.role`.

---

## 7. Autenticación

Flujo de login confirmado:

```text
Navegador (web/app.js)
    → POST /api/auth/sign-in/email   (api/server.ts → authHandler → Better Auth)
    → Better Auth valida email+password contra table User (Account.password)
    → Crea Session en PostgreSQL (cookie de sesión en el navegador)
    → GET /api/me con la cookie
    → api/server.ts handleMe → authenticateUser (tenant.ts, lee la sesión)
    → findContext(userId) → Membership → Company
    → Responde { user, company, role }
```

Flujo de cadastro (sign-up):

```text
Navegador → POST /api/auth/sign-up/email (crea User)
    → POST /api/company { name } (api/server.ts handleCompany)
    → ensureCompany(user.id, name) crea Company + Membership(role OWNER)
    → refreshMe()
```

Flujo de logout:

```text
Navegador → POST /api/auth/sign-out → Better Auth elimina la sesión
    → refreshMe() → GET /api/me da 401 → se muestra el login
```

Roles: enum `MembershipRole` = `OWNER | ADMIN | MEMBER`. El rol ADMIN se asigna con `scripts/setup-admin.ts`.

Tablas de autenticación (migración 20260907120000): `Account`, `Session`, `Verification`, y campos `emailVerified`/`image` en `User`.

---

## 8. Multi-tenant

Cómo funciona el aislamiento (confirmado en `api/tenant.ts` y `api/server.ts`):

1. La API resuelve primero el usuario desde la sesión (`authenticateUser`).
2. `findContext(userId)` busca la `Membership` del usuario con su `Company`.
3. Toda consulta de negocio futura debe filtrar por `companyId` resuelto de la sesión.
4. Un usuario solo ve los datos de la empresa a la que pertenece.

Archivos responsables:
- `api/tenant.ts` — CRÍTICO.
- `api/server.ts` — CRÍTICO.
- `prisma/schema.prisma` (modelos `Company`, `Membership`, `User`) — CRÍTICO si se altera.
- `prisma/migrations/*` — CRÍTICO.

Clasificación: **CRÍTICO**. Una alteración en `tenant.ts`, en los filtros por `companyId`, o en el esquema de `Membership` puede romper el aislamiento entre empresas.

`scripts/verify-isolation.ts` verifica el aislamiento con dos usuarios/empresas temporales.
---

## 9. Banco / Prisma

- **Fuente del schema**: `prisma/schema.prisma`. Modelos: `Company`, `User`, `Membership`, `Account`, `Session`, `Verification` + enum `MembershipRole` + datasource `postgresql`.
- **Migrations**: `prisma/migrations/` con 3 migraciones aplicables en orden cronológico (20260907064256_init, 20260907120000_etapa02_auth_company, 20260907130000_etapa02_constraint_renames).
- **Client generado**: `api/generated/` — lo genera `npm run db:generate` (comando `prisma generate`). El generador apunta a `../api/generated` dentro del schema.
- **Copia para runtime**: `api/dist/generated/` — la genera `npm run build:api` (paso `scripts/copy-prisma-client.mjs`).
- **Quién usa el client**: `api/db.ts` (PrismaClient) → usado por `auth.ts`, `server.ts`, `tenant.ts`, `scripts/check-db.ts`, `scripts/verify-isolation.ts`, `scripts/setup-admin.ts`.
- **Qué NO debe editarse**: `api/generated/**`, `api/dist/**`, `prisma/migrations/migration_lock.toml`.
- **Presupuesto para editar**: solo `prisma/schema.prisma` + nueva migración (ver MANUAL DE EDIÇÃO).

Nota verificada: `prisma.config.ts` define `datasource.url = env("DATABASE_URL")`. Sin la variable, los comandos de Prisma fallan.

---

## 10. Docker

`docker-compose.yml` (confirmado):

| Servicio | Imagen | Puertos | Depende de | Volumen | Healthcheck |
| --- | --- | --- | --- | --- | --- |
| `db` | `postgres:17-alpine` | host 5433 → 5432 | — | `postgres_data:/var/lib/postgresql/data` | `pg_isready -U zuarts -d zuarts_conecta` (interval 5s, timeout 5s, retries 10) |
| `app` | build `.` | host 3001 → 3001 | `db` (service_healthy) | — | — |

Variables inyectadas al servicio `app`: `DATABASE_URL`, `PORT`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`.

Mapa de arranque:

```text
docker compose up
    → postgres:17-alpine (container zuarts-conecta-gestao-db-1, puerto 5433)
    → compila imagen app desde Dockerfile
    → app (puerto 3001) → node api/dist/server.js (vía tsx) → sirve dist/web y /api/auth, /api/me, /api/company
    → app consulta db por DATABASE_URL (host db)
```

`Dockerfile` (confirmado):
- Etapa build: `node:24-alpine`, `npm install`, `npm run build` (db:generate + build:web + build:api).
- Etapa runtime: copia `api/dist`, `api`, `dist`, `scripts`, `package*.json`; `npm ci --omit=dev`; `EXPOSE 3001`; `CMD node_modules/.bin/tsx api/dist/server.js`.
- `ENV DATABASE_URL=<cadena local de la variable>` en build, solo para poder ejecutar `prisma generate` sin conexión.

Estado en ejecución (auditoría): el contenedor `zuarts-conecta-gestao-db-1` está «Up (healthy)». Docker 29.7.2.

---

## 11. Environment

Variables reales en `.env` (una por línea, valores omitidos por seguridad). Para cada una: nombre, dónde se usa, finalidad, si es obligatoria, default, riesgo.

| Variable | Dónde se usa | Finalidad | Obligatoria | Default | Riesgo |
| --- | --- | --- | --- | --- | --- |
| `DATABASE_URL` | `api/db.ts`, `prisma.config.ts`, `docker-compose.yml` | Cadena de conexión a PostgreSQL | SÍ | ninguna (sin ella, el servidor no arranca) | CRÍTICO — contiene credenciales |
| `PORT` | `api/server.ts` | Puerto HTTP del servidor | no | 3001 | BAJO |
| `BETTER_AUTH_SECRET` | `api/auth.ts` | Firma y cifrado de sesiones Better Auth | SÍ | ninguna | CRÍTICO — secreto |
| `BETTER_AUTH_URL` | `api/auth.ts`, `docker-compose.yml` | URL pública base (trusted origins) | SÍ para el navegador | — | MEDIO |
| `ADMIN_EMAIL` | `scripts/setup-admin.ts`, `docker-compose.yml` | Email del usuario admin local | solo para setup | `admin@zuarts.local` (ejemplo) | MEDIO |
| `ADMIN_PASSWORD` | `scripts/setup-admin.ts`, `docker-compose.yml` | Contraseña del admin local | solo para setup | — | CRÍTICO — secreto |
| `ADMIN_NAME` | `scripts/setup-admin.ts`, `docker-compose.yml` | Nombre público del admin | no | `Administrador Zuarts` | BAJO |

`.env.example` documenta las mismas 7 variables con placeholders. `.env` NO se sube a git (`.gitignore`).

Regla: nunca revelar `DATABASE_URL`, `BETTER_AUTH_SECRET` ni `ADMIN_PASSWORD`.

---

## 12. Build

Package manager: **npm** (`package-lock.json` v3). No hay `bun.lock`, `turbo.json` ni `biome.jsonc` en este proyecto.

Mapa comando → script → archivo → resultado:

| Comando | Script | Archivo | Resultado |
| --- | --- | --- | --- |
| `npm run dev` | `concurrently -k "npm run dev:api" "npm run dev:web"` | package.json | API (tsx watch) + build web en watch |
| `npm run dev:web` | `npm run build:web -- --watch` | package.json | copia web/→dist/web/ en watch |
| `npm run dev:api` | `tsx watch api/server.ts` | api/server.ts | servidor API en :3001 con recarga |
| `npm run build` | `db:generate && build:web && build:api` | — | client Prisma + dist/web + api/dist |
| `npm run build:web` | `node scripts/build-web.mjs` | scripts/build-web.mjs | copia web/→dist/web/ |
| `npm run build:api` | `tsc -p api/tsconfig.json && node scripts/copy-prisma-client.mjs` | api/tsconfig.json, scripts/copy-prisma-client.mjs | api/dist + api/dist/generated |
| `npm run typecheck` | `tsc -p tsconfig.json --noEmit` | tsconfig.json | chequeo de tipos (sin emitir) |
| `npm run lint` | `eslint . --ext .ts,.tsx --max-warnings 0` | eslint.config.js | lint |
| `npm test` | `node --test` | *.test.mjs | tests |
---

## 13. Build web detallado

`scripts/build-web.mjs` (confirmado):

- Origen: `web/`.
- Destino: `dist/web/`.
- Proceso: borra `dist/web/` y copia recursivamente todo `web/` (incluye subcarpetas, p. ej. `assets/`).
- Transformaciones: ninguna. Copia directa archivo a archivo.
- Watch: `--watch` vigila cambios y reconstruye.
- Dependencias: solo `node:fs/promises`, `node:fs`, `node:path`, `node:url`. Sin dependencias de terceros.

Respuesta clave:
- «Si cambio X (un archivo en `web/`), ¿qué comando ejecutar?» → `npm run build:web`.
- En desarrollo (con `npm run dev`), el watch lo hace automáticamente.
- Si el servidor sirve desde `dist/web`, tras el build está servido sin reiniciar (el `tsx watch` local no recarga archivos estáticos, los lee de disco en cada petición).

---

## 14. PWA

Existe (Etapa 03). Archivos y estado:

| Elemento | Archivo | Estado |
| --- | --- | --- |
| `manifest.json` | `web/manifest.json` | Presente. name `ZUARTS SISTEMA DE GESTÃO`, short_name `ZUARTS`, display `standalone`, start_url `/`, scope `/`, theme_color `#0145A1`, background `#F7F8FA`, 3 íconos. |
| Service worker | `web/sw.js` | Presente. Caché con Cache API (cache-first GET). Se registra desde `web/app.js` en `load`. |
| Íconos | `web/assets/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` | Presentes. **Provisionales** (sólido azul, sin símbolo). |
| Favicon | `web/assets/favicon.svg` | Presente. |
| `beforeinstallprompt` | `web/app.js` | Presente: captura el evento, muestra el botón `#install-app` y llama `prompt()` real. |
| `appinstalled` | `web/app.js` | Presente: oculta el botón tras la instalación. |
| Registro SW | `web/app.js` | `navigator.serviceWorker.register("/sw.js")`. |

El botón «Instalar App» solo aparece cuando el navegador emite `beforeinstallprompt` y no simula instalación.

---

## 15. Dependencias

Dependencias de producción (`package.json`):

| Nombre | Versión | Finalidad | Usada por | Riesgo |
| --- | --- | --- | --- | --- |
| `better-auth` | ^1.7.3 | Autenticación email/contraseña, sesiones | api/auth.ts | ALTO |
| `@better-auth/prisma-adapter` | ^1.7.3 | Adaptador Prisma para Better Auth | api/auth.ts | ALTO |
| `@prisma/client` | ^7.6.0 | Cliente Prisma (types + runtime) | api/db.ts | ALTO |
| `@prisma/adapter-pg` | ^7.6.0 | Driver PostgreSQL para Prisma 7 | api/db.ts | ALTO |
| `pg` | ^8.16.3 | Driver PostgreSQL (native pool) | vía adapter | MEDIO |
| `dotenv` | ^17.2.2 | Carga `.env` | api/auth.ts, api/db.ts, prisma.config.ts, scripts | BAJO |
| `tsx` | ^4.20.5 | Ejecuta/recarga TypeScript en dev y Docker | scripts dev, Dockerfile CMD | MEDIO |

DevDependencies:

| Nombre | Versión | Finalidad | Riesgo |
| --- | --- | --- | --- |
| `prisma` | ^7.6.0 | CLI (generate, migrate) | — |
| `typescript` | ^5.9.2 | tsc | — |
| `eslint` + `typescript-eslint` + `@eslint/js` + `globals` | — | lint | — |
| `concurrently` | ^9.2.1 | `npm run dev` (API + web a la vez) | — |
| `@types/node` | ^24.5.2 | tipos Node | — |
| `@types/pg` | ^8.15.5 | tipos pg | — |

Dependencias **no declaradas** pero presentes en `node_modules` y en el árbol npm (peer/semi-dependencias): `react`, `react-dom`, `@radix-ui`, `@visx`, `@vitejs`, `@vitest`, `d3-*`, `effect`, `kysely`, `mysql2`, `postgres`, `zod`, `valibot`, `nanostores`, `elkjs`, etc. Algunas son peers opcionales de Prisma/Better Auth; otras quedaron de un scaffold/plantilla anterior. **NO eliminar** sin verificar el árbol real (`npm why <paquete>`).

---

## 16. Archivos generados

| Archivo / carpeta | Generado por | Fuente original | Comando | ¿Se puede editar manualmente? |
| --- | --- | --- | --- | --- |
| `api/generated/**` | Prisma CLI | `prisma/schema.prisma` | `npm run db:generate` | NO |
| `api/dist/**` (js) | TypeScript (`tsc`) | `api/*.ts` | `npm run build:api` | NO |
| `api/dist/generated/**` | `scripts/copy-prisma-client.mjs` | `api/generated/**` | `npm run build:api` | NO |
| `dist/web/**` | `scripts/build-web.mjs` | `web/**` | `npm run build:web` | NO |
| `web/assets/icon-*.png` | `scripts/generate-icons.mjs` | script (genera PNG sólidos) | `node scripts/generate-icons.mjs` | NO (regenerable) |
| `package-lock.json` | npm | `package.json` | `npm install` | NO |
| `node_modules/**` | npm | `package.json` + lockfile | `npm install` | NO |
| `npm run db:generate` | `prisma generate` | prisma/schema.prisma | api/generated/ |
| `npm run db:migrate` | `prisma migrate dev` | prisma/migrations | nueva migración + DB |
| `npm run db:deploy` | `prisma migrate deploy` | prisma/migrations | aplica migraciones a DB |
| `npm run db:check` | `tsx scripts/check-db.ts` | scripts/check-db.ts | verifica conexión |
| `npm run admin:setup` | `tsx scripts/setup-admin.ts` | scripts/setup-admin.ts | crea/actualiza admin |
| `npm run start:api` | `node api/dist/server.js` | api/dist/server.js | servidor de producción |
| `npm run start:web` | `node api/dist/server.js` | api/dist/server.js | idéntico a start:api |
- `current-state.md`: estado por etapa.
- `roadmap.md`: roadmap (Etapa 03 aguardando aprobación).
- `ESTRUTURA_DO_PROJETO.md`: este manual.
- `.env.exemplo_estrutura.md`: mapa rápido de edición.
---

## 17. Fonte da verdade por área

| Área | Fonte da verdad | Archivo | Motivo |
| --- | --- | --- | --- |
| Login | `web/app.js` + `api/auth.ts` | web/app.js (form), api/auth.ts (auth) | El formulario llama a la API real; la API valida |
| Cadastro | `web/app.js` + `api/server.ts` + `api/tenant.ts` | sign-up + POST /api/company + ensureCompany | El flujo real crea User, Company y Membership |
| Logout | `web/app.js` + `api/auth.ts` | sign-out | Better Auth elimina la sesión |
| Sesión | `api/tenant.ts` (authenticateUser) + Session (Prisma) | cookie → sesión → user | El contexto se resuelve desde la sesión |
| Web (HTML) | `web/index.html` | — | Fuente del sitio servido |
| CSS | `web/styles.css` | — | Fuente de la apariencia |
| API | `api/server.ts` | — | Enrutamiento y handlers |
| Auth | `api/auth.ts` | — | Configuración Better Auth |
| Tenant | `api/tenant.ts` | — | Aislamiento multi-tenant |
| Database | PostgreSQL (docker compose, servicio `db`) | — | Estado real de datos |
| Prisma | `prisma/schema.prisma` | — | Definición de modelos |
| Docker | `docker-compose.yml` + `Dockerfile` | — | Infraestructura local |
| Build | `package.json` scripts + `scripts/build-web.mjs` | — | Mecanismo de build |
| PWA | `web/manifest.json` + `web/sw.js` + `web/app.js` | — | Manifest, SW, eventos install |
| Environment | `.env` (real) + `.env.example` (documentado) | — | Variables de entorno |

---

## 18. Mapas de conexión (grafo real confirmado en el código)

### Web graph

```text
Navegador → GET / → api/server.ts → dist/web/index.html
index.html → /styles.css → dist/web/styles.css
index.html → /app.js → dist/web/app.js
index.html → /manifest.json → dist/web/manifest.json
index.html → /assets/logo-oficial.svg, /assets/favicon.svg, íconos
app.js → navigator.serviceWorker.register('/sw.js') → dist/web/sw.js
web/** ←build-web.mjs→ dist/web/**
```

### Auth graph

```text
app.js (sign-in/sign-up/sign-out)
    → POST /api/auth/* → api/server.ts (authHandler)
    → api/auth.ts (Better Auth)
    → @better-auth/prisma-adapter → prisma (generated)
    → Session / Account / User (PostgreSQL)
```

### API graph

```text
api/server.ts
    ├── /api/auth/* → authHandler (Better Auth)
    ├── /api/me → handleMe → authenticateUser + findContext (tenant.ts)
    ├── /api/company → handleCompany → ensureCompany (tenant.ts)
    ├── /health → inline
    └── /health/db → prismaPing → prisma
```

### Tenant / database graph

```text
findContext(userId) → prisma.membership.findFirst({ userId }) → company
ensureCompany(userId, name) → prisma.company.create + prisma.membership.create(role OWNER)
authenticateUser(headers) → auth.api.getSession() → user
prisma (api/db.ts) → @prisma/adapter-pg → pg → PostgreSQL (container db, puerto 5433)
```

### Docker graph

```text
docker compose up
    → db (postgres:17-alpine) puerto 5433, volumen postgres_data, healthcheck pg_isready
    → app (build Dockerfile) puerto 3001
        → node api/dist/server.js (CMD tsx api/dist/server.js)
        → DATABASE_URL apunta a db:5432
        → sirve dist/web y la API
```

### Build graph

```text
npm run build → db:generate + build:web + build:api
db:generate  → prisma generate → api/generated/
build:web    → build-web.mjs → dist/web/
build:api    → tsc api/tsconfig.json → api/dist/ ; copy-prisma-client.mjs → api/dist/generated/
```

### PWA graph

```text
manifest.json (link) → nombre, display standalone, íconos, theme_color
app.js → beforeinstallprompt → muestra #install-app → prompt() → appinstalled → oculta
app.js (load) → serviceWorker.register('/sw.js') → cache (Cache API) en fetch
```
---

## 19. Flujos de datos

Login: el navegador envia credenciales a Better Auth, que crea una Session.

Luego web/app.js llama /api/me, y api/tenant.ts resuelve empresa y role.

Cadastro: el navegador crea User y Account, y luego crea Company y Membership.

Archivos estaticos: api/server.ts sirve dist/web/, que copia web/.

---

## 20. Codigo historico

src/ contiene una aplicacion React historica y no participa en el servidor actual.

El frontend real continua en web/.

No se debe editar src/ para cambiar la pantalla local.

---

## 21. Seguridad y secretos

.env contiene credenciales locales y no se documentan sus valores.

.gitignore excluye .env.

BETTER_AUTH_SECRET, DATABASE_URL y ADMIN_PASSWORD son datos sensibles.

Los documentos no incluyen valores secretos.

El backend valida la sesion antes de resolver empresa y role.

---

## 22. Tratamiento de errores

api/server.ts devuelve JSON para las rutas de salud, sesion y empresa.

web/app.js muestra errores en #auth-message y #app-message.

/health/db devuelve 503 cuando Prisma no conecta.

Un servidor detenido produce ERR_CONNECTION_REFUSED.

Un build web correcto no inicia la API.

---

## 23. Logo y activos de marca

web/index.html referencia /assets/logo-oficial.svg.

El build copia la logo, el favicon y los iconos a dist/web/assets/.

La logo debe conservar la imagen oficial sin filtros ni distorsion.

Los iconos PWA actuales estan marcados como provisionales.

---

## 24. PWA y cache

web/manifest.json define nombre, iconos, colores, alcance y modo standalone.

web/sw.js responde peticiones GET mediante Cache API.

web/app.js registra el service worker durante el evento load.

beforeinstallprompt muestra el boton solo cuando el navegador lo permite.

appinstalled oculta el boton despues de la instalacion.

La aplicacion no simula una instalacion.

---

## 25. Responsividad y accesibilidad

web/styles.css usa una columna para pantallas pequenas.

Los botones ocupan el ancho disponible debajo de 480 pixels.

Los servicios usan cuatro, dos o una columna segun el ancho disponible.

Los formularios usan labels asociados por for e id.

Los iconos decorativos usan aria-hidden="true".

Los mensajes dinamicos usan role="status".

---

## 26. Autenticacion y sesion

Better Auth usa email y password con Prisma Adapter.

credentials: include envia la cookie de sesion.

authenticateUser obtiene la sesion desde los headers.

El logout usa POST /api/auth/sign-out.

La vista activa aparece despues de una respuesta correcta de /api/me.

---

## 27. Multi-tenant

Company representa una empresa.

Membership conecta usuarios con empresas y contiene el role.

findContext resuelve la empresa mediante la membership del usuario.

ensureCompany crea la empresa y la membership inicial.

Las futuras consultas de negocio deben usar el companyId resuelto.

---

## 28. Banco y migraciones

El schema fuente es prisma/schema.prisma.

Las migraciones existentes estan en prisma/migrations/.

Membership usa companyId y no organizationId.

npm run db:generate regenera el cliente Prisma.

La interfaz no requiere una migracion para cambiar HTML o CSS.

No se ejecuta prisma migrate reset durante esta auditoria.

---

## 29. Docker y ejecucion local

db usa postgres:17-alpine y publica PostgreSQL en localhost:5433.

app publica HTTP en localhost:3001.

El healthcheck espera PostgreSQL antes de iniciar app.

El desarrollo local usa npm.cmd run dev desde zuarts-conecta-gestao.

Un terminal abierto mantiene los procesos de desarrollo activos.

---

## 30. Conclusion y pendientes

El proyecto tiene autenticacion y aislamiento multi-tenant funcionales.

El frontend real es estatico y se sirve desde dist/web/.

La fuente de la pantalla es web/.

Los iconos PWA provisionales necesitan activos oficiales.

La auditoria no modifica codigo, banco, Prisma ni Docker.

La Etapa 04 no fue iniciada.

No se implementaron modulos de negocio.
