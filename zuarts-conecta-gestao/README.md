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

### Essencial — R$297/mês

- Dashboard
- Clientes
- Fornecedores
- Produtos
- Vendas
- Estoque
- Financeiro
- Usuários
- Relatórios básicos
- Web + PWA

### Comercial — R$497/mês

Tudo do Essencial +

- Compras
- Estoque avançado
- Propostas
- Preço & Margem
- Controle de descontos
- Relatórios avançados
- Indicadores de desempenho
- Importação por planilha
- Recursos comerciais avançados
- Mais usuários

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
