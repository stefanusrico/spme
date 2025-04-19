/**
 * Plugin khusus untuk section Dosen Tetap Perguruan Tinggi
 */
import { processExcelDataBase } from "../utils/tableUtils"

const DosenTetapPerguruanTinggiPlugin = {
  getInfo() {
    return {
      code: "3a1",
      name: "Dosen Tetap Perguruan Tinggi Plugin",
      description: "Plugin for processing permanent university lecturer data",
    }
  },

  configureSection(config) {
    return {
      ...config,
      isDosenTetapSection: true,
    }
  },

  async processExcelData(workbook, tableCode, config, prodiName, sectionCode) {
    const { rawData, detectedIndices, jsonData, headerRowIndex } =
      await processExcelDataBase(workbook, tableCode, config, prodiName)

    if (rawData.length === 0) return { allRows: [] }

    const filteredData = rawData.filter((row) => {
      if (!row || row.length === 0) return false

      const nonEmptyValues = row.filter(
        (val) => val !== undefined && val !== null && val !== ""
      )
      if (nonEmptyValues.length <= 1) return false

      const allNumbers = nonEmptyValues.every((val) => {
        return (
          typeof val === "number" ||
          (typeof val === "string" && !isNaN(val) && val.trim() !== "")
        )
      })
      if (allNumbers && nonEmptyValues.length > 0) return false

      const hasSummaryLabel = row.some((cell) => {
        if (typeof cell !== "string") return false
        const normalized = String(cell).toLowerCase().trim()
        return (
          normalized === "jumlah" ||
          normalized === "total" ||
          normalized === "sum" ||
          normalized === "rata-rata" ||
          normalized === "average"
        )
      })
      if (hasSummaryLabel) return false

      return true
    })

    const processedData = filteredData.map((row, index) => {
      const item = {
        key: `excel-${index + 1}-${Date.now()}`,
        no: index + 1,
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
      }

      Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
        if (colIndex === undefined || colIndex < 0) return

        const value = row[colIndex]

        if (fieldName === "no" || fieldName === "nidn_nidk") {
          item[fieldName] =
            value !== undefined && value !== null ? String(value).trim() : ""
        } else if (
          fieldName === "kesesuaian_dengan_kompetensi_inti_ps_3" ||
          fieldName ===
            "kesesuaian_bidang_keahlian_dengan_mata_kuliah_yang_diampu_7" ||
          fieldName === "sertifikat_pendidik_profesional" ||
          fieldName === "sertifikat_kompetensi"
        ) {
          const strVal = String(value || "")
            .toLowerCase()
            .trim()
          item[fieldName] = [
            "yes",
            "ya",
            "ada",
            "v",
            "√",
            "✓",
            "1",
            "true",
          ].includes(strVal)
            ? "V"
            : ["no", "tidak", "0", "false"].includes(strVal)
            ? "Tidak"
            : strVal
        } else {
          item[fieldName] =
            value !== undefined && value !== null ? String(value).trim() : ""
        }
      })

      return item
    })

    return {
      allRows: processedData,
      shouldReplaceExisting: true,
    }
  },

  initializeData(config, prodiName, sectionCode, existingData = {}) {
    const initialTableData = {}

    if (config && config.tables) {
      config.tables.forEach((table) => {
        const tableCode = typeof table === "object" ? table.code : table

        if (
          existingData &&
          existingData[tableCode] &&
          existingData[tableCode].length > 0
        ) {
          initialTableData[tableCode] = existingData[tableCode]
        } else {
          initialTableData[tableCode] = [
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
      })
    }

    return initialTableData
  },

  calculateScore(data, config, additionalData = {}) {
    console.log("Calculating dosen tetap score with data:", data)

    // Mendapatkan jumlah mahasiswa jika tersedia di additionalData
    const NM = additionalData.jumlahMahasiswa || 0

    // Menggunakan logika sesuai dengan formula Excel yang diberikan

    // 1. Hitung NDT = Jumlah seluruh dosen tetap
    const NDT = data.filter(
      (dosen) => dosen.nidn_nidk && dosen.nidn_nidk.trim() !== ""
    ).length

    // 2. Hitung NDTPS = Jumlah dosen tetap dengan kesesuaian bidang
    const NDTPS = data.filter((dosen) => {
      const kesesuaian = (
        dosen.kesesuaian_dengan_kompetensi_inti_ps_3 || ""
      ).trim()
      return (
        dosen.nidn_nidk &&
        dosen.nidn_nidk.trim() !== "" &&
        (kesesuaian === "V" ||
          kesesuaian === "v" ||
          kesesuaian === "√" ||
          kesesuaian === "✓")
      )
    }).length

    // 3. Hitung NDS = Jumlah dosen dengan S3/Doktor yang memiliki kesesuaian
    const NDS = data.filter((dosen) => {
      const kesesuaian = (
        dosen.kesesuaian_dengan_kompetensi_inti_ps_3 || ""
      ).trim()
      const doktor = (
        dosen.doktor_doktor_terapan_nama_prodi_pasca_sarjana_1 || ""
      ).trim()
      return (
        dosen.nidn_nidk &&
        dosen.nidn_nidk.trim() !== "" &&
        doktor !== "" &&
        doktor !== "-" &&
        (kesesuaian === "V" ||
          kesesuaian === "v" ||
          kesesuaian === "√" ||
          kesesuaian === "✓")
      )
    }).length

    // 4. Hitung NDSK = Jumlah dosen dengan sertifikat kompetensi
    const NDSK = data.filter((dosen) => {
      const kesesuaian = (
        dosen.kesesuaian_dengan_kompetensi_inti_ps_3 || ""
      ).trim()
      const bidangSertifikasi = (
        dosen.bidang_sertifikasi_sertifikat_kompetensi_profesi_industri_5 || ""
      ).trim()
      const lembagaPenerbit = (
        dosen.lembaga_penerbit_sertifikat_kompetensi_profesi_industri_5 || ""
      ).trim()

      return (
        dosen.nidn_nidk &&
        dosen.nidn_nidk.trim() !== "" &&
        bidangSertifikasi !== "" &&
        bidangSertifikasi !== "-" &&
        lembagaPenerbit !== "" &&
        (kesesuaian === "V" ||
          kesesuaian === "v" ||
          kesesuaian === "√" ||
          kesesuaian === "✓")
      )
    }).length

    // 5. Hitung NDGB, NDLK, NDL = Jumlah dosen dengan jabatan akademik tertentu dan kesesuaian
    const NDGB = data.filter((dosen) => {
      const kesesuaian = (
        dosen.kesesuaian_dengan_kompetensi_inti_ps_3 || ""
      ).trim()
      const jabatan = (dosen.jabatan_akademik || "").trim()

      return (
        dosen.nidn_nidk &&
        dosen.nidn_nidk.trim() !== "" &&
        (jabatan === "Guru Besar" ||
          jabatan.toLowerCase().includes("guru besar") ||
          jabatan.toLowerCase().includes("profesor") ||
          jabatan.toLowerCase().includes("professor")) &&
        (kesesuaian === "V" ||
          kesesuaian === "v" ||
          kesesuaian === "√" ||
          kesesuaian === "✓")
      )
    }).length

    const NDLK = data.filter((dosen) => {
      const kesesuaian = (
        dosen.kesesuaian_dengan_kompetensi_inti_ps_3 || ""
      ).trim()
      const jabatan = (dosen.jabatan_akademik || "").trim()

      return (
        dosen.nidn_nidk &&
        dosen.nidn_nidk.trim() !== "" &&
        (jabatan === "Lektor Kepala" ||
          jabatan.toLowerCase().includes("lektor kepala")) &&
        (kesesuaian === "V" ||
          kesesuaian === "v" ||
          kesesuaian === "√" ||
          kesesuaian === "✓")
      )
    }).length

    const NDL = data.filter((dosen) => {
      const kesesuaian = (
        dosen.kesesuaian_dengan_kompetensi_inti_ps_3 || ""
      ).trim()
      const jabatan = (dosen.jabatan_akademik || "").trim()

      return (
        dosen.nidn_nidk &&
        dosen.nidn_nidk.trim() !== "" &&
        (jabatan === "Lektor" ||
          (jabatan.toLowerCase().includes("lektor") &&
            !jabatan.toLowerCase().includes("lektor kepala"))) &&
        (kesesuaian === "V" ||
          kesesuaian === "v" ||
          kesesuaian === "√" ||
          kesesuaian === "✓")
      )
    }).length

    // 6. Hitung jumlah dosen tidak tetap (dari additionalData)
    const NDTT = additionalData.NDTT || 0

    // 7. Hitung persentase-persentase sesuai matriks penilaian
    // PDS3 = Persentase dosen S3/Doktor
    const PDS3 = NDTPS > 0 ? (NDS / NDTPS) * 100 : 0

    // PDSK = Persentase dosen dengan sertifikat kompetensi
    const PDSK = NDTPS > 0 ? (NDSK / NDTPS) * 100 : 0

    // PGBLKL = Persentase dosen dengan jabatan GB/LK/L
    const PGBLKL = NDTPS > 0 ? ((NDGB + NDLK + NDL) / NDTPS) * 100 : 0

    // PDTT = Persentase dosen tidak tetap
    const PDTT = NDT + NDTT > 0 ? (NDTT / (NDT + NDTT)) * 100 : 0

    // 8. Hitung RMD = Rasio mahasiswa per dosen
    const RMD = NDTPS > 0 ? NM / NDTPS : 0

    // 9. Hitung skor untuk masing-masing komponen sesuai matriks penilaian

    // Skor untuk Kecukupan jumlah DTPS (No. 15)
    let skorKecukupan = 0
    if (NDTPS >= 12 && PDTT <= 10) {
      skorKecukupan = 4
    } else if (NDTPS >= 12 && PDTT <= 40) {
      skorKecukupan = 2 + (2 * (40 - PDTT)) / 30
    } else if (NDTPS < 12 && PDTT <= 40) {
      skorKecukupan = 1
    } else {
      skorKecukupan = 0
    }

    // Skor untuk Kualifikasi akademik DTPS (No. 16)
    let skorKualifikasi = 0
    if (PDS3 >= 10) {
      skorKualifikasi = 4
    } else if (PDS3 < 10) {
      skorKualifikasi = 2 + (20 * PDS3) / 100
    } else {
      skorKualifikasi = 2 // Minimal skor 2
    }

    // Skor untuk Sertifikasi kompetensi/profesi (No. 17)
    let skorSertifikasi = 0
    if (PDSK >= 50) {
      skorSertifikasi = 4
    } else if (PDSK < 50) {
      skorSertifikasi = 1 + (6 * PDSK) / 100
    } else {
      skorSertifikasi = 1 // Minimal skor 1
    }

    // Skor untuk Jabatan akademik DTPS (No. 18)
    let skorJabatan = 0
    if (PGBLKL >= 40) {
      skorJabatan = 4
    } else if (PGBLKL < 40) {
      skorJabatan = 2 + (20 * PGBLKL) / 40
    } else {
      skorJabatan = 2 // Minimal skor 2
    }

    // Skor untuk Rasio mahasiswa-dosen (No. 19)
    let skorRasio = 0
    if (RMD >= 10 && RMD <= 20) {
      skorRasio = 4
    } else if (RMD < 10) {
      skorRasio = (2 * RMD) / 5
    } else if (RMD > 20 && RMD <= 30) {
      skorRasio = (60 - 2 * RMD) / 5
    } else {
      skorRasio = 0
    }

    // 10. Hitung skor rata-rata untuk keseluruhan indikator
    const rataRata =
      (skorKecukupan +
        skorKualifikasi +
        skorSertifikasi +
        skorJabatan +
        skorRasio) /
      5

    // Log untuk debugging
    console.log("Hasil perhitungan skor dosen tetap:", {
      NDT,
      NDTPS,
      NDS,
      NDSK,
      NDGB,
      NDLK,
      NDL,
      NDTT,
      PDS3,
      PDSK,
      PGBLKL,
      PDTT,
      RMD,
      skorKecukupan,
      skorKualifikasi,
      skorSertifikasi,
      skorJabatan,
      skorRasio,
      rataRata,
    })

    return {
      score: rataRata,
      scoreDetail: {
        NDT,
        NDTPS,
        NDS,
        NDSK,
        NDGB,
        NDLK,
        NDL,
        NDTT,
        PDS3: PDS3.toFixed(2) + "%",
        PDSK: PDSK.toFixed(2) + "%",
        PGBLKL: PGBLKL.toFixed(2) + "%",
        PDTT: PDTT.toFixed(2) + "%",
        RMD: RMD.toFixed(2),
        skorKecukupan: skorKecukupan.toFixed(2),
        skorKualifikasi: skorKualifikasi.toFixed(2),
        skorSertifikasi: skorSertifikasi.toFixed(2),
        skorJabatan: skorJabatan.toFixed(2),
        skorRasio: skorRasio.toFixed(2),
        formula: "Matriks Penilaian LKPS C.4. Sumber Daya Manusia (15-19)",
      },
    }
  },

  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }

      const textFields = [
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

      textFields.forEach((field) => {
        if (result[field] === undefined || result[field] === null) {
          result[field] = ""
        } else if (typeof result[field] === "object") {
          result[field] = String(result[field])
        } else if (typeof result[field] !== "string") {
          result[field] = String(result[field])
        }
      })

      return result
    })
  },

  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      if (!item.nama_dosen) {
        errors.push(`Row ${index + 1}: Nama dosen harus diisi`)
      }

      if (item.nidn_nidk && !/^\d+$/.test(item.nidn_nidk)) {
        errors.push(`Row ${index + 1}: NIDN/NIDK harus berupa angka`)
      }

      if (!item.mata_kuliah_yang_diampu_pada_ps_yang_diakreditasi_6) {
        errors.push(
          `Row ${
            index + 1
          }: Mata kuliah yang diampu pada PS yang diakreditasi harus diisi`
        )
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  },

  prepareDataForSaving(data) {
    return data.map((item, index) => {
      const preparedItem = {
        ...item,
        no: index + 1,
        _timestamp: new Date().getTime(),
        selected: true,
      }

      Object.keys(preparedItem).forEach((key) => {
        if (
          typeof preparedItem[key] === "object" &&
          preparedItem[key] !== null
        ) {
          preparedItem[key] = String(preparedItem[key])
        }
      })

      return preparedItem
    })
  },
}

export default DosenTetapPerguruanTinggiPlugin
