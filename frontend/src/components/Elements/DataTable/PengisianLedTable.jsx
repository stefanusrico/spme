import React, { useState } from "react";
import { Upload, Tooltip, Button } from "antd";
import { UploadOutlined, SaveOutlined } from "@ant-design/icons";
// import Button from "../Button";
import Pagination from "@mui/material/Pagination";
import PaginationItem from "@mui/material/PaginationItem";
import Stack from "@mui/material/Stack";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import './StylePengisianLedTable.css'
import { FileLockIcon } from "lucide-react";
import axiosIstance from '../../../utils/axiosConfig'
import ClickableAndDeletableChips from "../Chip/clickableDeleteable";

function PengisianLedTable({ selectedData, showNilai, showMasukan, toggleNilaiVisibility, toggleMasukanVisibility, handleInputChange, handleClickButton, type}) {
    // State untuk pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [isUploaded, setIsUploaded] = useState(false);
    const [isLoadingCheck, setIsLoadingCheck] = useState(false)
    const itemsPerPage = 1; 

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentData = selectedData.Details.filter(detail => detail.Type === "K").slice(indexOfFirstItem, indexOfLastItem);
    
    const handlePageChange = (event, page) => {
        setCurrentPage(page);
    };

    const handleClickButtonLocal = (seq) => {
        setIsLoadingCheck(true)
    
        handleClickButton(seq);
    
        setTimeout(() => {
            setIsLoadingCheck(false)
        }, 2000);
    };

    const handleUpload = async ({ fileList }) => {
        console.log("File yang diunggah:", selectedData['No.']);

        const noSub = `${selectedData['No.']}${selectedData['Sub']}`;
        const storedUser = localStorage.getItem('user');
        const userData = JSON.parse(storedUser);
        
        if (fileList.length === 0) return;
    
        const formData = new FormData();
        fileList.forEach((file) => {
          formData.append("file", file.originFileObj);
        });

        formData.append("subFolder", userData.prodi);
        formData.append("noSub", noSub);
    
        try {
            const response = await axiosIstance.post("/upload-to-drive", 
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            );
            console.log("Upload sukses:", response.data);
            setIsUploaded(true);
        } catch (error) {
            console.error("Upload gagal:", error);
        }
      };

    return (
        <div>
            {/* Kontrol Pagination */}
            <Stack spacing={2} className="mb-4 center-stack">
                <Pagination
                    count={Math.ceil(selectedData.Details.filter(detail => detail.Type === "K").length / itemsPerPage)} // Total halaman
                    page={currentPage}
                    onChange={handlePageChange}
                    renderItem={(item) => (
                        <PaginationItem
                            className="pagination-items" 
                            slots={{ previous: ArrowBackIcon, next: ArrowForwardIcon }}
                            {...item}
                        />
                    )}
                />
            </Stack>
            <table className="text-center text-sm w-full rounded-md">
                <thead>
                    <tr>
                        <th className="border border-black w-[1%] sticky top-0 z-10 bg-gray">No Kriteria</th>
                        <th className="border border-black w-[2%] sticky top-0 z-10 bg-gray">Kriteria indikator</th>
                        <th className="border border-black w-[45%] sticky top-0 z-10 bg-gray">Isian Asesi</th>
                        <th className="border border-black w-[3%] sticky top-0 z-10 bg-gray">Data Pendukung</th>
                        <th className="border border-black w-[2%] sticky top-0 z-10 bg-gray">{type === "editable" ? "Check" : ""}</th>
                        {showNilai ? (
                            <th className="border border-black w-[2%] sticky top-0 z-10 bg-gray">
                                Nilai
                                <button onClick={toggleNilaiVisibility} className="ml-2">-</button>
                            </th>
                        ) : (
                            <th className="border border-black w-[1%] sticky top-0 z-10 bg-gray">
                                <button onClick={toggleNilaiVisibility}>+</button>
                            </th>
                        )}
                        {showMasukan ? (
                            <th className="border border-black w-[45%] sticky top-0 z-10 bg-gray">
                                Masukan / Penjelasan
                                <button onClick={toggleMasukanVisibility} className="ml-2">-</button>
                            </th>
                        ) : (
                            <th className="border border-black w-[1%] sticky top-0 z-10 bg-gray">
                                <button onClick={toggleMasukanVisibility}>+</button>
                            </th>
                        )}
                    </tr>
                </thead>
                <tbody className="h-[400px]">
                    {currentData.map((detail, index) => (
                        <tr key={index}>
                            <td className="border border-black black-600">{detail.Seq}</td>
                            <td className="border border-black black-600">{detail.Reference}</td>
                            <td className="border border-black black-600">
                                <textarea
                                    type="text"
                                    className={`w-full rounded-md resize-none h-[400px] ${type === "readOnly" ? "bg-gray" : "" }`}
                                    value={detail['Isian Asesi'] || ""}
                                    onChange={(e) => handleInputChange(detail.Seq, detail.Type, "Isian Asesi", e.target.value)}
                                />
                            </td>
                            <td className="border border-black black-600">
                                <Upload beforeUpload={() => false} onChange={handleUpload} showUploadList={false} accept=".xlsx, .xls, .png, .jpg" multiple={true} disabled={type === "readOnly" || isLoadingCheck}>
                                    <Tooltip title="Unggah file sebagai data pendukung">
                                        <Button icon={<UploadOutlined />} style={{ marginBottom: "16px" }}>
                                            {isUploaded ? "File Diupload!" : "Upload"}
                                        </Button>
                                    </Tooltip>
                                </Upload>
                                <ClickableAndDeletableChips 
                                    disabled={type === "readOnly" || isLoadingCheck}
                                    no={selectedData['No.']}
                                    sub={selectedData['Sub']}
                                    // prodi={}
                                />
                            </td>
                            <td className="border border-black black-600">
                                <button
                                    className={`h-10 px-1 text-sm rounded-md bg-primary text-white ${type === "readOnly" || isLoadingCheck ? "opacity-50 cursor-not-allowed" : "hover:bg-white hover:text-primary"}`}
                                    onClick={() => handleClickButtonLocal(detail.Seq)}
                                    disabled={type === "readOnly" || isLoadingCheck}
                                >
                                    {isLoadingCheck ? "..." : "Check"}
                                </button>
                            </td>
                            <td className="border border-black black-600">
                                {showNilai ? detail.Nilai || null : null}
                            </td>
                            <td className="border border-black black-600">
                                {showMasukan ? detail.Masukan || null : null}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default PengisianLedTable;
