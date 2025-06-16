import React, { useEffect, useState } from 'react';
import { Table } from 'antd';

const MasaStudiSarjanaTerapan = () => {
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
      title: 'Jumlah Mahasiswa yang Lulus pada',
      children: [
        {
          title: 'Akhir TS-6',
          dataIndex: 'akhirTS6',
          key: 'akhirTS6',
          align: 'center',
        },
        {
          title: 'Akhir TS-5',
          dataIndex: 'akhirTS5',
          key: 'akhirTS5',
          align: 'center',
        },
        {
          title: 'Akhir TS-4',
          dataIndex: 'akhirTS4',
          key: 'akhirTS4',
          align: 'center',
        },
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
      title: 'Rata-Rata Masa Studi',
      dataIndex: 'rataMasaStudi',
      key: 'rataMasaStudi',
      align: 'center',
    },
  ];

  useEffect(() => {
    const defaultData = [
      {
        key: 1,
        tahunMasuk: 'TS-6',
        jumlahDiterima: '',
        akhirTS6: '',
        akhirTS5: '',
        akhirTS4: '',
        akhirTS3: '',
        akhirTS2: '',
        akhirTS1: '',
        akhirTS: '',
        jumlahLulusan: '',
        rataMasaStudi: '',
      },
      {
        key: 2,
        tahunMasuk: 'TS-5',
        jumlahDiterima: '',
        akhirTS6: '',
        akhirTS5: '',
        akhirTS4: '',
        akhirTS3: '',
        akhirTS2: '',
        akhirTS1: '',
        akhirTS: '',
        jumlahLulusan: '',
        rataMasaStudi: '',
      },
      {
        key: 3,
        tahunMasuk: 'TS-4',
        jumlahDiterima: '',
        akhirTS6: '',
        akhirTS5: '',
        akhirTS4: '',
        akhirTS3: '',
        akhirTS2: '',
        akhirTS1: '',
        akhirTS: '',
        jumlahLulusan: '',
        rataMasaStudi: '',
      },
      {
        key: 4,
        tahunMasuk: 'TS-3',
        jumlahDiterima: '',
        akhirTS6: '',
        akhirTS5: '',
        akhirTS4: '',
        akhirTS3: '',
        akhirTS2: '',
        akhirTS1: '',
        akhirTS: '',
        jumlahLulusan: '',
        rataMasaStudi: '',
      },
    ];

    setData(defaultData);
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Section 6c: Masa Studi Lulusan Program Studi - Sarjana Terapan</h2>
      <Table
        columns={columns}
        dataSource={data}
        pagination={false}
        bordered
      />
    </div>
  );
};

export default MasaStudiSarjanaTerapan;
