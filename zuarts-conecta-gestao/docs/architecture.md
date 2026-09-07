# Arquitetura

## Fundacao de dados

O projeto usa Node.js, TypeScript e Prisma.

O banco usa PostgreSQL em Docker para desenvolvimento local.

O cliente Prisma usa `@prisma/adapter-pg`.

O servidor cria uma instancia reutilizavel de `PrismaClient`.

## Multiempresa

`Organization` representa uma empresa ou tenant.

`User` representa uma pessoa que acessa o sistema.

`Membership` representa a relacao entre pessoa e tenant.

As futuras entidades de negocio devem conter `organizationId`.

As consultas futuras devem filtrar pelo tenant autenticado.

## Limite da etapa

Esta etapa cria somente a fundacao do banco.

Esta etapa nao cria regras de negocio.

## Arquitetura futura do módulo CRM e Agentes

O CRM será um módulo futuro do ZUARTS SISTEMA DE GESTÃO.

A arquitetura Agentic-first será referência para esse módulo futuro.

Os conceitos futuros incluem agentes assíncronos, work queue, tasks, skills, tools, evidências, auditoria, rechecagem, pesquisa, enriquecimento, automações e sandbox.

A API e o Agent permanecem separados.
