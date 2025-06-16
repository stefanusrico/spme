import React, { useState } from 'react';
import { Table, Button, Upload, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';

const PengakuanRekognisiDTPS = () => {
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
            title: 'Bidang Keahlian',
            dataIndex: 'bidangKeahlian',
            key: 'bidangKeahlian',
            editable: true,
        },
        {
            title: 'Rekognisi dan Bukti Pendukung',
            dataIndex: 'rekognisiBukti',
            key: 'rekognisiBukti',
            editable: true,
        },
        {
            title: 'Tingkat',
            children: [
                {
                    title: 'Wilayah',
                    dataIndex: 'tingkatWilayah',
                    key: 'tingkatWilayah',
                    editable: true,
                },
                {
                    title: 'Nasional',
                    dataIndex: 'tingkatNasional',
                    key: 'tingkatNasional',
                    editable: true,
                },
                {
                    title: 'Internasional',
                    dataIndex: 'tingkatInternasional',
                    key: 'tingkatInternasional',
                    editable: true,
                },
            ],
        },
        {
            title: 'Tahun',
            dataIndex: 'tahun',
            key: 'tahun',
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
                bidangKeahlian: row[2] || '',
                rekognisiBukti: row[3] || '',
                tingkatWilayah: row[4] || '',
                tingkatNasional: row[5] || '',
                tingkatInternasional: row[6] || '',
                tahun: row[7] || '',
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
            <h2 className="text-xl font-bold mb-4">2. Kinerja Dosen</h2>
            <h3 className="text-lg font-bold mb-4">b1. Pengakuan/Rekognisi DTPS</h3>
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

export default PengakuanRekognisiDTPS;
