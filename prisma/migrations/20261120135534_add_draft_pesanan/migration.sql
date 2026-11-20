/*
  Warnings:

  - You are about to drop the column `kategoriId` on the `Produk` table. All the data in the column will be lost.
  - The `hargabeli` column on the `Produk` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `Kategori` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Produk" DROP CONSTRAINT "Produk_kategoriId_fkey";

-- AlterTable
ALTER TABLE "Produk" DROP COLUMN "kategoriId",
DROP COLUMN "hargabeli",
ADD COLUMN     "hargabeli" INTEGER;

-- DropTable
DROP TABLE "Kategori";

-- CreateTable
CREATE TABLE "nota" (
    "id" TEXT NOT NULL,
    "buyyer" TEXT NOT NULL,
    "jumlahbeli" INTEGER NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "fotonota" TEXT,
    "produkId" TEXT NOT NULL,

    CONSTRAINT "nota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DraftPesanan" (
    "id" TEXT NOT NULL,
    "namaPembeli" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DraftPesanan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemDraft" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "produkId" TEXT NOT NULL,
    "varianId" TEXT,
    "namaProduk" TEXT NOT NULL,
    "namaVarian" TEXT,
    "harga" INTEGER NOT NULL,
    "jumlah" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DraftPesanan_status_idx" ON "DraftPesanan"("status");

-- CreateIndex
CREATE INDEX "DraftPesanan_namaPembeli_status_idx" ON "DraftPesanan"("namaPembeli", "status");

-- CreateIndex
CREATE INDEX "ItemDraft_draftId_idx" ON "ItemDraft"("draftId");

-- CreateIndex
CREATE INDEX "ItemDraft_draftId_produkId_idx" ON "ItemDraft"("draftId", "produkId");

-- CreateIndex
CREATE INDEX "ItemDraft_produkId_idx" ON "ItemDraft"("produkId");

-- CreateIndex
CREATE INDEX "ItemDraft_varianId_idx" ON "ItemDraft"("varianId");

-- AddForeignKey
ALTER TABLE "nota" ADD CONSTRAINT "nota_produkId_fkey" FOREIGN KEY ("produkId") REFERENCES "Produk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemDraft" ADD CONSTRAINT "ItemDraft_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "DraftPesanan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemDraft" ADD CONSTRAINT "ItemDraft_produkId_fkey" FOREIGN KEY ("produkId") REFERENCES "Produk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemDraft" ADD CONSTRAINT "ItemDraft_varianId_fkey" FOREIGN KEY ("varianId") REFERENCES "VarianProduk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
