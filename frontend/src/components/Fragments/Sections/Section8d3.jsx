import React, { useEffect, useState } from 'react';
import { Table } from 'antd';

const WaktuTungguSarjanaTerapan = () => {
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
      dataIndex: 'jumlahTerlacak',
      key: 'jumlahTerlacak',
      align: 'center',
    },
    {
      title: 'Jumlah Lulusan Terlacak dengan Waktu Tunggu Mendapatkan Pekerjaan',
      children: [
        {
          title: 'WT < 6 Bulan',
          dataIndex: 'wtLessThan6',
          key: 'wtLessThan6',
          align: 'center',
        },
        {
          title: '6 <= WT <= 18 Bulan',
          dataIndex: 'wt6To18',
          key: 'wt6To18',
          align: 'center',
        },
        {
          title: 'WT > 18 Bulan',
          dataIndex: 'wtMoreThan18',
          key: 'wtMoreThan18',
          align: 'center',
        },
      ],
    },
  ];

  useEffect(() => {
    const defaultData = [
      {
        key: 1,
        tahunLulus: null,
        jumlahLulusan: null,
        jumlahTerlacak: null,
        wtLessThan6: null,
        wt6To18: null,
        wtMoreThan18: null,
      },
    ];
    setData(defaultData);
  }, []);

  const handleInputChange = (index, field, value) => {
    const newData = [...data];
    newData[index][field] = value;
    setData(newData);
  };

  const calculateTotals = () => {
    const totals = {
      key: 'total',
      tahunLulus: 'Jumlah',
      jumlahLulusan: data.reduce((sum, item) => sum + (item.jumlahLulusan || 0), 0),
      jumlahTerlacak: data.reduce((sum, item) => sum + (item.jumlahTerlacak || 0), 0),
      wtLessThan6: data.reduce((sum, item) => sum + (item.wtLessThan6 || 0), 0),
      wt6To18: data.reduce((sum, item) => sum + (item.wt6To18 || 0), 0),
      wtMoreThan18: data.reduce((sum, item) => sum + (item.wtMoreThan18 || 0), 0),
    };
    return totals;
  };

  const tableData = [...data, calculateTotals()];

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Waktu Tunggu Lulusan - Program Sarjana Terapan</h2>
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

export default WaktuTungguSarjanaTerapan;
