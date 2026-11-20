/*
  Warnings:

  - Added the required column `namaPembeli` to the `Pesanan` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Pesanan" DROP CONSTRAINT "Pesanan_userId_fkey";

-- AlterTable
ALTER TABLE "Pesanan" ADD COLUMN     "namaPembeli" TEXT NOT NULL,
ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Pesanan" ADD CONSTRAINT "Pesanan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
