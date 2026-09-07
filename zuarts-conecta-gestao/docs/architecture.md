# Arquitetura

## Fundacao de dados

O projeto usa Node.js, TypeScript e Prisma.

O banco usa PostgreSQL em Docker para desenvolvimento local.

O cliente Prisma usa `@prisma/adapter-pg`.

O servidor cria uma instancia reutilizavel de `PrismaClient`.

## Multiempresa

`Company` representa uma empresa ou tenant.

`User` representa uma pessoa que acessa o sistema.

`Membership` representa a relacao entre pessoa e tenant.

As futuras entidades de negocio devem conter `companyId`.

As consultas futuras devem filtrar pelo tenant autenticado.

## Decisions implementadas na Etapa 02

### Autenticacion

Better Auth se integra ao servidor Node existente na rota `/api/auth/*`.

O registro, login e logout usam email e contrasena.

As sesiones se guardan na tabela `Session`.

### Empresa como tenant

Na Etapa 02 o modelo `Organization` se renombró a `Company`.

A migration `20260907120000_etapa02_auth_company` realiza o renome e cria as tabelas de autenticacion.

### Aislamiento multi-tenant

Esta es uma decision arquitectural fundamental.

A API nunca confia na interface para isolar datos.

A API resolve primeiro o usuario desde a sesion autenticada.

A API filtra las consultas pela `Membership` desse usuario.

Um usuario solo acessa datos da empresa a que pertence.

Nenhun modulo futuro podera consultar datos de outra empresa sem essa validacion.

### Variaveles de entorno

`BETTER_AUTH_SECRET` firma y cifra datos de autenticacion. Viver so em entorno.

`BETTER_AUTH_URL` define a URL base publica da aplicacion.

Nenhun secret existe no codigo.

## Limite da etapa

A fundacion da Etapa 02 crea autenticacion e multiempresa.

A Etapa 02 nao cria regras de negocio.

## Arquitetura futura do módulo CRM e Agentes

O CRM será um módulo futuro do ZUARTS SISTEMA DE GESTÃO.

A arquitetura Agentic-first será referência para esse módulo futuro.

Os conceitos futuros incluem agentes assíncronos, work queue, tasks, skills, tools, evidências, auditoria, rechecagem, pesquisa, enriquecimento, automações e sandbox.

A API e o Agent permanecem separados.
