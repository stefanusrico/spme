import React, { useEffect, useState } from 'react';
import { Table, Input } from 'antd';

const TempatKerjaLulusan = () => {
  const [data, setData] = useState([]);

  const columns = [
    {
      title: 'Tahun Lulus',
      dataIndex: 'tahunLulus',
      key: 'tahunLulus',
      align: 'center',
    },
    {
      title: 'Jumlah Lulusan',
      dataIndex: 'jumlahLulusan',
      key: 'jumlahLulusan',
      align: 'center',
    },
    {
      title: 'Jumlah Lulusan yang Terlacak',
      dataIndex: 'lulusanTerlacak',
      key: 'lulusanTerlacak',
      align: 'center',
    },
    {
      title: 'Jumlah Lulusan Terlacak yang Bekerja Berdasarkan Tingkat/Ukuran Tempat Kerja/Berwirausaha',
      children: [
        {
          title: 'Lokal/Wilayah/Berwirausaha Tidak Berizin',
          dataIndex: 'lokal',
          key: 'lokal',
          align: 'center',
        },
        {
          title: 'Nasional/Berwirausaha Berizin',
          dataIndex: 'nasional',
          key: 'nasional',
          align: 'center',
        },
        {
          title: 'Multinasional/Internasional',
          dataIndex: 'multinasional',
          key: 'multinasional',
          align: 'center',
        },
      ],
    },
  ];

  useEffect(() => {
    const defaultData = [
      {
        key: 1,
        tahunLulus: 'TS-4',
        jumlahLulusan: '',
        lulusanTerlacak: '',
        lokal: '',
        nasional: '',
        multinasional: '',
      },
      {
        key: 2,
        tahunLulus: 'TS-3',
        jumlahLulusan: '',
        lulusanTerlacak: '',
        lokal: '',
        nasional: '',
        multinasional: '',
      },
      {
        key: 3,
        tahunLulus: 'TS-2',
        jumlahLulusan: '',
        lulusanTerlacak: '',
        lokal: '',
        nasional: '',
        multinasional: '',
      },
    ];
    setData(defaultData);
  }, []);

  const calculateTotals = () => {
    const totals = {
      key: 'total',
      tahunLulus: 'Jumlah',
      jumlahLulusan: data.reduce((sum, item) => sum + (parseInt(item.jumlahLulusan) || 0), 0),
      lulusanTerlacak: data.reduce((sum, item) => sum + (parseInt(item.lulusanTerlacak) || 0), 0),
      lokal: data.reduce((sum, item) => sum + (parseInt(item.lokal) || 0), 0),
      nasional: data.reduce((sum, item) => sum + (parseInt(item.nasional) || 0), 0),
      multinasional: data.reduce((sum, item) => sum + (parseInt(item.multinasional) || 0), 0),
    };
    return totals;
  };

  const tableData = [...data, calculateTotals()];

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Tempat Kerja Lulusan</h2>
      <Table
        columns={columns}
        dataSource={tableData}
        pagination={false}
        bordered
        rowClassName={(record) => (record.key === 'total' ? 'font-bold' : '')}
      />
    </div>
  );
};

export default TempatKerjaLulusan;
