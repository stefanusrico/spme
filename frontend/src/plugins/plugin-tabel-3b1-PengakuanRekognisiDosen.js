import { createPluginHandler } from "./core-plugin";
import { fetchScoreDetails } from "../utils/fetchScoreDetail"
import { cekStrata } from "./checkStrata";

const PengakuanRekognisiDtpsPlugins = createPluginHandler({
    info: {
        code: "3b1",
        name: "Pengakuan/Rekognisi DTPS",
        Description: "Plugin for processing rekognisi",
    },

    fieldMapping: {
        nama_dosen: 0,
        bidang_keahlian: 1,
        rekognisi_rekognisi_dan_bukti_pendukung: 2,
        bukti_pendukung_rekognisi_dan_bukti_pendukung: 3,
        tingkat_wilayah: 4,
        tingkat_nasional: 5,
        tingkat_interna_sional: 6,
        tahun_yyyy: 7,
    },

    validationRules: [
        { field: "nama_dosen", message: "Nama dosen harus diisi" },
        { field: "bidang_keahlian", message: "Bidang keahlian harus diisi" },
        { field: "rekognisi_rekognisi_dan_bukti_pendukung", message: "Rekognisi harus diisi" },
        { field: "bukti_pendukung_rekognisi_dan_bukti_pendukung", message: "Bukti pendukung harus diisi" },
        { field: "tahun_yyyy", message: "Tahun harus diisi" },
    ],

    scoreCalculator: async function (data, config) {
        let NRD = 0;
        data.forEach((item) => {
            if (item.nama_dosen?.trim() && item.rekognisi_rekognisi_dan_bukti_pendukung?.trim()) {
                NRD++;
            }
        });

        //Cek strata
        const strata = cekStrata()
        const butir = strata === "D-3" ? 24 : 25

        const response = await fetchScoreDetails("3a1");
        const NDTPS = response?.NDTPS || 0;
        const RRD = NDTPS ? NRD / NDTPS : 0;

        let score = 0;
        if(strata === "D-3"){
            score = RRD >= 0.25 ? 4 : 2 + (8 * RRD)
        }else{
            score = RRD >= 0.5 ? 4 : 2 + (4 * RRD)
        }
        
        score = Math.round(score * 100) / 100;

        return {
            scores: [
                { 
                    butir: butir, 
                    nilai: score 
                }
            ],
            scoreDetail: { RRD, NRD, NDTPS }
        };
    },
});

export default PengakuanRekognisiDtpsPlugins;
