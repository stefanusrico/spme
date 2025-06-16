import React, { useEffect, useState } from 'react';
import { Table } from 'antd';

const IntegrasiPenelitianPkM = () => {
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
      title: 'Judul Penelitian/PkM',
      dataIndex: 'judulPenelitian',
      key: 'judulPenelitian',
    },
    {
      title: 'Nama Dosen',
      dataIndex: 'namaDosen',
      key: 'namaDosen',
    },
    {
      title: 'Mata Kuliah',
      dataIndex: 'mataKuliah',
      key: 'mataKuliah',
    },
    {
      title: 'Bentuk Integrasi',
      dataIndex: 'bentukIntegrasi',
      key: 'bentukIntegrasi',
    },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Simulasi data dari API
        const apiResponse = [
          {
            judulPenelitian: 'Penerapan AI dalam Pendidikan',
            namaDosen: 'Dr. C. Sudirman',
            mataKuliah: 'Teknologi Pendidikan',
            bentukIntegrasi: 'Studi kasus pada kelas',
          },
          {
            judulPenelitian: 'Pengelolaan Limbah Organik',
            namaDosen: 'Prof. D. Kartono',
            mataKuliah: 'Ekologi Lingkungan',
            bentukIntegrasi: 'Diskusi dan presentasi hasil penelitian',
          },
        ];

        setData(apiResponse.map((item, index) => ({ key: index, ...item })));
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">
        Integrasi Kegiatan Penelitian/PkM dalam Pembelajaran
      </h2>
      <Table columns={columns} dataSource={data} pagination={false} bordered />
    </div>
  );
};

export default IntegrasiPenelitianPkM;
