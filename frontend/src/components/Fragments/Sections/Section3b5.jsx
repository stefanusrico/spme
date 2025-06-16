import React, { useEffect, useState } from 'react';
import { Table } from 'antd';

const KaryaIlmiahDisitasi = () => {
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
      title: 'Nama Dosen',
      dataIndex: 'namaDosen',
      key: 'namaDosen',
    },
    {
      title: 'Judul Artikel yang Disitasi',
      dataIndex: 'judulArtikel',
      key: 'judulArtikel',
      render: (text, record) => (
        <>
          <div>{record.judul}</div>
          <div style={{ fontSize: '0.9em', color: 'gray' }}>
            {`(${record.jurnal}, Vol ${record.volume}, ${record.tahun}, No ${record.nomor}, Hal ${record.halaman})`}
          </div>
        </>
      ),
    },
    {
      title: 'Jumlah Sitasi',
      dataIndex: 'jumlahSitasi',
      key: 'jumlahSitasi',
      align: 'center',
    },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Simulasi data dari API
        const apiResponse = [
          {
            namaDosen: 'Dr. A. Rahman',
            judul: 'Machine Learning for AI',
            jurnal: 'AI Journal',
            volume: '12',
            tahun: '2021',
            nomor: '3',
            halaman: '45-67',
            jumlahSitasi: 10,
          },
          {
            namaDosen: 'Prof. B. Kartini',
            judul: 'Deep Learning in Healthcare',
            jurnal: 'Medical Tech',
            volume: '15',
            tahun: '2020',
            nomor: '1',
            halaman: '23-45',
            jumlahSitasi: 15,
          },
        ];

        // Hitung total sitasi
        const totalSitasi = apiResponse.reduce((sum, item) => sum + item.jumlahSitasi, 0);

        // Tambahkan data "Jumlah" pada baris terakhir
        const finalData = [
          ...apiResponse.map((item, index) => ({
            key: index,
            ...item,
          })),
          {
            key: 'total',
            namaDosen: 'Jumlah',
            jumlahSitasi: totalSitasi,
            isTotal: true,
          },
        ];

        setData(finalData);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">
        Karya Ilmiah DTPS yang Disitasi dalam 3 Tahun Terakhir
      </h2>
      <Table
        columns={columns}
        dataSource={data}
        pagination={false}
        bordered
        rowClassName={(record) => (record.isTotal ? 'font-bold' : '')}
      />
    </div>
  );
};

export default KaryaIlmiahDisitasi;
