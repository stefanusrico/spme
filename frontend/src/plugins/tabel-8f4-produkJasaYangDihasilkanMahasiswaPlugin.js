/**
 * Plugin khusus untuk section produk / jasa yang dihasilkan mahasiswa yang diadopsi oleh industri / masyarakat
 */
import { processExcelDataBase } from "../utils/tableUtils"
import { cekStrata } from "./checkStrata"

const ProdukJasaYangDihasilkanMahasiswa = {
    getInfo() {
        return {
            code : "8f4",
            name : "Produk/Jasa yang Dihasilkan Mahasiswa yang Diadopsi oleh Industri/Masyarakat",
            Description : "Plugin for processing student innovation products",
        }
    },

    configureSection(config) {
        return {
            ...config,
            isProdukJasaYangDihasilkanMahasiswa : true,
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
                nama_mahasiswa: "",
                nama_produk_jasa: "",
                deskripsi_produk_jasa: "",
                bukti: ""
            }

            Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
                if(colIndex === undefined || colIndex < 0) return
                
                const value = row[colIndex]

                if(fieldName === "no"){
                    item[fieldName] = value !== undefined && value !== null ? String(value).trim() : ""
                } else {
                    item[fieldName] = value !== undefined && value !== null ? String(value).trim() : ""
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
                    initialTableData[tableCode] = [{
                        key: `default-produk-jasa-mahasiswa-${Date.now()}`,
                        no: 1,
                        selected: true,
                        nama_mahasiswa: "",
                        nama_produk_jasa: "",
                        deskripsi_produk_jasa: "",
                        bukti: ""
                    }]
                }
            })
        }
        
        return initialTableData
    },

    calculateScore(data, config, additionalData = {}) {
        console.log("Calculating produk jasa yang dihasilkan mahasiswa with data:", data)
        
        // Fungsi pengecekan isi field
        const isValidField = (field) => typeof field === 'string' && field.trim() !== "";

        //Cek strata
        const strata = cekStrata()
        const butir = strata === "D-3" ? 63 : 70

        // NAPJ: Jumlah produk/jasa karya mahasiswa
        const NAPJ = data.filter(item =>
            isValidField(item.nama_mahasiswa) &&
            isValidField(item.nama_produk_jasa) &&
            isValidField(item.bukti)
        ).length;

        // Hitung skor
        let score = 2;
        if (NAPJ >= 2) {
            score = 4;
        } else if (NAPJ === 1) {
            score = 3;
        }

        // Logging untuk debugging
        console.log('Hasil NAPJ :', NAPJ);
        console.log('Score : ', score)

        return {
            scores: [
                {
                    butir : 63,
                    nilai : score
                }
            ],
            scoreDetail : {
                NAPJ
            }
        }
    },

    normalizeData(data) {
        return data.map((item) => {
            const result = { ...item }

            const textFields = [
                "nama_mahasiswa",
                "nama_produk_jasa",
                "deskripsi_produk_jasa",
                "bukti"
            ]

            textFields.forEach((field) => {
                if (result[field] === undefined || result[field] === null) {
                    result[field] = ""
                } else if (typeof result[field] === "object") {
                    result[field] = String(result[field])
                } else if (typeof result[field] !== "string") {
                    result[field] = String(result[field])
                }
            })

            return result
        })
    },

    validateData(data) {
        const errors = []

        data.forEach((item, index) => {
            if (!item.nama_mahasiswa) {
                errors.push(`Row ${index + 1}: Nama mahasiswa harus diisi`)
              }
        
              if (!item.nama_produk_jasa) {
                errors.push(`Row ${index + 1}: Nama produk atau jasa harus diisi`)
              }
        
              if (!item.deskripsi_produk_jasa) {
                errors.push(`Row ${index + 1}: Deskripsi produk atau jasa harus diisi`)
              }

              if (!item.bukti) {
                errors.push(`Row ${index + 1}: Bukti harus diisi`)
              }
        })

        return {
            valid: errors.length === 0,
            errors,
        }
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

export default ProdukJasaYangDihasilkanMahasiswa;