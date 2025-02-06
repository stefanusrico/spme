import React, { useState, useEffect } from 'react';
import { Table } from 'antd';

const LuaranPenelitianPkmMahasiswa = () => {
  const [data, setData] = useState([]);

  const columns = [
    {
      title: 'No',
      dataIndex: 'no',
      key: 'no',
      align: 'center',
    },
    {
      title: 'Judul Luaran Penelitian/PkM',
      dataIndex: 'judulLuaran',
      key: 'judulLuaran',
    },
    {
      title: 'Tahun',
      dataIndex: 'tahun',
      key: 'tahun',
      align: 'center',
    },
    {
      title: 'Keterangan',
      dataIndex: 'keterangan',
      key: 'keterangan',
    },
  ];

  useEffect(() => {
    const defaultData = [
      { key: 1, no: 'I', judulLuaran: 'HKI: a) Paten, b) Paten Sederhana', tahun: '', keterangan: '' },
      { key: 2, no: '1', judulLuaran: '', tahun: '', keterangan: '' },
      { key: 3, no: '2', judulLuaran: '', tahun: '', keterangan: '' },
      { key: 4, no: 'Jumlah', judulLuaran: '', tahun: '', keterangan: '', isMerged: true },
      { key: 5, no: 'II', judulLuaran: 'HKI: a) Hak Cipta, b) Desain Produk Industri, c) Perlindungan Varietas Tanaman', tahun: '', keterangan: '' },
      { key: 6, no: '1', judulLuaran: '', tahun: '', keterangan: '' },
      { key: 7, no: '2', judulLuaran: '', tahun: '', keterangan: '' },
      { key: 8, no: 'Jumlah', judulLuaran: '', tahun: '', keterangan: '', isMerged: true },
      { key: 9, no: 'III', judulLuaran: 'Teknologi Tepat Guna, Produk: Produk Terstandarisasi, Produk Tersertifikasi', tahun: '', keterangan: '' },
      { key: 10, no: '1', judulLuaran: '', tahun: '', keterangan: '' },
      { key: 11, no: '2', judulLuaran: '', tahun: '', keterangan: '' },
      { key: 12, no: 'Jumlah', judulLuaran: '', tahun: '', keterangan: '', isMerged: true },
      { key: 13, no: 'IV', judulLuaran: 'Buku Ber-ISBN, Book Chapter', tahun: '', keterangan: '' },
      { key: 14, no: '1', judulLuaran: '', tahun: '', keterangan: '' },
      { key: 15, no: '2', judulLuaran: '', tahun: '', keterangan: '' },
      { key: 16, no: 'Jumlah', judulLuaran: '', tahun: '', keterangan: '', isMerged: true },
    ];
    setData(defaultData);
  }, []);

  const mergedRowRender = (value, record) => {
    return record.isMerged ? { children: value, props: { colSpan: 4, style: { fontWeight: 'bold' } } } : value;
  };

  const formattedColumns = columns.map((col) => {
    if (col.dataIndex === 'no') {
      return {
        ...col,
        render: mergedRowRender,
      };
    }
    return col;
  });

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Luaran Penelitian/PkM Lainnya oleh Mahasiswa</h2>
      <Table
        columns={formattedColumns}
        dataSource={data}
        pagination={false}
        bordered
        rowClassName={(record) => (record.isMerged ? 'font-bold' : '')}
      />
    </div>
  );
};

export default LuaranPenelitianPkmMahasiswa;
