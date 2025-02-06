import React, { Children, useState } from 'react';
import { Table, Button, Upload, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';

const DosenPembimbingTA = () => {
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
            title: 'Jumlah Mahasiswa yang Dibimbing',
            children: 
            [
                {
                    title: 'pada PS yang diakreditasi',
                    children:
                    [
                        {
                            title: 'TS-2',
                            dataIndex: 'ts2',
                            key: 'ts2',
                            editable: true,
                        },
                        {
                            title: 'TS-1',
                            dataIndex: 'ts1',
                            key: 'ts1',
                            editable: true,
                        },
                        {
                            title: 'TS',
                            dataIndex: 'ts',
                            key: 'ts',
                            editable: true,
                        },
                        {
                            title: 'Rata-rata',
                            dataIndex: 'ratarata',
                            key: 'ratarata',
                            editable: true,
                        }
                    ]
                },
                {
                    title: 'pada PS Lain di PT',
                    children:
                    [
                        {
                            title: 'TS-2',
                            dataIndex: 'ts2',
                            key: 'ts2',
                            editable: true,
                        },
                        {
                            title: 'TS-1',
                            dataIndex: 'ts1',
                            key: 'ts1',
                            editable: true,
                        },
                        {
                            title: 'TS',
                            dataIndex: 'ts',
                            key: 'ts',
                            editable: true,
                        },
                        {
                            title: 'Rata-rata',
                            dataIndex: 'ratarata',
                            key: 'ratarata',
                            editable: true,
                        }
                    ]
                }
            ]
            
        },
        {
            title: 'Rata-rata Jumlah Bimbingan di semua Program/Semester',
            dataIndex: 'rataRataBimbingan',
            key: 'rataRataBimbingan',
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
                jumlahMahasiswa: row[2] || '',
                rasioBimbingan: row[3] || '',
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
            <h3 className="text-lg font-bold mb-4">c. Dosen Pembimbing Utama Tugas Akhir</h3>
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

export default DosenPembimbingTA;
