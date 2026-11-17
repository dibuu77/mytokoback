"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";

export default function ProdukPage() {
  const [produkList, setProdukList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);

  // State Form
  const [form, setForm] = useState({
    nama: "",
    harga: "",
    stok: "",
    deskripsi: "",
  });

  // State Mode Edit & Error
  const [editingId, setEditingId] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState("");

  const isEditing = Boolean(editingId);

  // 1. Ambil data produk (GET)
  const fetchProduk = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/produk");
      const resData = await res.json();

      if (resData.success) {
        setProdukList(resData.data);
      } else {
        setGeneralError(resData.message || "Gagal memuat produk");
      }
    } catch (err) {
      setGeneralError("Koneksi bermasalah saat mengambil data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduk();
  }, []);

  // 2. Handler input form dua arah
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // 3. Handler persiapan Edit (Sinkron)
  const handleEditClick = (item) => {
    setEditingId(item.id);
    setForm({
      nama: item.nama || item.name || "",
      harga: item.harga ? String(item.harga) : "",
      stok: item.stok !== undefined ? String(item.stok) : "",
      deskripsi: item.deskripsi || "",
    });
    setFieldErrors({});
    setGeneralError("");
  };

  // 4. Batal Edit / Reset Form (Sinkron)
  const handleCancelEdit = () => {
    setEditingId(null);
    setForm({
      nama: "",
      harga: "",
      stok: "",
      deskripsi: "",
    });
    setFieldErrors({});
  };

  // 5. Submit Form: Tambah (POST) atau Edit (PUT)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setGeneralError("");
    setFieldErrors({});

    const endpoint = isEditing ? `/api/produk/${editingId}` : "/api/produk";
    const method = isEditing ? "PUT" : "POST";

    try {
      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nama: form.nama,
          harga: Number(form.harga),
          stok: Number(form.stok),
          deskripsi: form.deskripsi,
        }),
      });

      const resData = await res.json();

      if (!res.ok || !resData.success) {
        if (resData.errors) {
          setFieldErrors(resData.errors);
        } else {
          setGeneralError(resData.message || "Gagal menyimpan produk");
        }
        return;
      }

      // Berhasil: perbarui list tabel dan reset form
      await fetchProduk();
      handleCancelEdit();
    } catch (err) {
      setGeneralError("Koneksi bermasalah saat menyimpan data");
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manajemen Produk</h1>
          <p className="text-gray-500 text-sm mt-1">
            Tambah, perbarui, dan kelola katalog produk Anda
          </p>
        </div>

        {generalError && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {generalError}
          </div>
        )}

        {/* Layout Form & List */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Kolom Kiri: Form Tambah / Edit */}
          <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-fit">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              {isEditing ? "Edit Produk" : "Tambah Produk Baru"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Produk
                </label>
                <input
                  type="text"
                  name="nama"
                  value={form.nama}
                  onChange={handleChange}
                  required
                  placeholder="Contoh: Kemeja Flanel"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {fieldErrors.nama && (
                  <p className="text-xs text-red-500 mt-1">{fieldErrors.nama}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Harga (Rp)
                </label>
                <input
                  type="number"
                  name="harga"
                  value={form.harga}
                  onChange={handleChange}
                  required
                  min="0"
                  placeholder="Contoh: 150000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {fieldErrors.harga && (
                  <p className="text-xs text-red-500 mt-1">{fieldErrors.harga}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stok
                </label>
                <input
                  type="number"
                  name="stok"
                  value={form.stok}
                  onChange={handleChange}
                  required
                  min="0"
                  placeholder="Contoh: 20"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {fieldErrors.stok && (
                  <p className="text-xs text-red-500 mt-1">{fieldErrors.stok}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deskripsi
                </label>
                <textarea
                  name="deskripsi"
                  value={form.deskripsi}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Keterangan singkat produk..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {fieldErrors.deskripsi && (
                  <p className="text-xs text-red-500 mt-1">{fieldErrors.deskripsi}</p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition disabled:opacity-50"
                >
                  {submitLoading
                    ? "Menyimpan..."
                    : isEditing
                    ? "Simpan Perubahan"
                    : "Tambah Produk"}
                </button>

                {isEditing && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg text-sm transition"
                  >
                    Batal
                  </button>
                )}
              </div>
            </form>
          </section>

          {/* Kolom Kanan: Tabel Daftar Produk */}
          <section className="md:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Daftar Produk</h2>

            {loading ? (
              <p className="text-sm text-gray-500">Memuat data produk...</p>
            ) : produkList.length === 0 ? (
              <p className="text-sm text-gray-500">Belum ada produk yang ditambahkan.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-200 text-gray-500 bg-gray-50">
                    <tr>
                      <th className="p-3">Nama</th>
                      <th className="p-3">Harga</th>
                      <th className="p-3">Stok</th>
                      <th className="p-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {produkList.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="p-3 font-medium text-gray-900">
                          <Link
                            href={`/produk/${item.id}`}
                            className="text-indigo-600 hover:text-indigo-800 hover:underline font-semibold"
                          >
                            {item.nama || item.name}
                          </Link>
                        </td>
                        <td className="p-3 text-gray-700">
                          Rp {item.harga?.toLocaleString("id-ID")}
                        </td>
                        <td className="p-3 text-gray-700">{item.stok ?? "-"}</td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleEditClick(item)}
                            className="text-indigo-600 hover:text-indigo-900 font-medium text-sm"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}