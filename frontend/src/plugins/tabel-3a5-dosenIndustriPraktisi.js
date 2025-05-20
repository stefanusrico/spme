/**
 * Plugin khusus untuk section produk / jasa yang dihasilkan mahasiswa yang diadopsi oleh industri / masyarakat
 */
import { processExcelDataBase } from "../utils/tableUtils"
import { fetchScoreDetails } from "../utils/fetchScoreDetail"
import { cekStrata } from "./checkStrata"

const DosenIndustriPraktisi = {
    getInfo() {
        return {
            code : "3a5",
            name : "Dosen Industri/Praktisi",
            Description : "Plugin for processing Practitioner/Industry Lecturer",
        }
    },

    configureSection(config) {
        return {
            ...config,
            isDosenIndustriPraktisi : true,
        }
    },

    async processExcelData(workbook, tableCode, config, prodiName, sectionCode) { 
        const { rawData, detectedIndices, jsonData, headerRowIndex } = await processExcelDataBase(workbook, tableCode, config, prodiName)

        if (rawData.length === 0) return {allRows: []}

        const filteredData = rawData.filter((row) => {
            if(!row || row.length === 0) return false;

            const nonEmptyValues = row.filter(
                (val) => val !== undefined && val !== null && val !== ""
            )

            if(nonEmptyValues.length <= 1) return false
            
            console.log("all numbers : ", nonEmptyValues)
            const allNumbers = nonEmptyValues.every((val) => {
                return (
                    typeof val === "number" || (typeof val === "string" && !isNaN(val) && val.trim() !== "")
                )
            })

            if(allNumbers && nonEmptyValues.length > 0) return false

            const hasSummaryLabel = row.some((cell) => {
                if(typeof cell !== "string") return false

                const normalized = String(cell).toLowerCase().trim()
                return (
                    normalized === "jumlah" ||
                    normalized === "total" ||
                    normalized === "sum" ||
                    normalized === "rata-rata" ||
                    normalized === "average"
                )
            })

            if(hasSummaryLabel) return false
            return true
        })

        const processedData = filteredData.map((row, index) => {
            const item = {
                key: `excel-${index + 1}-${Date.now()}`,
                no: index + 1,
                selected: true,
                nama_dosen_industri_praktisi: "",
                nidk : "",
                perusahaan_industri : "",
                pendidikan_tertinggi : "",
                bidang_keahlian : "",
                bidang_sertifikasi_sertifikat_profesi_kompetensi_industri: "",
                lembaga_penerbit_sertifikat_profesi_kompetensi_industri: "",
                mata_kuliah_yang_diampu: "",
                bobot_kredit_sks: "",
            }

            Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
                if(colIndex === undefined || colIndex < 0) return
                
                const value = row[colIndex]

                if(fieldName === "no" || fieldName === "nama_dosen_industri_praktisi"){
                    item[fieldName] = value !== undefined && value !== null ? String(value).trim() : ""
                } else if (fieldName === "bobot_kredit_sks") {
                    const num = parseFloat(value)
                    item[fieldName] = !isNaN(num) ? Math.max(0, num) : 0
                } else {
                    item[fieldName] = value ? String(value).trim() : ""
                }
            })

            return item
        })

        return {
            allRows: processedData,
            shouldReplaceExisting: true,
        }
    },

    initializeData(config, prodiName, sectionCode, existingData = {}) {
        const initialTableData = {}

        if (config && config.tables) {
            config.tables.forEach((table) => {
                const tableCode = typeof table === "object" ? table.code : table

                if (
                existingData &&
                existingData[tableCode] &&
                existingData[tableCode].length > 0
                ) {
                    initialTableData[tableCode] = existingData[tableCode]
                } else {
                    initialTableData[tableCode] = []
                }
            })
        }
        
        return initialTableData
    },

    async calculateScore(data, config, additionalData = {}) {        
        // MKKI = Jumlah mata kuliah kompetensi yang diampu oleh dosen industri/praktisi. 
        let uniqueMatkul = new Set();

        //Cek strata
        const strata = cekStrata()
        const butir = strata === "D-3" ? 23 : 24

        data.forEach((item) => {
            const matkul = item.mata_kuliah_yang_diampu;
            if (matkul && matkul.trim() !== "") {
                uniqueMatkul.add(matkul.trim());
            }
        });

        const MKKI = uniqueMatkul.size;

        // MKK = Jumlah mata kuliah kompetensi 
        const responseScoreDetail = await fetchScoreDetails("5a-1")
        
        if (!responseScoreDetail) {
            console.warn('fetchScoreDetails("5a-1") did not return any data');
            return {
                scores: [
                    {
                        butir: 23,
                        nilai: 0 
                    }
                ],
                scoreDetail: {}
            };
        }
        const MKK = responseScoreDetail?.jumlah_mata_kuliah_kompetensi || 0
        
        // PMKI = (MKKI / MKK) x 100%
        const PMKI = (MKKI / MKK) * 100
        
        // Hitung skor
        let score = 0;
        if (PMKI >= 20) {
            score = 4;
        } else if (PMKI < 20) {
            score = 2 + (10 * PMKI / 100)
        } 

        score = Math.round(score * 100) / 100;

        // Logging untuk debugging
        console.log('Hasil PMKI :', PMKI,'%');
        console.log('Score : ', score)

        return {
            scores: [
                {
                    butir : 23,
                    nilai : score
                }
            ],
            scoreDetail : {
                MKK,
                MKKI,
                PMKI
            }
        }
    },

    normalizeData(data) {
        return data.map((item) => {
            const result = { ...item };
    
            const textFields = [
                "nama_dosen_industri_praktisi",
                "nidk",
                "perusahaan_industri",
                "pendidikan_tertinggi",
                "bidang_keahlian",
                "bidang_sertifikasi_sertifikat_profesi_kompetensi_industri",
                "lembaga_penerbit_sertifikat_profesi_kompetensi_industri",
                "mata_kuliah_yang_diampu"
            ];
    
            textFields.forEach((field) => {
                if (result[field] === undefined || result[field] === null) {
                    result[field] = "";
                } else if (typeof result[field] === "object") {
                    result[field] = String(result[field]);
                } else if (typeof result[field] !== "string") {
                    result[field] = String(result[field]);
                }
            });
    
            // Pastikan bobot_kredit_sks adalah angka
            result.bobot_kredit_sks = parseFloat(result.bobot_kredit_sks) || 0;
    
            return result;
        });
    },       

    validateData(data) {
        const errors = [];
    
        data.forEach((item, index) => {
            const requiredFields = [
                { field: item.nama_dosen_industri_praktisi, message: `Row ${index + 1}: Nama dosen harus diisi` },
                { field: item.nidk, message: `Row ${index + 1}: NIDK harus diisi` },
                { field: item.perusahaan_industri, message: `Row ${index + 1}: Perusahaan industri harus diisi` },
                { field: item.pendidikan_tertinggi, message: `Row ${index + 1}: Pendidikan tertinggi harus diisi` },
                { field: item.bidang_keahlian, message: `Row ${index + 1}: Bidang keahlian harus diisi` },
                { field: item.bidang_sertifikasi_sertifikat_profesi_kompetensi_industri, message: `Row ${index + 1}: Bidang sertifikasi harus diisi` },
                { field: item.lembaga_penerbit_sertifikat_profesi_kompetensi_industri, message: `Row ${index + 1}: Lembaga penerbit sertifikat harus diisi` },
                { field: item.mata_kuliah_yang_diampu, message: `Row ${index + 1}: Mata kuliah harus diisi` },
            ];
    
            requiredFields.forEach(({ field, message }) => {
                if (!field || field.trim() === "") errors.push(message);
            });

            if (item.bobot_kredit_sks === undefined || item.bobot_kredit_sks === null || item.bobot_kredit_sks === 0) {
                errors.push(`Row ${index + 1}: Bobot kredit SKS harus diisi dan tidak boleh 0`);
            }
        });
    
        return {
            valid: errors.length === 0,
            errors,
        };
    },    
    
    prepareDataForSaving(data) {
        return data.map((item, index) => {
            const preparedItem = {
                ...item,
                no: index + 1,
                _timestamp: new Date().getTime(),
                selected: true,
            }

            Object.keys(preparedItem).forEach((key) => {
                if (
                    typeof preparedItem[key] === "object" &&
                    preparedItem[key] !== null
                ) {
                    preparedItem[key] = String(preparedItem[key])
                }
            })

            return preparedItem
        })
    },
}

export default DosenIndustriPraktisi;