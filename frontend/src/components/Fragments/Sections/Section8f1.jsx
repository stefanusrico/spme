import React, { useEffect, useState } from 'react';
import { Table } from 'antd';

const PublikasiIlmiahMahasiswa = () => {
  const [data, setData] = useState([]);

  const columns = [
    {
      title: 'No',
      dataIndex: 'no',
      key: 'no',
      align: 'center',
    },
    {
      title: 'Media Publikasi',
      dataIndex: 'mediaPublikasi',
      key: 'mediaPublikasi',
    },
    {
      title: 'Jumlah Judul',
      children: [
        {
          title: 'TS-2',
          dataIndex: 'jumlahTS2',
          key: 'jumlahTS2',
          align: 'center',
        },
        {
          title: 'TS-1',
          dataIndex: 'jumlahTS1',
          key: 'jumlahTS1',
          align: 'center',
        },
        {
          title: 'TS',
          dataIndex: 'jumlahTS',
          key: 'jumlahTS',
          align: 'center',
        },
      ],
    },
    {
      title: 'Jumlah',
      dataIndex: 'jumlah',
      key: 'jumlah',
      align: 'center',
    },
  ];

  useEffect(() => {
    const defaultData = [
      { key: 1, no: 1, mediaPublikasi: 'Jurnal Nasional Tidak Terakreditasi', jumlahTS2: null, jumlahTS1: null, jumlahTS: null, jumlah: null },
      { key: 2, no: 2, mediaPublikasi: 'Jurnal Nasional Terakreditasi', jumlahTS2: null, jumlahTS1: null, jumlahTS: null, jumlah: null },
      { key: 3, no: 3, mediaPublikasi: 'Jurnal Internasional', jumlahTS2: null, jumlahTS1: null, jumlahTS: null, jumlah: null },
      { key: 4, no: 4, mediaPublikasi: 'Jurnal Internasional Bereputasi', jumlahTS2: null, jumlahTS1: null, jumlahTS: null, jumlah: null },
    ];
    setData(defaultData);
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Publikasi Ilmiah Mahasiswa</h2>
      <Table
        columns={columns}
        dataSource={data}
        pagination={false}
        bordered
      />
    </div>
  );
};

export default PublikasiIlmiahMahasiswa;
