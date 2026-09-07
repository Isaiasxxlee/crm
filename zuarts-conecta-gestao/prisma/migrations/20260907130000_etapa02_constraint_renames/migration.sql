-- Etapa 02: rename leftover Organization-named constraint/index to Company
ALTER TABLE "Company" RENAME CONSTRAINT "Organization_pkey" TO "Company_pkey";
ALTER INDEX "Organization_slug_key" RENAME TO "Company_slug_key";
