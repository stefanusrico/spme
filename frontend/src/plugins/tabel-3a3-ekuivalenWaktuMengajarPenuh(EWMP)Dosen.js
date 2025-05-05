/**
 * Plugin khusus untuk section produk / jasa yang dihasilkan mahasiswa yang diadopsi oleh industri / masyarakat
 */
import { processExcelDataBase } from "../utils/tableUtils"

const EkuivalenWaktuMengajarPenuhDosen = {
    getInfo() {
        return {
            code : "3a3",
            name : "Ekuivalen Waktu Mengajar Penuh (EWMP) Dosen",
            Description : "Plugin for processing Lecturer Full Teaching Time Equivalent",
        }
    },

    configureSection(config) {
        return {
            ...config,
            isEkuivalenWaktuMengajarPenuhDosen : true,
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
                nama_dosen_dt: "",
                dtps : "",
                ps_yang_diakreditasi_pendidikan_pembelajaran_dan_pembimbingan : 0,
                ps_lain_di_dalam_pt_pendidikan_pembelajaran_dan_pembimbingan : 0,
                ps_lain_di_luar_pt_pendidikan_pembelajaran_dan_pembimbingan : 0,

                penelitian_ekuivalen_waktu_mengajar_penuh_ewmp_pada_saat_ts_dalam_satuan_kredit_semester_sks : 0,
                pkm_ekuivalen_waktu_mengajar_penuh_ewmp_pada_saat_ts_dalam_satuan_kredit_semester_sks : 0,
                tugas_tambahan_dan_atau_penunjang_ekuivalen_waktu_mengajar_penuh_ewmp_pada_saat_ts_dalam_satuan_kredit_semester_sks : 0,
                
                jumlah_per_tahun_sks : 0,
                jumlah_per_semester_sks: 0,
            }

            Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
                if(colIndex === undefined || colIndex < 0) return
                
                const value = row[colIndex]

                if(fieldName === "no" || fieldName === "nama_dosen_dt"){
                    item[fieldName] = value !== undefined && value !== null ? String(value).trim() : ""
                } else if(
                    [
                        "ps_yang_diakreditasi_pendidikan_pembelajaran_dan_pembimbingan",
                        "ps_lain_di_dalam_pt_pendidikan_pembelajaran_dan_pembimbingan",
                        "ps_lain_di_luar_pt_pendidikan_pembelajaran_dan_pembimbingan",

                        "penelitian_ekuivalen_waktu_mengajar_penuh_ewmp_pada_saat_ts_dalam_satuan_kredit_semester_sks",
                        "pkm_ekuivalen_waktu_mengajar_penuh_ewmp_pada_saat_ts_dalam_satuan_kredit_semester_sks",
                        "tugas_tambahan_dan_atau_penunjang_ekuivalen_waktu_mengajar_penuh_ewmp_pada_saat_ts_dalam_satuan_kredit_semester_sks",
                        "jumlah_per_tahun_sks",
                        "jumlah_per_semester_sks",
                    ].includes(fieldName)
                ){
                    const num = parseFloat(value)
                    item[fieldName] = !isNaN(num) ? Math.max(0, num) : 0
                } else if (fieldName === "dtps") {
                    const strVal = String(value || "").toLowerCase().trim()
                    item[fieldName] = ["yes","ya","ada","v","√","✓","1","true"].includes(strVal) ? "V" 
                        : ["no", "tidak", "0", "false"].includes(strVal) ? "Tidak" : strVal
                }else {
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

    calculateScore(data, config, additionalData = {}) {
        // RDPU = Rata-rata jumlah bimbingan sebagai pembimbing utama di seluruh program/ semester. 
        let EWMP = 0
        let index = 0
        let totalEWMP = 0

        // Fungsi pengecekan isi field
        data.forEach((item) => {
            if (
                item.jumlah_per_semester_sks !== null && 
                item.jumlah_per_semester_sks !== undefined && 
                item.jumlah_per_semester_sks !== ''
            ){
                index += 1
                totalEWMP += item.jumlah_per_semester_sks
            }
        })

        EWMP = index > 0 ? Math.round((totalEWMP / index) * 100) / 100 : 0;

        // Hitung skor
        let score = 0;
        if (EWMP === 14) {
            score = 4;
        } else if (EWMP >= 12 && EWMP < 14 ) {
            score = ((3 * EWMP) - 34) / 2
        } else if (EWMP > 14 && EWMP <= 16 ) {
            score = (50 - (3 * EWMP)) / 2
        } 

        score = Math.round(score * 100) / 100;

        // Logging untuk debugging
        console.log('Hasil EWMP :', EWMP);
        console.log('Score : ', score)

        return {
            scores: [
                {
                    butir : 21,
                    nilai : score
                }
            ],
            scoreDetail : {
                EWMP,
            }
        }
    },

    normalizeData(data) {
        return data.map((item) => {
            const result = { ...item }

            const numericFields = [
                "ps_yang_diakreditasi_pendidikan_pembelajaran_dan_pembimbingan",
                "ps_lain_di_dalam_pt_pendidikan_pembelajaran_dan_pembimbingan",
                "ps_lain_di_luar_pt_pendidikan_pembelajaran_dan_pembimbingan",

                "penelitian_ekuivalen_waktu_mengajar_penuh_ewmp_pada_saat_ts_dalam_satuan_kredit_semester_sks",
                "pkm_ekuivalen_waktu_mengajar_penuh_ewmp_pada_saat_ts_dalam_satuan_kredit_semester_sks",
                "tugas_tambahan_dan_atau_penunjang_ekuivalen_waktu_mengajar_penuh_ewmp_pada_saat_ts_dalam_satuan_kredit_semester_sks",
                "jumlah_per_tahun_sks",
                "jumlah_per_semester_sks",
            ]

            const textFields = [
                "nama_dosen_dt",
                "dpts",
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

            numericFields.forEach((field) => {
                result[field] = !isNaN(parseFloat(result[field])) ? Math.max(0, parseFloat(result[field])) : 0
            })

            return result
        })
    },

    validateData(data) {
        const errors = [];
    
        data.forEach((item, index) => {
            // Daftar field wajib isi
            const requiredFields = [
                { field: item.nama_dosen_dt, message: `Row ${index + 1}: Nama dosen harus diisi` },
                { field: item.dtps, message: `Row ${index + 1}: DTPS harus diisi` },
            ];
    
            // Cek field wajib isi
            requiredFields.forEach(({ field, message }) => {
                if (!field) errors.push(message);
            });
    
            // Hitung jumlah_per_tahun_sks
            const totalSKS = 
                (parseFloat(item.ps_yang_diakreditasi_pendidikan_pembelajaran_dan_pembimbingan) || 0) +
                (parseFloat(item.ps_lain_di_dalam_pt_pendidikan_pembelajaran_dan_pembimbingan) || 0) +
                (parseFloat(item.ps_lain_di_luar_pt_pendidikan_pembelajaran_dan_pembimbingan) || 0) +
                (parseFloat(item.penelitian_ekuivalen_waktu_mengajar_penuh_ewmp_pada_saat_ts_dalam_satuan_kredit_semester_sks) || 0) +
                (parseFloat(item.pkm_ekuivalen_waktu_mengajar_penuh_ewmp_pada_saat_ts_dalam_satuan_kredit_semester_sks) || 0) +
                (parseFloat(item.tugas_tambahan_dan_atau_penunjang_ekuivalen_waktu_mengajar_penuh_ewmp_pada_saat_ts_dalam_satuan_kredit_semester_sks) || 0);
    
            // Cek apakah semua komponen EWMP kosong
            const allZero = totalSKS === 0;
    
            // Set jumlah_per_tahun_sks dan jumlah_per_semester_sks
            if (item.dtps === "V" && !allZero) {
                item.jumlah_per_tahun_sks = totalSKS;
                item.jumlah_per_semester_sks = totalSKS / 2;
            } else {
                item.jumlah_per_tahun_sks = "";
                item.jumlah_per_semester_sks = "";
            }
    
            // Validasi apakah jumlah_per_tahun_sks dan jumlah_per_semester_sks sesuai
            if (item.dtps === "V" && !allZero) {
                const tolerance = 0.0001;
                if (Math.abs(item.jumlah_per_semester_sks * 2 - item.jumlah_per_tahun_sks) > tolerance) {
                    errors.push(`Row ${index + 1}: Jumlah per tahun SKS dan jumlah per semester SKS tidak konsisten`);
                }
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

export default EkuivalenWaktuMengajarPenuhDosen;