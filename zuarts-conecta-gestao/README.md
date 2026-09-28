# ZUARTS SISTEMA DE GESTÃO

**Zuarts Inova Simples (I.S.)**

Plataforma SaaS Web + PWA para gestão empresarial.

Nome técnico do projeto: `zuarts-conecta-gestao`.

## Módulos

### Gestão Geral

- Dashboard
- Clientes
- Fornecedores
- Vendas
- Produtos
- Estoque
- Financeiro
- Preço & Margem
- Propostas
- Relatórios
- Usuários
- Configurações

### Saúde

#### Saúde Humana

- Pacientes
- Profissionais
- Agenda
- Atendimentos
- Prontuários
- Procedimentos
- Histórico
- Financeiro
- Relatórios

#### Saúde Animal

- Clientes/Tutores
- Pets
- Agenda
- Atendimentos
- Procedimentos
- Vacinas
- Histórico
- Financeiro
- Relatórios

### Marketing

- Redes Sociais
- Tráfego Pago
- Landing Pages
- Websites

### Administração

- Usuários
- Empresa
- Planos
- Configurações

### CRM — FUTURO

- Leads
- Contatos
- Empresas
- Oportunidades
- Pipeline
- Deals
- Atividades
- Follow-ups
- Evidence
- Agent Tasks
- Agent Runs

**O CRM é um módulo futuro do ZUARTS SISTEMA DE GESTÃO, e não o nome do produto.**

## CRM de Referência

O CRM que aparece como referência é somente material de referência arquitetural.

Os conceitos técnicos já estudados permanecem como referência para o módulo futuro.

**Os conceitos Agentic-first serão utilizados futuramente no módulo CRM do ZUARTS SISTEMA DE GESTÃO.**

- agentes assíncronos;
- work queue;
- tasks;
- skills;
- tools;
- evidências;
- auditoria;
- rechecagem;
- pesquisa;
- enriquecimento;
- automações;
- sandbox;
- separação entre API e Agent.

Source → Evidence → Interpretation → Suggestion → Human confirmation → Official data

Nenhuma informação sobre uma pessoa ou empresa deve ser inventada pelo agente.

## Planos

O catálogo de planos vive no banco de dados. Nomes, preços, limites e módulos vêm do registro do plano.

### Essencial — R$100,00/mês

Faixa comercial: 0 a 10 clientes.

- Dashboard
- Clientes
- Fornecedores
- Produtos
- Vendas
- Estoque
- Financeiro
- Relatórios
- Usuários
- Configurações

### Profissional — preço por definir

Faixa comercial: 11 a 30 clientes.

- Tudo do Essencial
- Preço & margem
- Propostas

### Premium — preço por definir

Faixa comercial: 31 clientes ou mais.

- Tudo do Profissional

Preço nulo significa preço por definir. Preço nulo não significa gratuidade.

Não existe Plano Gestão.

## Execução local

```text
npm install
docker compose up -d db
npm run db:migrate -- --name init
npm run db:check
npm run dev
```

Web: http://localhost:3001

API: http://localhost:3001/health

Banco: http://localhost:3001/health/db

## Status atual

Atualizado em 2026-09-28, depois da Etapa 08 (Caixa de entrada com mensagens da Meta).

### Estágio

Fundação SaaS pronta. Primeira caixa de entrada construída. O caminho Instagram → Meta → ZUARTS está implementado e testado com eventos simulados e assinados.

**Instagram: webhook, gravação e caixa de entrada implementados. Nenhuma mensagem real da Meta foi recebida ainda.** A prova real depende da configuração do app IACERES (ver abaixo).

### Funcional (confirmado por teste automatizado)

- Cadastro, login e logout com e-mail e senha (Better Auth). Sessão no banco.
- Empresa (tenant) criada no primeiro login, com papel `OWNER`.
- Isolamento por empresa: toda consulta do CRM e da caixa de entrada filtra por `companyId`.
- Perfil de negócio: segmento, tipo e especialidade. API e tela ligadas.
- Planos e assinatura: listar, trocar plano, uso de clientes. API e tela ligadas.
- API REST do CRM com CRUD: empresas, contatos, leads, deals, atividades, follow-ups e evidências.
- Webhook da Meta em `/api/webhooks/meta`: verificação `hub.challenge`, assinatura `X-Hub-Signature-256`, idempotência por `message.mid`.
- Adapter do Instagram: texto, imagem, áudio, vídeo, arquivo e mensagens eco da empresa.
- Modelos `Channel`, `Conversation` e `Message`, com migration `20260928120000_etapa08_caixa_de_entrada_meta` aplicada no banco local.
- API da caixa de entrada: `GET /api/inbox/conversations`, `/:id` e `/:id/messages`.
- Tela **Caixa de Entrada** (menu lateral): lista de conversas e mensagens reais do banco, somente leitura. Verificada no Chrome em desktop, 320 px e tema escuro.
- Registro de canal por empresa: `npm run channel:register`.
- `typecheck`, `lint` e 55 testes passam.

