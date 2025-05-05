import { createPluginHandler } from "./core-plugin";
import { fetchScoreDetails } from "../utils/fetchScoreDetail"

//vokasi
const LuaranPenelitianPkmLainnyaHKIPatenPatenSederhana = createPluginHandler({
    info: {
        code: "3b8-1",
        name: "Luaran Penelitian/PkM Lainnya - HKI (Paten, Paten Sederhana)",
        Description: "Plugin for processing Luaran Penelitian/PkM Lainnya - HKI (Paten, Paten Sederhana)",
    },

    fieldMapping: {
        judul_luaran_penelitian_dan_pkm: 1,
        tanggal_hh_bb_tttt: 2,
        nomor_paten_granted: 3,
    },

    validationRules: [
        { field: "judul_luaran_penelitian_dan_pkm", message: "Judul Luaran Penelitian dan PkM harus diisi" },
        { field: "tanggal_hh_bb_tttt", message: "Tanggal (HH/BB/TTTT) harus diisi" },
        { field: "nomor_paten_granted", message: "Nomor Paten (Granted) harus diisi" },
    ],

    scoreCalculator: async function (data, config) {
        // NA = Jumlah luaran penelitian/PkM yang mendapat pengakuan HKI (Paten, Paten Sederhana) 
        // NB = Jumlah luaran penelitian/PkM yang mendapat pengakuan HKI (Hak Cipta, Desain Produk Industri, Perlindungan Varietas Tanaman, Desain Tata Letak Sirkuit Terpadu, dll.) 
        // NC = Jumlah luaran penelitian/PkM dalam bentuk Teknologi Tepat Guna, Produk (Produk Terstandarisasi, Produk Tersertifikasi), Karya Seni, Rekayasa Sosial. 
        // ND = Jumlah luaran penelitian/PkM yang diterbitkan dalam bentuk Buku ber-ISBN, Book Chapter.
        let NA = 0

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
                isValidField(item.nomor_paten_granted) 
            ){
                NA += 1
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
                NA
            }
        }
    },
});

export default LuaranPenelitianPkmLainnyaHKIPatenPatenSederhana;
