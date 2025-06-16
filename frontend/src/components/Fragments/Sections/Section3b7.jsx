import React, { useState } from "react";
import { Table, Button, Upload, message } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import * as XLSX from "xlsx";

const LuaranPenelitianPkm = () => {
  const [data, setData] = useState([]);

  const columns = [
    {
      title: "No",
      dataIndex: "no",
      key: "no",
      render: (_, record) => record.isCategory ? <strong>{record.no}</strong> : record.no,
      width: 50,
      align: "center",
    },
    {
      title: "Judul Luaran Penelitian/PkM",
      dataIndex: "judulLuaran",
      key: "judulLuaran",
      render: (_, record) => record.isCategory ? <strong>{record.judulLuaran}</strong> : record.judulLuaran,
      editable: true,
    },
    {
      title: "Tahun",
      dataIndex: "tahun",
      key: "tahun",
      align: "center",
    },
    {
      title: "Keterangan",
      dataIndex: "keterangan",
      key: "keterangan",
      editable: true,
    },
  ];

  const initialData = [
    {
      key: "1",
      no: "I",
      judulLuaran: "HKI",
      isCategory: true,
    },
    {
      key: "2",
      no: "",
      judulLuaran: "a) Paten",
    },
    {
      key: "3",
      no: "1",
      judulLuaran: "Judul Paten 1",
      tahun: "2022",
      keterangan: "Deskripsi paten 1",
    },
    {
      key: "4",
      no: "",
      judulLuaran: "Jumlah",
      isCategory: true,
    },
    {
      key: "5",
      no: "II",
      judulLuaran: "HKI",
      isCategory: true,
    },
    {
      key: "6",
      no: "",
      judulLuaran: "a) Hak Cipta",
    },
    {
      key: "7",
      no: "1",
      judulLuaran: "Judul Hak Cipta 1",
      tahun: "2023",
      keterangan: "Deskripsi hak cipta 1",
    },
    {
      key: "8",
      no: "",
      judulLuaran: "Jumlah",
      isCategory: true,
    },
    {
      key: "9",
      no: "III",
      judulLuaran: "Teknologi Tepat Guna",
      isCategory: true,
    },
    {
      key: "10",
      no: "1",
      judulLuaran: "Judul Teknologi Tepat Guna 1",
      tahun: "2024",
      keterangan: "Deskripsi teknologi tepat guna 1",
    },
    {
      key: "11",
      no: "",
      judulLuaran: "Jumlah",
      isCategory: true,
    },
    {
      key: "12",
      no: "IV",
      judulLuaran: "Buku Ber-ISBN",
      isCategory: true,
    },
    {
      key: "13",
      no: "1",
      judulLuaran: "Judul Buku 1",
      tahun: "2025",
      keterangan: "Deskripsi buku 1",
    },
    {
      key: "14",
      no: "",
      judulLuaran: "Jumlah",
      isCategory: true,
    },
  ];

  const handleUpload = (info) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const formattedData = jsonData.slice(1).map((row, index) => ({
        key: index,
        no: row[0] || "",
        judulLuaran: row[1] || "",
        tahun: row[2] || "",
        keterangan: row[3] || "",
      }));

      setData(formattedData);
    };
    reader.readAsArrayBuffer(info.file.originFileObj);
  };

  const handleSave = () => {
    message.success("Data has been saved successfully!");
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">b7. Luaran Penelitian/PkM Lainnya oleh DTPS</h2>
      <Upload beforeUpload={() => false} onChange={handleUpload}>
        <Button icon={<UploadOutlined />}>Upload Excel</Button>
      </Upload>
      <Table
        columns={columns}
        dataSource={data.length > 0 ? data : initialData}
        pagination={{ pageSize: 10 }}
        className="mt-4"
        bordered
      />
      <Button type="primary" className="mt-4" onClick={handleSave}>
        Save Data
      </Button>
    </div>
  );
};

export default LuaranPenelitianPkm;
