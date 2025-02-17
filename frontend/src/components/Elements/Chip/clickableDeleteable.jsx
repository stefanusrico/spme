import * as React from 'react';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import axiosInstance from '../../../utils/axiosConfig';
import { useState, useEffect } from 'react';

export default function ClickableAndDeletableChips({ no, sub, disabled }) {
    const [uploadedFiles, setUploadedFiles] = useState([]);

    const fetchUploadedFiles = async () => {
        const noSub = `${no}${sub}`;
        const storedUser = localStorage.getItem('user');
        const userData = JSON.parse(storedUser);
    
        try {
            const response = await axiosInstance.get(`/get-files`, {
                params: {
                    subFolder: userData.prodi,
                    noSub: noSub
                }
            });
            console.log("berhasil fetch", response.data.files)
            setUploadedFiles(response.data.files); // Pastikan API mengembalikan array file
        } catch (error) {
            console.error("Gagal mengambil file:", error);
        }
    };

    const handleClick = (fileUrl) => {
        console.info('You clicked the Chip.');
        window.open(fileUrl, "_blank");
    };

    const handleDelete = async ({fileId}) => {
        // console.info('You clicked the delete icon.');
        const noSub = `${no}${sub}`;
        const storedUser = localStorage.getItem('user');
        const userData = JSON.parse(storedUser);
        try {
            const response = await axiosInstance.delete('/delete-files', {
                data: { fileId, subFolder: userData.prodi , noSub }
            });
            console.log(response.data.message);
            fetchUploadedFiles();
        } catch (error) {
            console.error('Gagal menghapus file:', error.response.data);
        }
    };

    useEffect(() => {
        fetchUploadedFiles();
    }, [no, sub]);

    return (
        <Stack direction="column" spacing={1}>
            {uploadedFiles && uploadedFiles.length > 0 ? (
                uploadedFiles.map((file, index) => (
                    <Chip
                        disabled={disabled}
                        style={{width: '120px'}}
                        key={index}
                        label={file.name}
                        variant="outlined"
                        onClick={() => handleClick(file.url)} 
                        onDelete={() => handleDelete({ fileId: file.id })}
                    />
                ))
            ) : (
                <p>No files uploaded</p>
            )}
        </Stack>
    );
}
