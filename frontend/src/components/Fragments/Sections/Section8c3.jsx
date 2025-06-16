import React, { useEffect, useState } from 'react';
import { Table } from 'antd';

const MasaStudiMagisterTerapan = () => {
  const [data, setData] = useState([]);

  const columns = [
    {
      title: 'Tahun Masuk',
      dataIndex: 'tahunMasuk',
      key: 'tahunMasuk',
      align: 'center',
    },
    {
      title: 'Jumlah Mahasiswa Diterima',
      dataIndex: 'jumlahDiterima',
      key: 'jumlahDiterima',
      align: 'center',
    },
    {
      title: 'Jumlah Mahasiswa yang Lulus Pada',
      children: [
        {
          title: 'Akhir TS-3',
          dataIndex: 'akhirTS3',
          key: 'akhirTS3',
          align: 'center',
        },
        {
          title: 'Akhir TS-2',
          dataIndex: 'akhirTS2',
          key: 'akhirTS2',
          align: 'center',
        },
        {
          title: 'Akhir TS-1',
          dataIndex: 'akhirTS1',
          key: 'akhirTS1',
          align: 'center',
        },
        {
          title: 'Akhir TS',
          dataIndex: 'akhirTS',
          key: 'akhirTS',
          align: 'center',
        },
      ],
    },
    {
      title: 'Jumlah Lulusan s/d Akhir TS',
      dataIndex: 'jumlahLulusan',
      key: 'jumlahLulusan',
      align: 'center',
    },
    {
      title: 'Rata-rata Masa Studi',
      dataIndex: 'rataMasaStudi',
      key: 'rataMasaStudi',
      align: 'center',
    },
  ];

  useEffect(() => {
    const defaultData = [
      { key: 1, tahunMasuk: 'TS-3', jumlahDiterima: null, akhirTS3: null, akhirTS2: null, akhirTS1: null, akhirTS: null, jumlahLulusan: null, rataMasaStudi: null },
      { key: 2, tahunMasuk: 'TS-2', jumlahDiterima: null, akhirTS3: null, akhirTS2: null, akhirTS1: null, akhirTS: null, jumlahLulusan: null, rataMasaStudi: null },
      { key: 3, tahunMasuk: 'TS-1', jumlahDiterima: null, akhirTS3: null, akhirTS2: null, akhirTS1: null, akhirTS: null, jumlahLulusan: null, rataMasaStudi: null },
    ];
    setData(defaultData);
  }, []);

  const calculateTotals = () => {
    const totals = {
      key: 'total',
      tahunMasuk: 'Jumlah',
      jumlahDiterima: data.reduce((sum, item) => sum + (item.jumlahDiterima || 0), 0),
      akhirTS3: data.reduce((sum, item) => sum + (item.akhirTS3 || 0), 0),
      akhirTS2: data.reduce((sum, item) => sum + (item.akhirTS2 || 0), 0),
      akhirTS1: data.reduce((sum, item) => sum + (item.akhirTS1 || 0), 0),
      akhirTS: data.reduce((sum, item) => sum + (item.akhirTS || 0), 0),
      jumlahLulusan: data.reduce((sum, item) => sum + (item.jumlahLulusan || 0), 0),
      rataMasaStudi: data.length > 0 ? (data.reduce((sum, item) => sum + (item.rataMasaStudi || 0), 0) / data.length).toFixed(2) : 0,
    };
    return totals;
  };

  const tableData = [...data, calculateTotals()];

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Masa Studi Lulusan Program Studi - Magister Terapan</h2>
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

export default MasaStudiMagisterTerapan;
