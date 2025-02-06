import React, { useState, useEffect } from "react";
import { Table, Input } from "antd";

const KaryaIlmiahMahasiswaDisitasi = () => {
  const [data, setData] = useState([]);

  const columns = [
    {
      title: "No",
      dataIndex: "no",
      key: "no",
      align: "center",
    },
    {
      title: "Nama Dosen",
      dataIndex: "namaDosen",
      key: "namaDosen",
      align: "center",
    },
    {
      title: "Judul Artikel yang Disitasi (Jurnal/Buku, Volume, Tahun, Nomor, Halaman)",
      dataIndex: "judulArtikel",
      key: "judulArtikel",
      align: "center",
    },
    {
      title: "Jumlah Sitasi",
      dataIndex: "jumlahSitasi",
      key: "jumlahSitasi",
      align: "center",
    },
  ];

  useEffect(() => {
    const defaultData = [
      { key: 1, no: 1, namaDosen: "", judulArtikel: "", jumlahSitasi: "" },
      { key: 2, no: 2, namaDosen: "", judulArtikel: "", jumlahSitasi: "" },
    ];

    const summaryRow = {
      key: "summary",
      no: "Jumlah",
      namaDosen: "",
      judulArtikel: "",
      jumlahSitasi: "",
    };

    setData([...defaultData, summaryRow]);
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Karya Ilmiah Mahasiswa yang Disitasi dalam 3 Tahun Terakhir</h2>
      <Table
        columns={columns}
        dataSource={data}
        pagination={false}
        bordered
        rowClassName={(record) => (record.key === "summary" ? "font-bold" : "")}
      />
    </div>
  );
};

export default KaryaIlmiahMahasiswaDisitasi;
