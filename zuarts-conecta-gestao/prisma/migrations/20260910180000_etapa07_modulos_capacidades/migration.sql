BEGIN;

CREATE TABLE "Module" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "area" VARCHAR(80) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Capability" (
    "id" UUID NOT NULL,
    "moduleId" UUID NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Capability_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlanModule" (
    "id" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "moduleId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanModule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TenantModule" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "moduleId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantModule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Module_slug_key" ON "Module"("slug");

CREATE UNIQUE INDEX "Capability_moduleId_slug_key" ON "Capability"("moduleId", "slug");

CREATE INDEX "Capability_moduleId_position_idx" ON "Capability"("moduleId", "position");

CREATE UNIQUE INDEX "PlanModule_planId_moduleId_key" ON "PlanModule"("planId", "moduleId");

CREATE INDEX "PlanModule_moduleId_idx" ON "PlanModule"("moduleId");

CREATE UNIQUE INDEX "TenantModule_companyId_moduleId_key" ON "TenantModule"("companyId", "moduleId");

CREATE INDEX "TenantModule_moduleId_idx" ON "TenantModule"("moduleId");

ALTER TABLE "Capability" ADD CONSTRAINT "Capability_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlanModule" ADD CONSTRAINT "PlanModule_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlanModule" ADD CONSTRAINT "PlanModule_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TenantModule" ADD CONSTRAINT "TenantModule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TenantModule" ADD CONSTRAINT "TenantModule_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "Module" ("id", "slug", "name", "description", "area", "position", "updatedAt") VALUES
('9c7d0000-0000-4000-8000-000000000001', 'dashboard', 'Dashboard', 'Visão geral do sistema.', 'gestao', 0, CURRENT_TIMESTAMP),
('9c7d0000-0000-4000-8000-000000000002', 'clientes', 'Clientes', 'Gestão de clientes do negócio.', 'gestao', 1, CURRENT_TIMESTAMP),
('9c7d0000-0000-4000-8000-000000000003', 'fornecedores', 'Fornecedores', 'Gestão de fornecedores e compras.', 'gestao', 2, CURRENT_TIMESTAMP),
('9c7d0000-0000-4000-8000-000000000004', 'produtos', 'Produtos', 'Catálogo de produtos e variantes.', 'gestao', 3, CURRENT_TIMESTAMP),
('9c7d0000-0000-4000-8000-000000000005', 'vendas', 'Vendas', 'Registro de vendas e controle de descontos.', 'gestao', 4, CURRENT_TIMESTAMP),
('9c7d0000-0000-4000-8000-000000000006', 'estoque', 'Estoque', 'Entradas, saídas e existências.', 'gestao', 5, CURRENT_TIMESTAMP),
('9c7d0000-0000-4000-8000-000000000007', 'financeiro', 'Financeiro', 'Movimentos de caixa, cobros e reportes.', 'gestao', 6, CURRENT_TIMESTAMP),
('9c7d0000-0000-4000-8000-000000000008', 'precios', 'Preço & margem', 'Listas de precios e cálculo de margem.', 'gestao', 7, CURRENT_TIMESTAMP),
('9c7d0000-0000-4000-8000-000000000009', 'propuestas', 'Propostas', 'Elaboração e seguimento de propostas.', 'gestao', 8, CURRENT_TIMESTAMP),
('9c7d0000-0000-4000-8000-00000000000a', 'reportes', 'Relatórios', 'Reportes básicos, avançados e indicadores.', 'gestao', 9, CURRENT_TIMESTAMP),
('9c7d0000-0000-4000-8000-00000000000b', 'usuarios', 'Usuários', 'Usuários do sistema e seus roles.', 'gestao', 10, CURRENT_TIMESTAMP),
('9c7d0000-0000-4000-8000-00000000000c', 'configuracion', 'Configurações', 'Dados da empresa e módulos do plano.', 'gestao', 11, CURRENT_TIMESTAMP);

