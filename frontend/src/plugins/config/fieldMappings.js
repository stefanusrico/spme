import { PluginUtils } from "../utils/PluginUtils.js"

export const dosenTetapFieldMapping = {
  nama_dosen: {
    type: "text",
    required: true,
  },
  nidn_nidk: {
    type: "text",
    required: true,
    pattern: /^\d+$/,
  },
  jabatan_akademik: {
    type: "text",
    required: true,
  },
  magister_magister_terapan_nama_prodi_pasca_sarjana_1: {
    type: "text",
  },
  doktor_doktor_terapan_nama_prodi_pasca_sarjana_1: {
    type: "text",
  },
  bidang_keahlian_2: {
    type: "text",
  },
  kesesuaian_dengan_kompetensi_inti_ps_3: {
    type: "boolean",
    processor: PluginUtils.parseBoolean,
  },
  nomor_sertifikat_pendidik_profesional_4: {
    type: "text",
  },
  bidang_sertifikasi_sertifikat_kompetensi_profesi_industri_5: {
    type: "text",
  },
  lembaga_penerbit_sertifikat_kompetensi_profesi_industri_5: {
    type: "text",
  },
  mata_kuliah_yang_diampu_pada_ps_yang_diakreditasi_6: {
    type: "text",
    required: true,
  },
  kesesuaian_bidang_keahlian_dengan_mata_kuliah_yang_diampu_7: {
    type: "boolean",
    processor: PluginUtils.parseBoolean,
  },
  mata_kuliah_yang_diampu_pada_ps_lain_8: {
    type: "text",
  },
  sertifikat_pendidik_profesional: {
    type: "boolean",
    processor: PluginUtils.parseBoolean,
  },
  sertifikat_kompetensi: {
    type: "boolean",
    processor: PluginUtils.parseBoolean,
  },
}
