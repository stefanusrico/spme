import { createPluginHandler } from "./core-plugin";
import { fetchScoreDetails } from "../utils/fetchScoreDetail"
import { cekStrata } from "./checkStrata";

//Vokasi
const PkmDtpsYangMelibatkanMahasiswa = createPluginHandler({
    info: {
        code: "7",
        name: "PkM DTPS yang Melibatkan Mahasiswa",
        Description: "Plugin for processing PkM DTPS yang Melibatkan Mahasiswa",
    },

    fieldMapping: {
        nama_dosen: 1,
        tema_penelitian_sesuai_roadmap: 2,
        nama_mahasiswa: 3,
        judul_kegiatan_pkm_selain_kkn: 4,
        tahun_yyyy: 5
    },

    validationRules: [
        { field: "nama_dosen", message: "Nama Dosen harus diisi" },
        { field: "tema_pkm_sesuai_roadmap", message: "Tema Penelitian harus diisi" },
        { field: "nama_mahasiswa", message: "Nama mahasiswa harus diisi" },
        { field: "judul_kegiatan_pkm_selain_kkn", message: "Judul kegiatan harus diisi" },
        { field: "tahun_yyyy", message: "Tahun harus diisi" },
    ],

    scoreCalculator: async function (data, config) {
        // NPkMM = Jumlah judul PkM DTPS yang dalam pelaksanaannya melibatkan mahasiswa program studi dalam 3 tahun terakhir. 
        // NPkMD = Jumlah judul PkM DTPS dalam 3 tahun terakhir. 
        // PPkMDM = (NPkMM / NPkMD) x 100% 
        let NPkMM = 0
        const seen = new Set();
        const currentYear = new Date().getFullYear();
        // const currentYear = 2023

        //Cek strata
        const strata = cekStrata()
        const butir = strata === "D-3" ? 50 : 56

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
                isValidField(item.nama_mahasiswa) &&
                isValidField(item.judul_kegiatan_pkm_selain_kkn) &&
                isValidField(item.tahun_yyyy)
            ) {
                const year = parseInt(item.tahun_yyyy);
                const uniqueKey = [
                    item.nama_dosen,
                    item.tema_pkm_sesuai_roadmap,
                    item.nama_mahasiswa,
                    item.judul_kegiatan_pkm_selain_kkn,
                    item.tahun_yyyy
                ].join('|');

                if (!seen.has(uniqueKey)) {
                    seen.add(uniqueKey);

                    if (year >= currentYear - 2 && year <= currentYear) {
                        NPkMM += 1;
                    }
                }
            }
        });


        const responseScoreDetail = await fetchScoreDetails("3b3")
        
        if (!responseScoreDetail) {
            console.warn('Masukan data dari tabel 3b3');
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
        const NPkMD = Number(responseScoreDetail?.NI || 0) + Number(responseScoreDetail?.NN || 0) + Number(responseScoreDetail?.NL || 0)
        if (NPkMD === 0) {
            return {
                scores: [
                    {
                        butir: butir,
                        nilai: 0
                    }
                ],
                scoreDetail: {
                    NPkMM,
                    NPkMD,
                    PPkMDM : 0
                }
            };
        }

        //Menghitung PPDM
        const PPkMDM = Math.round((NPkMM/NPkMD) * 100 ) / 100

        let score = 0
        if(PPkMDM >= 0.25){
            score = 4
        }else{
            score = 2 + (8 * PPkMDM)
        }
        return {
            scores: [
                {
                    butir : butir,
                    nilai : score
                }
            ],
            scoreDetail : {
                NPkMM,
                NPkMD,
                PPkMDM
            }
        }
    },
});

export default PkmDtpsYangMelibatkanMahasiswa;
