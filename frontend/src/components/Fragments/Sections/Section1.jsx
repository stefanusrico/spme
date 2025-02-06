import React, { useState } from "react";
import { Table, Button, Upload, message, Tooltip, Checkbox } from "antd";
import { UploadOutlined, SaveOutlined } from "@ant-design/icons";
import * as XLSX from "xlsx";
import axios from "axios";

const TataPamongSection = () => {
    const [data, setData] = useState([]);
    const [isUploaded, setIsUploaded] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const prodiId = "99999";

    const columns = [
        { title: "No", dataIndex: "key", key: "key", width: 50, align: "center" },
        { title: "Lembaga Mitra", dataIndex: "lembagamitra", key: "lembagamitra", editable: true },
        {
          title: "Tingkat",
          children: [
              {
                  title: "Internasional",
                  dataIndex: "tingkatinternasional",
                  key: "tingkatinternasional",
                  render: (text) => text ? <Checkbox checked disabled /> : <Checkbox disabled />, 
                  align: "center",
              },
              {
                  title: "Nasional",
                  dataIndex: "tingkatnasional",
                  key: "tingkatnasional",
                  render: (text) => text ? <Checkbox checked disabled /> : <Checkbox disabled />, 
                  align: "center",
              },
              {
                  title: "Lokal/Wilayah",
                  dataIndex: "tingkatlokalwilayah",
                  key: "tingkatlokalwilayah",
                  render: (text) => text ? <Checkbox checked disabled /> : <Checkbox disabled />, 
                  align: "center",
              },
          ],
      },
        { title: "Judul Kegiatan Kerjasama", dataIndex: "judulkegiatankerjasama", key: "judulkegiatankerjasama", editable: true },
        { title: "Tanggal Awal Kerja Sama", dataIndex: "tanggalawal", key: "tanggalawal", editable: true },
        { title: "Tanggal Akhir Kerja Sama", dataIndex: "tanggalakhir", key: "tanggalakhir", editable: true },
        { title: "Bukti Kerjasama", dataIndex: "buktikerjasama", key: "buktikerjasama", editable: true },
        { title: "Manfaat Bagi Program Studi", dataIndex: "manfaatbagiprogramstudi", key: "manfaatbagiprogramstudi", editable: true },
    ];

    const handleUpload = (info) => {
        const file = info.file;
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
              const workbook = XLSX.read(e.target.result, { type: "binary" });
              const sheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[sheetName];
              const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 2 });
              
              if (!jsonData || jsonData.length === 0 || jsonData[0].length === 0) {
                  message.warning("File Excel kosong atau tidak valid.");
                  return;
              }

              const requiredColumns = {
                  lembagamitra: 6,
                  tingkatinternasional: 16,
                  tingkatnasional: 17,
                  tingkatlokalwilayah: 18,
                  judulkegiatankerjasama: 8,
                  tanggalawal: 14,
                  tanggalakhir: 15,
                  buktikerjasama: 13,
                  manfaatbagiprogramstudi: null,
              };

              const processedData = jsonData
              .filter((row, index) => index !== 0 && row && row.length > 0 && row[requiredColumns.lembagamitra])
                  .map((row, index) => {
                      const rowData = {};
                      for (const key in requiredColumns) {
                        if (requiredColumns[key] !== null && row[requiredColumns[key]] !== undefined) {
                          rowData[key] = row[requiredColumns[key]].toString().trim();
                        } else {
                          rowData[key] = "";
                        }
                      }
                      rowData.key = (index + 1).toString();
                      return rowData;
                  });

              setData(processedData);
              setIsUploaded(true);
              message.success("File berhasil diunggah!");
          } catch (error) {
              message.error("Format file tidak valid.");
          }
      };

      reader.readAsBinaryString(file);
  };

    const handleSave = async () => {
        if (!data.length) {
            message.warning("Tidak ada data untuk disimpan.");
            return;
        }

        setIsSaving(true);
        try {
            const response = await axios.post(`http://localhost:8000/api/section/1/${prodiId}`, data);
            if (response.status === 200) {
                message.success("Data berhasil disimpan!");
                setData([]);
                setIsUploaded(false);
            } else {
                message.error(`Terjadi kesalahan: ${response.status}`);
            }
        } catch (error) {
            message.error("Gagal menyimpan data.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div style={{ padding: "20px", background: "#fff", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <h2>1. Tata Pamong, Tata Kelola, dan Kerjasama</h2>
            <h3>a. Kerjasama</h3>
            <Upload beforeUpload={() => false} onChange={handleUpload} showUploadList={false} accept=".xlsx,.xls">
                <Tooltip title="Unggah file Excel">
                    <Button icon={<UploadOutlined />}>{isUploaded ? "File Diupload!" : "Upload Excel"}</Button>
                </Tooltip>
            </Upload>
            <Table columns={columns} dataSource={data} pagination={{ pageSize: 5 }} bordered size="small" style={{ marginBottom: "16px" }} />
            <Tooltip title="Simpan data">
                <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={isSaving}>{isSaving ? "Menyimpan..." : "Save Data"}</Button>
            </Tooltip>
        </div>
    );
};

export default TataPamongSection;
