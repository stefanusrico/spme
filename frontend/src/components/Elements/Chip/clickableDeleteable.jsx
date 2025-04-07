import * as React from 'react';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import axiosInstance from '../../../utils/axiosConfig';
import { useState, useEffect } from 'react';

export default function ClickableAndDeletableChips({ no, sub, kriteria, dataPendukung, disabled, handleClick }) {
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [driveFiles, setDriveFiles] = useState([]);

    const fetchUploadedFiles = async () => {
        const noSub = `${no}${sub}`;
        const storedUser = localStorage.getItem('user');
        const userData = JSON.parse(storedUser);
    
        try {
            const response = await axiosInstance.get(`/get-files`, {
                params: {
                    subFolder: userData.prodi.name,
                    noSub: noSub,
                    noKriteria: kriteria
                }
            });
            
            setDriveFiles(response.data.files || []);
        } catch (error) {
            console.error("Gagal mengambil file:", error);
        }
    };

    const handleDelete = async ({fileId}) => {
        // console.info('You clicked the delete icon.');
        const noSub = `${no}${sub}`;
        const storedUser = localStorage.getItem('user');
        const userData = JSON.parse(storedUser);
        try {
            const response = await axiosInstance.delete('/delete-files', {
                data: { fileId, subFolder: userData.prodi.name , noSub }
            });
            fetchUploadedFiles();
        } catch (error) {
            console.error('Gagal menghapus file:', error.response.data);
        }
    };

    useEffect(() => {
        fetchUploadedFiles();
    }, [no, sub]);

    useEffect(() => {
        console.log("data dari drive :", driveFiles);
        console.log("data pendukung tambahan :", dataPendukung);

        // Membuat Set berisi nama file dari driveFiles untuk pengecekan cepat
        const driveFileNames = new Set(driveFiles.map(file => file.name));

        // Filter dataPendukung, hanya ambil yang tidak ada di driveFileNames
        const filteredFiles = (dataPendukung || []).filter(file => !driveFileNames.has(file.name));

        // Gabungkan driveFiles dengan filteredFiles
        const combinedFiles = [...driveFiles, ...filteredFiles];

        console.log("hasil combinedFiles :", combinedFiles);
        setUploadedFiles(combinedFiles);
    }, [driveFiles, dataPendukung]);

    useEffect(() => {
        console.log("uploaded files : ", uploadedFiles)
    },[uploadedFiles])

    return (
        <Stack direction="column" spacing={1}>
            {uploadedFiles && uploadedFiles.length > 0 ? (
                uploadedFiles.map((file, index) => (
                    <Chip
                        disabled={disabled}
                        style={{width: '520px'}}
                        key={index}
                        label={file.name}
                        variant="outlined"
                        onClick={() => handleClick(index)} 
                        onDelete={() => handleDelete({ fileId: file.id })}
                    />
                ))
            ) : (
                <p>No files uploaded</p>
            )}
        </Stack>
    );
}
