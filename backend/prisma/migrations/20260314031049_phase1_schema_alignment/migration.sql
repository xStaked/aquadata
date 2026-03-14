/*
  Warnings:

  - The primary key for the `case_messages` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `cases` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `farm_id` column on the `cases` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `assigned_tech_id` column on the `cases` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `clients` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `assigned_advisor_id` column on the `clients` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `farms` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `assigned_advisor_id` column on the `farms` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `fca_calculations` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `farm_id` column on the `fca_calculations` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `knowledge_articles` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `roi_calculations` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `farm_id` column on the `roi_calculations` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `technical_visits` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `case_id` column on the `technical_visits` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `id` on the `case_messages` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `case_id` on the `case_messages` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `user_id` on the `case_messages` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `cases` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `organization_id` on the `cases` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `client_id` on the `cases` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `clients` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `organization_id` on the `clients` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `farms` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `client_id` on the `farms` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `organization_id` on the `farms` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `fca_calculations` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `user_id` on the `fca_calculations` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `organization_id` on the `fca_calculations` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `knowledge_articles` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `organization_id` on the `knowledge_articles` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `created_by` on the `knowledge_articles` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `roi_calculations` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `user_id` on the `roi_calculations` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `organization_id` on the `roi_calculations` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `technical_visits` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `organization_id` on the `technical_visits` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `client_id` on the `technical_visits` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `farm_id` on the `technical_visits` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `advisor_id` on the `technical_visits` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "case_messages" DROP CONSTRAINT "case_messages_case_id_fkey";

-- DropForeignKey
ALTER TABLE "cases" DROP CONSTRAINT "cases_client_id_fkey";

-- DropForeignKey
ALTER TABLE "cases" DROP CONSTRAINT "cases_farm_id_fkey";

-- DropForeignKey
ALTER TABLE "farms" DROP CONSTRAINT "farms_client_id_fkey";

-- DropForeignKey
ALTER TABLE "fca_calculations" DROP CONSTRAINT "fca_calculations_farm_id_fkey";

-- DropForeignKey
ALTER TABLE "roi_calculations" DROP CONSTRAINT "roi_calculations_farm_id_fkey";

-- DropForeignKey
ALTER TABLE "technical_visits" DROP CONSTRAINT "technical_visits_client_id_fkey";

-- DropForeignKey
ALTER TABLE "technical_visits" DROP CONSTRAINT "technical_visits_farm_id_fkey";

-- AlterTable
ALTER TABLE "case_messages" DROP CONSTRAINT "case_messages_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "case_id",
ADD COLUMN     "case_id" UUID NOT NULL,
DROP COLUMN "user_id",
ADD COLUMN     "user_id" UUID NOT NULL,
ADD CONSTRAINT "case_messages_pkey" PRIMARY KEY ("id");

-- AlterTable
CREATE SEQUENCE cases_case_number_seq;
ALTER TABLE "cases" DROP CONSTRAINT "cases_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "organization_id",
ADD COLUMN     "organization_id" UUID NOT NULL,
DROP COLUMN "client_id",
ADD COLUMN     "client_id" UUID NOT NULL,
DROP COLUMN "farm_id",
ADD COLUMN     "farm_id" UUID,
ALTER COLUMN "case_number" SET DEFAULT nextval('cases_case_number_seq'),
DROP COLUMN "assigned_tech_id",
ADD COLUMN     "assigned_tech_id" UUID,
ADD CONSTRAINT "cases_pkey" PRIMARY KEY ("id");
ALTER SEQUENCE cases_case_number_seq OWNED BY "cases"."case_number";

-- AlterTable
ALTER TABLE "clients" DROP CONSTRAINT "clients_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "organization_id",
ADD COLUMN     "organization_id" UUID NOT NULL,
DROP COLUMN "assigned_advisor_id",
ADD COLUMN     "assigned_advisor_id" UUID,
ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "farms" DROP CONSTRAINT "farms_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "client_id",
ADD COLUMN     "client_id" UUID NOT NULL,
DROP COLUMN "organization_id",
ADD COLUMN     "organization_id" UUID NOT NULL,
DROP COLUMN "assigned_advisor_id",
ADD COLUMN     "assigned_advisor_id" UUID,
ADD CONSTRAINT "farms_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "fca_calculations" DROP CONSTRAINT "fca_calculations_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "user_id",
ADD COLUMN     "user_id" UUID NOT NULL,
DROP COLUMN "organization_id",
ADD COLUMN     "organization_id" UUID NOT NULL,
DROP COLUMN "farm_id",
ADD COLUMN     "farm_id" UUID,
ADD CONSTRAINT "fca_calculations_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "knowledge_articles" DROP CONSTRAINT "knowledge_articles_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "organization_id",
ADD COLUMN     "organization_id" UUID NOT NULL,
DROP COLUMN "created_by",
ADD COLUMN     "created_by" UUID NOT NULL,
ADD CONSTRAINT "knowledge_articles_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "roi_calculations" DROP CONSTRAINT "roi_calculations_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "user_id",
ADD COLUMN     "user_id" UUID NOT NULL,
DROP COLUMN "organization_id",
ADD COLUMN     "organization_id" UUID NOT NULL,
DROP COLUMN "farm_id",
ADD COLUMN     "farm_id" UUID,
ADD CONSTRAINT "roi_calculations_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "technical_visits" DROP CONSTRAINT "technical_visits_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "organization_id",
ADD COLUMN     "organization_id" UUID NOT NULL,
DROP COLUMN "case_id",
ADD COLUMN     "case_id" UUID,
DROP COLUMN "client_id",
ADD COLUMN     "client_id" UUID NOT NULL,
DROP COLUMN "farm_id",
ADD COLUMN     "farm_id" UUID NOT NULL,
DROP COLUMN "advisor_id",
ADD COLUMN     "advisor_id" UUID NOT NULL,
ADD CONSTRAINT "technical_visits_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE INDEX "case_messages_case_id_idx" ON "case_messages"("case_id");

-- CreateIndex
CREATE INDEX "case_messages_user_id_idx" ON "case_messages"("user_id");

-- CreateIndex
CREATE INDEX "cases_organization_id_idx" ON "cases"("organization_id");

-- CreateIndex
CREATE INDEX "cases_status_idx" ON "cases"("status");

-- CreateIndex
CREATE INDEX "cases_client_id_idx" ON "cases"("client_id");

-- CreateIndex
CREATE INDEX "cases_farm_id_idx" ON "cases"("farm_id");

-- CreateIndex
CREATE INDEX "cases_assigned_tech_id_idx" ON "cases"("assigned_tech_id");

-- CreateIndex
CREATE INDEX "clients_organization_id_idx" ON "clients"("organization_id");

-- CreateIndex
CREATE INDEX "clients_assigned_advisor_id_idx" ON "clients"("assigned_advisor_id");

-- CreateIndex
CREATE INDEX "farms_organization_id_idx" ON "farms"("organization_id");

-- CreateIndex
CREATE INDEX "farms_client_id_idx" ON "farms"("client_id");

-- CreateIndex
CREATE INDEX "farms_assigned_advisor_id_idx" ON "farms"("assigned_advisor_id");

-- CreateIndex
CREATE INDEX "fca_calculations_organization_id_idx" ON "fca_calculations"("organization_id");

-- CreateIndex
CREATE INDEX "fca_calculations_farm_id_idx" ON "fca_calculations"("farm_id");

-- CreateIndex
CREATE INDEX "fca_calculations_user_id_idx" ON "fca_calculations"("user_id");

-- CreateIndex
CREATE INDEX "knowledge_articles_organization_id_idx" ON "knowledge_articles"("organization_id");

-- CreateIndex
CREATE INDEX "knowledge_articles_category_idx" ON "knowledge_articles"("category");

-- CreateIndex
CREATE INDEX "knowledge_articles_is_published_idx" ON "knowledge_articles"("is_published");

-- CreateIndex
CREATE INDEX "knowledge_articles_created_by_idx" ON "knowledge_articles"("created_by");

-- CreateIndex
CREATE INDEX "roi_calculations_organization_id_idx" ON "roi_calculations"("organization_id");

-- CreateIndex
CREATE INDEX "roi_calculations_farm_id_idx" ON "roi_calculations"("farm_id");

-- CreateIndex
CREATE INDEX "roi_calculations_user_id_idx" ON "roi_calculations"("user_id");

-- CreateIndex
CREATE INDEX "technical_visits_organization_id_idx" ON "technical_visits"("organization_id");

-- CreateIndex
CREATE INDEX "technical_visits_case_id_idx" ON "technical_visits"("case_id");

-- CreateIndex
CREATE INDEX "technical_visits_client_id_idx" ON "technical_visits"("client_id");

-- CreateIndex
CREATE INDEX "technical_visits_farm_id_idx" ON "technical_visits"("farm_id");

-- CreateIndex
CREATE INDEX "technical_visits_advisor_id_idx" ON "technical_visits"("advisor_id");

-- AddForeignKey
ALTER TABLE "farms" ADD CONSTRAINT "farms_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_messages" ADD CONSTRAINT "case_messages_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technical_visits" ADD CONSTRAINT "technical_visits_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technical_visits" ADD CONSTRAINT "technical_visits_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technical_visits" ADD CONSTRAINT "technical_visits_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fca_calculations" ADD CONSTRAINT "fca_calculations_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roi_calculations" ADD CONSTRAINT "roi_calculations_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
