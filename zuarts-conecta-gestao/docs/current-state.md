# Estado atual

O produto se chama ZUARTS SISTEMA DE GESTÃO.

A empresa se chama Zuarts Inova Simples (I.S.).

O nome técnico do projeto permanece `zuarts-conecta-gestao`.

## Etapa 01

O projeto possui PostgreSQL local em Docker.

O projeto usa Prisma 7 com o adapter PostgreSQL.

O banco usa a variavel `DATABASE_URL` na raiz do projeto.

O schema inicial possui `Organization`, `User` e `Membership`.

`Membership` conecta cada usuario a uma organizacao com uma funcao.

A migration inicial foi aplicada no banco local.

O endpoint `/health/db` valida uma consulta real no PostgreSQL.

A validacao final da Etapa 01 foi concluida com sucesso.

Nao existe seed porque o schema nao precisa de dados obrigatorios.

## Limites

Gestao Geral, Saude, Saude Animal, CRM, IA, agentes, vendas, estoque e financeiro nao foram implementados.

CRM e Agentes pertencem ao módulo futuro de relacionamento.
