import React, { useEffect, useState } from 'react';
import { Table } from 'antd';

const KesesuaianBidangKerja = () => {
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
      title: 'Jumlah Lulusan yang Terlacak',
      dataIndex: 'jumlahTerlacak',
      key: 'jumlahTerlacak',
      align: 'center',
    },
    {
      title: 'Jumlah Lulusan dengan Tingkat Kesesuaian Bidang Kerja',
      children: [
        {
          title: 'Rendah',
          dataIndex: 'kesesuaianRendah',
          key: 'kesesuaianRendah',
          align: 'center',
        },
        {
          title: 'Sedang',
          dataIndex: 'kesesuaianSedang',
          key: 'kesesuaianSedang',
          align: 'center',
        },
        {
          title: 'Tinggi',
          dataIndex: 'kesesuaianTinggi',
          key: 'kesesuaianTinggi',
          align: 'center',
        },
      ],
    },
  ];

  useEffect(() => {
    const defaultData = [
      { key: 1, tahunLulus: '', jumlahLulusan: '', jumlahTerlacak: '', kesesuaianRendah: '', kesesuaianSedang: '', kesesuaianTinggi: '' },
      { key: 2, tahunLulus: '', jumlahLulusan: '', jumlahTerlacak: '', kesesuaianRendah: '', kesesuaianSedang: '', kesesuaianTinggi: '' },
      { key: 3, tahunLulus: '', jumlahLulusan: '', jumlahTerlacak: '', kesesuaianRendah: '', kesesuaianSedang: '', kesesuaianTinggi: '' },
    ];
    setData(defaultData);
  }, []);

  const handleInputChange = (index, field, value) => {
    const newData = [...data];
    newData[index][field] = value;
    setData(newData);
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Kesesuaian Bidang Kerja Lulusan</h2>
      <Table
        columns={columns}
        dataSource={data}
        pagination={false}
        bordered
      />
    </div>
  );
};

export default KesesuaianBidangKerja;
