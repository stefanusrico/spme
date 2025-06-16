import React, { useEffect, useState } from 'react';
import { Table } from 'antd';

const IPKLulusan = () => {
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
      title: 'Indeks Prestasi Kumulatif',
      children: [
        {
          title: 'Min',
          dataIndex: 'ipkMin',
          key: 'ipkMin',
          align: 'center',
        },
        {
          title: 'Rata-rata',
          dataIndex: 'ipkRata',
          key: 'ipkRata',
          align: 'center',
        },
        {
          title: 'Maks',
          dataIndex: 'ipkMaks',
          key: 'ipkMaks',
          align: 'center',
        },
      ],
    },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Simulasi data dari API
        const apiResponse = [
          {
            tahunLulus: 'TS-2',
            jumlahLulusan: 50,
            ipkMin: 2.75,
            ipkRata: 3.45,
            ipkMaks: 3.90,
          },
          {
            tahunLulus: 'TS-1',
            jumlahLulusan: 60,
            ipkMin: 2.80,
            ipkRata: 3.50,
            ipkMaks: 3.95,
          },
          {
            tahunLulus: 'TS',
            jumlahLulusan: 55,
            ipkMin: 2.85,
            ipkRata: 3.55,
            ipkMaks: 4.00,
          },
        ];

        // Jika data dari API kosong, gunakan default data
        const defaultYears = ['TS-2', 'TS-1', 'TS'];
        const finalData = defaultYears.map((year, index) => {
          const existingData = apiResponse.find((item) => item.tahunLulus === year);
          return {
            key: index,
            tahunLulus: year,
            jumlahLulusan: existingData?.jumlahLulusan || 0,
            ipkMin: existingData?.ipkMin || '-',
            ipkRata: existingData?.ipkRata || '-',
            ipkMaks: existingData?.ipkMaks || '-',
          };
        });

        setData(finalData);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">IPK Lulusan</h2>
      <Table
        columns={columns}
        dataSource={data}
        pagination={false}
        bordered
      />
    </div>
  );
};

export default IPKLulusan;
