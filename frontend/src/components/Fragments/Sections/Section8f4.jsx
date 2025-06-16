import React from 'react';
import { Table } from 'antd';

const ProdukJasaMahasiswa = () => {
  const columns = [
    {
      title: 'No',
      dataIndex: 'no',
      key: 'no',
      align: 'center',
    },
    {
      title: 'Nama Dosen',
      dataIndex: 'namaDosen',
      key: 'namaDosen',
    },
    {
      title: 'Nama Produk/Jasa',
      dataIndex: 'namaProduk',
      key: 'namaProduk',
    },
    {
      title: 'Deskripsi Produk/Jasa',
      dataIndex: 'deskripsiProduk',
      key: 'deskripsiProduk',
    },
    {
      title: 'Bukti',
      dataIndex: 'bukti',
      key: 'bukti',
    },
  ];

  const dataSource = [
    {
      key: '1',
      no: 1,
      namaDosen: 'Dr. John Doe',
      namaProduk: 'Aplikasi Mobile',
      deskripsiProduk: 'Aplikasi untuk manajemen proyek secara efisien.',
      bukti: 'URL atau dokumen terkait',
    },
    {
      key: '2',
      no: 2,
      namaDosen: 'Dr. Jane Smith',
      namaProduk: 'Produk Bioteknologi',
      deskripsiProduk: 'Produk untuk meningkatkan hasil panen.',
      bukti: 'Sertifikat atau laporan',
    },
  ];

  const footer = () => ({
    no: 'Jumlah',
    namaDosen: '',
    namaProduk: '',
    deskripsiProduk: '',
    bukti: '',
  });

  const tableData = [...dataSource, footer()];

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Produk/Jasa Mahasiswa yang Diadopsi oleh Industri/Masyarakat</h2>
      <Table
        columns={columns}
        dataSource={tableData}
        pagination={false}
        bordered
        rowClassName={(record) => (record.no === 'Jumlah' ? 'font-bold' : '')}
      />
    </div>
  );
};

export default ProdukJasaMahasiswa;
