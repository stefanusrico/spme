import React, { useEffect, useState } from 'react';
import { Table } from 'antd';

const WaktuTungguDiploma3 = () => {
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
      title: 'Jumlah Lulusan yang Dipesan Sebelum Lulus',
      dataIndex: 'dipesanSebelumLulus',
      key: 'dipesanSebelumLulus',
      align: 'center',
    },
    {
      title: 'Jumlah Lulusan Terlacak dengan Waktu Tunggu Mendapatkan Pekerjaan',
      children: [
        {
          title: 'WT < 3 Bulan',
          dataIndex: 'wtUnder3',
          key: 'wtUnder3',
          align: 'center',
        },
        {
          title: '3 <= WT <= 6 Bulan',
          dataIndex: 'wt3to6',
          key: 'wt3to6',
          align: 'center',
        },
        {
          title: 'WT > 6 Bulan',
          dataIndex: 'wtAbove6',
          key: 'wtAbove6',
          align: 'center',
        },
      ],
    },
  ];

  useEffect(() => {
    const defaultData = [
      { key: 1, tahunLulus: null, jumlahLulusan: null, lulusanTerlacak: null, dipesanSebelumLulus: null, wtUnder3: null, wt3to6: null, wtAbove6: null },
      { key: 2, tahunLulus: null, jumlahLulusan: null, lulusanTerlacak: null, dipesanSebelumLulus: null, wtUnder3: null, wt3to6: null, wtAbove6: null },
      { key: 3, tahunLulus: null, jumlahLulusan: null, lulusanTerlacak: null, dipesanSebelumLulus: null, wtUnder3: null, wt3to6: null, wtAbove6: null },
    ];
    setData(defaultData);
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Waktu Tunggu Lulusan - Diploma 3</h2>
      <Table
        columns={columns}
        dataSource={data}
        pagination={false}
        bordered
      />
    </div>
  );
};

export default WaktuTungguDiploma3;
