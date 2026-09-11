# ETAPA 03 — Planos, limites e assinaturas

## Estrutura

Esta etapa adiciona `Plan` e `Subscription`.
Ela preserva Company, User, Membership, BusinessProfile e Contact.

```text
Company
├── BusinessProfile
└── Subscription[]
    └── Plan
```

Cada Company possui no máximo uma assinatura atual.
O índice parcial `Subscription_current_company_key` garante essa regra no PostgreSQL.
As assinaturas anteriores permanecem na mesma tabela.
A troca cancela a assinatura anterior e cria uma assinatura atual, na mesma transação.
O histórico preserva planId e datas. Ele não representa um histórico de faturas ou preços contratados.

`Plan` armazena nome, slug, descrição, preço, moeda, periodicidade, limites, disponibilidade, ordem e datas.
`isDefault` identifica o plano inicial sem depender do nome comercial.
Um índice parcial permite somente um plano padrão.
As restrições SQL impedem preços negativos, faixas inválidas e períodos personalizados sem duração positiva.

## Enums

- `SubscriptionStatus`: ACTIVE, PENDING, SUSPENDED, CANCELLED e EXPIRED.
- `BillingPeriod`: MONTHLY, QUARTERLY, SEMIANNUAL, YEARLY e CUSTOM.

Os registros iniciais usam MONTHLY.
CUSTOM utiliza `customPeriodDays`. Esta etapa não agenda cobranças.

## Migration e catálogo

Migration: `20260910160000_etapa06_plans_subscriptions`.
Ela sucede as duas migrations `etapa05` da Etapa 02.
Ela cria as tabelas, enums, índices, restrições e dados iniciais.
Ela associa as empresas existentes ao plano compatível com a contagem atual de contatos.
Ela preserva os registros existentes.

| Plano inicial | Mínimo comercial | Máximo | Preço inicial | Moeda | Período |
| --- | --- | --- | --- | --- | --- |
| Essencial | 0 | 10 | 100,00 | BRL | MONTHLY |
| Profissional | 11 | 30 | NULL | BRL | MONTHLY |
| Premium | 31 | NULL | NULL | BRL | MONTHLY |

O preço usa `Decimal(12,2)` no banco.
O JSON transporta o preço como texto decimal. A interface formata a moeda com Intl.
Preço nulo significa preço ainda não definido. A interface não apresenta esse valor como gratuidade.
Máximo nulo significa ausência de limite superior.
Nomes, descrições, preços e limites vêm do banco.

## Contagem e limites

`Contact` representa o contato atual da Company no CRM.
Ele ainda não distingue cliente comercial, prospecto ou outra relação.
Nesta etapa, cada Contact existente conta como um cliente para o limite.
A contagem inclui contatos arquivados. A listagem atual do CRM também inclui esses registros.
A exclusão de um contato reduz a contagem.
Nenhum model Customer integra esta entrega.

`getCompanyClientCount` centraliza essa definição.
Uma futura classificação de clientes altera essa função, sem duplicar registros.
Todas as consultas filtram por `companyId`.

O máximo é o limite operacional de inclusão.
O mínimo descreve a faixa comercial e orienta a associação inicial das empresas existentes.
A empresa pode escolher antecipadamente um plano com maior capacidade.
A troca para um máximo inferior à quantidade existente retorna `plan_capacity_exceeded`.
Nenhuma troca exclui contatos para ajustar o limite.

Uma assinatura precisa estar ACTIVE e dentro das datas de vigência.
O plano também precisa estar ativo.
Assinaturas pendentes, suspensas, canceladas ou expiradas bloqueiam novas inclusões.
Elas continuam disponíveis para consulta.
A seleção interna não reativa essas assinaturas.

O status efetivo considera `endsAt`, mesmo com status armazenado ACTIVE.
`startedAt` futuro também bloqueia inclusões.
Nenhuma rotina automática modifica status ou realiza cobrança.

## Serviços

Arquivo: `api/plans/service.ts`.

| Serviço | Responsabilidade |
| --- | --- |
| `getCompanyPlan` | Consulta a assinatura atual e seu plano. |
| `getCompanyClientCount` | Conta os contatos da Company. |
| `getCompanyUsage` | Retorna plano, assinatura, estado efetivo, uso e disponibilidade. |
| `withClientCapacity` | Verifica o limite e executa a inclusão na mesma transação. |
| `lockCompany` | Serializa inclusões e trocas de plano da mesma empresa. |
| `createInitialSubscription` | Associa uma nova empresa ao plano padrão ativo. |
| `planSelectionReason` | Centraliza as restrições da escolha de plano. |
| `selectCompanyPlan` | Troca o plano e preserva o histórico. |

O bloqueio PostgreSQL usa a linha da Company com `FOR UPDATE`.
A criação de Contact e a troca de plano usam esse mesmo bloqueio.
Duas inclusões simultâneas não ultrapassam a última vaga disponível.
A integração altera somente o ponto de criação de Contact no CRM.

## Assinatura inicial

