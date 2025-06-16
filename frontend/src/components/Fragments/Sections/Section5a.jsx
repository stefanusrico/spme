import React, { useEffect, useState } from 'react';
import { Table } from 'antd';

const Section5Pendidikan = () => {
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
      title: 'Semester',
      dataIndex: 'semester',
      key: 'semester',
    },
    {
      title: 'Kode Mata Kuliah',
      dataIndex: 'kodeMataKuliah',
      key: 'kodeMataKuliah',
    },
    {
      title: 'Nama Mata Kuliah',
      dataIndex: 'namaMataKuliah',
      key: 'namaMataKuliah',
    },
    {
      title: 'Bobot Kredit',
      children: [
        {
          title: 'Kuliah/Responsi/Tutorial',
          dataIndex: 'bobotKuliah',
          key: 'bobotKuliah',
        },
        {
          title: 'Seminar',
          dataIndex: 'bobotSeminar',
          key: 'bobotSeminar',
        },
        {
          title: 'Praktikum/Praktik/Praktik Lapangan',
          dataIndex: 'bobotPraktikum',
          key: 'bobotPraktikum',
        },
      ],
    },
    {
      title: 'Konversi Kredit ke Jam',
      dataIndex: 'konversiKreditJam',
      key: 'konversiKreditJam',
    },
    {
      title: 'Capaian Pembelajaran',
      children: [
        {
          title: 'Sikap',
          dataIndex: 'capaianSikap',
          key: 'capaianSikap',
        },
        {
          title: 'Pengetahuan',
          dataIndex: 'capaianPengetahuan',
          key: 'capaianPengetahuan',
        },
        {
          title: 'Keterampilan Umum',
          dataIndex: 'capaianKeterampilanUmum',
          key: 'capaianKeterampilanUmum',
        },
        {
          title: 'Keterampilan Khusus',
          dataIndex: 'capaianKeterampilanKhusus',
          key: 'capaianKeterampilanKhusus',
        },
      ],
    },
    {
      title: 'Dokumen Rencana Pembelajaran',
      dataIndex: 'dokumenRencanaPembelajaran',
      key: 'dokumenRencanaPembelajaran',
      render: (text) => (
        <a href={text} target="_blank" rel="noopener noreferrer">
          Lihat Dokumen
        </a>
      ),
    },
    {
      title: 'Unit Penyelenggara',
      dataIndex: 'unitPenyelenggara',
      key: 'unitPenyelenggara',
    },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Simulasi data dari API
        const apiResponse = [
          {
            semester: 'Ganjil',
            kodeMataKuliah: 'IF101',
            namaMataKuliah: 'Pengantar Informatika',
            bobotKuliah: 3,
            bobotSeminar: 0,
            bobotPraktikum: 1,
            konversiKreditJam: 170,
            capaianSikap: 'Memiliki sikap profesional',
            capaianPengetahuan: 'Memahami dasar-dasar ilmu komputer',
            capaianKeterampilanUmum: 'Mampu bekerja dalam tim',
            capaianKeterampilanKhusus: 'Mampu membuat program sederhana',
            dokumenRencanaPembelajaran: 'https://example.com/rencana-pembelajaran-if101',
            unitPenyelenggara: 'Fakultas Teknik',
          },
          {
            semester: 'Genap',
            kodeMataKuliah: 'IF102',
            namaMataKuliah: 'Pemrograman Dasar',
            bobotKuliah: 3,
            bobotSeminar: 1,
            bobotPraktikum: 1,
            konversiKreditJam: 200,
            capaianSikap: 'Bertanggung jawab terhadap tugas',
            capaianPengetahuan: 'Menguasai logika pemrograman',
            capaianKeterampilanUmum: 'Mampu menyelesaikan masalah',
            capaianKeterampilanKhusus: 'Mampu membuat aplikasi sederhana',
            dokumenRencanaPembelajaran: 'https://example.com/rencana-pembelajaran-if102',
            unitPenyelenggara: 'Fakultas Teknik',
          },
        ];

        setData(apiResponse.map((item, index) => ({ key: index, ...item })));
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Section 5: Pendidikan - Kurikulum</h2>
      <Table
        columns={columns}
        dataSource={data}
        pagination={false}
        bordered
      />
    </div>
  );
};

export default Section5Pendidikan;
