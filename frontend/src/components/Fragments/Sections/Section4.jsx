import React, { useEffect, useState } from 'react';
import { Table } from 'antd';

const KeuanganSaranaPrasarana = () => {
  const [data, setData] = useState([]);

  const columns = [
    {
      title: 'No',
      dataIndex: 'no',
      key: 'no',
      align: 'center',
      render: (text, record, index) => record.isMerged ? '' : index + 1,
    },
    {
      title: 'Jenis Penggunaan',
      dataIndex: 'jenisPenggunaan',
      key: 'jenisPenggunaan',
    },
    {
      title: 'Unit Pengelola Program Studi',
      children: [
        {
          title: 'TS-2',
          dataIndex: 'unitPengelolaTS2',
          key: 'unitPengelolaTS2',
        },
        {
          title: 'TS-1',
          dataIndex: 'unitPengelolaTS1',
          key: 'unitPengelolaTS1',
        },
        {
          title: 'TS',
          dataIndex: 'unitPengelolaTS',
          key: 'unitPengelolaTS',
        },
        {
          title: 'Rata-rata',
          dataIndex: 'unitPengelolaRataRata',
          key: 'unitPengelolaRataRata',
        },
      ],
    },
    {
      title: 'Program Studi',
      children: [
        {
          title: 'TS-2',
          dataIndex: 'programStudiTS2',
          key: 'programStudiTS2',
        },
        {
          title: 'TS-1',
          dataIndex: 'programStudiTS1',
          key: 'programStudiTS1',
        },
        {
          title: 'TS',
          dataIndex: 'programStudiTS',
          key: 'programStudiTS',
        },
        {
          title: 'Rata-rata',
          dataIndex: 'programStudiRataRata',
          key: 'programStudiRataRata',
        },
      ],
    },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Simulasi data untuk tabel
        const apiResponse = [
          { jenisPenggunaan: 'Biaya Operasional Pendidikan', no: 1 },
          { jenisPenggunaan: 'a. Biaya Dosen (gaji, honor)', no: '' },
          { jenisPenggunaan: 'b. Biaya Tenaga Kependidikan', no: '' },
          { jenisPenggunaan: 'c. Biaya Operasional', no: '' },
          { jenisPenggunaan: 'd. Biaya Operasional Tak Langsung', no: '' },
          { jenisPenggunaan: 'Jumlah', isMerged: true },
          { jenisPenggunaan: 'Biaya Operasional Kemahasiswaan', no: 2 },
          { jenisPenggunaan: 'Jumlah', isMerged: true },
          { jenisPenggunaan: 'Biaya Penelitian', no: 3 },
          { jenisPenggunaan: 'Biaya PKM', no: 4 },
          { jenisPenggunaan: 'Jumlah', isMerged: true },
          { jenisPenggunaan: 'Biaya Investasi SDM', no: 5 },
          { jenisPenggunaan: 'Biaya Investasi Sarana', no: 6 },
          { jenisPenggunaan: 'Biaya Investasi Prasarana', no: 7 },
          { jenisPenggunaan: 'Jumlah', isMerged: true },
          { jenisPenggunaan: 'Total', isMerged: true },
        ];

        // Menambahkan key untuk setiap baris
        const finalData = apiResponse.map((item, index) => ({
          key: index,
          ...item,
        }));

        setData(finalData);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Keuangan, Sarana, dan Prasarana</h2>
      <Table
        columns={columns}
        dataSource={data}
        pagination={false}
        bordered
        rowClassName={(record) => (record.isMerged ? 'font-bold' : '')}
      />
    </div>
  );
};

export default KeuanganSaranaPrasarana;
