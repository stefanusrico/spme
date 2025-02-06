import React, { useEffect, useState } from 'react';
import { Table } from 'antd';

const WaktuTungguSarjana = () => {
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
          title: 'WT < 6 bulan',
          dataIndex: 'wtLessThan6',
          key: 'wtLessThan6',
          align: 'center',
        },
        {
          title: '6 <= WT <= 18 bulan',
          dataIndex: 'wtBetween6And18',
          key: 'wtBetween6And18',
          align: 'center',
        },
        {
          title: 'WT >= 18 bulan',
          dataIndex: 'wtGreaterThan18',
          key: 'wtGreaterThan18',
          align: 'center',
        },
      ],
    },
  ];

  useEffect(() => {
    const defaultData = [
      {
        key: 1,
        tahunLulus: '',
        jumlahLulusan: null,
        jumlahTerlacak: null,
        wtLessThan6: null,
        wtBetween6And18: null,
        wtGreaterThan18: null,
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
      wtBetween6And18: data.reduce((sum, item) => sum + (item.wtBetween6And18 || 0), 0),
      wtGreaterThan18: data.reduce((sum, item) => sum + (item.wtGreaterThan18 || 0), 0),
    };
    return totals;
  };

  const tableData = [...data, calculateTotals()];

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Waktu Tunggu Lulusan - Program Sarjana</h2>
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

export default WaktuTungguSarjana;
