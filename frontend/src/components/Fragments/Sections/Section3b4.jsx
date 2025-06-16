import React from "react";
import { Table } from "antd";

const PagelaranPublikasiDTPS = () => {
  const columns = [
    {
      title: "No",
      dataIndex: "no",
      key: "no",
      align: "center",
      width: 50,
      render: (text, record) => (record.isTotal ? <strong>{text}</strong> : text),
    },
    {
      title: "Jenis",
      dataIndex: "jenis",
      key: "jenis",
      render: (text, record) => (record.isTotal ? <strong>{text}</strong> : text),
    },
    {
      title: "Jumlah Judul",
      children: [
        {
          title: "TS-2",
          dataIndex: "ts2",
          key: "ts2",
          align: "center",
        },
        {
          title: "TS-1",
          dataIndex: "ts1",
          key: "ts1",
          align: "center",
        },
        {
          title: "TS",
          dataIndex: "ts",
          key: "ts",
          align: "center",
        },
      ],
    },
    {
      title: "Jumlah",
      dataIndex: "jumlah",
      key: "jumlah",
      align: "center",
      render: (text, record) => (record.isTotal ? <strong>{text}</strong> : text),
    },
  ];

  const data = [
    {
      key: "1",
      no: "1",
      jenis: "Publikasi di jurnal nasional tak terakreditasi",
      ts2: 5,
      ts1: 4,
      ts: 6,
      jumlah: 15,
    },
    {
      key: "2",
      no: "2",
      jenis: "Publikasi di jurnal nasional terakreditasi",
      ts2: 8,
      ts1: 7,
      ts: 9,
      jumlah: 24,
    },
    {
      key: "3",
      no: "3",
      jenis: "Publikasi di jurnal internasional",
      ts2: 3,
      ts1: 2,
      ts: 5,
      jumlah: 10,
    },
    {
      key: "4",
      no: "4",
      jenis: "Publikasi di jurnal internasional bereputasi",
      ts2: 2,
      ts1: 1,
      ts: 3,
      jumlah: 6,
    },
    {
      key: "5",
      no: "5",
      jenis: "Publikasi di seminar wilayah/lokal/perguruan tinggi",
      ts2: 6,
      ts1: 5,
      ts: 7,
      jumlah: 18,
    },
    {
      key: "6",
      no: "6",
      jenis: "Publikasi di seminar nasional",
      ts2: 10,
      ts1: 9,
      ts: 11,
      jumlah: 30,
    },
    {
      key: "7",
      no: "7",
      jenis: "Publikasi di seminar internasional",
      ts2: 4,
      ts1: 3,
      ts: 5,
      jumlah: 12,
    },
    {
      key: "8",
      no: "8",
      jenis: "Pagelaran/pameran/presentasi dalam forum di tingkat wilayah",
      ts2: 2,
      ts1: 3,
      ts: 4,
      jumlah: 9,
    },
    {
      key: "9",
      no: "9",
      jenis: "Pagelaran/pameran/presentasi dalam forum di tingkat nasional",
      ts2: 5,
      ts1: 6,
      ts: 7,
      jumlah: 18,
    },
    {
      key: "10",
      no: "10",
      jenis: "Pagelaran/pameran/presentasi dalam forum di tingkat internasional",
      ts2: 1,
      ts1: 2,
      ts: 3,
      jumlah: 6,
    },
    {
      key: "11",
      no: "",
      jenis: "Jumlah",
      ts2: 46,
      ts1: 42,
      ts: 60,
      jumlah: 148,
      isTotal: true,
    },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">b.4 Pagelaran/Pameran/Presentasi/Publikasi Ilmiah DTPS</h2>
      <Table
        columns={columns}
        dataSource={data}
        pagination={false}
        bordered
        rowClassName={(record) => (record.isTotal ? "font-bold" : "")}
      />
    </div>
  );
};

export default PagelaranPublikasiDTPS;
