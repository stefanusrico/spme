import { createPluginHandler } from "./core-plugin";
import { fetchScoreDetails } from "../utils/fetchScoreDetail"

//STr
const LuaranPenelitianPkmYangDihasilkanMahasiswaHKIPatenPatenSederhana = createPluginHandler({
    info: {
        code: "8f5-1",
        name: "Luaran Penelitian/PkM yang Dihasilkan Mahasiswa - HKI (Paten, Paten Sederhana)",
        Description: "Plugin for processing Luaran Penelitian/PkM yang Dihasilkan Mahasiswa - HKI (Paten, Paten Sederhana)",
    },

    fieldMapping: {
        luaran_penelitian_dan_pkm: 1,
        tanggal_hh_bb_tttt: 2,
        status_registered_granted_komersial: 3,
        nomor_registrasi_paten: 4,
    },

    validationRules: [
        { field: "luaran_penelitian_dan_pkm", message: "Judul Luaran Penelitian dan PkM harus diisi" },
        { field: "tanggal_hh_bb_tttt", message: "Tanggal (HH/BB/TTTT) harus diisi" },
        { field: "status_registered_granted_komersial", message: "Status harus diisi" },
        { field: "nomor_registrasi_paten", message: "Nomor Registrasi/Paten harus diisi" },
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
                isValidField(item.luaran_penelitian_dan_pkm) &&
                isValidField(item.tanggal_hh_bb_tttt) &&
                isValidField(item.nomor_registrasi_paten) 
            ){
                NA += 1
            }
        });
            
        return {
            scores: [
                {
                    butir : 71,
                    nilai : "Score ada di 8f5-4"
                }
            ],
            scoreDetail : {
                NA
            }
        }
    },
});

export default LuaranPenelitianPkmYangDihasilkanMahasiswaHKIPatenPatenSederhana;
