# Estado atual

O produto se chama ZUARTS SISTEMA DE GESTÃO.

A empresa se chama Zuarts Inova Simples (I.S.).

O nome técnico do projeto permanece `zuarts-conecta-gestao`.

## Etapa 01

O projeto possui PostgreSQL local em Docker.

O projeto usa Prisma 7 com o adapter PostgreSQL.

O banco usa a variavel `DATABASE_URL` na raiz do projeto.

O schema inicial possuia `Organization`, `User` e `Membership`.

`Membership` conecta cada usuario a uma organizacao com uma funcao.

A migration inicial foi aplicada no banco local.

O endpoint `/health/db` valida uma consulta real no PostgreSQL.

A validacao final da Etapa 01 foi concluida com sucesso.

Nao existe seed porque o schema nao precisa de dados obrigatorios.

## Etapa 02

A Etapa 02 agrega autenticacao e a fundacion multiempresa.

### Autenticacion com Better Auth

Better Auth maneja o registro, o inicio de sessao e a saida por email e contrasena.

As sesiones se almacenam na base de datos na tabela `Session`.

A rota `/api/auth/*` se monta sobre o servidor Node existente.

As credenciales secretas vivem em variaveles de entorno. Nao hay secrets no codigo.

Variaveles novas: `BETTER_AUTH_SECRET` y `BETTER_AUTH_URL`.

### Empresa e tenant

O modelo `Organization` da Etapa 01 se renombró a `Company`.

`Company` representa a empresa ou tenant.

Todo usuario pertence a uma empresa mediante `Membership`.

`Membership` conecta `User` com `Company` e guarda o rol (`OWNER`, `ADMIN`, `MEMBER`).

### Usuario

`User` guarda a identidade da pessoa.

Um usuario pode ter varias pertenencias, uma por empresa.

A fundacion sostiene proprietario, administrador e usuario operativo sem um sistema complexo de permisos.

### Aislamiento multi-tenant

A API sempre resolve o contexto a partir do usuario autenticado.

As consultas se filtram pela `Membership` do usuario.

Um usuario solo ve a empresa a que pertenece.

A decision se documenta em `docs/architecture.md`.

### Migrations

Migration nova: `20260907120000_etapa02_auth_company`.

Nao se reinició a base de datos. Se conservaram as migrations anteriores.

### Comandos de validacion

Iniciar Docker: `docker compose up -d db`

Verificar PostgreSQL: `npm run db:check`

Aplicar migrations: `npm run db:deploy`

Type-check: `npm run typecheck`

Lint: `npm run lint`

Tests: `npm test`

Build: `npm run build`

Verificar aislamiento: `npx tsx scripts/verify-isolation.ts`

### Estado atual

Autenticacion, registro, login e logout funcionam.

A creacion e asociacion de empresa funcionam.

O aislamiento por empresa esta verificado.

## Limites

Gestao Geral, Saude, Saude Animal, CRM, IA, agentes, vendas, estoque e financeiro nao foram implementados.

CRM e Agentes pertencem ao modulo futuro de relacionamento.

CRM de referencia segue como material arquitectural para o modulo futuro.

Nao se implementaram permisos complexos. Só a fundacion extensible.
