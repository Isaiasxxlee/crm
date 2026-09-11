BEGIN;

CREATE TABLE "BusinessSegment" (
    "id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BusinessSegment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BusinessType" (
    "id" UUID NOT NULL,
    "segmentId" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BusinessType_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Specialty" (
    "id" UUID NOT NULL,
    "businessTypeId" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Specialty_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BusinessProfile" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "businessTypeId" UUID NOT NULL,
    "specialtyId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BusinessSegment_name_key" ON "BusinessSegment"("name");

CREATE UNIQUE INDEX "BusinessType_segmentId_name_key" ON "BusinessType"("segmentId", "name");

CREATE UNIQUE INDEX "Specialty_businessTypeId_name_key" ON "Specialty"("businessTypeId", "name");

CREATE UNIQUE INDEX "Specialty_id_businessTypeId_key" ON "Specialty"("id", "businessTypeId");

CREATE UNIQUE INDEX "BusinessProfile_companyId_key" ON "BusinessProfile"("companyId");

CREATE INDEX "BusinessProfile_businessTypeId_idx" ON "BusinessProfile"("businessTypeId");

CREATE INDEX "BusinessProfile_specialtyId_businessTypeId_idx" ON "BusinessProfile"("specialtyId", "businessTypeId");

ALTER TABLE "BusinessType" ADD CONSTRAINT "BusinessType_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "BusinessSegment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Specialty" ADD CONSTRAINT "Specialty_businessTypeId_fkey" FOREIGN KEY ("businessTypeId") REFERENCES "BusinessType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BusinessProfile" ADD CONSTRAINT "BusinessProfile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BusinessProfile" ADD CONSTRAINT "BusinessProfile_businessTypeId_fkey" FOREIGN KEY ("businessTypeId") REFERENCES "BusinessType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BusinessProfile" ADD CONSTRAINT "BusinessProfile_specialtyId_businessTypeId_fkey" FOREIGN KEY ("specialtyId", "businessTypeId") REFERENCES "Specialty"("id", "businessTypeId") ON DELETE RESTRICT ON UPDATE RESTRICT;
INSERT INTO "BusinessSegment" ("id", "name", "position") VALUES ('1d8fbf48-e4e0-48b6-9b93-3981c8dff71b', 'Com?rcio', 0);
INSERT INTO "BusinessType" ("id", "segmentId", "name", "position") VALUES ('29a6d4a4-e022-40d2-a57a-3dee48712a0c', '1d8fbf48-e4e0-48b6-9b93-3981c8dff71b', 'Loja de roupas', 0);
INSERT INTO "BusinessType" ("id", "segmentId", "name", "position") VALUES ('3de78727-a732-48c8-a61c-0cd4353ea237', '1d8fbf48-e4e0-48b6-9b93-3981c8dff71b', 'Loja de cal?ados', 1);
INSERT INTO "BusinessType" ("id", "segmentId", "name", "position") VALUES ('b3df33df-ca1d-4623-99dd-3c967ee2a61a', '1d8fbf48-e4e0-48b6-9b93-3981c8dff71b', 'Loja de acess?rios', 2);
INSERT INTO "BusinessType" ("id", "segmentId", "name", "position") VALUES ('26db4abc-f620-4e38-80a4-f09359583e63', '1d8fbf48-e4e0-48b6-9b93-3981c8dff71b', 'Mercado', 3);
INSERT INTO "BusinessType" ("id", "segmentId", "name", "position") VALUES ('c22c1259-f20f-4d95-b634-37e70aece0f0', '1d8fbf48-e4e0-48b6-9b93-3981c8dff71b', 'Concession?ria', 4);
INSERT INTO "BusinessSegment" ("id", "name", "position") VALUES ('90abc9ea-3f73-4b6a-8c98-11111e603b0c', 'Alimenta??o', 1);
INSERT INTO "BusinessType" ("id", "segmentId", "name", "position") VALUES ('33104810-1529-4aac-9ea0-3e5299453e85', '90abc9ea-3f73-4b6a-8c98-11111e603b0c', 'Restaurante', 0);
INSERT INTO "BusinessType" ("id", "segmentId", "name", "position") VALUES ('100359d0-28bf-4428-8569-1bc696fee72a', '90abc9ea-3f73-4b6a-8c98-11111e603b0c', 'Lanchonete', 1);
INSERT INTO "BusinessType" ("id", "segmentId", "name", "position") VALUES ('13025b37-e142-44c1-8b26-f1d066e84f73', '90abc9ea-3f73-4b6a-8c98-11111e603b0c', 'Pizzaria', 2);
INSERT INTO "BusinessType" ("id", "segmentId", "name", "position") VALUES ('8a6174ac-1677-4655-9848-362bd575f2bf', '90abc9ea-3f73-4b6a-8c98-11111e603b0c', 'Delivery', 3);
INSERT INTO "BusinessType" ("id", "segmentId", "name", "position") VALUES ('cf5f66b4-525d-49f7-a8d1-e05590316bb6', '90abc9ea-3f73-4b6a-8c98-11111e603b0c', 'Cafeteria', 4);
INSERT INTO "BusinessSegment" ("id", "name", "position") VALUES ('587b881e-f797-47c7-821d-9503cc70d972', 'Beleza e Est?tica', 2);
INSERT INTO "BusinessType" ("id", "segmentId", "name", "position") VALUES ('0f47574f-ac7c-4ff4-81f3-026870a2e31b', '587b881e-f797-47c7-821d-9503cc70d972', 'Barbearia', 0);
INSERT INTO "BusinessType" ("id", "segmentId", "name", "position") VALUES ('cbf31cf1-3673-4e3f-bd3f-da5be9015489', '587b881e-f797-47c7-821d-9503cc70d972', 'Sal?o de beleza', 1);
INSERT INTO "BusinessType" ("id", "segmentId", "name", "position") VALUES ('733a409a-1581-4d36-99df-dfe9dbdaa7ae', '587b881e-f797-47c7-821d-9503cc70d972', 'Est?tica', 2);
INSERT INTO "BusinessType" ("id", "segmentId", "name", "position") VALUES ('43654685-5915-4a3c-9f4c-f8f9cf08b71f', '587b881e-f797-47c7-821d-9503cc70d972', 'Manicure e pedicure', 3);
INSERT INTO "BusinessSegment" ("id", "name", "position") VALUES ('6776826d-3056-476d-8708-2afa33137127', 'Sa?de', 3);
INSERT INTO "BusinessType" ("id", "segmentId", "name", "position") VALUES ('8392e9ae-7562-4ce5-9e24-1029385ca2a2', '6776826d-3056-476d-8708-2afa33137127', 'Cl?nica', 0);
INSERT INTO "Specialty" ("id", "businessTypeId", "name", "position") VALUES ('65919830-6eff-48f0-a33a-81f2003e69a2', '8392e9ae-7562-4ce5-9e24-1029385ca2a2', 'Psicologia', 0);
INSERT INTO "Specialty" ("id", "businessTypeId", "name", "position") VALUES ('84022b25-c26a-496e-ab7c-4f48abadcc54', '8392e9ae-7562-4ce5-9e24-1029385ca2a2', 'Fisioterapia', 1);
INSERT INTO "Specialty" ("id", "businessTypeId", "name", "position") VALUES ('5e9f31c2-d478-421c-82ce-384efb337b6c', '8392e9ae-7562-4ce5-9e24-1029385ca2a2', 'Nutri??o', 2);
INSERT INTO "BusinessType" ("id", "segmentId", "name", "position") VALUES ('23b3a2bf-c41f-4172-ae42-dba094876888', '6776826d-3056-476d-8708-2afa33137127', 'Consult?rio', 1);
INSERT INTO "BusinessType" ("id", "segmentId", "name", "position") VALUES ('c746f6da-f692-4ab5-8978-337c9d4434b4', '6776826d-3056-476d-8708-2afa33137127', 'Policl?nica', 2);
INSERT INTO "BusinessType" ("id", "segmentId", "name", "position") VALUES ('e92605ac-9e36-4264-9fd3-386ed6942013', '6776826d-3056-476d-8708-2afa33137127', 'Odontologia', 3);
INSERT INTO "Specialty" ("id", "businessTypeId", "name", "position") VALUES ('0df51ce4-4065-4c59-a866-9b4466b9902a', 'e92605ac-9e36-4264-9fd3-386ed6942013', 'Ortodontia', 0);
INSERT INTO "Specialty" ("id", "businessTypeId", "name", "position") VALUES ('791d08e2-5cfe-4bd8-acc0-68b04a8026ca', 'e92605ac-9e36-4264-9fd3-386ed6942013', 'Implantodontia', 1);
INSERT INTO "BusinessSegment" ("id", "name", "position") VALUES ('186c36b0-4383-4de2-9cc0-0cfc167da32e', 'Pet', 4);
INSERT INTO "BusinessType" ("id", "segmentId", "name", "position") VALUES ('a8dfb111-1e3b-4bc9-b757-70f01d407f14', '186c36b0-4383-4de2-9cc0-0cfc167da32e', 'Pet Shop', 0);
INSERT INTO "BusinessType" ("id", "segmentId", "name", "position") VALUES ('b5410185-8e4e-44ba-adbb-c28ad00c8a97', '186c36b0-4383-4de2-9cc0-0cfc167da32e', 'Banho e Tosa', 1);
INSERT INTO "BusinessType" ("id", "segmentId", "name", "position") VALUES ('ba37dd4d-54a7-4df4-9744-dc82f04586f0', '186c36b0-4383-4de2-9cc0-0cfc167da32e', 'Cl?nica Veterin?ria', 2);
INSERT INTO "BusinessType" ("id", "segmentId", "name", "position") VALUES ('0e7c6d2b-166b-48ca-ab44-032dbc1b0342', '186c36b0-4383-4de2-9cc0-0cfc167da32e', 'Hotel para Pets', 3);
INSERT INTO "BusinessSegment" ("id", "name", "position") VALUES ('49a2850f-4368-4dc9-ba80-508306a809b7', 'Servi?os Profissionais', 5);
INSERT INTO "BusinessType" ("id", "segmentId", "name", "position") VALUES ('94127e8f-73b1-4304-8699-6dbe63f3ab70', '49a2850f-4368-4dc9-ba80-508306a809b7', 'Academia', 0);
INSERT INTO "BusinessType" ("id", "segmentId", "name", "position") VALUES ('a94bd70e-3f7a-4449-ae3d-b77d2a063793', '49a2850f-4368-4dc9-ba80-508306a809b7', 'Personal Trainer', 1);
INSERT INTO "BusinessType" ("id", "segmentId", "name", "position") VALUES ('c3e6b384-623f-4d18-bff4-dfb4cffd93fc', '49a2850f-4368-4dc9-ba80-508306a809b7', 'Consultoria', 2);
INSERT INTO "BusinessType" ("id", "segmentId", "name", "position") VALUES ('64dfed88-f0c7-4601-a026-d977e6604c93', '49a2850f-4368-4dc9-ba80-508306a809b7', 'Escrit?rio', 3);
INSERT INTO "BusinessSegment" ("id", "name", "position") VALUES ('dfb30b71-6f9f-4cc7-af7b-a3e0f2e000da', 'Outros', 6);
INSERT INTO "BusinessType" ("id", "segmentId", "name", "position") VALUES ('dca14e13-a92d-4cf2-93c0-35478863025d', 'dfb30b71-6f9f-4cc7-af7b-a3e0f2e000da', 'Outros tipos de neg?cio', 0);

COMMIT;
