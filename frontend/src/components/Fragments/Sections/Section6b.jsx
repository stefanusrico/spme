import React, { useEffect, useState } from 'react';
import { Table } from 'antd';

const PenelitianTesisDisertasi = () => {
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
      title: 'Judul Tesis/Disertasi',
      dataIndex: 'judulTesis',
      key: 'judulTesis',
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
      // Data default dengan baris "Jumlah"
      const defaultData = [
        {
          key: 'jumlah',
          no: '',
          namaDosen: 'Jumlah',
          temaPenelitian: '',
          namaMahasiswa: '',
          judulTesis: '',
          tahun: '',
          isTotal: true,
        },
      ];

      setData(defaultData);
    };

    fetchData();
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Section 6b: Penelitian DTPS yang Menjadi Rujukan Tema Tesis/Disertasi</h2>
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

export default PenelitianTesisDisertasi;
