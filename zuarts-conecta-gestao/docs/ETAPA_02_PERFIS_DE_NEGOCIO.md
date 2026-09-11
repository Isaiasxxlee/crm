# ETAPA 02 — Perfis de Negócio

A implementação preserva Node.js, TypeScript, node:http, PostgreSQL, Prisma, HTML, CSS, JavaScript, PWA e Docker.
As alterações permanecem no working tree. Nenhum commit ou push integra esta entrega.

## Arquivos criados

- `api/business-profile/router.ts`: endpoints autenticados e validação das relações.
- `api/business-profile/validation.ts`: schema Zod e tipo derivado para entrada.
- `api/business-profile/business-profile.test.mjs`: servidor e empresas isoladas para testes.
- `api/business-profile/scenarios.mjs`: cenários de integração.
- `prisma/migrations/20260910120000_etapa05_business_profiles/migration.sql`: estrutura e dados iniciais.
- `prisma/migrations/20260910121000_etapa05_business_profile_labels/migration.sql`: correção dos acentos dos dados iniciais.
- `web/business-profile.js`: seleção, resumo, gravação, edição e tratamento de falhas.
- `scripts/verify-business-profile-ui.mjs`: verificação automatizada no Chrome, com API simulada.
- `docs/ETAPA_02_PERFIS_DE_NEGOCIO.md`: relatório desta entrega.

## Arquivos alterados

- `api/server.ts`: encaminha as rotas do perfil.
- `prisma/schema.prisma`: adiciona quatro models e a relação com Company.
- `package.json` e `package-lock.json`: declaram Zod como dependência direta.
- `web/app.js`: integra navegação e limpa o perfil durante mudanças de sessão.
- `web/index.html`: adiciona a tela e organiza o menu solicitado.
- `web/styles.css`: adiciona cards, seleção, responsividade e cores do perfil.
- `web/sw.js`: atualiza a versão do cache dos arquivos estáticos.

## Models e relações

`Company` possui zero ou um `BusinessProfile`.
O índice único em `BusinessProfile.companyId` impede dois perfis para a mesma empresa.
A exclusão de Company remove seu perfil pela relação existente no banco.

`BusinessSegment` possui vários `BusinessType`.
Cada tipo pertence a um segmento.
Cada tipo possui zero ou várias especialidades.
Cada `Specialty` pertence a um tipo.

O perfil armazena `businessTypeId` e `specialtyId` opcional.
O tipo determina o segmento. O perfil não duplica essa informação.
Uma chave estrangeira composta vincula `specialtyId` e `businessTypeId` ao mesmo registro de Specialty.
Essa restrição impede especialidades incompatíveis também em gravações diretas no banco.

O seed cadastra sete segmentos, 27 tipos e cinco especialidades.
As migrations armazenam esses dados no PostgreSQL.
O backend e a interface usam IDs e relações. Nenhuma regra depende do nome do negócio.
O catálogo aceita novos registros no banco. Esta etapa não cria CRUD administrativo.

## Endpoints

| Método | Rota | Resultado |
| --- | --- | --- |
| GET | `/api/business-profile/segments` | Segmentos ordenados por posição e nome. |
| GET | `/api/business-profile/types?segmentId=<uuid>` | Tipos do segmento. |
| GET | `/api/business-profile/specialties?businessTypeId=<uuid>` | Especialidades do tipo. |
| GET | `/api/business-profile` | Perfil da empresa autenticada, ou `null`. |
| PUT | `/api/business-profile` | Cria ou atualiza o perfil da empresa autenticada. |

PUT recebe `segmentId`, `businessTypeId` e `specialtyId` opcional.
Omissão ou `null` em `specialtyId` remove a especialidade.
Zod rejeita IDs inválidos e campos adicionais, inclusive `companyId` e `id`.
Registros inexistentes retornam 404. Relações incompatíveis retornam 400.
Sessão ausente retorna 401. Usuário sem Membership retorna 403.
As respostas usam `Cache-Control: no-store`.

## Isolamento entre empresas

O backend usa `authenticateUser` e `findContext`, existentes no projeto.
Essas funções resolvem a sessão, Membership e Company.
Todas as consultas e gravações de perfil filtram pelo `companyId` desse contexto.
A URL não oferece consulta de perfil por ID arbitrário.
O frontend não determina a empresa autorizada.
O frontend cancela requisições e limpa dados durante mudanças de sessão ou área.
O service worker continua sem armazenar respostas da API.

## Tela

O menu posiciona Perfis de Negócio após Dashboard.
A sequência continua com Empresas, Usuários, CRM, Agenda, Clientes, Atendimentos, Vendas, Financeiro, Relatórios, Estoque e Configurações.
A estrutura visual da sidebar permanece.

A tela apresenta segmento, tipo, especialidade opcional e resumo antes da gravação.
A troca de segmento limpa tipo e especialidade.
A troca de tipo limpa a especialidade.
Tipos sem especialidades não apresentam uma etapa vazia.
Após salvar, a tela apresenta o resumo e Editar Perfil.
Falhas mantêm as escolhas e oferecem Tentar novamente.

A área possui navegação interna com Visão Geral.
Novas entradas futuras usam essa área sem transformar o dashboard.
Planos e Serviços Adicionais permanecem fora do modelo BusinessProfile.
Esta entrega não cria essas entidades, telas ou regras.

## Validação

| Verificação | Resultado |
| --- | --- |
| `npm run db:generate` | Prisma Client gerado. |
| `npm run db:deploy` | Duas migrations aplicadas ao PostgreSQL local. |
| `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` | Nenhuma diferença. |
| `npm test` | 26 testes passam. Nenhum teste falha ou fica ignorado. |
| Testes existentes do CRM | Todos passam. |
| `npm run build` | Build web e API passam. |
| `npm run typecheck` | Passa. |
| ESLint dos arquivos implementados | Passa. |
| `npm run lint` | Três erros existentes no teste do CRM. |
| `docker compose build app` | Passa. |
| `git diff --check` | Passa. |
| Chrome sem janela | Fluxos visuais passam com API simulada. |

Os testes de integração usam sessão real, Membership real e PostgreSQL real.
Eles cobrem criação de segmento, catálogos, criação, atualização, consulta, especialidade opcional e isolamento.
Eles também cobrem dados inválidos, registros inexistentes, incompatibilidades, ausência de autenticação e ausência de Membership.
As restrições de especialidade e unicidade também recebem testes diretos no banco.

O teste visual cobre criação, edição, recarga, falha de gravação, nova tentativa e preservação do Dashboard.
Ele também verifica teclado, largura de 320 pixels, tema escuro e erros JavaScript.

Execução do teste visual:

```powershell
node scripts/verify-business-profile-ui.mjs 'C:\Program Files\Google\Chrome\Application\chrome.exe'
```

## Issues

1. BROKEN — O lint geral encontra três blocos vazios em `api/crm/crm.test.mjs`, nas linhas 44, 55 e 216.
   Fix: pendente. Esta entrega preserva o CRM.
2. RISK — O npm reporta quatro alertas altos em `prisma`, `@prisma/config`, `deepmerge-ts` e `mysql2`.
   Fix: pendente. A atualização exige análise separada das dependências existentes.
3. BROKEN — O comando `mdn` não existe no ambiente. A consulta de tarefas do Median falha.
   Fix: pendente. Instalar ou disponibilizar o CLI do Median.
4. RISK — Aplicar somente a primeira migration mantém rótulos sem acentos.
   Fix: segunda migration criada e aplicada. Usar `npm run db:deploy` aplica ambas. I caused this.
