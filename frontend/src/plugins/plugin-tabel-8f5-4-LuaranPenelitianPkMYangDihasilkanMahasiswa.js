import { createPluginHandler } from "./core-plugin";
import { fetchScoreDetails } from "../utils/fetchScoreDetail"

//vokasi
const LuaranPenelitianPkmYangDihasilkanMahasiswaBukuBerIsbnBookChapter = createPluginHandler({
    info: {
        code: "8f5-4",
        name: "Luaran Penelitian/PkM Lainnya - Buku Ber-ISBN, Book Chapter",
        Description: "Plugin for processing Luaran Penelitian/PkM Lainnya - Buku Ber-ISBN, Book Chapter",
    },

    fieldMapping: {
        luaran_penelitian_dan_pkm: 1,
        tanggal_hh_bb_tttt: 2,
        nomor_isbn: 3,
    },

    validationRules: [
        { field: "judul_luaran_penelitian_dan_pkm", message: "Judul Luaran Penelitian dan PkM harus diisi" },
        { field: "tanggal_hh_bb_tttt", message: "Tanggal (HH/BB/TTTT) harus diisi" },
        { field: "nomor_isbn", message: "Keterangan (Nomor ISBN) harus diisi" },
    ],

    scoreCalculator: async function (data, config) {
        // NA = Jumlah luaran penelitian/PkM yang mendapat pengakuan HKI (Paten, Paten Sederhana) 
        // NB = Jumlah luaran penelitian/PkM yang mendapat pengakuan HKI (Hak Cipta, Desain Produk Industri, Perlindungan Varietas Tanaman, Desain Tata Letak Sirkuit Terpadu, dll.) 
        // NC = Jumlah luaran penelitian/PkM dalam bentuk Teknologi Tepat Guna, Produk (Produk Terstandarisasi, Produk Tersertifikasi), Karya Seni, Rekayasa Sosial. 
        // ND = Jumlah luaran penelitian/PkM yang diterbitkan dalam bentuk Buku ber-ISBN, Book Chapter.
        let ND = 0

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
                isValidField(item.judul_luaran_penelitian_dan_pkm) &&
                isValidField(item.tanggal_hh_bb_tttt) &&
                isValidField(item.nomor_isbn) 
            ){
                ND += 1
            }
        });
        const responseScoreDetail1 = await fetchScoreDetails("8f5-1")
        const responseScoreDetail2= await fetchScoreDetails("8f5-2")
        const responseScoreDetail3 = await fetchScoreDetails("8f5-3")
        if (!responseScoreDetail1 || !responseScoreDetail1 || !responseScoreDetail1) {
            console.warn('Masukan data dari tabel 8f5-1, 8f5-2, dan 8f5-3');
            return {
                scores: [
                    {
                        butir: 71,
                        nilai: 0 
                    }
                ],
                scoreDetail: {}
            };
        }
        const NA = Number(responseScoreDetail1?.NA || 0)
        const NB = Number(responseScoreDetail2?.NB || 0)
        const NC = Number(responseScoreDetail3?.NC || 0)

        //Menghitung NLP
        const NLP = Math.round((2 * (NA + NB + NC) + ND) * 100 ) / 100

        let score = 0
        if(NLP >= 1){
            score = 4
        }else{
            score = 2 + (2 * RLP)
        }
        return {
            scores: [
                {
                    butir : 71,
                    nilai : score
                }
            ],
            scoreDetail : {
                NA,NB,NC,ND,NLP
            }
        }
    },
});

export default LuaranPenelitianPkmYangDihasilkanMahasiswaBukuBerIsbnBookChapter;
