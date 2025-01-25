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
                  render: (text) => text ? <Checkbox checked disabled /> : <Checkbox disabled />, // Render sebagai Checkbox
                  align: "center",
              },
              {
                  title: "Nasional",
                  dataIndex: "tingkatnasional",
                  key: "tingkatnasional",
                  render: (text) => text ? <Checkbox checked disabled /> : <Checkbox disabled />, // Render sebagai Checkbox
                  align: "center",
              },
              {
                  title: "Lokal/Wilayah",
                  dataIndex: "tingkatlokalwilayah",
                  key: "tingkatlokalwilayah",
                  render: (text) => text ? <Checkbox checked disabled /> : <Checkbox disabled />, // Render sebagai Checkbox
                  align: "center",
              },
          ],
      },
        { title: "Judul Kegiatan Kerjasama", dataIndex: "judulkegiatankerjasama", key: "judulkegiatankerjasama", editable: true },
        { title: "Waktu dan Durasi", dataIndex: "waktudurasi", key: "waktudurasi", editable: true },
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

              // Definisikan indeks kolom yang dibutuhkan berdasarkan contoh data
              const requiredColumns = {
                  lembagamitra: 6, // Index kolom "Lembaga Mitra" (ingat index dimulai dari 0)
                  tingkatinternasional: 16,
                  tingkatnasional: 17,
                  tingkatlokalwilayah: 18,
                  judulkegiatankerjasama: 8,
                  waktudurasi: 14, // "Durasi Kerja Sama\r\n(Tahun)"
                  buktikerjasama: 13, // "Bukti Kerjasama\r\n(link MoU/PKS)"
                  manfaatbagiprogramstudi: null, // Tidak ada di contoh data, bisa disesuaikan
              };

              const processedData = jsonData
              .filter((row, index) => index !== 0 && row && row.length > 0 && row[requiredColumns.lembagamitra]) //filter baris kosong dan baris tanpa nama lembaga mitra.
                  .map((row, index) => {
                      const rowData = {};
                      for (const key in requiredColumns) {
                        if (requiredColumns[key] !== null && row[requiredColumns[key]] !== undefined) { //cek jika kolom ada di data dan tidak null di requiredColumns
                          rowData[key] = row[requiredColumns[key]].toString().trim(); //Konversi ke string dan hapus whitespace
                        } else {
                          rowData[key] = ""; //Jika tidak ada isikan string kosong
                        }
                      }
                      rowData.key = (index + 1).toString();
                      return rowData;
                  });

              console.log("Processed Data:", processedData);
              setData(processedData);
              setIsUploaded(true);
              message.success("File berhasil diunggah!");
          } catch (error) {
              message.error("Format file tidak valid. Pastikan Anda mengunggah file Excel yang benar.");
              console.error("Error saat mengunggah:", error);
          }
      };

      reader.onerror = (error) => {
          message.error("Gagal membaca file.");
          console.error("Error FileReader:", error);
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
                message.error(`Terjadi kesalahan saat menyimpan data: ${response.status}`);
            }
        } catch (error) {
            message.error("Gagal menyimpan data. Periksa koneksi API atau data yang dikirim.");
            console.error("Error saat menyimpan:", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div style={{ padding: "20px", background: "#fff", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <h2 style={{ fontSize: "1.5em", fontWeight: "bold", marginBottom: "16px" }}>1. Tata Pamong, Tata Kelola, dan Kerjasama</h2>
            <h3 style={{ fontSize: "1.25em", fontWeight: "bold", marginBottom: "12px" }}>a. Kerjasama</h3>
            <Upload beforeUpload={() => false} onChange={handleUpload} showUploadList={false} accept=".xlsx,.xls">
                <Tooltip title="Unggah file Excel untuk mengisi tabel">
                    <Button icon={<UploadOutlined />} style={{ marginBottom: "16px" }}>
                        {isUploaded ? "File Diupload!" : "Upload Excel"}
                    </Button>
                </Tooltip>
            </Upload>
            <Table
                columns={columns}
                dataSource={data}
                pagination={{ pageSize: 5 }}
                bordered
                size="small" // Membuat tabel lebih compact
                style={{ marginBottom: "16px", tableLayout: "fixed" }} // Mencegah teks meluber
                className="compact-table" // Tambahkan kelas untuk styling tambahan
            />
            <Tooltip title="Simpan data yang telah diunggah">
                <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={isSaving}>
                    {isSaving ? "Menyimpan..." : "Save Data"}
                </Button>
            </Tooltip>
        </div>
    );
};

export default TataPamongSection;
