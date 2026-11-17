/*
  Warnings:

  - You are about to drop the column `hargabeli` on the `Produk` table. All the data in the column will be lost.
  - You are about to drop the column `hargajual` on the `Produk` table. All the data in the column will be lost.
  - Added the required column `harga` to the `Produk` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Produk" DROP COLUMN "hargabeli",
DROP COLUMN "hargajual",
ADD COLUMN     "harga" INTEGER NOT NULL,
ADD COLUMN     "kategoriId" TEXT,
ADD COLUMN     "stok" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Kategori" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,

    CONSTRAINT "Kategori_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VarianProduk" (
    "id" TEXT NOT NULL,
    "produkId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "harga" INTEGER NOT NULL,
    "stok" INTEGER NOT NULL DEFAULT 0,
    "fotoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VarianProduk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "produkId" TEXT NOT NULL,
    "varianId" TEXT,
    "jumlah" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pesanan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pesanan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetailPesanan" (
    "id" TEXT NOT NULL,
    "pesananId" TEXT NOT NULL,
    "produkId" TEXT NOT NULL,
    "varianId" TEXT,
    "namaVarian" TEXT,
    "jumlah" INTEGER NOT NULL,
    "harga" INTEGER NOT NULL,

    CONSTRAINT "DetailPesanan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Produk" ADD CONSTRAINT "Produk_kategoriId_fkey" FOREIGN KEY ("kategoriId") REFERENCES "Kategori"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VarianProduk" ADD CONSTRAINT "VarianProduk_produkId_fkey" FOREIGN KEY ("produkId") REFERENCES "Produk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_produkId_fkey" FOREIGN KEY ("produkId") REFERENCES "Produk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_varianId_fkey" FOREIGN KEY ("varianId") REFERENCES "VarianProduk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pesanan" ADD CONSTRAINT "Pesanan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetailPesanan" ADD CONSTRAINT "DetailPesanan_pesananId_fkey" FOREIGN KEY ("pesananId") REFERENCES "Pesanan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetailPesanan" ADD CONSTRAINT "DetailPesanan_produkId_fkey" FOREIGN KEY ("produkId") REFERENCES "Produk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetailPesanan" ADD CONSTRAINT "DetailPesanan_varianId_fkey" FOREIGN KEY ("varianId") REFERENCES "VarianProduk"("id") ON DELETE SET NULL ON UPDATE CASCADE;
