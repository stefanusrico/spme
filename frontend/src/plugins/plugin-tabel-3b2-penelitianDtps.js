/**
 * Plugin khusus untuk section produk / jasa yang dihasilkan mahasiswa yang diadopsi oleh industri / masyarakat
 */
import { processExcelDataBase } from "../utils/tableUtils"
import { fetchScoreDetails } from "../utils/fetchScoreDetail"
import { cekStrata } from "./checkStrata"

const PenelitianDtps = {
    getInfo() {
        return {
            code : "3b2",
            name : "Penelitian DTPS",
            Description : "Plugin for processing ",
        }
    },

    configureSection(config) {
        return {
            ...config,
            isPenelitianDtps : true,
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
                sumber_pembiayaan: "",
                ts_2_jumlah_judul_penelitian: 0,
                ts_1_jumlah_judul_penelitian: 0,
                ts_jumlah_judul_penelitian: 0,
                jumlah: 0,
            }

            Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
                if(colIndex === undefined || colIndex < 0) return
                
                const value = row[colIndex]

                if(fieldName === "no" || fieldName === "sumber_pembiayaan"){
                    item[fieldName] = value !== undefined && value !== null ? String(value).trim() : ""
                } else {
                    const num = parseFloat(value)
                    item[fieldName] = !isNaN(num) ? Math.max(0, num) : 0
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
        //NI = Jumlah penelitian dengan sumber pembiayaan luar negeri dalam 3 tahun terakhir.
        //NN = Jumlah penelitian dengan sumber pembiayaan dalam negeri dalam 3 tahun terakhir.
        //NL = Jumlah penelitian dengan sumber pembiayaan PT/ mandiri dalam 3 tahun terakhir.

        let NL = 0, NN = 0, NI = 0;

        //Cek strata
        const strata = cekStrata()
        const butir = strata === "D-3" ? 25 : 26

        //Mendapatkan nilai NI, NN, dan NL
        data.forEach(item => {
            const jumlah = (item.ts_2_jumlah_judul_penelitian || 0)
                        + (item.ts_1_jumlah_judul_penelitian || 0)
                        + (item.ts_jumlah_judul_penelitian || 0);
            const sumber = item.sumber_pembiayaan.toLowerCase();

            if (sumber.includes("mandiri") || sumber.includes("perguruan tinggi")) {
                NL += jumlah;
            } else if (sumber.includes("luar negeri")) {
                NI += jumlah;
            } else {
                NN += jumlah;
            }
        });

        //Mendapatkan nilai NDTPS
        const responseScoreDetail = await fetchScoreDetails("3a1")
        if (!responseScoreDetail) {
            console.warn('fetchScoreDetails("3a1") did not return any data');
            return {
                scores: [
                    {
                        butir: butir,
                        nilai: 0 
                    }
                ],
                scoreDetail: {}
            };
        }
        let NDTPS = responseScoreDetail?.NDTPS || 0

        //Mendapatkan nilai RI, RN, dan RL
        let RI = Math.round((NI / 3 / NDTPS) * 100) / 100
        let RN = Math.round((NN / 3 / NDTPS) * 100) / 100
        let RL = Math.round((NL / 3 / NDTPS) * 100) / 100

        //Dengan Faktor: 
        const a = 0.05  
        const b = 0.3 
        const c = 1 

        //Mendapatkan nilai A, B, dan C 
        let A = Math.round((RI / a) * 100) / 100
        let B = Math.round((RN / b) * 100) / 100
        let C = Math.round((RL / c) * 100) / 100

        //Menghitung score
        let score = 0
        if(RI >= a && RN >= b){
            score = 4
        } else if((RI > 0 && RI < a) || (RN > 0 && RN < b) || (RL > 0 && RL <= c)){
            score = 4 * ((A+B+(C/2))-(A*B)-((A*C)/2)-((B*C)/2)+((A*B*C)/2))  
        }

        score = Math.round(score * 100) / 100;
            
        return {
            scores: [
                {
                    butir : butir,
                    nilai : score
                }
            ],
            scoreDetail : {
                NI,
                NL,
                NN,
                NDTPS,
                RI,
                RL, 
                RN,
                A,
                B,
                C,
                a,
                b,
                c
            }
        }
    },

    normalizeData(data) {
        return data.map((item) => {
            const result = { ...item };
    
            const textFields = ["sumber_pembiayaan"];
            const numericFields = [
                "ts_2_jumlah_judul_penelitian",
                "ts_1_jumlah_judul_penelitian",
                "ts_jumlah_judul_penelitian",
                "jumlah"
            ];
    
            // textFields.forEach((field) => {
            //     result[field] = typeof result[field] === "string" ? result[field].trim() : "";
            // });
    
            numericFields.forEach((field) => {
                const num = parseFloat(result[field]);
                result[field] = !isNaN(num) ? Math.max(0, num) : 0;
            });
    
            return result;
        });
    },       

    validateData(data) {
        const errors = [];
    
        data.forEach((item, index) => {
            if (!item.sumber_pembiayaan || String(item.sumber_pembiayaan).trim() === "") {
                errors.push(`Row ${index + 1}: Sumber pembiayaan harus diisi`);
            }
    
            const tahunFields = [
                { field: item.ts_2_jumlah_judul_penelitian, label: "TS-2" },
                { field: item.ts_1_jumlah_judul_penelitian, label: "TS-1" },
                { field: item.ts_jumlah_judul_penelitian, label: "TS" },
            ];
    
            tahunFields.forEach(({ field, label }) => {
                const num = parseFloat(field);
                if (isNaN(num) || num < 0) {
                    errors.push(`Row ${index + 1}: Nilai tahun ${label} harus berupa angka >= 0`);
                }
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

export default PenelitianDtps;