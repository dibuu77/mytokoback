-- CreateTable
CREATE TABLE "SesiKasir" (
    "id" TEXT NOT NULL,
    "modalAwal" INTEGER NOT NULL,
    "uangAkhir" INTEGER,
    "totalJual" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'BUKA',
    "dibukaPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ditutupPada" TIMESTAMP(3),

    CONSTRAINT "SesiKasir_pkey" PRIMARY KEY ("id")
);
