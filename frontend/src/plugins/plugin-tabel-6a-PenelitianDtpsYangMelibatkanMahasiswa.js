import { createPluginHandler } from "./core-plugin";
import { fetchScoreDetails } from "../utils/fetchScoreDetail"

//STr
const PenelitianDtpsYangMelibatkanMahasiswa = createPluginHandler({
    info: {
        code: "6a",
        name: "Penelitian DTPS yang Melibatkan Mahasiswa",
        Description: "Plugin for processing Penelitian DTPS yang Melibatkan Mahasiswa",
    },

    fieldMapping: {
        nama_dosen: 1,
        tema_penelitian_sesuai_roadmap: 2,
        nama_mahasiswa: 3,
        judul_kegiatan: 4,
        tahun_yyyy: 5
    },

    validationRules: [
        { field: "nama_dosen", message: "Nama Dosen harus diisi" },
        { field: "tema_penelitian_sesuai_roadmap", message: "Tema Penelitian harus diisi" },
        { field: "nama_mahasiswa", message: "Nama mahasiswa harus diisi" },
        { field: "judul_kegiatan", message: "Judul kegiatan harus diisi" },
        { field: "tahun_yyyy", message: "Tahun harus diisi" },
    ],

    scoreCalculator: async function (data, config) {
        //NPM = Jumlah judul penelitian DTPS yang dalam pelaksanaannya melibatkan mahasiswa program studi dalam 3 tahun terakhir. 
        let NPM = 0
        const seen = new Set();
        const currentYear = new Date().getFullYear();
        // const currentYear = 2023

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
                isValidField(item.judul_kegiatan) &&
                isValidField(item.tahun_yyyy)
            ) {
                const year = parseInt(item.tahun_yyyy);
                const uniqueKey = [
                    item.nama_dosen,
                    item.tema_penelitian_sesuai_roadmap,
                    item.nama_mahasiswa,
                    item.judul_kegiatan,
                    item.tahun_yyyy
                ].join('|');

                if (!seen.has(uniqueKey)) {
                    seen.add(uniqueKey);

                    if (year >= currentYear - 2 && year <= currentYear) {
                        NPM += 1;
                    }
                }
            }
        });


        const responseScoreDetail = await fetchScoreDetails("3b2")
        
        if (!responseScoreDetail) {
            console.warn('Masukan data dari tabel 3b2');
            return {
                scores: [
                    {
                        butir: 54,
                        nilai: 0 
                    }
                ],
                scoreDetail: {}
            };
        }
        const NPD = Number(responseScoreDetail?.NI || 0) + Number(responseScoreDetail?.NN || 0) + Number(responseScoreDetail?.NL || 0)
        if (NPD === 0) {
            return {
                scores: [
                    {
                        butir: 54,
                        nilai: 0
                    }
                ],
                scoreDetail: {
                    NPM,
                    NPD,
                    PPDM : 0
                }
            };
        }

        //Menghitung PPDM
        const PPDM = Math.round((NPM/NPD) * 100 ) / 100

        let score = 0
        if(PPDM >= 0.25){
            score = 4
        }else{
            score = 2 + (8 * PPDM)
        }
        return {
            scores: [
                {
                    butir : 29,
                    nilai : score
                }
            ],
            scoreDetail : {
                NPM,
                NPD,
                PPDM
            }
        }
    },
});

export default PenelitianDtpsYangMelibatkanMahasiswa;
