import React, { useState } from 'react';
import { Table, Button, Upload, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';

const DosenIndustri = () => {
    const [data, setData] = useState([]);

    const columns = [
        {
            title: 'No',
            dataIndex: 'no',
            key: 'no',
            width: 50,
            align: 'center',
        },
        {
            title: 'Nama Dosen Industri/Praktisi',
            dataIndex: 'namaDosenIndustri',
            key: 'namaDosenIndustri',
            editable: true,
        },
        {
            title: 'NIDK',
            dataIndex: 'nidk',
            key: 'nidk',
            editable: true,
        },
        {
            title: 'Perusahaan/Industri',
            dataIndex: 'perusahaan',
            key: 'perusahaan',
            editable: true,
        },
        {
            title: 'Pendidikan Tertinggi',
            dataIndex: 'pendidikanTertinggi',
            key: 'pendidikanTertinggi',
            editable: true,
        },
        {
            title: 'Bidang Keahlian',
            dataIndex: 'bidangKeahlian',
            key: 'bidangKeahlian',
            editable: true,
        },
        {
            title: 'Sertifikat Profesi/Kompetensi/Industri',
            dataIndex: 'sertifikatProfesi',
            key: 'sertifikatProfesi',
            editable: true,
        },
        {
            title: 'Mata Kuliah yang Diampu',
            dataIndex: 'mataKuliahDiampu',
            key: 'mataKuliahDiampu',
            editable: true,
        },
        {
            title: 'Bobot Kredit (sks)',
            dataIndex: 'bobotKredit',
            key: 'bobotKredit',
            editable: true,
        },
    ];

    const handleUpload = (info) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            const formattedData = jsonData.slice(1).map((row, index) => ({
                key: index,
                no: row[0] || '',
                namaDosenIndustri: row[1] || '',
                namaPerusahaan: row[2] || '',
                mataKuliah: row[3] || '',
                jumlahSKS: row[4] || '',
            }));

            setData(formattedData);
        };
        reader.readAsArrayBuffer(info.file.originFileObj);
    };

    const handleSave = () => {
        message.success('Data has been saved successfully!');
    };

    return (
        <div>
            <h2 className="text-xl font-bold mb-4">3. Profil Dosen dan Mahasiswa</h2>
            <h3 className="text-lg font-bold mb-4">d. Dosen Industri</h3>
            <Upload beforeUpload={() => false} onChange={handleUpload}>
                <Button icon={<UploadOutlined />}>Upload Excel</Button>
            </Upload>
            <Table
                columns={columns}
                dataSource={data}
                pagination={{ pageSize: 5 }}
                className="mt-4"
                bordered
            />
            <Button type="primary" className="mt-4" onClick={handleSave}>
                Save Data
            </Button>
        </div>
    );
};

export default DosenIndustri;
