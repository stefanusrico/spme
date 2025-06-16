import React, { useEffect, useState } from 'react';
import { Table } from 'antd';

const PrestasiMahasiswa = () => {
  const [data, setData] = useState([]);

  const columns = [
    {
      title: 'No',
      dataIndex: 'no',
      key: 'no',
      align: 'center',
    },
    {
      title: 'Nama Kegiatan',
      dataIndex: 'namaKegiatan',
      key: 'namaKegiatan',
      align: 'center',
    },
    {
      title: 'Tahun Perolehan',
      dataIndex: 'tahunPerolehan',
      key: 'tahunPerolehan',
      align: 'center',
    },
    {
      title: 'Tingkat',
      children: [
        {
          title: 'Lokal/Wilayah',
          dataIndex: 'tingkatLokal',
          key: 'tingkatLokal',
          align: 'center',
        },
        {
          title: 'Nasional',
          dataIndex: 'tingkatNasional',
          key: 'tingkatNasional',
          align: 'center',
        },
        {
          title: 'Internasional',
          dataIndex: 'tingkatInternasional',
          key: 'tingkatInternasional',
          align: 'center',
        },
      ],
    },
    {
      title: 'Prestasi yang Dicapai',
      dataIndex: 'prestasiDicapai',
      key: 'prestasiDicapai',
      align: 'center',
    },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Simulasi data dari API
        const apiResponse = [
          {
            no: 1,
            namaKegiatan: 'Lomba Karya Tulis Ilmiah',
            tahunPerolehan: 2023,
            tingkatLokal: 'Juara 1',
            tingkatNasional: '-',
            tingkatInternasional: '-',
            prestasiDicapai: 'Piala Emas',
          },
          {
            no: 2,
            namaKegiatan: 'Hackathon Nasional',
            tahunPerolehan: 2023,
            tingkatLokal: '-',
            tingkatNasional: 'Juara 2',
            tingkatInternasional: '-',
            prestasiDicapai: 'Medali Perak',
          },
        ];

        // Tambahkan baris jumlah di akhir
        const jumlahBaris = {
          key: 'jumlah',
          no: 'Jumlah',
          namaKegiatan: '',
          tahunPerolehan: '',
          tingkatLokal: '',
          tingkatNasional: '',
          tingkatInternasional: '',
          prestasiDicapai: '',
        };

        setData([...apiResponse, jumlahBaris]);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Prestasi Akademik Mahasiswa</h2>
      <Table
        columns={columns}
        dataSource={data.map((item, index) => ({ ...item, key: index }))}
        pagination={false}
        bordered
      />
    </div>
  );
};

export default PrestasiMahasiswa;
