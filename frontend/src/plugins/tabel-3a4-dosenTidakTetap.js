/**
 * Plugin khusus untuk section produk / jasa yang dihasilkan mahasiswa yang diadopsi oleh industri / masyarakat
 */
import { processExcelDataBase } from "../utils/tableUtils"
import { fetchScoreDetails } from "../utils/fetchScoreDetail"

const DosenTidakTetap = {
    getInfo() {
        return {
            code : "3a4",
            name : "Dosen Tidak Tetap",
            Description : "Plugin for processing Non-Permanent Lecturers",
        }
    },

    configureSection(config) {
        return {
            ...config,
            isDosenTidakTetap : true,
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
                nama_dosen: "",
                nidn_nidk : "",
                magister_magister_terapan_pendidikan_pasca_sarjana : "",
                doktor_doktor_terapan_pendidikan_pasca_sarjana : "",
                bidang_keahlian : "",
                jabatan_akademik: "",
                nomor_sertifikat_pendidik_profesional: "",
                bidang_sertifikasi_sertifikat_kompetensi_profesi_industri: "",
                lembaga_penerbit_sertifikat_kompetensi_profesi_industri: "",
                mata_kuliah_yang_diampu_pada_ps_yang_diakreditasi: "",
                kesesuaian_bidang_keahlian_dengan_mata_kuliah_yang_diampu: "",
            }

            Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
                if(colIndex === undefined || colIndex < 0) return
                
                const value = row[colIndex]

                if(fieldName === "no" || fieldName === "nama_dosen"){
                    item[fieldName] = value !== undefined && value !== null ? String(value).trim() : ""
                } else if (fieldName === "bidang_keahlian_dengan_mata_kuliah_yang_diampu") {
                    const strVal = String(value || "").toLowerCase().trim()
                    item[fieldName] = ["yes","ya","ada","v","√","✓","1","true"].includes(strVal) ? "V" 
                        : ["no", "tidak", "0", "false"].includes(strVal) ? "Tidak" : strVal
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
        // NDTT = Jumlah dosen tidak tetap yang ditugaskan sebagai pengampu mata kuliah di program studi yang diakreditasi. 
        let NDTT = 0
        
        // NDT =  Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah di program studi yang diakreditasi. 
        const responseScoreDetail = await fetchScoreDetails("3a1")
        
        if (!responseScoreDetail) {
            console.warn('fetchScoreDetails("3a1") did not return any data');
            return {
                scores: [
                    {
                        butir: 22,
                        nilai: 0 
                    }
                ],
                scoreDetail: {}
            };
        }
        
        let NDT = responseScoreDetail?.NDT || 0
        
        // PDTT = (NDTT / (NDT + NDTT)) x 100%
        let PDTT = 0

        // Fungsi pengecekan isi field
        data.forEach((item) => {
            if (
                item.nama_dosen !== null && 
                item.nama_dosen !== undefined && 
                item.nama_dosen !== ''
            ){
                NDTT += 1
            }
        })

        PDTT = (NDTT / (NDT + NDTT)) * 100;

        // Hitung skor
        let score = 0;
        if (PDTT === 0 && responseScoreDetail.NDTPS >= 5) {
            score = 4;
        } else if (PDTT > 0 && PDTT <= 40 && responseScoreDetail.NDTPS >= 5) {
            score = 4 - (5 * PDTT / 100)
        } else if (PDTT > 40 && PDTT <= 60 && responseScoreDetail.NDTPS >= 5) {
            score = 1
        } 

        score = Math.round(score * 100) / 100;

        // Logging untuk debugging
        console.log('Hasil PDTT :', PDTT,'%');
        console.log('Score : ', score)

        return {
            scores: [
                {
                    butir : 22,
                    nilai : score
                }
            ],
            scoreDetail : {
                PDTT,
                NDTT
            }
        }
    },

    normalizeData(data) {
        return data.map((item) => {
            const result = { ...item };
    
            const textFields = [
                "nama_dosen",
                "nidn_nidk",
                "magister_magister_terapan_pendidikan_pasca_sarjana",
                "doktor_doktor_terapan_pendidikan_pasca_sarjana",
                "bidang_keahlian",
                "jabatan_akademik",
                "nomor_sertifikat_pendidik_profesional",
                "bidang_sertifikasi_sertifikat_kompetensi_profesi_industri",
                "lembaga_penerbit_sertifikat_kompetensi_profesi_industri",
                "mata_kuliah_yang_diampu_pada_ps_yang_diakreditasi",
                "kesesuaian_bidang_keahlian_dengan_mata_kuliah_yang_diampu"
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
    
            return result;
        });
    },
    

    validateData(data) {
        const errors = [];
    
        data.forEach((item, index) => {
            // Daftar field wajib isi
            const requiredFields = [
                { field: item.nama_dosen, message: `Row ${index + 1}: Nama dosen harus diisi` },
                { field: item.nidn_nidk, message: `Row ${index + 1}: NIDN/NIDK harus diisi` },
                { field: item.magister_magister_terapan_pendidikan_pasca_sarjana, message: `Row ${index + 1}: Magister harus diisi` },
                { field: item.doktor_doktor_terapan_pendidikan_pasca_sarjana, message: `Row ${index + 1}: Doktor harus diisi` },
                { field: item.bidang_keahlian, message: `Row ${index + 1}: Bidang keahlian harus diisi` },
                { field: item.jabatan_akademik, message: `Row ${index + 1}: Jabatan akademik harus diisi` },
                { field: item.nomor_sertifikat_pendidik_profesional, message: `Row ${index + 1}: Nomor sertifikat pendidik harus diisi` },
                { field: item.bidang_sertifikasi_sertifikat_kompetensi_profesi_industri, message: `Row ${index + 1}: Bidang sertifikasi harus diisi` },
                { field: item.lembaga_penerbit_sertifikat_kompetensi_profesi_industri, message: `Row ${index + 1}: Lembaga penerbit sertifikat harus diisi` },
                { field: item.mata_kuliah_yang_diampu_pada_ps_yang_diakreditasi, message: `Row ${index + 1}: Mata kuliah yang diampu harus diisi` },
                { field: item.kesesuaian_bidang_keahlian_dengan_mata_kuliah_yang_diampu, message: `Row ${index + 1}: Kesesuaian bidang keahlian harus diisi` },
            ];
    
            // Cek field wajib isi
            requiredFields.forEach(({ field, message }) => {
                if (!field) errors.push(message);
            });
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

export default DosenTidakTetap;