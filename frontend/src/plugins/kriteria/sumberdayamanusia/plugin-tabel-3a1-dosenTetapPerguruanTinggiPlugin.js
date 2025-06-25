import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"

export class DosenTetapPerguruanTinggiPlugin extends BasePlugin {
  constructor() {
    super({
      code: "3a1",
      name: "Dosen Tetap Perguruan Tinggi Plugin",
      description: "Plugin for processing permanent university lecturer data",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isDosenTetapSection: true,
    }
  }

  hasDefaultData() {
    return true
  }

  getDefaultData(tableCode, config = {}) {
    return [
      {
        key: `default-dosen-${Date.now()}`,
        no: 1,
        selected: true,
        nama_dosen: "",
        nidn_nidk: "",
        jabatan_akademik: "",
        magister_magister_terapan_nama_prodi_pasca_sarjana_1: "",
        doktor_doktor_terapan_nama_prodi_pasca_sarjana_1: "",
        bidang_keahlian_2: "",
        kesesuaian_dengan_kompetensi_inti_ps_3: "",
        nomor_sertifikat_pendidik_profesional_4: "",
        bidang_sertifikasi_sertifikat_kompetensi_profesi_industri_5: "",
        lembaga_penerbit_sertifikat_kompetensi_profesi_industri_5: "",
        mata_kuliah_yang_diampu_pada_ps_yang_diakreditasi_6: "",
        kesesuaian_bidang_keahlian_dengan_mata_kuliah_yang_diampu_7: "",
        mata_kuliah_yang_diampu_pada_ps_lain_8: "",
        sertifikat_pendidik_profesional: "",
        sertifikat_kompetensi: "",
      },
    ]
  }

  // ✅ Override field type detection for boolean fields
  detectFieldType(fieldName, value) {
    const fieldLower = fieldName.toLowerCase()

    // Boolean patterns specific to dosen data
    if (
      fieldLower.includes("kesesuaian_dengan_kompetensi_inti_ps_3") ||
      fieldLower.includes(
        "kesesuaian_bidang_keahlian_dengan_mata_kuliah_yang_diampu_7"
      ) ||
      fieldLower.includes("sertifikat_pendidik_profesional") ||
      fieldLower.includes("sertifikat_kompetensi")
    ) {
      return "boolean_text" // Custom type for V/Tidak
    }

    // NIDN/NIDK should be text (even though numeric)
    if (fieldLower.includes("nidn") || fieldLower.includes("nidk")) {
      return "text"
    }

    return super.detectFieldType(fieldName, value)
  }

  // ✅ Override field value processing
  processFieldValue(fieldName, value, fieldType = "auto") {
    if (fieldType === "auto") {
      fieldType = this.detectFieldType(fieldName, value)
    }

    if (fieldType === "boolean_text") {
      const strVal = String(value || "")
        .toLowerCase()
        .trim()
      return ["yes", "ya", "ada", "v", "√", "✓", "1", "true"].includes(strVal)
        ? "V"
        : ["no", "tidak", "0", "false"].includes(strVal)
        ? "Tidak"
        : strVal
    }

    return super.processFieldValue(fieldName, value, fieldType)
  }

  // ✅ Use enhanced Excel processing from BasePlugin
  async processExcelData(workbook, tableCode, config, prodiName, sectionCode) {
    const result = await super.processExcelData(
      workbook,
      tableCode,
      config,
      prodiName,
      sectionCode
    )

    // ✅ Additional processing specific to dosen data
    if (result && result.allRows) {
      result.allRows = result.allRows.map((item) => {
        // Ensure specific field initialization
        const processedItem = {
          ...item,
          nama_dosen: item.nama_dosen || "",
          nidn_nidk: item.nidn_nidk || "",
          jabatan_akademik: item.jabatan_akademik || "",
          magister_magister_terapan_nama_prodi_pasca_sarjana_1:
            item.magister_magister_terapan_nama_prodi_pasca_sarjana_1 || "",
          doktor_doktor_terapan_nama_prodi_pasca_sarjana_1:
            item.doktor_doktor_terapan_nama_prodi_pasca_sarjana_1 || "",
          bidang_keahlian_2: item.bidang_keahlian_2 || "",
          kesesuaian_dengan_kompetensi_inti_ps_3:
            item.kesesuaian_dengan_kompetensi_inti_ps_3 || "",
          nomor_sertifikat_pendidik_profesional_4:
            item.nomor_sertifikat_pendidik_profesional_4 || "",
          bidang_sertifikasi_sertifikat_kompetensi_profesi_industri_5:
            item.bidang_sertifikasi_sertifikat_kompetensi_profesi_industri_5 ||
            "",
          lembaga_penerbit_sertifikat_kompetensi_profesi_industri_5:
            item.lembaga_penerbit_sertifikat_kompetensi_profesi_industri_5 ||
            "",
          mata_kuliah_yang_diampu_pada_ps_yang_diakreditasi_6:
            item.mata_kuliah_yang_diampu_pada_ps_yang_diakreditasi_6 || "",
          kesesuaian_bidang_keahlian_dengan_mata_kuliah_yang_diampu_7:
            item.kesesuaian_bidang_keahlian_dengan_mata_kuliah_yang_diampu_7 ||
            "",
          mata_kuliah_yang_diampu_pada_ps_lain_8:
            item.mata_kuliah_yang_diampu_pada_ps_lain_8 || "",
          sertifikat_pendidik_profesional:
            item.sertifikat_pendidik_profesional || "",
          sertifikat_kompetensi: item.sertifikat_kompetensi || "",
        }

        // Convert NIDN/NIDK to string if it's a number
        if (
          processedItem.nidn_nidk &&
          typeof processedItem.nidn_nidk === "number"
        ) {
          processedItem.nidn_nidk = String(processedItem.nidn_nidk)
        }

        return processedItem
      })
    }

    return result
  }

  // ✅ Enhanced normalization
  normalizeData(data) {
    const normalized = data.map((item, index) => {
      const result = {
        ...item,
        id: item.id || `row-${Math.random().toString(36).substring(2, 9)}`,
        key: item.key || `row-${Math.random().toString(36).substring(2, 9)}`,
        no: index + 1,
      }

      // Normalize text fields
      const textFields = [
        "nama_dosen",
        "nidn_nidk",
        "jabatan_akademik",
        "magister_magister_terapan_nama_prodi_pasca_sarjana_1",
        "doktor_doktor_terapan_nama_prodi_pasca_sarjana_1",
        "bidang_keahlian_2",
        "nomor_sertifikat_pendidik_profesional_4",
        "bidang_sertifikasi_sertifikat_kompetensi_profesi_industri_5",
        "lembaga_penerbit_sertifikat_kompetensi_profesi_industri_5",
        "mata_kuliah_yang_diampu_pada_ps_yang_diakreditasi_6",
        "mata_kuliah_yang_diampu_pada_ps_lain_8",
      ]

      textFields.forEach((field) => {
        result[field] = PluginUtils.normalizeTextField(result[field] || "")
      })

      // Normalize boolean text fields
      const booleanTextFields = [
        "kesesuaian_dengan_kompetensi_inti_ps_3",
        "kesesuaian_bidang_keahlian_dengan_mata_kuliah_yang_diampu_7",
        "sertifikat_pendidik_profesional",
        "sertifikat_kompetensi",
      ]

      booleanTextFields.forEach((field) => {
        result[field] = this.processFieldValue(
          field,
          result[field],
          "boolean_text"
        )
      })

      return result
    })

    return normalized
  }

  // ✅ Enhanced validation
  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      if (item.selected) {
        // Required fields validation
        if (!item.nama_dosen || item.nama_dosen.trim() === "") {
          errors.push(`Row ${index + 1}: Nama dosen harus diisi`)
        }

        if (
          !item.mata_kuliah_yang_diampu_pada_ps_yang_diakreditasi_6 ||
          item.mata_kuliah_yang_diampu_pada_ps_yang_diakreditasi_6.trim() === ""
        ) {
          errors.push(
            `Row ${
              index + 1
            }: Mata kuliah yang diampu pada PS yang diakreditasi harus diisi`
          )
        }

        // NIDN/NIDK format validation (if provided)
        if (item.nidn_nidk && item.nidn_nidk.trim() !== "") {
          const nidnPattern = /^\d{10}$/ // NIDN should be 10 digits
          const nidkPattern = /^\d+$/ // NIDK should be numeric

          if (
            !nidnPattern.test(item.nidn_nidk) &&
            !nidkPattern.test(item.nidn_nidk)
          ) {
            errors.push(
              `Row ${index + 1}: NIDN/NIDK harus berupa angka (NIDN: 10 digit)`
            )
          }
        }

        // Jabatan akademik validation
        const validJabatan = [
          "Asisten Ahli",
          "Lektor",
          "Lektor Kepala",
          "Profesor",
          "Tenaga Pengajar",
          "",
        ]

        if (
          item.jabatan_akademik &&
          !validJabatan.some(
            (j) => j.toLowerCase() === item.jabatan_akademik.toLowerCase()
          )
        ) {
          errors.push(
            `Row ${
              index + 1
            }: Jabatan akademik tidak valid. Valid: ${validJabatan
              .filter((j) => j)
              .join(", ")}`
          )
        }
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  // ✅ Enhanced data preparation for saving
  prepareDataForSaving(data) {
    return data.map((item, index) => {
      const preparedItem = {
        ...item,
        no: index + 1,
        _timestamp: new Date().getTime(),
        selected: item.selected !== false,
      }

      // Ensure all text fields are strings
      const allFields = [
        "nama_dosen",
        "nidn_nidk",
        "jabatan_akademik",
        "magister_magister_terapan_nama_prodi_pasca_sarjana_1",
        "doktor_doktor_terapan_nama_prodi_pasca_sarjana_1",
        "bidang_keahlian_2",
        "kesesuaian_dengan_kompetensi_inti_ps_3",
        "nomor_sertifikat_pendidik_profesional_4",
        "bidang_sertifikasi_sertifikat_kompetensi_profesi_industri_5",
        "lembaga_penerbit_sertifikat_kompetensi_profesi_industri_5",
        "mata_kuliah_yang_diampu_pada_ps_yang_diakreditasi_6",
        "kesesuaian_bidang_keahlian_dengan_mata_kuliah_yang_diampu_7",
        "mata_kuliah_yang_diampu_pada_ps_lain_8",
        "sertifikat_pendidik_profesional",
        "sertifikat_kompetensi",
      ]

      allFields.forEach((field) => {
        if (preparedItem[field] !== undefined && preparedItem[field] !== null) {
          preparedItem[field] = String(preparedItem[field])
        } else {
          preparedItem[field] = ""
        }
      })

      return preparedItem
    })
  }
}

export const dosenTetapPerguruanTinggiPlugin =
  new DosenTetapPerguruanTinggiPlugin()
export default dosenTetapPerguruanTinggiPlugin
