import React, { useState, useEffect } from 'react';
import { Table } from 'antd';

const PagelaranPameranPresentasi = () => {
  const [data, setData] = useState([]);

  const columns = [
    {
      title: 'No',
      dataIndex: 'no',
      key: 'no',
      align: 'center',
    },
    {
      title: 'Jenis',
      dataIndex: 'jenis',
      key: 'jenis',
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
    const defaultData = [
      { key: 1, no: 1, jenis: 'Publikasi di jurnal nasional tak terakreditasi', ts2: null, ts1: null, ts: null, jumlah: null },
      { key: 2, no: 2, jenis: 'Publikasi di jurnal nasional terakreditasi', ts2: null, ts1: null, ts: null, jumlah: null },
      { key: 3, no: 3, jenis: 'Publikasi di jurnal internasional', ts2: null, ts1: null, ts: null, jumlah: null },
      { key: 4, no: 4, jenis: 'Publikasi di jurnal internasional bereputasi', ts2: null, ts1: null, ts: null, jumlah: null },
      { key: 5, no: 5, jenis: 'Publikasi di seminar wilayah/lokal/perguruan tinggi', ts2: null, ts1: null, ts: null, jumlah: null },
      { key: 6, no: 6, jenis: 'Publikasi di seminar nasional', ts2: null, ts1: null, ts: null, jumlah: null },
      { key: 7, no: 7, jenis: 'Publikasi di seminar internasional', ts2: null, ts1: null, ts: null, jumlah: null },
      { key: 8, no: 8, jenis: 'Pagelaran/pameran/presentasi dalam forum di tingkat wilayah', ts2: null, ts1: null, ts: null, jumlah: null },
      { key: 9, no: 9, jenis: 'Pagelaran/pameran/presentasi dalam forum di tingkat nasional', ts2: null, ts1: null, ts: null, jumlah: null },
      { key: 10, no: 10, jenis: 'Pagelaran/pameran/presentasi dalam forum di tingkat internasional', ts2: null, ts1: null, ts: null, jumlah: null },
      { key: 11, no: '', jenis: 'Jumlah', ts2: null, ts1: null, ts: null, jumlah: null },
    ];
    setData(defaultData);
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Pagelaran/Pameran/Presentasi/Publikasi Ilmiah Mahasiswa</h2>
      <Table
        columns={columns}
        dataSource={data}
        pagination={false}
        bordered
        rowClassName={(record) => (record.no === '' ? 'font-bold' : '')}
      />
    </div>
  );
};

export default PagelaranPameranPresentasi;
