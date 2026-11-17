"use client";

import { useState, useEffect } from "react";
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

  return (
    <main>
      <div>
        {/* Header */}
        <div>
          <h1>Manajemen Produk</h1>
          <p>Tambah dan kelola katalog produk Anda</p>
        </div>

        {generalError && (
          <div>
            <p>{generalError}</p>
          </div>
        )}

        {/* Layout List */}
        <div>
          <section>
            <h2>Daftar Produk</h2>

            {loading ? (
              <p>Memuat data produk...</p>
            ) : produkList.length === 0 ? (
              <p>Belum ada produk yang ditambahkan.</p>
            ) : (
              <div>
                <table>
                  <thead>
                    <tr>
                      <th>Nama</th>
                      <th>Harga</th>
                    </tr>
                  </thead>
                  <tbody>
                    {produkList.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <Link href={`/produk/${item.id}`}>
                            {item.nama || item.Harga || item.harga || item.name}
                          </Link>
                        </td>
                        <td>
                          Rp {item.harga?.toLocaleString("id-ID") || item.Harga?.toLocaleString("id-ID")}
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
