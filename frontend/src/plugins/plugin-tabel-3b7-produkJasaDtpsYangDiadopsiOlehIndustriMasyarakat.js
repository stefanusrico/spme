import { createPluginHandler } from "./core-plugin";
import { fetchScoreDetails } from "../utils/fetchScoreDetail"
import { cekStrata } from "./checkStrata";

//vokasi
const ProdukJasaDtpsYangDiadopsiOlehIndustriMasyarakat = createPluginHandler({
    info: {
        code: "3b7",
        name: "Produk/Jasa DTPS yang Diadopsi oleh Industri/Masyarakat",
        Description: "Plugin for processing Produk/Jasa DTPS yang Diadopsi oleh Industri/Masyarakat",
    },

    fieldMapping: {
        nama_dosen: 1,
        nama_produk_jasa: 2,
        deskripsi_produk_jasa: 3,
        bukti: 4
    },

    validationRules: [
        { field: "nama_dosen", message: "Nama Dosen harus diisi" },
        { field: "nama_produk_jasa", message: "Nama produk/jasa harus diisi" },
        { field: "deskripsi_produk_jasa", message: "Deskripsi produk/jasa harus diisi" },
    ],

    scoreCalculator: async function (data, config) {
        //NAPJ = Jumlah produk/jasa yang diadopsi oleh industri/masyarakat dalam 3 tahun terakhir.
        let NAPJ = 0

        //Cek strata
        const strata = cekStrata()
        const butir = strata === "D-3" ? 28 : 30

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
            if(
                isValidField(item.nama_dosen) &&
                isValidField(item.nama_produk_jasa) &&
                isValidField(item.deskripsi_produk_jasa) &&
                isValidField(item.bukti)
            ){
                NAPJ += 1
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
                    NAPJ,
                    RS: 0
                }
            };
        }

        //Menghitung RS
        RS = Math.round((NAPJ/NDTPS) * 100) / 100
        
        //Menghitung score
        let score = 0
        if(RS >= 1){
            score = 4
        } else if(RS < 1){
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
                NAPJ, RS
            }
        }
    },
});

export default ProdukJasaDtpsYangDiadopsiOlehIndustriMasyarakat;