INSERT INTO "Capability" ("id", "moduleId", "slug", "name", "description", "position", "updatedAt") VALUES
('9c7d0000-0000-4000-8000-000000000101', '9c7d0000-0000-4000-8000-000000000001', 'resumen', 'Resumo geral', 'Resumo geral do negócio em uma única tela.', 0, CURRENT_TIMESTAMP),
('9c7d0000-0000-4000-8000-000000000102', '9c7d0000-0000-4000-8000-000000000001', 'indicadores', 'Indicadores de desempeño', 'KPIs e tendências do negócio.', 1, CURRENT_TIMESTAMP),
('9c7d0000-0000-4000-8000-000000000201', '9c7d0000-0000-4000-8000-000000000002', 'registro', 'Registro de clientes', 'Alta, edição e consulta de clientes.', 0, CURRENT_TIMESTAMP),
('9c7d0000-0000-4000-8000-000000000202', '9c7d0000-0000-4000-8000-000000000002', 'historial', 'Historial de clientes', 'Compras, atividade e seguimento por cliente.', 1, CURRENT_TIMESTAMP),
('9c7d0000-0000-4000-8000-000000000203', '9c7d0000-0000-4000-8000-000000000002', 'importacion', 'Importação por planilha', 'Importação de clientes desde uma planilha.', 2, CURRENT_TIMESTAMP),
('9c7d0000-0000-4000-8000-000000000301', '9c7d0000-0000-4000-8000-000000000003', 'registro', 'Registro de fornecedores', 'Alta, edição e consulta de fornecedores.', 0, CURRENT_TIMESTAMP),
('9c7d0000-0000-4000-8000-000000000302', '9c7d0000-0000-4000-8000-000000000003', 'compras', 'Compras', 'Registro de compras e pagos a fornecedores.', 1, CURRENT_TIMESTAMP),
('9c7d0000-0000-4000-8000-000000000401', '9c7d0000-0000-4000-8000-000000000004', 'catalogo', 'Catálogo de produtos', 'Alta, edição e consulta de produtos.', 0, CURRENT_TIMESTAMP),
('9c7d0000-0000-4000-8000-000000000402', '9c7d0000-0000-4000-8000-000000000004', 'variantes', 'Variantes e presentações', 'Variantes, unidades e presentações.', 1, CURRENT_TIMESTAMP),
('9c7d0000-0000-4000-8000-000000000501', '9c7d0000-0000-4000-8000-000000000005', 'registro', 'Registro de vendas', 'Alta e consulta de vendas.', 0, CURRENT_TIMESTAMP),
('9c7d0000-0000-4000-8000-000000000502', '9c7d0000-0000-4000-8000-000000000005', 'descuentos', 'Controle de descontos', 'Descontos por venda e por cliente.', 1, CURRENT_TIMESTAMP),
('9c7d0000-0000-4000-8000-000000000503', '9c7d0000-0000-4000-8000-000000000005', 'historial', 'Historial de vendas', 'Consulta de vendas anteriores e detalle.', 2, CURRENT_TIMESTAMP),
('9c7d0000-0000-4000-8000-000000000601', '9c7d0000-0000-4000-8000-000000000006', 'basico', 'Entradas e saídas', 'Movimentos básicos de entradas e saídas.', 0, CURRENT_TIMESTAMP),
('9c7d0000-0000-4000-8000-000000000602', '9c7d0000-0000-4000-8000-000000000006', 'avanzado', 'Estoque avançado', 'Lotes, ubicaciones e existências avançadas.', 1, CURRENT_TIMESTAMP),
('9c7d0000-0000-4000-8000-000000000701', '9c7d0000-0000-4000-8000-000000000007', 'movimientos', 'Movimentos de caixa', 'Registro de ingressos e saídas de caixa.', 0, CURRENT_TIMESTAMP),
('9c7d0000-0000-4000-8000-000000000702', '9c7d0000-0000-4000-8000-000000000007', 'cuentas', 'Contas por cobrar e pagar', 'Seguimento de contas pendentes.', 1, CURRENT_TIMESTAMP),
('9c7d0000-0000-4000-8000-000000000703', '9c7d0000-0000-4000-8000-000000000007', 'reportes', 'Reportes financeiros', 'Resumo financeiro do negócio.', 2, CURRENT_TIMESTAMP),
('9c7d0000-0000-4000-8000-000000000801', '9c7d0000-0000-4000-8000-000000000008', 'margenes', 'Cálculo de margem', 'Margem e rentabilidade por produto e venda.', 0, CURRENT_TIMESTAMP),
('9c7d0000-0000-4000-8000-000000000802', '9c7d0000-0000-4000-8000-000000000008', 'listas', 'Listas de precios', 'Listas de precios por cliente.', 1, CURRENT_TIMESTAMP),
('9c7d0000-0000-4000-8000-000000000901', '9c7d0000-0000-4000-8000-000000000009', 'creacion', 'Criação de propostas', 'Elaboração e emissão de propostas.', 0, CURRENT_TIMESTAMP),
('9c7d0000-0000-4000-8000-000000000902', '9c7d0000-0000-4000-8000-000000000009', 'seguimiento', 'Seguimento e aprobación', 'Estado, seguimento e aprobación de propostas.', 1, CURRENT_TIMESTAMP),
('9c7d0000-0000-4000-8000-000000001001', '9c7d0000-0000-4000-8000-00000000000a', 'basicos', 'Reportes básicos', 'Reportes essenciais do negócio.', 0, CURRENT_TIMESTAMP),
('9c7d0000-0000-4000-8000-000000001002', '9c7d0000-0000-4000-8000-00000000000a', 'avanzados', 'Reportes avançados', 'Reportes detalhados e configurables.', 1, CURRENT_TIMESTAMP),
('9c7d0000-0000-4000-8000-000000001003', '9c7d0000-0000-4000-8000-00000000000a', 'indicadores', 'Indicadores de desempeño', 'KPIs e comparativos por período.', 2, CURRENT_TIMESTAMP),
('9c7d0000-0000-4000-8000-000000001004', '9c7d0000-0000-4000-8000-00000000000a', 'importacion', 'Importação por planilha', 'Importação de dados por planilha.', 3, CURRENT_TIMESTAMP),
('9c7d0000-0000-4000-8000-000000001101', '9c7d0000-0000-4000-8000-00000000000b', 'gestion', 'Gestão de usuários', 'Alta, edição e roles de usuários.', 0, CURRENT_TIMESTAMP),
('9c7d0000-0000-4000-8000-000000001201', '9c7d0000-0000-4000-8000-00000000000c', 'empresa', 'Dados da empresa', 'Dados da empresa e do negócio.', 0, CURRENT_TIMESTAMP),
('9c7d0000-0000-4000-8000-000000001202', '9c7d0000-0000-4000-8000-00000000000c', 'modulos', 'Módulos do plano', 'Consulta dos módulos ativos do plano.', 1, CURRENT_TIMESTAMP);

