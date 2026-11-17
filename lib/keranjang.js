import * as v from "valibot";

export const idSchema = v.pipe(
  v.string("ID harus berupa teks"),
  v.trim(),
  v.minLength(1, "ID tidak boleh kosong")
);

export const aturankeranjang = v.object({
  id : idSchema,
  produkId : v.pipe(
    v.string("ID harus berupa teks"),
    v.trim(),
    v.minLength(1, "ID tidak boleh kosong")
  ),
  varianId : v.optional (v.pipe(
    v.string("ID harus berupa teks"),
    v.trim(),
    v.minLength(1, "ID tidak boleh kosong"))
  ),
  jumlah : v.pipe(
    v.number("jumlah harus berupa angka"),
    v.minValue(1, "jumlah harus lebih dari 0")
)
});


export const updatejumlah = v.pick(aturankeranjang, ["id", "jumlah"]);

