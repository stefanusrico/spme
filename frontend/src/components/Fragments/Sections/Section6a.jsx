import React, { useEffect, useState } from 'react';
import { Table } from 'antd';

const PenelitianMahasiswa = () => {
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
      title: 'Tema Penelitian Sesuai Roadmap',
      dataIndex: 'temaPenelitian',
      key: 'temaPenelitian',
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
      // Simulasi data dari API
      const apiResponse = [
        {
          no: 1,
          namaDosen: 'Dr. Budi Santoso',
          temaPenelitian: 'Pengembangan AI untuk Pendidikan',
          namaMahasiswa: 'Adi Wijaya',
          judulKegiatan: 'Penerapan Chatbot di Lingkungan Sekolah',
          tahun: 2023,
        },
        {
          no: 2,
          namaDosen: 'Dr. Siti Aminah',
          temaPenelitian: 'Teknologi IoT untuk Pertanian',
          namaMahasiswa: 'Dewi Lestari',
          judulKegiatan: 'Monitoring Tanaman dengan Sensor IoT',
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
          key: 'jumlah',
          no: '',
          namaDosen: 'Jumlah',
          temaPenelitian: '',
          namaMahasiswa: '',
          judulKegiatan: '',
          tahun: '',
          isTotal: true,
        },
      ];

      setData(finalData);
    };

    fetchData();
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Section 6: Penelitian DTPS yang Melibatkan Mahasiswa</h2>
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

export default PenelitianMahasiswa;
