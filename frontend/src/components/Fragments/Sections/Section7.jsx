import React, { useEffect, useState } from 'react';
import { Table } from 'antd';

const PengabdianKepadaMasyarakat = () => {
  const [data, setData] = useState([]);

  const columns = [
    {
      title: 'No',
      dataIndex: 'no',
      key: 'no',
      align: 'center',
      render: (_, __, index) => (index < data.length - 1 ? index + 1 : ''),
    },
    {
      title: 'Nama Dosen',
      dataIndex: 'namaDosen',
      key: 'namaDosen',
    },
    {
      title: 'Tema PkM Sesuai Roadmap',
      dataIndex: 'temaPkm',
      key: 'temaPkm',
    },
    {
      title: 'Nama Mahasiswa',
      dataIndex: 'namaMahasiswa',
      key: 'namaMahasiswa',
    },
    {
      title: 'Judul Kegiatan',
      dataIndex: 'judulKegiatan',
      key: 'judulKegiatan',
    },
    {
      title: 'Tahun',
      dataIndex: 'tahun',
      key: 'tahun',
      align: 'center',
    },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Simulasi data dari API
        const apiResponse = [
          {
            namaDosen: 'Dr. Siti Aminah',
            temaPkm: 'Pemberdayaan Masyarakat melalui Teknologi Tepat Guna',
            namaMahasiswa: 'Ahmad Fadli',
            judulKegiatan: 'Pelatihan Pembuatan Biogas untuk Desa Mandiri Energi',
            tahun: 2023,
          },
          {
            namaDosen: 'Prof. Rahmat Wijaya',
            temaPkm: 'Edukasi Kesehatan untuk Remaja',
            namaMahasiswa: 'Dian Sari',
            judulKegiatan: 'Sosialisasi Gizi Seimbang untuk Pelajar SMA',
            tahun: 2022,
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
            temaPkm: '',
            namaMahasiswa: '',
            judulKegiatan: '',
            tahun: '',
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
      <h2 className="text-xl font-bold mb-4">Pengabdian kepada Masyarakat</h2>
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

export default PengabdianKepadaMasyarakat;
