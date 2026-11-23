/*
  Warnings:

  - A unique constraint covering the columns `[nomorNota]` on the table `Pesanan` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "DetailPesanan" ADD COLUMN     "namaProduk" TEXT;

-- AlterTable
ALTER TABLE "Pesanan" ADD COLUMN     "kembalian" INTEGER,
ADD COLUMN     "nomorNota" TEXT,
ADD COLUMN     "sesiKasirId" TEXT,
ADD COLUMN     "uangDiterima" INTEGER;

-- AlterTable
ALTER TABLE "SesiKasir" ADD COLUMN     "selisih" INTEGER,
ADD COLUMN     "uangSeharusnya" INTEGER;

-- AlterTable
ALTER TABLE "nota" ADD COLUMN     "varianId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Pesanan_nomorNota_key" ON "Pesanan"("nomorNota");

-- CreateIndex
CREATE INDEX "Pesanan_sesiKasirId_idx" ON "Pesanan"("sesiKasirId");

-- AddForeignKey
ALTER TABLE "Pesanan" ADD CONSTRAINT "Pesanan_sesiKasirId_fkey" FOREIGN KEY ("sesiKasirId") REFERENCES "SesiKasir"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nota" ADD CONSTRAINT "nota_varianId_fkey" FOREIGN KEY ("varianId") REFERENCES "VarianProduk"("id") ON DELETE SET NULL ON UPDATE CASCADE;
