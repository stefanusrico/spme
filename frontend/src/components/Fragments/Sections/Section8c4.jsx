import React, { useEffect, useState } from 'react';
import { Table } from 'antd';

const MasaStudiDoktorTerapan = () => {
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
        { title: 'Akhir TS-6', dataIndex: 'akhirTS6', key: 'akhirTS6', align: 'center' },
        { title: 'Akhir TS-5', dataIndex: 'akhirTS5', key: 'akhirTS5', align: 'center' },
        { title: 'Akhir TS-4', dataIndex: 'akhirTS4', key: 'akhirTS4', align: 'center' },
        { title: 'Akhir TS-3', dataIndex: 'akhirTS3', key: 'akhirTS3', align: 'center' },
        { title: 'Akhir TS-2', dataIndex: 'akhirTS2', key: 'akhirTS2', align: 'center' },
        { title: 'Akhir TS-1', dataIndex: 'akhirTS1', key: 'akhirTS1', align: 'center' },
        { title: 'Akhir TS', dataIndex: 'akhirTS', key: 'akhirTS', align: 'center' },
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
      { key: 1, tahunMasuk: 'TS-6', jumlahDiterima: '', akhirTS6: '', akhirTS5: '', akhirTS4: '', akhirTS3: '', akhirTS2: '', akhirTS1: '', akhirTS: '', jumlahLulusan: '', rataMasaStudi: '' },
      { key: 2, tahunMasuk: 'TS-5', jumlahDiterima: '', akhirTS6: '', akhirTS5: '', akhirTS4: '', akhirTS3: '', akhirTS2: '', akhirTS1: '', akhirTS: '', jumlahLulusan: '', rataMasaStudi: '' },
      { key: 3, tahunMasuk: 'TS-4', jumlahDiterima: '', akhirTS6: '', akhirTS5: '', akhirTS4: '', akhirTS3: '', akhirTS2: '', akhirTS1: '', akhirTS: '', jumlahLulusan: '', rataMasaStudi: '' },
    ];
    setData(defaultData);
  }, []);

  const calculateTotals = () => {
    const totals = {
      key: 'total',
      tahunMasuk: 'Jumlah',
      jumlahDiterima: data.reduce((sum, item) => sum + (parseFloat(item.jumlahDiterima) || 0), 0),
      akhirTS6: data.reduce((sum, item) => sum + (parseFloat(item.akhirTS6) || 0), 0),
      akhirTS5: data.reduce((sum, item) => sum + (parseFloat(item.akhirTS5) || 0), 0),
      akhirTS4: data.reduce((sum, item) => sum + (parseFloat(item.akhirTS4) || 0), 0),
      akhirTS3: data.reduce((sum, item) => sum + (parseFloat(item.akhirTS3) || 0), 0),
      akhirTS2: data.reduce((sum, item) => sum + (parseFloat(item.akhirTS2) || 0), 0),
      akhirTS1: data.reduce((sum, item) => sum + (parseFloat(item.akhirTS1) || 0), 0),
      akhirTS: data.reduce((sum, item) => sum + (parseFloat(item.akhirTS) || 0), 0),
      jumlahLulusan: data.reduce((sum, item) => sum + (parseFloat(item.jumlahLulusan) || 0), 0),
      rataMasaStudi: (data.reduce((sum, item) => sum + (parseFloat(item.rataMasaStudi) || 0), 0) / data.length).toFixed(2),
    };
    return totals;
  };

  const tableData = [...data, calculateTotals()];

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Masa Studi Lulusan Program Studi - Doktor Terapan</h2>
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

export default MasaStudiDoktorTerapan;
