import { createPluginHandler } from "./core-plugin";
import { fetchScoreDetails } from "../utils/fetchScoreDetail"
import { cekStrata } from "./checkStrata";

//vokasi
const LuaranPenelitianPkmLainnyaHKIHakCiptaDesainProdukIndustriDll = createPluginHandler({
    info: {
        code: "3b8-2",
        name: "Luaran Penelitian/PkM Lainnya - HKI (Hak Cipta, Desain Produk Industri, dll.)",
        Description: "Plugin for processing Luaran Penelitian/PkM Lainnya - HKI (Hak Cipta, Desain Produk Industri, dll.)",
    },

    fieldMapping: {
        judul_luaran_penelitian_dan_pkm: 1,
        tanggal_hh_bb_tttt: 2,
        keterangan_nomor_sertifikat: 3,
    },

    validationRules: [
        { field: "judul_luaran_penelitian_dan_pkm", message: "Judul Luaran Penelitian dan PkM harus diisi" },
        { field: "tanggal_hh_bb_tttt", message: "Tanggal (HH/BB/TTTT) harus diisi" },
        { field: "keterangan_nomor_sertifikat", message: "Keterangan Nomor Sertifikat harus diisi" },
    ],

    scoreCalculator: async function (data, config) {
        // NA = Jumlah luaran penelitian/PkM yang mendapat pengakuan HKI (Paten, Paten Sederhana) 
        // NB = Jumlah luaran penelitian/PkM yang mendapat pengakuan HKI (Hak Cipta, Desain Produk Industri, Perlindungan Varietas Tanaman, Desain Tata Letak Sirkuit Terpadu, dll.) 
        // NC = Jumlah luaran penelitian/PkM dalam bentuk Teknologi Tepat Guna, Produk (Produk Terstandarisasi, Produk Tersertifikasi), Karya Seni, Rekayasa Sosial. 
        // ND = Jumlah luaran penelitian/PkM yang diterbitkan dalam bentuk Buku ber-ISBN, Book Chapter.
        let NB = 0

        //Cek strata
        const strata = cekStrata()
        const butir = strata === "D-3" ? 29 : 31

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
                isValidField(item.keterangan_nomor_sertifikat) 
            ){
                NB += 1
            }
        });
            
        return {
            scores: [
                {
                    butir : butir,
                    nilai : "Score ada di 3b8-4"
                }
            ],
            scoreDetail : {
                NB
            }
        }
    },
});

export default LuaranPenelitianPkmLainnyaHKIHakCiptaDesainProdukIndustriDll;
