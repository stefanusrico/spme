import React, { useEffect, useState } from 'react';
import { Table } from 'antd';

const PengabdianMasyarakat = () => {
  const defaultSources = [
    "Perguruan Tinggi (Mandiri)",
    "Lembaga dalam negeri (di luar PT)",
    "Lembaga luar negeri",
  ];

  const [data, setData] = useState([]);

  const columns = [
    {
      title: 'No',
      dataIndex: 'no',
      key: 'no',
      align: 'center',
      render: (_, __, index) => index + 1,
    },
    {
      title: 'Sumber Pembiayaan',
      dataIndex: 'sumberPembiayaan',
      key: 'sumberPembiayaan',
    },
    {
      title: 'Jumlah Judul',
      children: [
        {
          title: 'TS-2',
          dataIndex: 'ts2',
          key: 'ts2',
          align: 'center',
        },
        {
          title: 'TS-1',
          dataIndex: 'ts1',
          key: 'ts1',
          align: 'center',
        },
        {
          title: 'TS',
          dataIndex: 'ts',
          key: 'ts',
          align: 'center',
        },
      ],
    },
    {
      title: 'Jumlah',
      dataIndex: 'jumlah',
      key: 'jumlah',
      align: 'center',
    },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Simulasi fetch data dari API
        const apiResponse = [
          {
            sumberPembiayaan: "Perguruan Tinggi (Mandiri)",
            ts2: 3,
            ts1: 4,
            ts: 2,
          },
          {
            sumberPembiayaan: "Lembaga dalam negeri (di luar PT)",
            ts2: 1,
            ts1: 2,
            ts: 3,
          },
        ];

        const mergedData = defaultSources.map((source, index) => {
          const apiData = apiResponse.find(item => item.sumberPembiayaan === source);
          return {
            key: index,
            sumberPembiayaan: source,
            ts2: apiData?.ts2 || 0,
            ts1: apiData?.ts1 || 0,
            ts: apiData?.ts || 0,
            jumlah: (apiData?.ts2 || 0) + (apiData?.ts1 || 0) + (apiData?.ts || 0),
          };
        });

        setData(mergedData);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    };

    fetchData();
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Pengabdian Kepada Masyarakat</h2>
      <Table
        columns={columns}
        dataSource={data}
        pagination={false}
        bordered
      />
    </div>
  );
};

export default PengabdianMasyarakat;
