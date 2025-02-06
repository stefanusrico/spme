import React, { useState } from 'react';
import { Table, Button, message, Upload, Tooltip } from 'antd';
import { UploadOutlined, SaveOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import axios from 'axios';

const MahasiswaSection = () => {
    const [kualitasInputData, setKualitasInputData] = useState([]);
    const [mahasiswaAsingData, setMahasiswaAsingData] = useState([]);
    const [isUploadedKualitas, setIsUploadedKualitas] = useState(false);
    const [isUploadedAsing, setIsUploadedAsing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const prodiId = "99999";

    const kualitasInputColumns = [
        { title: 'Tahun Akademik', dataIndex: 'tahunAkademik', key: 'tahunAkademik', fixed: 'left' },
        { title: 'Daya Tampung', dataIndex: 'dayaTampung', key: 'dayaTampung' },
        { title: 'Jumlah Calon Mahasiswa', children: [
            { title: 'Pendaftar', dataIndex: 'pendaftar', key: 'pendaftar' },
            { title: 'Lulus Seleksi', dataIndex: 'lulusSeleksi', key: 'lulusSeleksi' },
        ]},
        { title: 'Jumlah Mahasiswa Baru', children: [
            { title: 'Reguler', dataIndex: 'regulerBaru', key: 'regulerBaru' },
            { title: 'Transfer', dataIndex: 'transferBaru', key: 'transferBaru' },
        ]},
        { title: 'Jumlah Mahasiswa Aktif', children: [
            { title: 'Reguler', dataIndex: 'regulerAktif', key: 'regulerAktif' },
            { title: 'Transfer', dataIndex: 'transferAktif', key: 'transferAktif' },
        ]},
    ];

    const mahasiswaAsingColumns = [
        { title: 'No', dataIndex: 'key', key: 'key', width: 50 },
        { title: 'Program Studi', dataIndex: 'programStudi', key: 'programStudi' },
        { title: 'Jumlah Mahasiswa Aktif', children: [
            { title: 'TS-2', dataIndex: 'aktifTS2', key: 'aktifTS2' },
            { title: 'TS-1', dataIndex: 'aktifTS1', key: 'aktifTS1' },
            { title: 'TS', dataIndex: 'aktifTS', key: 'aktifTS' },
        ]},
        { title: 'Jumlah Mahasiswa Asing Penuh Waktu', children: [
            { title: 'TS-2', dataIndex: 'penuhWaktuTS2', key: 'penuhWaktuTS2' },
            { title: 'TS-1', dataIndex: 'penuhWaktuTS1', key: 'penuhWaktuTS1' },
            { title: 'TS', dataIndex: 'penuhWaktuTS', key: 'penuhWaktuTS' },
        ]},
        { title: 'Jumlah Mahasiswa Asing Paruh Waktu', children: [
            { title: 'TS-2', dataIndex: 'paruhWaktuTS2', key: 'paruhWaktuTS2' },
            { title: 'TS-1', dataIndex: 'paruhWaktuTS1', key: 'paruhWaktuTS1' },
            { title: 'TS', dataIndex: 'paruhWaktuTS', key: 'paruhWaktuTS' },
        ]},
    ];

    const handleUploadKualitas = (info) => handleUpload(info, setKualitasInputData, setIsUploadedKualitas, "Kualitas Input Mahasiswa");
    const handleUploadAsing = (info) => handleUpload(info, setMahasiswaAsingData, setIsUploadedAsing, "Mahasiswa Asing");

    const handleUpload = (info, setData, setIsUploaded, sectionName) => {
        const file = info.file;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const workbook = XLSX.read(e.target.result, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 0 }); // Baca semua baris, nanti difilter

                if (!jsonData || jsonData.length === 0 || jsonData[0].length === 0) {
                    message.warning(`File Excel ${sectionName} kosong atau tidak valid.`);
                    return;
                }
                const headers = Object.keys(jsonData[0]).filter(key => key !== '__rowNum__');
                const processedData = jsonData.filter((row, index) => index !== 0 && row.some(cell => cell)).map((row, index) => {
                    const rowData = {};
                    headers.forEach((header, colIndex) => {
                        rowData[header] = row[colIndex] ? row[colIndex].toString().trim() : "";
                    });
                    rowData.key = (index + 1).toString();
                    return rowData;
                });
                setData(processedData);
                setIsUploaded(true);
                message.success(`File ${sectionName} berhasil diunggah!`);
            } catch (error) {
                message.error(`Format file ${sectionName} tidak valid. Pastikan Anda mengunggah file Excel yang benar.`);
                console.error("Error saat mengunggah:", error);
            }
        };
        reader.onerror = (error) => {
            message.error(`Gagal membaca file ${sectionName}.`);
            console.error("Error FileReader:", error);
        };
        reader.readAsBinaryString(file);
    };

    const handleSave = async () => {
        if (!kualitasInputData.length && !mahasiswaAsingData.length) {
            message.warning("Tidak ada data untuk disimpan.");
            return;
        }

        setIsSaving(true);
        try {
            const responseKualitas = kualitasInputData.length > 0 ? await axios.post(`http://localhost:8000/api/mahasiswa/kualitas/${prodiId}`, kualitasInputData) : null;
            const responseAsing = mahasiswaAsingData.length > 0 ? await axios.post(`http://localhost:8000/api/mahasiswa/asing/${prodiId}`, mahasiswaAsingData) : null;

            if ((responseKualitas && responseKualitas.status === 200) || (responseAsing && responseAsing.status === 200) || (!responseKualitas && !responseAsing)) { //kondisi jika salah satu atau keduanya berhasil atau jika keduanya kosong.
                message.success("Data berhasil disimpan!");
                setKualitasInputData([]);
                setMahasiswaAsingData([]);
                setIsUploadedKualitas(false);
                setIsUploadedAsing(false);
            } else {
                message.error("Terjadi kesalahan saat menyimpan data.");
            }
        } catch (error) {
            message.error("Gagal menyimpan data. Periksa koneksi API atau data yang dikirim.");
            console.error("Error saat menyimpan:", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div>
            <h2 className="text-xl font-bold mb-4">2. Mahasiswa</h2>

            <h3 className="text-xl font-bold mb-4">a. Kualitas Input Mahasiswa</h3>
            <Upload beforeUpload={() => false} onChange={handleUploadKualitas} showUploadList={false} accept=".xlsx,.xls">
                <Tooltip title="Unggah file Excel untuk mengisi tabel Kualitas Input Mahasiswa">
                    <Button icon={<UploadOutlined />} style={{ marginBottom: "16px" }}>{isUploadedKualitas ? "File Kualitas Diupload!" : "Upload Excel Kualitas"}</Button>
                </Tooltip>
            </Upload>
            <Table columns={kualitasInputColumns} dataSource={kualitasInputData} pagination={false} bordered className="mb-8" size="small" style={{tableLayout:"fixed"}}/>

            <h3 className="text-xl font-bold mb-4">b. Mahasiswa Asing</h3>
            <Upload beforeUpload={() => false} onChange={handleUploadAsing} showUploadList={false} accept=".xlsx,.xls">
                <Tooltip title="Unggah file Excel untuk mengisi tabel Mahasiswa Asing">
                    <Button icon={<UploadOutlined />} style={{ marginBottom: "16px" }}>{isUploadedAsing ? "File Asing Diupload!" : "Upload Excel Asing"}</Button>
                </Tooltip>
            </Upload>
            <Table columns={mahasiswaAsingColumns} dataSource={mahasiswaAsingData} pagination={{ pageSize: 5 }} bordered size="small" style={{tableLayout:"fixed"}} />

            <Tooltip title="Simpan data yang telah diunggah">
                <Button type="primary" className="mt-4" onClick={handleSave} loading={isSaving} icon={<SaveOutlined/>}>
                    {isSaving ? "Menyimpan..." : "Save Data"}
                </Button>
            </Tooltip>
        </div>
    );
};

export default MahasiswaSection;