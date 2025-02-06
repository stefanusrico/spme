import React, { useState } from 'react';
import { Table, Button, Upload, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';

const ProfilDosenTidakTetap = () => {
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
            title: 'Nama Dosen',
            dataIndex: 'namaDosen',
            key: 'namaDosen',
            editable: true,
        },
        {
            title: 'NIDN/ NIDK/ NUP',
            dataIndex: 'nidnNidkNup',
            key: 'nidnNidkNup',
            editable: true,
        },
        {
            title: 'Pendidikan Pasca Sarjana',
            dataindex: 'pendidikanPascaSarjana',
            key: 'pendidikanPascaSarjana',
            aditable: true,
        },
        {
            title: 'Bidang Keahlian',
            dataIndex: 'bidangKeahlian',
            key: 'bidangKeahlian',
            editable: true,
        },
        {
            title: 'Jabatan Akademik',
            dataIndex: 'jabatanAkademik',
            key: 'jabatanAkademik',
            editable: true,
        },
        
        {
            title: 'Sertifikat Pendidik Profesional',
            dataIndex: 'sertifikatPendidik',
            key: 'sertifikatPendidik',
            render: (text) => (text ? 'Ya' : 'Tidak'),
        },
        {
            title: 'Sertifikat Profesi/Kompetensi/Industri',
            dataIndex: 'sertifikatProfesi',
            key: 'sertifikatProfesi',
            render: (text) => (text ? 'Sesuai' : 'Tidak Sesuai'),
        },
        {
            title: 'Mata Kuliah yang Diampu pada PS yang Diakreditas',
            dataIndex: 'mataKuliahDiampu',
            key: 'mataKuliahDiampu',
            editable: true,
        },
        {
            title: 'Kesesuaian Bidang Keahlian dengan Mata Kuliah yang Diampu',
            dataIndex: 'kesesuaianBidang',
            key: 'kesesuaianBidang',
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
                namaDosen: row[1] || '',
                nidnNidkNup: row[2] || '',
                s2: row[3] || '',
                s3: row[4] || '',
                bidangKeahlian: row[5] || '',
                sertifikatPendidik: row[6]?.toLowerCase() === 'ya',
                kesesuaianMK: row[7]?.toLowerCase() === 'sesuai',
                mataKuliah: row[8] || '',
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
            <h2 className="text-xl font-bold mb-4">3. Profil Dosen Tidak Tetap</h2>
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

export default ProfilDosenTidakTetap;
