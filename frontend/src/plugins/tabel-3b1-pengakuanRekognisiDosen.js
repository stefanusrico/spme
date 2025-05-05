/**
 * Plugin khusus untuk section produk / jasa yang dihasilkan mahasiswa yang diadopsi oleh industri / masyarakat
 */
import { processExcelDataBase } from "../utils/tableUtils"
import { fetchScoreDetails } from "../utils/fetchScoreDetail"

const PengakuanRekognisiDtps = {
    getInfo() {
        return {
            code : "3b1",
            name : "Pengakuan/Rekognisi DTPS",
            Description : "Plugin for processing ",
        }
    },

    configureSection(config) {
        return {
            ...config,
            isPengakuanRekognisiDtps : true,
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
                bidang_keahlian : "",
                rekognisi_rekognisi_dan_bukti_pendukung : "",
                bukti_pendukung_rekognisi_dan_bukti_pendukung : "",
                tingkat_wilayah : "",
                tingkat_nasional: "",
                tingkat_interna_sional: "",
                tahun_yyyy: "",
            }

            Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
                if(colIndex === undefined || colIndex < 0) return
                
                const value = row[colIndex]

                if(fieldName === "no" || fieldName === "nama_dosen"){
                    item[fieldName] = value !== undefined && value !== null ? String(value).trim() : ""
                } else if (fieldName === "tingkat_wilayah" || fieldName === "tingkat_nasional" && fieldName === "tingkat_interna_sional") {
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
        // NRD = Jumlah pengakuan atas prestasi/kinerja DTPS yang relevan dengan bidang keahlian dalam 3 tahun terakhir. 
        let NRD = 0;
        data.forEach((item) => {
            if (item.nama_dosen?.trim() && item.rekognisi_rekognisi_dan_bukti_pendukung?.trim()) {
                NRD += 1;
            }
        });
        
        // NDTPS = Jumlah dosen tetap yang ditugaskan sebagai pengampu mata kuliah dengan bidang keahlian yang sesuai dengan kompetensi inti program studi yang diakreditasi. 
        const responseScoreDetail = await fetchScoreDetails("3a1")
        
        if (!responseScoreDetail) {
            console.warn('fetchScoreDetails("3a1") did not return any data');
            return {
                scores: [
                    {
                        butir: 24,
                        nilai: 0 
                    }
                ],
                scoreDetail: {}
            };
        }

        const NDTPS = responseScoreDetail?.NDTPS || 0
        // RRD = NRD / NDTPS 
        let RRD = NRD / NDTPS 

        // Hitung skor
        let score = 0;
        if (RRD >= 0.25) {
            score = 4;
        } else if (RRD < 0.25) {
            score = 2 + (8 * RRD)
        } 

        score = Math.round(score * 100) / 100;
        RRD = Math.round(RRD * 100) / 100;

        // Logging untuk debugging
        console.log('Hasil RRD : ',RRD);
        console.log('Score : ', score)

        return {
            scores: [
                {
                    butir : 24,
                    nilai : score
                }
            ],
            scoreDetail : {
                RRD,
                NRD,
                NDTPS
            }
        }
    },

    normalizeData(data) {
        return data.map((item) => {
            const result = { ...item };
    
            const textFields = [
                "nama_dosen",
                "bidang_keahlian",
                "rekognisi_rekognisi_dan_bukti_pendukung",
                "bukti_pendukung_rekognisi_dan_bukti_pendukung",
                "tingkat_wilayah",
                "tingkat_nasional",
                "tingkat_interna_sional",
                "tahun_yyyy"
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
            const requiredFields = [
                { field: item.nama_dosen, message: `Row ${index + 1}: Nama dosen harus diisi` },
                { field: item.bidang_keahlian, message: `Row ${index + 1}: Bidang keahlian harus diisi` },
                { field: item.rekognisi_rekognisi_dan_bukti_pendukung, message: `Row ${index + 1}: Rekognisi harus diisi` },
                { field: item.bukti_pendukung_rekognisi_dan_bukti_pendukung, message: `Row ${index + 1}: Bukti pendukung harus diisi` },
                { field: item.tingkat_wilayah, message: `Row ${index + 1}: Tingkat wilayah harus diisi` },
                { field: item.tingkat_nasional, message: `Row ${index + 1}: Tingkat nasional harus diisi` },
                { field: item.tingkat_interna_sional, message: `Row ${index + 1}: Tingkat internasional harus diisi` },
                { field: item.tahun_yyyy, message: `Row ${index + 1}: Tahun harus diisi` },
            ];
    
            requiredFields.forEach(({ field, message }) => {
                if (!field || String(field).trim() === "") errors.push(message);
            });

            const tingkat = [
                item.tingkat_wilayah,
                item.tingkat_nasional,
                item.tingkat_interna_sional
            ];
    
            const validYes = ["v", "ya", "yes", "ada", "✓", "√", "1", "true"];
            const hasOneTingkat = tingkat.some(val =>
                validYes.includes(String(val || "").toLowerCase())
            );
    
            if (!hasOneTingkat) {
                errors.push(`Row ${index + 1}: Minimal salah satu tingkat (wilayah/nasional/internasional) harus terisi dengan valid`);
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

export default PengakuanRekognisiDtps;