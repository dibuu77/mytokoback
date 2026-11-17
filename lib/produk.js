import * as v from "valibot";

// ==========================================
// A. SKEMA PRIMITIF & UTAMA
// ==========================================

// 1. Validasi ID (CUID / String sesuai Prisma Schema)
export const idSchema = v.pipe(
  v.string("ID harus berupa teks"),
  v.trim(),
  v.minLength(1, "ID tidak boleh kosong")
);

// 2. Skema Base Produk (Tabel Database)
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
  hargabeli: v.optional( v.pipe(
    v.number("Harga harus berupa angka"),
    v.minValue(1, "Harga harus lebih dari 0")
  )),
  stok: v.pipe(
    v.number("Stok harus berupa angka"),
    v.integer("Stok harus bilangan bulat"),
    v.minValue(0, "Stok tidak boleh minus") // Pengganti v.nonNegative
  ),
  deskripsi: v.optional(v.pipe(
    v.string("deskripsi harus berupa teks"),
    v.trim(),
    v.minLength(3, "deskripsi minimal 3 karakter"),
    v.maxLength(50, "deskripsi maksimal 50 karakter")
  )),
  tempat : v.optional(v.pipe(
    v.string("tempat harus berupa teks"),
    v.trim(),
    v.minLength(3, "tempat minimal 3 karakter"),
    v.maxLength(50, "tempat maksimal 50 karakter")
  )),
  fotoUrl: v.optional(v.pipe(
    v.string("Nama harus berupa teks"),
    v.trim(),
    v.minLength(3, "Nama minimal 3 karakter"),
    v.maxLength(50, "Nama maksimal 50 karakter")
  ))
});


// ==========================================
// B. SKEMA PER METHOD / SKENARIO
// ==========================================

// 1. GET (Query Filter & Pagination)
export const produkQuerySchema = v.object({
  q: v.optional(v.string()),

  minHarga: v.optional(
    v.pipe(
      v.unknown(),
      v.transform((val) => Number(val)),
      v.number("minHarga harus berupa angka"),
      v.minValue(0, "minHarga tidak boleh minus") // Pengganti v.nonNegative
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
    1 // Default page = 1
  ),

  limit: v.optional(
    v.pipe(
      v.unknown(),
      v.transform((val) => Number(val)),
      v.integer("Limit harus bilangan bulat"),
      v.minValue(1, "Limit minimal 1")
    ),
    10 // Default limit = 10
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

// 2. POST (Tambah Data Baru - ID Dibuang)
export const createProdukSchema = v.omit(produkBaseSchema, ["id"]);

// 3. PUT (Update Total - Body Lengkap Tanpa ID)
export const updateProdukPUTSchema = v.omit(produkBaseSchema, ["id"]);

// 4. PATCH (Update Sebagian - Partial & Omit ID)
export const updateProdukPATCHSchema = v.partial(
  v.omit(produkBaseSchema, ["id"])
);



export async function PATCH(request, { params }) {
  const { id } = await params;
  const body = await request.json();
  const val = v.safeParse(statusSchema, body);
  if (!val.success) return NextResponse.json({ success: false, message: "Invalid boolean" }, { status: 400 });

  const updated = await prisma.produk.update({ where: { id }, data: { isTersedia: val.output.isTersedia } });
  return NextResponse.json({ success: true, data: updated });
}