import { createPluginHandler } from "./core-plugin";
import { fetchScoreDetails } from "../utils/fetchScoreDetail"

//vokasi
const LuaranPenelitianPkmLainnyaTeknologiTepatGunaProduk = createPluginHandler({
    info: {
        code: "3b8-3",
        name: "Luaran Penelitian/PkM Lainnya - Teknologi Tepat Guna, Produk",
        Description: "Plugin for processing Luaran Penelitian/PkM Lainnya - Teknologi Tepat Guna, Produk",
    },

    fieldMapping: {
        judul_luaran_penelitian_dan_pkm: 1,
        tanggal_hh_bb_tttt: 2,
        status_tingkat_kesiapan_teknologi: 3,
        nomor_sertifikat_tkt: 4
    },

    validationRules: [
        { field: "judul_luaran_penelitian_dan_pkm", message: "Judul Luaran Penelitian dan PkM harus diisi" },
        { field: "tanggal_hh_bb_tttt", message: "Tanggal (HH/BB/TTTT) harus diisi" },
        { field: "status_tingkat_kesiapan_teknologi", message: "Status Tingkat Kesiapan Teknologi harus diisi" },
        { field: "nomor_sertifikat_tkt", message: "Nomor Sertifikat TKT harus diisi" },
    ],

    scoreCalculator: async function (data, config) {
        // NA = Jumlah luaran penelitian/PkM yang mendapat pengakuan HKI (Paten, Paten Sederhana) 
        // NB = Jumlah luaran penelitian/PkM yang mendapat pengakuan HKI (Hak Cipta, Desain Produk Industri, Perlindungan Varietas Tanaman, Desain Tata Letak Sirkuit Terpadu, dll.) 
        // NC = Jumlah luaran penelitian/PkM dalam bentuk Teknologi Tepat Guna, Produk (Produk Terstandarisasi, Produk Tersertifikasi), Karya Seni, Rekayasa Sosial. 
        // ND = Jumlah luaran penelitian/PkM yang diterbitkan dalam bentuk Buku ber-ISBN, Book Chapter.
        let NC = 0

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
                isValidField(item.status_tingkat_kesiapan_teknologi) &&
                isValidField(item.nomor_sertifikat_tkt)
            ){
                NC += 1
            }
        });
            
        return {
            scores: [
                {
                    butir : 29,
                    nilai : score
                }
            ],
            scoreDetail : {
                NC
            }
        }
    },
});

export default LuaranPenelitianPkmLainnyaTeknologiTepatGunaProduk;
