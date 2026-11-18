
import * as v from "valibot";

// ==========================================
// A. SKEMA PRIMITIF & UTAMA
// ==========================================

// 1. Validasi ID
export const idSchema = v.pipe(
  v.string("ID harus berupa teks"),
  v.trim(),
  v.minLength(1, "ID tidak boleh kosong")
);

// 2. Skema Base Produk
export const produkBaseSchema = v.object({
  id: idSchema,

  nama: v.pipe(
    v.string("Nama harus berupa teks"),
    v.trim(),
    v.minLength(3, "Nama minimal 3 karakter"),
    v.maxLength(50, "Nama maksimal 50 karakter")
  ),

  harga: v.pipe(
    v.number("Harga harus berupa angka"),
    v.minValue(1, "Harga harus lebih dari 0")
  ),

  hargabeli: v.optional(
    v.pipe(
      v.number("Harga harus berupa angka"),
      v.minValue(1, "Harga harus lebih dari 0")
    )
  ),

  stok: v.pipe(
    v.number("Stok harus berupa angka"),
    v.integer("Stok harus bilangan bulat"),
    v.minValue(0, "Stok tidak boleh minus")
  ),

  deskripsi: v.optional(
    v.pipe(
      v.string("Deskripsi harus berupa teks"),
      v.trim(),
      v.minLength(3, "Deskripsi minimal 3 karakter"),
      v.maxLength(50, "Deskripsi maksimal 50 karakter")
    )
  ),

  tempat: v.optional(
    v.pipe(
      v.string("Tempat harus berupa teks"),
      v.trim(),
      v.minLength(3, "Tempat minimal 3 karakter"),
      v.maxLength(50, "Tempat maksimal 50 karakter")
    )
  ),

  fotoUrl: v.optional(
    v.pipe(
      v.string("URL foto harus berupa teks"),
      v.trim(),
      v.minLength(3, "URL foto minimal 3 karakter"),
      v.maxLength(2048, "URL foto terlalu panjang")
    )
  ),
});

// ==========================================
// B. SKEMA QUERY
// ==========================================

export const produkQuerySchema = v.object({
  q: v.optional(v.string()),

  minHarga: v.optional(
    v.pipe(
      v.unknown(),
      v.transform((val) => Number(val)),
      v.number("minHarga harus berupa angka"),
      v.minValue(0, "minHarga tidak boleh minus")
    )
  ),

  maxHarga: v.optional(
    v.pipe(
      v.unknown(),
      v.transform((val) => Number(val)),
      v.number("maxHarga harus berupa angka"),
      v.minValue(1, "maxHarga harus lebih dari 0")
    )
  ),

  page: v.optional(
    v.pipe(
      v.unknown(),
      v.transform((val) => Number(val)),
      v.integer("Page harus bilangan bulat"),
      v.minValue(1, "Page minimal 1")
    ),
    1
  ),

  limit: v.optional(
    v.pipe(
      v.unknown(),
      v.transform((val) => Number(val)),
      v.integer("Limit harus bilangan bulat"),
      v.minValue(1, "Limit minimal 1")
    ),
    10
  ),

  sortBy: v.optional(
    v.picklist(["createdAt", "harga", "nama"]),
    "createdAt"
  ),

  order: v.optional(
    v.picklist(["asc", "desc"]),
    "desc"
  ),
});

// ==========================================
// C. SKEMA PER METHOD
// ==========================================

// POST: Tambah produk
export const createProdukSchema = v.omit(
  produkBaseSchema,
  ["id"]
);

// PUT: Update seluruh produk
export const updateProdukPUTSchema = v.omit(
  produkBaseSchema,
  ["id"]
);

// PATCH: Update sebagian produk
export const updateProdukPATCHSchema = v.partial(
  v.omit(produkBaseSchema, ["id"])
);
