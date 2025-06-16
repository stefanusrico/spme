import React, { useEffect, useState } from 'react';
import { Table, Input } from 'antd';

const KepuasanMahasiswa = () => {
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
      title: 'Aspek yang Diukur',
      dataIndex: 'aspek',
      key: 'aspek',
    },
    {
      title: 'Tingkat Kepuasan Mahasiswa',
      children: [
        {
          title: 'Sangat Baik',
          dataIndex: 'sangatBaik',
          key: 'sangatBaik',
          align: 'center',
        },
        {
          title: 'Baik',
          dataIndex: 'baik',
          key: 'baik',
          align: 'center',
        },
        {
          title: 'Cukup',
          dataIndex: 'cukup',
          key: 'cukup',
          align: 'center',
        },
        {
          title: 'Kurang',
          dataIndex: 'kurang',
          key: 'kurang',
          align: 'center',
        },
      ],
    },
    {
      title: 'Rencana Tindak Lanjut oleh UPPS/PS',
      dataIndex: 'tindakLanjut',
      key: 'tindakLanjut',
    },
  ];

  const defaultData = [
    {
      key: '1',
      aspek: 'Keandalan (reliability): kemampuan dosen, tenaga kependidikan, dan pengelola dalam memberikan pelayanan.',
      sangatBaik: '',
      baik: '',
      cukup: '',
      kurang: '',
      tindakLanjut: '',
    },
    {
      key: '2',
      aspek: 'Daya tanggap (responsiveness): kemauan dari dosen, tenaga kependidikan, dan pengelola dalam membantu mahasiswa dan memberikan jasa dengan cepat.',
      sangatBaik: '',
      baik: '',
      cukup: '',
      kurang: '',
      tindakLanjut: '',
    },
    {
      key: '3',
      aspek: 'Kepastian (assurance): kemampuan dosen, tenaga kependidikan, dan pengelola untuk memberi keyakinan kepada mahasiswa bahwa pelayanan yang diberikan telah sesuai dengan ketentuan.',
      sangatBaik: '',
      baik: '',
      cukup: '',
      kurang: '',
      tindakLanjut: '',
    },
    {
      key: '4',
      aspek: 'Empati (empathy): kesediaan/kepedulian dosen, tenaga kependidikan, dan pengelola untuk memberi perhatian kepada mahasiswa.',
      sangatBaik: '',
      baik: '',
      cukup: '',
      kurang: '',
      tindakLanjut: '',
    },
    {
      key: '5',
      aspek: 'Tangible: penilaian mahasiswa terhadap kecukupan, aksesibilitas, kualitas sarana dan prasarana.',
      sangatBaik: '',
      baik: '',
      cukup: '',
      kurang: '',
      tindakLanjut: '',
    },
    {
      key: 'jumlah',
      aspek: 'Jumlah',
      sangatBaik: 0,
      baik: 0,
      cukup: 0,
      kurang: 0,
      tindakLanjut: '',
      isTotal: true,
    },
  ];

  useEffect(() => {
    setData(defaultData);
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Section 5c: Kepuasan Mahasiswa</h2>
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

export default KepuasanMahasiswa;
