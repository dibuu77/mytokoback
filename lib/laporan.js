import * as v from "valibot";

export const idSchema = v.pipe(
  v.string("ID harus berupa teks"),
  v.trim(),
  v.minLength(1, "ID tidak boleh kosong")
);

// 2. Skema Base Produk (Tabel Database)
export const aturannota = v.object({
  id: idSchema,
  buyyer : v.pipe(
      v.string("Nama harus berupa teks"),
      v.trim(),
      v.minLength(3, "Nama minimal 3 karakter"),
      v.maxLength(50, "Nama maksimal 50 karakter")
    ),
  produkId : v.pipe(
      v.string("Nama harus berupa teks"),
      v.trim(),
      v.minLength(3, "Nama minimal 3 karakter"),
      v.maxLength(50, "Nama maksimal 50 karakter")
    ),
  jumlahbeli : v.pipe(
      v.number("Nama harus berupa teks"),
      v.maxLength(50, "Nama maksimal 50 karakter")
    ),
  fotonota : v.pipe(
      v.string("Nama harus berupa teks"),
      v.trim(),
      v.minLength(3, "Nama minimal 3 karakter"),
      v.maxLength(50, "Nama maksimal 50 karakter")
    )
  });

export const aturannota2 = v.omit(aturannota, ["id"]);
