import React, { useEffect, useState } from 'react';
import { Table } from 'antd';

const PublikasiIlmiahDTPS = () => {
  const defaultTypes = [
    "Jurnal Nasional tidak terakreditasi",
    "Jurnal Nasional terakreditasi",
    "Jurnal Internasional",
    "Jurnal Internasional bereputasi",
    "Seminar wilayah/lokal/perguruan tinggi",
    "Seminar nasional",
    "Seminar internasional",
    "Tulisan di media massa wilayah",
    "Tulisan di media massa nasional",
    "Tulisan di media massa internasional",
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
      title: 'Media Publikasi',
      dataIndex: 'mediaPublikasi',
      key: 'mediaPublikasi',
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
            mediaPublikasi: "Jurnal Nasional terakreditasi",
            ts2: 3,
            ts1: 5,
            ts: 2,
          },
          {
            mediaPublikasi: "Jurnal Internasional",
            ts2: 1,
            ts1: 2,
            ts: 4,
          },
        ];

        const mergedData = defaultTypes.map((type, index) => {
          const apiData = apiResponse.find(item => item.mediaPublikasi === type);
          return {
            key: index,
            mediaPublikasi: type,
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
      <h2 className="text-xl font-bold mb-4">Publikasi Ilmiah DTPS</h2>
      <Table
        columns={columns}
        dataSource={data}
        pagination={false}
        bordered
      />
    </div>
  );
};

export default PublikasiIlmiahDTPS;
