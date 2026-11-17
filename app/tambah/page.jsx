"use client";

import { useState, useEffect } from "react";

export default function ProdukPage() {
  const [produkList, setProdukList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  
  // State Form (sesuaikan field dengan skema createProdukSchema Anda)
  const [form, setForm] = useState({
    nama: "",
    harga: "",
    stok: "",
    deskripsi: "",
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState("");

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

  // 2. Kirim data produk baru (POST)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setFieldErrors({});
    setGeneralError("");

    // Konversi tipe data number jika skema Valibot Anda membutuhkannya
    const payload = {
      ...form,
      harga: Number(form.harga),
      stok: Number(form.stok),
    };

    try {
      const res = await fetch("/api/produk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();

      if (!res.ok) {
        // Tangkap error validasi dari Valibot
        if (resData.errors) {
          setFieldErrors(resData.errors);
        } else {
          setGeneralError(resData.message || "Gagal menambahkan produk");
        }
        return;
      }

      // Reset form & perbarui data list produk
      setForm({ nama: "", harga: "", stok: "", deskripsi: "" });
      fetchProduk();
    } catch (err) {
      setGeneralError("Terjadi kesalahan koneksi server");
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-12 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manajemen Produk</h1>
          <p className="text-gray-500 text-sm mt-1">Tambah dan kelola katalog produk Anda</p>
        </div>

        {generalError && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {generalError}
          </div>
        )}

        {/* Layout Form & List */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Form Tambah Produk */}
          <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-fit">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Tambah Produk Baru</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nama Produk</label>
                <input
                  type="text"
                  placeholder="e.g. Kaos Polos"
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                {fieldErrors.nama && (
                  <p className="text-xs text-red-500 mt-1">{fieldErrors.nama[0]}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Harga (Rp)</label>
                  <input
                    type="number"
                    placeholder="50000"
                    value={form.harga}
                    onChange={(e) => setForm({ ...form, harga: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  {fieldErrors.harga && (
                    <p className="text-xs text-red-500 mt-1">{fieldErrors.harga[0]}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Stok</label>
                  <input
                    type="number"
                    placeholder="10"
                    value={form.stok}
                    onChange={(e) => setForm({ ...form, stok: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  {fieldErrors.stok && (
                    <p className="text-xs text-red-500 mt-1">{fieldErrors.stok[0]}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Deskripsi</label>
                <textarea
                  rows={3}
                  placeholder="Keterangan singkat..."
                  value={form.deskripsi}
                  onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {fieldErrors.deskripsi && (
                  <p className="text-xs text-red-500 mt-1">{fieldErrors.deskripsi[0]}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg text-sm transition disabled:opacity-50"
              >
                {submitLoading ? "Menyimpan..." : "Simpan Produk"}
              </button>
            </form>
          </section>

          {/* Tabel / List Daftar Produk */}
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
                      <th className="p-3">Deskripsi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {produkList.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="p-3 font-medium text-gray-900">{item.nama || item.name}</td>
                        <td className="p-3 text-gray-700">Rp {item.harga?.toLocaleString("id-ID")}</td>
                        <td className="p-3 text-gray-700">{item.stok}</td>
                        <td className="p-3 text-gray-500 truncate max-w-xs">{item.deskripsi || "-"}</td>
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