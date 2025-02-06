import React, { useEffect, useState } from 'react';
import { Table } from 'antd';

const KepuasanPengguna = () => {
  const [data, setData] = useState([]);

  const columns = [
    {
      title: 'No',
      dataIndex: 'no',
      key: 'no',
      align: 'center',
    },
    {
      title: 'Jenis Kemampuan',
      dataIndex: 'jenisKemampuan',
      key: 'jenisKemampuan',
      align: 'center',
    },
    {
      title: 'Tingkat Kepuasan Pengguna',
      children: [
        {
          title: 'Sangat Baik',
          dataIndex: 'sangatBaik',
          key: 'sangatBaik',
          align: 'center',
        },
        {
          title: 'Baik',
          dataIndex: 'baik',
          key: 'baik',
          align: 'center',
        },
        {
          title: 'Cukup',
          dataIndex: 'cukup',
          key: 'cukup',
          align: 'center',
        },
        {
          title: 'Kurang',
          dataIndex: 'kurang',
          key: 'kurang',
          align: 'center',
        },
      ],
    },
    {
      title: 'Rencana Tindak Lanjut oleh UPPS/PS',
      dataIndex: 'rencanaTindakLanjut',
      key: 'rencanaTindakLanjut',
      align: 'center',
    },
  ];

  useEffect(() => {
    const defaultData = [
      { key: 1, no: 1, jenisKemampuan: 'Etika', sangatBaik: '', baik: '', cukup: '', kurang: '', rencanaTindakLanjut: '' },
      { key: 2, no: 2, jenisKemampuan: 'Keahlian pada Bidang Ilmu', sangatBaik: '', baik: '', cukup: '', kurang: '', rencanaTindakLanjut: '' },
      { key: 3, no: 3, jenisKemampuan: 'Kemampuan Berbahasa Asing', sangatBaik: '', baik: '', cukup: '', kurang: '', rencanaTindakLanjut: '' },
      { key: 4, no: 4, jenisKemampuan: 'Penggunaan Teknologi Informasi', sangatBaik: '', baik: '', cukup: '', kurang: '', rencanaTindakLanjut: '' },
      { key: 5, no: 5, jenisKemampuan: 'Kemampuan Berkomunikasi', sangatBaik: '', baik: '', cukup: '', kurang: '', rencanaTindakLanjut: '' },
      { key: 6, no: 6, jenisKemampuan: 'Kerjasama Tim', sangatBaik: '', baik: '', cukup: '', kurang: '', rencanaTindakLanjut: '' },
      { key: 7, no: 7, jenisKemampuan: 'Pengembangan Diri', sangatBaik: '', baik: '', cukup: '', kurang: '', rencanaTindakLanjut: '' },
      { key: 'total', no: '', jenisKemampuan: 'Jumlah', sangatBaik: '', baik: '', cukup: '', kurang: '', rencanaTindakLanjut: '' },
    ];
    setData(defaultData);
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Kepuasan Pengguna</h2>
      <Table
        columns={columns}
        dataSource={data}
        pagination={false}
        bordered
        rowClassName={(record) => (record.key === 'total' ? 'font-bold' : '')}
      />
    </div>
  );
};

export default KepuasanPengguna;
