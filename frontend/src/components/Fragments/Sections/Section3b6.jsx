import React, { useEffect, useState } from 'react';
import { Table } from 'antd';

const ProdukJasaDiadopsi = () => {
  const [data, setData] = useState([]);

  const columns = [
    {
      title: 'No',
      dataIndex: 'no',
      key: 'no',
      align: 'center',
      render: (_, __, index) => index + 1,
    },
    {
      title: 'Nama Dosen',
      dataIndex: 'namaDosen',
      key: 'namaDosen',
    },
    {
      title: 'Nama Produk/Jasa',
      dataIndex: 'namaProduk',
      key: 'namaProduk',
    },
    {
      title: 'Deskripsi Produk/Jasa',
      dataIndex: 'deskripsiProduk',
      key: 'deskripsiProduk',
    },
    {
      title: 'Bukti',
      dataIndex: 'bukti',
      key: 'bukti',
      render: (text) => (
        <a href={text} target="_blank" rel="noopener noreferrer">
          Lihat Bukti
        </a>
      ),
    },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Simulasi data dari API
        const apiResponse = [
          {
            namaDosen: 'Dr. A. Rahman',
            namaProduk: 'Alat Deteksi Polusi Udara',
            deskripsiProduk: 'Alat berbasis IoT untuk memantau kualitas udara secara real-time.',
            bukti: 'https://example.com/bukti-polusi',
          },
          {
            namaDosen: 'Prof. B. Kartini',
            namaProduk: 'Aplikasi Edukasi Anak',
            deskripsiProduk: 'Aplikasi berbasis mobile untuk meningkatkan literasi anak usia dini.',
            bukti: 'https://example.com/bukti-edukasi',
          },
        ];

        // Tambahkan baris "Jumlah" pada akhir data
        const finalData = [
          ...apiResponse.map((item, index) => ({
            key: index,
            ...item,
          })),
          {
            key: 'total',
            namaDosen: 'Jumlah',
            namaProduk: '',
            deskripsiProduk: '',
            bukti: '',
            isTotal: true,
          },
        ];

        setData(finalData);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">
        Produk/Jasa DTPS yang Diadopsi oleh Industri/Masyarakat
      </h2>
      <Table
        columns={columns}
        dataSource={data}
        pagination={false}
        bordered
        rowClassName={(record) => (record.isTotal ? 'font-bold' : '')}
      />
    </div>
  );
};

export default ProdukJasaDiadopsi;
