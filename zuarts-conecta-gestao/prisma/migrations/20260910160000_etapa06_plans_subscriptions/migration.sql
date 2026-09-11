BEGIN;

CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PENDING', 'SUSPENDED', 'CANCELLED', 'EXPIRED');

CREATE TYPE "BillingPeriod" AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'YEARLY', 'CUSTOM');

CREATE TABLE "Plan" (
    "id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "description" TEXT NOT NULL,
    "price" DECIMAL(12,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'BRL',
    "billingPeriod" "BillingPeriod" NOT NULL DEFAULT 'MONTHLY',
    "customPeriodDays" INTEGER,
    "minClients" INTEGER NOT NULL DEFAULT 0,
    "maxClients" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Subscription" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Plan_slug_key" ON "Plan"("slug");

CREATE INDEX "Subscription_companyId_isCurrent_idx" ON "Subscription"("companyId", "isCurrent");

CREATE INDEX "Subscription_planId_idx" ON "Subscription"("planId");

ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Subscription_current_company_key" ON "Subscription"("companyId") WHERE "isCurrent" = true;
CREATE UNIQUE INDEX "Plan_default_key" ON "Plan"("isDefault") WHERE "isDefault" = true;
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_limits_check" CHECK ("minClients" >= 0 AND ("maxClients" IS NULL OR "maxClients" >= "minClients"));
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_price_check" CHECK ("price" IS NULL OR "price" >= 0);
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_period_check" CHECK (("billingPeriod" = 'CUSTOM' AND "customPeriodDays" > 0 AND "customPeriodDays" IS NOT NULL) OR ("billingPeriod" <> 'CUSTOM' AND "customPeriodDays" IS NULL));

INSERT INTO "Plan" ("id", "name", "slug", "description", "price", "minClients", "maxClients", "isDefault", "position", "updatedAt") VALUES
('796114aa-f5c9-46ac-bb65-3f7988e06e21', 'Essencial', 'essencial', 'Uso do sistema com até 10 contatos. Valor de referência para manutenção e infraestrutura.', 100.00, 0, 10, true, 0, CURRENT_TIMESTAMP),
('796114aa-f5c9-46ac-bb65-3f7988e06e22', 'Profissional', 'profissional', 'Capacidade para até 30 contatos no mesmo sistema. Preço ainda não definido.', NULL, 11, 30, false, 1, CURRENT_TIMESTAMP),
('796114aa-f5c9-46ac-bb65-3f7988e06e23', 'Premium', 'premium', 'Contatos sem limite superior no mesmo sistema. Preço ainda não definido.', NULL, 31, NULL, false, 2, CURRENT_TIMESTAMP);

INSERT INTO "Subscription" ("id", "companyId", "planId", "updatedAt")
SELECT gen_random_uuid(), company."id", plan."id", CURRENT_TIMESTAMP
FROM "Company" company
CROSS JOIN LATERAL (SELECT COUNT(*) AS total FROM "Contact" contact WHERE contact."companyId" = company."id") usage
JOIN "Plan" plan ON usage.total >= plan."minClients" AND (plan."maxClients" IS NULL OR usage.total <= plan."maxClients");

COMMIT;
