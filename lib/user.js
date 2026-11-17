import * as v from "valibot";

export const idSchema = v.pipe(
  v.string("ID harus berupa teks"),
  v.trim(),
  v.minLength(1, "ID tidak boleh kosong")
);

// 2. Skema Base Produk (Tabel Database)
export const aturanakun = v.object({
  id: idSchema,
  nama : v.pipe(
      v.string("Nama harus berupa teks"),
      v.trim(),
      v.minLength(3, "Nama minimal 3 karakter"),
      v.maxLength(50, "Nama maksimal 50 karakter")
    ),
  email : v.pipe(
      v.string("Nama harus berupa teks"),
      v.trim(),
      v.minLength(3, "Nama minimal 3 karakter"),
      v.maxLength(50, "Nama maksimal 50 karakter")
    ),
  password : v.pipe(
      v.string("Nama harus berupa teks"),
      v.trim(),
      v.minLength(3, "Nama minimal 3 karakter"),
      v.maxLength(50, "Nama maksimal 50 karakter")
    )
  });

export const opsiemail = v.partial(aturanakun, ["email"]);
export const update = v.omit(opsiemail, ["id"]);