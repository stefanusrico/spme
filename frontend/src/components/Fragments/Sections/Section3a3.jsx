import React, { useState } from 'react';
import { Table, Button, Upload, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';

const EkuivalenWaktuMengajarSection = () => {
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
            title: 'Nama Dosen (DT)',
            dataIndex: 'namaDosen',
            key: 'namaDosen',
            editable: true,
        },
        {
            title: 'DTPS',
            dataIndex: 'dtps',
            key: 'dtps',
            editable: true,
        },
        {
            title: 'Ekuivalen Waktu Mengajar Penuh pada TS (dalam SKS)',
            children: [
                {
                    title: 'Pendidikan: Pembelajaran dan Pembimbingan',
                    children: [
                        {
                        title: 'PS yang Diakreditasi',
                        dataIndex: 'psDiakreditasi',
                        key: 'psDiakreditasi',
                        editable: true,
                        },
                        {
                        title: 'PS Lain di dalam PT',
                        dataIndex: 'psLaindalam',
                        key: 'psLaindalam',
                        editable: true,
                        },
                        {
                        title: 'PS Lain di luar PT',
                        dataIndex: 'psLainluar',
                        key: 'psLainluar',
                        editable: true,
                        },
                    ],
                },
                {
                    title: 'Penelitian',
                    dataIndex: 'penelitian',
                    key: 'penelitian',
                    editable: true,
                },
                {
                    title: 'PkM',
                    dataIndex: 'pkm',
                    key: 'pkm',
                    editable: true,
                },
                {
                    title: 'Tugas Tambahan dan/atau Penunjang',
                    dataIndex: 'tugasTambahan',
                    key: 'tugasTambahan',
                    editable: true,
                },
            ],
        },
        {
            title: 'Jumlah (SKS)',
            dataIndex: 'jumlahSKS',
            key: 'jumlahSKS',
            editable: true,
        },
        {
            title: 'Rata-Rata per Semester (SKS)',
            dataIndex: 'rataRataPerSemester',
            key: 'rataRataPerSemester',
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
                dtps: row[2] || '',
                ekuivalenWaktuMengajar: row[3] || '',
                pendidikanPsDiakreditasi: row[4] || '',
                pendidikanPsLainDiPT: row[5] || '',
                pendidikanPsLainDiLuarPT: row[6] || '',
                penelitian: row[7] || '',
                pkm: row[8] || '',
                tugasTambahan: row[9] || '',
                jumlahSKS: row[10] || '',
                rataRataPerSemester: row[11] || '',
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
            <h2 className="text-xl font-bold mb-4">2. Ekuivalen Waktu Mengajar Penuh</h2>
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

export default EkuivalenWaktuMengajarSection;
