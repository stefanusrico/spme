import { createPluginHandler } from "./core-plugin";
import { fetchScoreDetails } from "../utils/fetchScoreDetail"

const PagelaranPameranPresentasiPublikasiIlmiahDTPSPlugin = createPluginHandler({
    info: {
        code: "3b5",
        name: "Pagelaran/Pameran/Presentasi/Publikasi Ilmiah DTPS",
        Description: "Plugin for processing Pagelaran/Pameran/Presentasi/Publikasi Ilmiah DTPS",
    },

    fieldMapping: {
        jenis_publikasi: 1,
        ts_2_jumlah_judul: 2,
        ts_1_jumlah_judul: 3,
        ts_jumlah_judul: 4,
        jumlah: 5,
    },

    validationRules: [
        { field: "jenis_publikasi", message: "Jenis Publikasi harus diisi" },
        { field: "ts_2_jumlah_judul", message: "TS-2 Jumlah Judul harus diisi" },
        { field: "ts_1_jumlah_judul", message: "TS-1 Jumlah Judul harus diisi" },
        { field: "ts_jumlah_judul", message: "TS Jumlah Judul harus diisi" },
    ],

    scoreCalculator: async function (data, config) {
        //NA1 = Jumlah publikasi di jurnal nasional tidak terakreditasi.
        //NA2 = Jumlah publikasi di jurnal nasional terakreditasi.
        //NA3 = Jumlah publikasi di jurnal internasional.
        //NA4 = Jumlah publikasi di jurnal internasional bereputasi.
        
        
        //NB1 = Jumlah publikasi di seminar wilayah/lokal/PT.
        //NB2 = Jumlah publikasi di seminar nasional.
        //NB3 = Jumlah publikasi di seminar internasional.


        //NC1 = Jumlah pagelaran/pameran/presentasi di media massa wilayah.
        //NC2  = Jumlah pagelaran/pameran/presentasi di media massa nasional.
        //NC3 = Jumlah pagelaran/pameran/presentasi di media massa internasional.

        let NA1 = 0, NA2 = 0, NA3 = 0, NA4 = 0, NB1 = 0, NB2 = 0, NB3 = 0, NC1 = 0, NC2 = 0, NC3 = 0;

        //Mendapatkan nilai NI, NN, dan NL
        data.forEach(item => {
            const ts2 = typeof item.ts_2_jumlah_judul === 'number' ? item.ts_2_jumlah_judul : Number(item.ts_2_jumlah_judul) || 0;
            const ts1 = typeof item.ts_1_jumlah_judul === 'number' ? item.ts_1_jumlah_judul : Number(item.ts_1_jumlah_judul) || 0;
            const ts = typeof item.ts_jumlah_judul === 'number' ? item.ts_jumlah_judul : Number(item.ts_jumlah_judul) || 0;
        
            const jumlah = ts2 + ts1 + ts;
        
            const judul = typeof item.jenis_publikasi === 'string' ? item.jenis_publikasi.toLowerCase() : "";
        
            if (judul.includes("internasional bereputasi")) {
                NA4 += jumlah;
            } else if (judul.includes("jurnal penelitian internasional")) {
                NA3 += jumlah;
            } else if (judul.includes("jurnal penelitian nasional terakreditasi")) {
                NA2 += jumlah;
            } else if (judul.includes("jurnal penelitian nasional tidak terakreditasi")) {
                NA1 += jumlah;
            } else if (judul.includes("seminar internasional")) {
                NB3 += jumlah;
            } else if (judul.includes("seminar nasional")) {
                NB2 += jumlah;
            } else if (judul.includes("seminar wilayah")) {
                NB1 += jumlah;
            } else if (judul.includes("forum di tingkat internasional")) {
                NC3 += jumlah;
            } else if (judul.includes("forum di tingkat nasional")) {
                NC2 += jumlah;
            } else if (judul.includes("forum di tingkat wilayah")) {
                NC1 += jumlah;
            }         
        });

        //Mendapatkan nilai NDTPS
        const responseScoreDetail = await fetchScoreDetails("3a1")
        if (!responseScoreDetail) {
            console.warn('fetchScoreDetails("3a1") did not return any data');
            return {
                scores: [
                    {
                        butir: 27,
                        nilai: 0 
                    }
                ],
                scoreDetail: {}
            };
        }
        let NDTPS = Number(responseScoreDetail?.NDTPS || 0)

        if (NDTPS === 0) {
            return {
                scores: [
                    {
                        butir: 27,
                        nilai: 0
                    }
                ],
                scoreDetail: {
                    NAS,
                    RS: 0
                }
            };
        }

        //Mendapatkan nilai rw, RI, RN, 
        let RW = Math.round(((NA1 + NB1 + NC1) / NDTPS) * 100) / 100
        let RN = Math.round(((NA2 + NA3 + NB2 + NC2) / NDTPS) * 100) / 100
        let RI = Math.round(((NA4 + NB3 + NC3) / NDTPS) * 100) / 100

        //Dengan Faktor: 
        const a = 0.05  
        const b = 0.3 
        const c = 1 

        //Mendapatkan nilai A, B, dan C 
        let A = Math.round((RI / a) * 100) / 100
        let B = Math.round((RN / b) * 100) / 100
        let C = Math.round((RW / c) * 100) / 100

        //Menghitung score
        let score = 0
        if(RI >= a && RN >= b){
            score = 4
        } else if((RI > 0 && RI < a) || (RN > 0 && RN < b) || (RW > 0 && RW <= c)){
            score = 4 * ((A+B+(C/2))-(A*B)-((A*C)/2)-((B*C)/2)+((A*B*C)/2))  
        }

        score = score > 4 ? 4 : score;
        score = Math.round(score * 100) / 100;
            
        return {
            scores: [
                {
                    butir : 27,
                    nilai : score
                }
            ],
            scoreDetail : {
                NA1,NA2,NA3,NA4,
                NB1,NB2,NB3,
                NC1,NC2,NC3,
                RI, RN, RW
            }
        }
    },
});

export default PagelaranPameranPresentasiPublikasiIlmiahDTPSPlugin;
