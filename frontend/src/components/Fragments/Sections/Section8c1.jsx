import React, { useEffect, useState } from 'react';
import { Table } from 'antd';

const MasaStudiLulusan = () => {
  const [data, setData] = useState([]);

  const columns = [
    {
      title: 'Tahun Masuk',
      dataIndex: 'tahunMasuk',
      key: 'tahunMasuk',
    },
    {
      title: 'Jumlah Mahasiswa Diterima',
      dataIndex: 'jumlahMahasiswaDiterima',
      key: 'jumlahMahasiswaDiterima',
    },
    {
      title: 'Jumlah Mahasiswa yang Lulus Pada',
      children: [
        {
          title: 'Akhir TS-4',
          dataIndex: 'akhirTS4',
          key: 'akhirTS4',
        },
        {
          title: 'Akhir TS-3',
          dataIndex: 'akhirTS3',
          key: 'akhirTS3',
        },
        {
          title: 'Akhir TS-2',
          dataIndex: 'akhirTS2',
          key: 'akhirTS2',
        },
        {
          title: 'Akhir TS-1',
          dataIndex: 'akhirTS1',
          key: 'akhirTS1',
        },
        {
          title: 'Akhir TS',
          dataIndex: 'akhirTS',
          key: 'akhirTS',
        },
      ],
    },
    {
      title: 'Jumlah Lulusan s/d Akhir TS',
      dataIndex: 'jumlahLulusan',
      key: 'jumlahLulusan',
    },
    {
      title: 'Rata-Rata Masa Studi',
      dataIndex: 'rataRataMasaStudi',
      key: 'rataRataMasaStudi',
    },
  ];

  useEffect(() => {
    const fetchData = async () => {
      const defaultData = [
        {
          key: '1',
          tahunMasuk: 'TS-4',
          jumlahMahasiswaDiterima: '',
          akhirTS4: '',
          akhirTS3: '',
          akhirTS2: '',
          akhirTS1: '',
          akhirTS: '',
          jumlahLulusan: '',
          rataRataMasaStudi: '',
        },
        {
          key: '2',
          tahunMasuk: 'TS-3',
          jumlahMahasiswaDiterima: '',
          akhirTS4: '',
          akhirTS3: '',
          akhirTS2: '',
          akhirTS1: '',
          akhirTS: '',
          jumlahLulusan: '',
          rataRataMasaStudi: '',
        },
        {
          key: '3',
          tahunMasuk: 'TS-2',
          jumlahMahasiswaDiterima: '',
          akhirTS4: '',
          akhirTS3: '',
          akhirTS2: '',
          akhirTS1: '',
          akhirTS: '',
          jumlahLulusan: '',
          rataRataMasaStudi: '',
        },
      ];

      setData(defaultData);
    };

    fetchData();
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Section 6c: Masa Studi Lulusan Program Studi</h2>
      <Table
        columns={columns}
        dataSource={data}
        pagination={false}
        bordered
      />
    </div>
  );
};

export default MasaStudiLulusan;
