BEGIN;

UPDATE "BusinessSegment" SET "name" = 'Comércio' WHERE "id" = '1d8fbf48-e4e0-48b6-9b93-3981c8dff71b';
UPDATE "BusinessSegment" SET "name" = 'Alimentação' WHERE "id" = '90abc9ea-3f73-4b6a-8c98-11111e603b0c';
UPDATE "BusinessSegment" SET "name" = 'Beleza e Estética' WHERE "id" = '587b881e-f797-47c7-821d-9503cc70d972';
UPDATE "BusinessSegment" SET "name" = 'Saúde' WHERE "id" = '6776826d-3056-476d-8708-2afa33137127';
UPDATE "BusinessSegment" SET "name" = 'Serviços Profissionais' WHERE "id" = '49a2850f-4368-4dc9-ba80-508306a809b7';
UPDATE "BusinessType" SET "name" = 'Loja de calçados' WHERE "id" = '3de78727-a732-48c8-a61c-0cd4353ea237';
UPDATE "BusinessType" SET "name" = 'Loja de acessórios' WHERE "id" = 'b3df33df-ca1d-4623-99dd-3c967ee2a61a';
UPDATE "BusinessType" SET "name" = 'Concessionária' WHERE "id" = 'c22c1259-f20f-4d95-b634-37e70aece0f0';
UPDATE "BusinessType" SET "name" = 'Salão de beleza' WHERE "id" = 'cbf31cf1-3673-4e3f-bd3f-da5be9015489';
UPDATE "BusinessType" SET "name" = 'Estética' WHERE "id" = '733a409a-1581-4d36-99df-dfe9dbdaa7ae';
UPDATE "BusinessType" SET "name" = 'Clínica' WHERE "id" = '8392e9ae-7562-4ce5-9e24-1029385ca2a2';
UPDATE "BusinessType" SET "name" = 'Consultório' WHERE "id" = '23b3a2bf-c41f-4172-ae42-dba094876888';
UPDATE "BusinessType" SET "name" = 'Policlínica' WHERE "id" = 'c746f6da-f692-4ab5-8978-337c9d4434b4';
UPDATE "BusinessType" SET "name" = 'Clínica Veterinária' WHERE "id" = 'ba37dd4d-54a7-4df4-9744-dc82f04586f0';
UPDATE "BusinessType" SET "name" = 'Escritório' WHERE "id" = '64dfed88-f0c7-4601-a026-d977e6604c93';
UPDATE "BusinessType" SET "name" = 'Outros tipos de negócio' WHERE "id" = 'dca14e13-a92d-4cf2-93c0-35478863025d';
UPDATE "Specialty" SET "name" = 'Nutrição' WHERE "id" = '5e9f31c2-d478-421c-82ce-384efb337b6c';

COMMIT;