O fluxo existente de criação de Company continua com os mesmos dados e endpoints.
Company, Membership e assinatura inicial são gravados na mesma transação.
O script `setup-admin.ts` também usa o serviço de assinatura inicial.
Empresas novas recebem o plano padrão ativo configurado no banco.
Ausência de plano padrão não impede o cadastro da empresa.
Nesse estado, novas inclusões ficam bloqueadas até a associação a um plano disponível.
OWNER ou ADMIN pode fazer essa associação na tela Planos.

As assinaturas iniciais ficam ACTIVE, sem vencimento automático.
Essa escolha permite validar limites antes da implementação comercial de cobrança.
A seleção não representa pagamento ou confirmação de uma venda.

## API e autorização

| Método | Endpoint | Resultado |
| --- | --- | --- |
| GET | `/api/plans` | Planos ativos e disponibilidade de seleção calculada pelo backend. |
| GET | `/api/plans/:id` | Consulta de um plano ativo. |
| GET | `/api/subscription` | Plano, assinatura atual, uso e permissão de gestão. |
| GET | `/api/subscription/usage` | Mesmo contexto, disponível para consumidores de limite. |
| PUT | `/api/subscription` | Seleção interna do plano com `{ "planId": "uuid" }`. |

A sessão identifica o usuário. Membership determina a Company.
As consultas e alterações usam somente o companyId desse contexto.
Zod rejeita campos adicionais, companyId e subscriptionId no corpo da seleção.
PlanId identifica uma opção, sem conceder autorização.
O backend verifica existência, disponibilidade e capacidade do plano.
Somente OWNER ou ADMIN da Company altera o plano.
MEMBER consulta os dados, mas não altera a assinatura.
As respostas usam `Cache-Control: no-store`.
O service worker continua sem armazenar respostas da API.

## Interface

Fluxo: Dashboard → Perfis de Negócio → Planos.
A navegação interna apresenta Visão Geral e Planos.
Descrição ainda não existe na Etapa 02. Nenhuma tela vazia integra esta entrega.
Serviços Adicionais permanece como extensão futura da navegação.

A tela apresenta cards do catálogo, plano atual, status, contagem real e limite.
Planos limitados apresentam uma barra com percentual real.
Planos ilimitados apresentam a quantidade real, sem barra artificial.
As respostas da API determinam a disponibilidade dos botões.
Erros apresentam mensagem e nova tentativa.
Mudanças de sessão ou área cancelam requisições e limpam os dados locais.
O CSS mantém a identidade atual e corrige o texto dos botões azuis no tema escuro.

## Arquivos desta etapa

Criados:

- `api/plans/service.ts`
- `api/plans/router.ts`
- `api/plans/validation.ts`
- `api/plans/plans.test.mjs`
- `api/plans/scenarios.mjs`
- `prisma/migrations/20260910160000_etapa06_plans_subscriptions/migration.sql`
- `web/plans.js`
- `scripts/browser-session.mjs`
- `scripts/verify-plans-ui.mjs`
- `docs/ETAPA_03_PLANOS_ASSINATURAS.md`

Alterados:

- `prisma/schema.prisma`
- `api/server.ts`
- `api/tenant.ts`
- `api/crm/contacts.ts`
- `scripts/setup-admin.ts`
- `web/app.js`
- `web/index.html`
- `web/styles.css`
- `web/sw.js`

## Validação

| Verificação | Resultado |
| --- | --- |
| Prisma validate e generate | Passam. |
| Migration deploy | Migration aplicada ao PostgreSQL local. |
| Prisma migrate diff | Nenhuma diferença detectada. |
| `npm test` | 44 testes passam, sem falhas ou testes ignorados. |
| Regressão de CRM e Etapa 02 | Todos os testes passam. |
| `npm run typecheck` | Passa. |
| `npm run build` | Build web e API passam. |
| ESLint dos arquivos desta etapa | Passa. |
| `npm run lint` | Mantém três erros existentes no teste do CRM. |
| `docker compose up -d --build` | Build e inicialização passam. |
| Aplicação, `/health` e `/health/db` | HTTP 200 em localhost:3001. |
| Chrome com API real | Navegação, cards, uso, seleção e persistência passam. |
| Chrome em 320 pixels e tema escuro | Passa, sem rolagem horizontal da página. |
| Console do fluxo verificado | Nenhum erro JavaScript. |

O teste visual cria uma empresa temporária e oito contatos pela API real.
Ele valida 8/10, troca para Profissional e verifica 8/30.
Ele troca para Premium e confirma ausência de barra de limite.
Ele confirma a persistência após recarga e limpa seus registros temporários.

```powershell
node scripts/verify-plans-ui.mjs 'C:\Program Files\Google\Chrome\Application\chrome.exe'
```

## Issues

1. BROKEN — O lint geral encontra três blocos vazios anteriores em `api/crm/crm.test.mjs`, nas linhas 44, 55 e 216.
   Fix: pendente. A alteração de limites preserva esse teste existente.
2. RISK — O npm mantém quatro alertas altos em `prisma`, `@prisma/config`, `deepmerge-ts` e `mysql2`.
   Fix: pendente. Revisar as dependências existentes em trabalho específico.
3. BROKEN — O comando `mdn` não está disponível. A consulta de tarefas do Median falha.
   Fix: pendente. Disponibilizar o CLI do Median.