### Depende da configuração da Meta

Etapa 09 (2026-09-28): o código está compatível com o formato real da Meta. Nenhuma alteração de código foi necessária. O `.env` local tem `META_VERIFY_TOKEN`. Verificação GET, `/health` e o fluxo assinado passam localmente. Estes itens estão **pendentes, com configuração manual no painel da Meta**:

- `META_APP_SECRET` preenchido no `.env` com o App Secret do app IACERES.
- Webhook do app IACERES apontando para uma URL HTTPS pública do ZUARTS.
- Campo `messages` assinado e conta do Instagram ativada em `subscribed_apps`.
- App em modo Live com acesso a `instagram_business_manage_messages`, conforme a documentação da Meta.
- Canal registrado com o `user_id` da conta profissional (`GET graph.instagram.com/me?fields=user_id`).

O passo a passo está em [docs/ETAPA_08_CAIXA_DE_ENTRADA_META.md](docs/ETAPA_08_CAIXA_DE_ENTRADA_META.md).

### Como testar o webhook

1. Defina `META_VERIFY_TOKEN` e `META_APP_SECRET` no `.env`.
2. `npm run build` e `npm run dev`.
3. Verificação: `curl "http://localhost:3001/api/webhooks/meta?hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=123"` responde `123`.
4. Testes: `node --test api/meta/meta-webhook.test.mjs`.
5. Evento assinado manual: comando em `docs/ETAPA_08_CAIXA_DE_ENTRADA_META.md`.

### Parcial

- Confirmação de e-mail: o link aparece só no log do servidor. Não há provedor de e-mail.
- Papéis `OWNER`, `ADMIN` e `MEMBER`: só Planos verifica o papel. O CRM não verifica.
- Módulos e capacidades: tabelas e dados existem. A rota `/api/modules` não está ligada ao servidor.
- Caixa de entrada: sem nome do cliente do Instagram. A tela mostra "Contato do Instagram ···1234". Sem atualização automática: o botão **Atualizar** recarrega.
- Conversa sem vínculo com `Contact`: o webhook do Instagram não traz nome nem telefone.
- PWA: manifest e service worker existem.

### Somente interface ou estrutura

- Dashboard principal, Dashboard de Gestão e Dashboard CRM: dados fixos de exemplo.
- Telas de Leads, Contatos, Empresas, Oportunidades, Pipeline, Deals, Atividades e Follow-ups: aviso "em preparação".
- Agenda, Clientes, Atendimentos, Vendas, Financeiro, Relatórios, Estoque, Configurações, Marketing e Saúde: "Módulo em desenvolvimento".
- Messenger e WhatsApp: tipos previstos no enum `ChannelType`. Nenhum adapter. Payloads desses canais são ignorados.
- `AgentTask` e `AgentRun`: tabelas existem. Nenhum código usa essas tabelas.

### Não implementado

- Responder mensagens pelo Instagram.
- Messenger e WhatsApp.
- Tela para conectar um canal (hoje: script `channel:register`).
- Armazenamento criptografado de token por canal.
- IA, resumo de conversa, extração de nome e telefone, classificação de intenção.
- Criação de lead a partir da conversa.
- Pipeline visual (kanban), automações, workflows, relatórios reais, documentos e propostas.
- E-mail e SMS.

### Limitações encontradas

- Os testes de integração gravam usuários de teste no banco de desenvolvimento e apagam esses usuários no fim.
- Listas do CRM não têm paginação nem filtros. A caixa de entrada limita a 50 conversas e 200 mensagens.
- `web/*.js` não passa pelo lint. O lint só verifica `.ts` e `.tsx`.
- `src/` (React) não é usado pelo build.
- `_cat2.sql` é um arquivo de depuração versionado.

### Próxima etapa recomendada

Configurar o webhook do app IACERES com uma URL HTTPS pública e confirmar uma mensagem real do Instagram na Caixa de Entrada.
