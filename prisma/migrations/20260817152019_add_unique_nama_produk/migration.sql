/*
  Warnings:

  - A unique constraint covering the columns `[nama]` on the table `Produk` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Produk" ADD COLUMN     "hargabeli" TEXT,
ADD COLUMN     "tempat" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Produk_nama_key" ON "Produk"("nama");
