/**
 * Plugin khusus untuk section produk / jasa yang dihasilkan mahasiswa yang diadopsi oleh industri / masyarakat
 */
import { processExcelDataBase } from "../utils/tableUtils"

const DosenPembimbingTugasAkhir = {
    getInfo() {
        return {
            code : "3a2",
            name : "Dosen Pembimbing Tugas Akhir",
            Description : "Plugin for processing final project supervisor",
        }
    },

    configureSection(config) {
        return {
            ...config,
            isDosenPembimbingTugasAkhir : true,
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
                nama_dosen_2: "",
                ts_2_pada_ps_yang_diakreditasi_3_jumlah_mahasiswa_yang_dibimbing : 0,
                ts_1_pada_ps_yang_diakreditasi_3_jumlah_mahasiswa_yang_dibimbing : 0,
                ts_pada_ps_yang_diakreditasi_3_jumlah_mahasiswa_yang_dibimbing : 0,
                rata_rata_pada_ps_yang_diakreditasi_3_jumlah_mahasiswa_yang_dibimbing : 0,

                ts_2_pada_ps_lain_di_pt_4_jumlah_mahasiswa_yang_dibimbing : 0,
                ts_1_pada_ps_lain_di_pt_4_jumlah_mahasiswa_yang_dibimbing : 0,
                ts_pada_ps_lain_di_pt_4_jumlah_mahasiswa_yang_dibimbing : 0,
                rata_rata_pada_ps_lain_di_pt_4_jumlah_mahasiswa_yang_dibimbing : 0,
                
                rata_rata_jumlah_bimbingan_di_semua_program_semester_5: 0,
                ts_2_nomor_sk_penugasan_pembimbing: "",
                ts_1_nomor_sk_penugasan_pembimbing: "",
                ts_nomor_sk_penugasan_pembimbing: "",
            }

            Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
                if(colIndex === undefined || colIndex < 0) return
                
                const value = row[colIndex]

                if(fieldName === "no" || fieldName === "nama_dosen_2"){
                    item[fieldName] = value !== undefined && value !== null ? String(value).trim() : ""
                } else if(
                    [
                        "ts_2_pada_ps_yang_diakreditasi_3_jumlah_mahasiswa_yang_dibimbing",
                        "ts_1_pada_ps_yang_diakreditasi_3_jumlah_mahasiswa_yang_dibimbing",
                        "ts_pada_ps_yang_diakreditasi_3_jumlah_mahasiswa_yang_dibimbing",
                        "rata_rata_pada_ps_yang_diakreditasi_3_jumlah_mahasiswa_yang_dibimbing",
                        "ts_2_pada_ps_lain_di_pt_4_jumlah_mahasiswa_yang_dibimbing",
                        "ts_1_pada_ps_lain_di_pt_4_jumlah_mahasiswa_yang_dibimbing",
                        "ts_pada_ps_lain_di_pt_4_jumlah_mahasiswa_yang_dibimbing",
                        "rata_rata_pada_ps_lain_di_pt_4_jumlah_mahasiswa_yang_dibimbing",
                        "rata_rata_jumlah_bimbingan_di_semua_program_semester_5",
                    ].includes(fieldName)
                ){
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

    calculateScore(data, config, additionalData = {}) {
        // RDPU = Rata-rata jumlah bimbingan sebagai pembimbing utama di seluruh program/ semester. 
        let RDPU = 0
        let index = 0
        let totalAverageFinalProjectSupervisor = 0

        // Fungsi pengecekan isi field
        data.forEach((item) => {
            if (
                item.rata_rata_jumlah_bimbingan_di_semua_program_semester_5 !== null && 
                item.rata_rata_jumlah_bimbingan_di_semua_program_semester_5 !== undefined && 
                item.rata_rata_jumlah_bimbingan_di_semua_program_semester_5 !== ''
            ){
                index += 1
                totalAverageFinalProjectSupervisor += item.rata_rata_jumlah_bimbingan_di_semua_program_semester_5
            }
        })

        RDPU = index > 0 ? totalAverageFinalProjectSupervisor / index : 0;

        // Hitung skor
        let score = 0;
        if (RDPU <= 6) {
            score = 4;
        } else if (RDPU > 6 && RDPU <= 10 ) {
            score = 7*(RDPU/2);
        }

        // Logging untuk debugging
        console.log('Hasil RDPU :', RDPU);
        console.log('Score : ', score)

        return {
            scores: [
                {
                    butir : 20,
                    nilai : score
                }
            ],
            scoreDetail : {
                RDPU
            }
        }
    },

    normalizeData(data) {
        return data.map((item) => {
            const result = { ...item }

            const numericFields = [
                "ts_2_pada_ps_yang_diakreditasi_3_jumlah_mahasiswa_yang_dibimbing",
                "ts_1_pada_ps_yang_diakreditasi_3_jumlah_mahasiswa_yang_dibimbing",
                "ts_pada_ps_yang_diakreditasi_3_jumlah_mahasiswa_yang_dibimbing",
                "rata_rata_pada_ps_yang_diakreditasi_3_jumlah_mahasiswa_yang_dibimbing",
                "ts_2_pada_ps_lain_di_pt_4_jumlah_mahasiswa_yang_dibimbing",
                "ts_1_pada_ps_lain_di_pt_4_jumlah_mahasiswa_yang_dibimbing",
                "ts_pada_ps_lain_di_pt_4_jumlah_mahasiswa_yang_dibimbing",
                "rata_rata_pada_ps_lain_di_pt_4_jumlah_mahasiswa_yang_dibimbing",
                "rata_rata_jumlah_bimbingan_di_semua_program_semester_5",
            ]

            const textFields = [
                "nama_dosen_2",
                "ts_2_nomor_sk_penugasan_pembimbing",
                "ts_1_nomor_sk_penugasan_pembimbing",
                "ts_nomor_sk_penugasan_pembimbing"
            ]

            textFields.forEach((field) => {
                if (result[field] === undefined || result[field] === null) {
                    result[field] = ""
                } else if (typeof result[field] === "object") {
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
        const errors = []
    
        data.forEach((item, index) => {
            // Daftar field wajib isi
            const requiredFields = [
                { field: item.nama_dosen_2, message: `Row ${index + 1}: Nama dosen harus diisi` },
                { field: item.ts_2_nomor_sk_penugasan_pembimbing, message: `Row ${index + 1}: Nomor SK TS-2 harus diisi` },
                { field: item.ts_1_nomor_sk_penugasan_pembimbing, message: `Row ${index + 1}: Nomor SK TS-1 harus diisi` },
                { field: item.ts_nomor_sk_penugasan_pembimbing, message: `Row ${index + 1}: Nomor SK TS harus diisi` },
            ];
    
            // Cek field wajib isi
            requiredFields.forEach(({ field, message }) => {
                if (!field) errors.push(message);
            });
    
            // Helper untuk cek jumlah mahasiswa dibimbing
            const validateJumlahMahasiswa = (rataRata, ts2, ts1, ts) => {
                const tolerance = 0.0001;
                const total = parseFloat(ts2 || 0) + parseFloat(ts1 || 0) + parseFloat(ts || 0);
                return Math.abs(parseFloat(rataRata || 0) - total) <= tolerance;
            };
    
            // Validasi PS yang diakreditasi
            if (!validateJumlahMahasiswa(
                item.rata_rata_pada_ps_yang_diakreditasi_3_jumlah_mahasiswa_yang_dibimbing,
                item.ts_2_pada_ps_yang_diakreditasi_3_jumlah_mahasiswa_yang_dibimbing,
                item.ts_1_pada_ps_yang_diakreditasi_3_jumlah_mahasiswa_yang_dibimbing,
                item.ts_pada_ps_yang_diakreditasi_3_jumlah_mahasiswa_yang_dibimbing
            )) {
                errors.push(`Row ${index + 1}: Data TS-2, TS-1, TS pada jumlah mahasiswa yang dibimbing pada PS yang diakreditasi tidak sama dengan rata-ratanya`);
            }
    
            // Validasi PS lain di PT
            if (!validateJumlahMahasiswa(
                item.rata_rata_pada_ps_lain_di_pt_4_jumlah_mahasiswa_yang_dibimbing,
                item.ts_2_pada_ps_lain_di_pt_4_jumlah_mahasiswa_yang_dibimbing,
                item.ts_1_pada_ps_lain_di_pt_4_jumlah_mahasiswa_yang_dibimbing,
                item.ts_pada_ps_lain_di_pt_4_jumlah_mahasiswa_yang_dibimbing
            )) {
                errors.push(`Row ${index + 1}: Data TS-2, TS-1, TS pada jumlah mahasiswa yang dibimbing pada PS Lain di PT tidak sama dengan rata-ratanya`);
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

export default DosenPembimbingTugasAkhir;