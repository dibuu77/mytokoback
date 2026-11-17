/*
  Warnings:

  - You are about to drop the column `harga` on the `Produk` table. All the data in the column will be lost.
  - Added the required column `hargabeli` to the `Produk` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hargajual` to the `Produk` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Produk" DROP COLUMN "harga",
ADD COLUMN     "hargabeli" INTEGER NOT NULL,
ADD COLUMN     "hargajual" INTEGER NOT NULL;
