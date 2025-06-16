import React, { useState } from 'react';
import { Table, Button, Upload, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';

const ProfilDosenTetap = () => {
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
            title: 'NIDN/NIDK',
            dataIndex: 'nidnNidk',
            key: 'nidnNidk',
            editable: true,
        },
        {
            title: 'Pendidikan Pasca Sarjana',
            children: [
                {
                    title: 'Magister/Magister Terapan/Spesialis',
                    dataIndex: 's2',
                    key: 's2',
                    editable: true,
                },
                {
                    title: 'Doktor/Doktor Terapan/Spesialis',
                    dataIndex: 's3',
                    key: 's3',
                    editable: true,
                },
            ],
        },
        {
            title: 'Bidang Keahlian',
            dataIndex: 'bidangKeahlian',
            key: 'bidangKeahlian',
            editable: true,
        },
        {
            title: 'Kesesuaian dengan Kompetensi Inti PS',
            dataIndex: 'kesesuaianKompetensi',
            key: 'kesesuaianKompetensi',
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
            dataIndex: 'sertifikasiPendidik',
            key: 'sertifikasiPendidik',
            render: (text) => (text ? 'Ya' : 'Tidak'),
            editable: true,
        },
        {
            title: 'Sertifikat Kompetensi/Profesi/Industri',
            dataIndex: 'sertifikatKompetensi',
            key: 'sertifikatKompetensi',
            editable: true,
        },
        {
            title: 'Mata Kuliah yang Diampu pada PS yang Diakreditasi',
            dataIndex: 'mataKuliah',
            key: 'mataKuliah',
            render: (text) => (text ? 'Sesuai' : 'Tidak Sesuai'),
            editable: true,
        },
        {
            title: 'Kesesuaian Bidang Keahlian dengan Mata Kuliah yang Diampu',
            dataIndex: 'kesesuaiaBidang',
            key: 'kesesuaianBidang',
            editable: true,
        },
        {
            title: 'Mata Kuliah yang Diampu pada PS Lain',
            dataIndex: 'mataKuliahLain',
            key: 'mataKuliahLain',
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
                nidnNidk: row[2] || '',
                pendidikanTertinggi: row[3] || '',
                jabatanAkademik: row[4] || '',
                sertifikasiPendidik: row[5] === 'Ya',
                bidangKeahlian: row[6] || '',
                kesesuaianMK: row[7] === 'Sesuai',
                jumlahSKS: row[8] || '',
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
            <h2 className="text-xl font-bold mb-4">3. Profil Dosen Tetap</h2>
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

export default ProfilDosenTetap;
