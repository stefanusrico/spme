import { createPluginHandler } from "./core-plugin";
import { fetchScoreDetails } from "../utils/fetchScoreDetail"
import { cekStrata } from "./checkStrata";

//STr
const KaryaIlmiahDtpsYangDisitasi = createPluginHandler({
    info: {
        code: "3b6",
        name: "Karya Ilimiah DTPS yang Disitasi",
        Description: "Plugin for processing Karya Ilimiah DTPS yang Disitasi",
    },

    fieldMapping: {
        nama_dosen: 1,
        judul_artikel_yang_disitasi_jurnal_volume_tahun_nomor_halaman: 2,
        jumlah_sitasi: 3,
    },

    validationRules: [
        { field: "nama_dosen", message: "Nama Dosen harus diisi" },
        { field: "judul_artikel_yang_disitasi_jurnal_volume_tahun_nomor_halaman", message: "Judul Artikel yang Disitasi (Jurnal, Volume, Tahun, Nomor, Halaman) harus diisi" },
        { field: "jumlah_sitasi", message: "Jumlah sitasi harus diisi" },
    ],

    scoreCalculator: async function (data, config) {
        //NAS = jumlah artikel yang disitasi
        let NAS = 0

        //Cek strata
        const strata = cekStrata()
        const butir = strata === "D-3" ? 0 : 29

        const isValidField = (value) => {
            if (typeof value === 'string') {
                return value.trim() !== '';
            }
            if (typeof value === 'number') {
                return !isNaN(value);
            }
            return false;
        }
        data.forEach(item => {
            if (
                isValidField(item.nama_dosen) &&
                isValidField(item.judul_artikel_yang_disitasi_jurnal_volume_tahun_nomor_halaman) &&
                isValidField(item.jumlah_sitasi)
            ) {
                NAS += 1;
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

        let NDTPS = Number(responseScoreDetail?.NDTPS || 0)
        let RS = 0
        if (NDTPS === 0) {
            return {
                scores: [
                    {
                        butir: butir,
                        nilai: 0
                    }
                ],
                scoreDetail: {
                    NAS,
                    RS: 0
                }
            };
        }

        //Menghitung RS
        RS = Math.round((NAS/NDTPS) * 100) / 100
        
        //Menghitung score
        let score = 0
        if(RS >= 0.5){
            score = 4
        } else if(RS < 0.5){
            score = 2 + (2 * RS)
        }
            
        return {
            scores: [
                {
                    butir : butir,
                    nilai : score
                }
            ],
            scoreDetail : {
                NAS, RS
            }
        }
    },
});

export default KaryaIlmiahDtpsYangDisitasi;