INSERT INTO "PlanModule" ("id", "planId", "moduleId", "updatedAt")
SELECT gen_random_uuid(), plan."id", module."id", CURRENT_TIMESTAMP
FROM "Plan" plan
CROSS JOIN "Module" module
WHERE plan."slug" = 'essencial'
AND module."slug" IN ('dashboard', 'clientes', 'fornecedores', 'produtos', 'vendas', 'estoque', 'financeiro', 'reportes', 'usuarios', 'configuracion');

INSERT INTO "PlanModule" ("id", "planId", "moduleId", "updatedAt")
SELECT gen_random_uuid(), plan."id", module."id", CURRENT_TIMESTAMP
FROM "Plan" plan
CROSS JOIN "Module" module
WHERE plan."slug" = 'profissional'
AND module."slug" IN ('dashboard', 'clientes', 'fornecedores', 'produtos', 'vendas', 'estoque', 'financeiro', 'reportes', 'usuarios', 'configuracion', 'precios', 'propuestas');

INSERT INTO "PlanModule" ("id", "planId", "moduleId", "updatedAt")
SELECT gen_random_uuid(), plan."id", module."id", CURRENT_TIMESTAMP
FROM "Plan" plan
CROSS JOIN "Module" module
WHERE plan."slug" = 'premium'
AND module."slug" IN ('dashboard', 'clientes', 'fornecedores', 'produtos', 'vendas', 'estoque', 'financeiro', 'reportes', 'usuarios', 'configuracion', 'precios', 'propuestas');

INSERT INTO "TenantModule" ("id", "companyId", "moduleId", "updatedAt")
SELECT gen_random_uuid(), subscription."companyId", link."moduleId", CURRENT_TIMESTAMP
FROM "Subscription" subscription
JOIN "PlanModule" link ON link."planId" = subscription."planId"
WHERE subscription."isCurrent" = true;

COMMIT;