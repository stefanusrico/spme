import { createPluginHandler } from "./core-plugin";
import { fetchScoreDetails } from "../utils/fetchScoreDetail"

const PengabdianKepadaMasyarakatDtpsPlugin = createPluginHandler({
    info: {
        code: "3b3",
        name: "Pengabdian Kepada Masyarakat DTPS",
        Description: "Plugin for processing Pengabdian Kepada Masyarakat DTPS",
    },

    fieldMapping: {
        sumber_pembiayaan: 1,
        ts_2_jumlah_judul_pkm: 2,
        ts_1_jumlah_judul_pkm: 3,
        ts_jumlah_judul_pkm: 4,
        jumlah: 5,
    },

    validationRules: [
        { field: "ts_2_jumlah_judul_pkm", message: "TS-2 Jumlah Judul PkM harus diisi" },
        { field: "ts_1_jumlah_judul_pkm", message: "TS-1 Jumlah Judul PkM harus diisi" },
        { field: "ts_jumlah_judul_pkm", message: "TS Jumlah Judul PkM harus diisi" },
    ],

    scoreCalculator: async function (data, config) {
        //NI = Jumlah penelitian dengan sumber pembiayaan luar negeri dalam 3 tahun terakhir.
        //NN = Jumlah penelitian dengan sumber pembiayaan dalam negeri dalam 3 tahun terakhir.
        //NL = Jumlah penelitian dengan sumber pembiayaan PT/ mandiri dalam 3 tahun terakhir.

        let NL = 0, NN = 0, NI = 0;

        //Mendapatkan nilai NI, NN, dan NL
        data.forEach(item => {
            console.log("data jumlah judul pkm ts-2: ", item.ts_2_jumlah_judul_pkm)
            console.log("data jumlah judul pkm ts-1: ", item.ts_1_jumlah_judul_pkm)
            const jumlah = 
                Number(item.ts_2_jumlah_judul_pkm || 0) +
                Number(item.ts_1_jumlah_judul_pkm || 0) +
                Number(item.ts_jumlah_judul_pkm || 0);

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
                        butir: 26,
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

        score = score > 4 ? 4 : score;
        score = Math.round(score * 100) / 100;
            
        return {
            scores: [
                {
                    butir : 26,
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
});

export default PengabdianKepadaMasyarakatDtpsPlugin;
