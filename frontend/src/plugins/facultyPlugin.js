/**
 * Plugin khusus untuk section Faculty (3-*)
 */
import { normalizeDataConsistency } from "../utils/tridharmaUtils"
import { calculateScore } from "../utils/formulaUtils"
import { processExcelDataBase, isTrueValue } from "../utils/tableUtils"

const FacultyPlugin = {
  getInfo() {
    return {
      code: "3-*", // Wildcard untuk semua section Faculty (3-1, 3-2, dll)
      name: "Faculty Section Plugin",
      description: "Specific implementation for faculty-related sections",
    }
  },

  configureSection(config) {
    return {
      ...config,
      isFacultySection: true,
    }
  },

  async processExcelData(workbook, tableCode, config, prodiName, sectionCode) {
    // Gunakan fungsi dasar untuk mendapatkan data mentah
    const baseResult = await processExcelDataBase(
      workbook,
      tableCode,
      config,
      prodiName
    )

    const { rawData, headers, detectedIndices, columnMap, tableConfig } =
      baseResult

    if (rawData.length === 0) {
      console.log("No raw data found in Excel")
      return { allRows: [], prodiRows: [], polbanRows: [] }
    }

    console.log(`Processing ${rawData.length} rows with Faculty plugin`)

    // Deteksi kolom khusus Faculty
    const facultyIndices = this.detectFacultyColumns(headers)
    const mergedIndices = { ...detectedIndices, ...facultyIndices }

    // Proses data mentah menjadi objek
    const processedData = this.processRawData(
      rawData,
      mergedIndices,
      columnMap,
      prodiName
    )

    // Pisahkan data berdasarkan sumber (prodi vs polban)
    const prodiRows = processedData.filter((row) => row.source === "prodi")
    const polbanRows = processedData.filter(
      (row) => row.source === "polban" || row.source === "other"
    )

    console.log(`Found ${prodiRows.length} rows for prodi ${prodiName}`)
    console.log(`Found ${polbanRows.length} rows for polban/other sources`)

    return {
      allRows: processedData,
      prodiRows: prodiRows,
      polbanRows: polbanRows,
    }
  },

  // Deteksi kolom khusus Faculty
  detectFacultyColumns(headers) {
    // Deteksi indeks kolom Faculty berdasarkan header
    const findIndex = (possibleNames) => {
      for (let i = 0; i < headers.length; i++) {
        const header = String(headers[i] || "")
          .toLowerCase()
          .trim()
        for (const name of possibleNames) {
          if (header.includes(name.toLowerCase())) {
            return i
          }
        }
      }
      return -1
    }

    // Deteksi kolom dosen
    const namaDosenIndex = findIndex([
      "nama dosen",
      "nama_dosen",
      "dosen",
      "lecturer",
    ])

    const nipIndex = findIndex(["nip", "nidn", "nomor induk", "no induk"])

    const gelarIndex = findIndex(["gelar", "gelar akademik", "academic degree"])

    const pendidikanIndex = findIndex([
      "pendidikan",
      "pendidikan tertinggi",
      "highest education",
      "education",
    ])

    const bidangIndex = findIndex([
      "bidang",
      "bidang keahlian",
      "expertise",
      "field",
    ])

    const statusIndex = findIndex(["status", "status aktif", "active"])

    const dosenTetapIndex = findIndex([
      "dosen tetap",
      "tetap",
      "permanent",
      "dosen_tetap",
    ])

    // Fallback ke kolom default jika tidak ditemukan
    const facultyIndices = {
      nama_dosen: namaDosenIndex !== -1 ? namaDosenIndex : 1,
      nip: nipIndex !== -1 ? nipIndex : 2,
      gelar_akademik: gelarIndex !== -1 ? gelarIndex : 3,
      pendidikan_tertinggi: pendidikanIndex !== -1 ? pendidikanIndex : 4,
      bidang_keahlian: bidangIndex !== -1 ? bidangIndex : 5,
      status_aktif: statusIndex !== -1 ? statusIndex : 6,
      is_dosen_tetap: dosenTetapIndex !== -1 ? dosenTetapIndex : 7,
    }

    console.log("Detected Faculty columns:", facultyIndices)

    return facultyIndices
  },

  // Proses data mentah menjadi objek
  processRawData(rawData, detectedIndices, columnMap, prodiName) {
    return rawData.map((row, index) => {
      // Mulai dengan properti dasar
      const item = {
        key: `excel-${index + 1}`,
        selected: false,
        no: index + 1,

        // Inisialisasi field Faculty
        is_dosen_tetap: false,
        status_aktif: true,
      }

      // Isi dengan nilai berdasarkan indeks kolom yang terdeteksi
      Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
        if (colIndex === undefined || colIndex < 0) return

        const value = row[colIndex]
        const column = columnMap[fieldName]

        // Proses nilai berdasarkan tipe kolom
        if (fieldName === "is_dosen_tetap" || fieldName === "status_aktif") {
          // Field boolean khusus Faculty
          item[fieldName] = isTrueValue(value)
        } else if (column && column.type === "boolean") {
          item[fieldName] = isTrueValue(value)
        } else if (column && column.type === "number") {
          item[fieldName] =
            value !== undefined && value !== null && value !== ""
              ? Number(value)
              : 0
        } else if (column && column.type === "date") {
          item[fieldName] =
            value !== undefined && value !== null ? String(value).trim() : ""
        } else {
          item[fieldName] =
            value !== undefined && value !== null ? String(value).trim() : ""
        }
      })

      // Inisialisasi kolom nama_dosen jika tidak ada
      if (!item.nama_dosen && row[1]) {
        item.nama_dosen = String(row[1] || "").trim()
      }

      if (!item.pendidikan_tertinggi && row[4]) {
        item.pendidikan_tertinggi = String(row[4] || "").trim()
      }

      // Format pendidikan_tertinggi
      if (item.pendidikan_tertinggi) {
        const pendidikan = item.pendidikan_tertinggi.toUpperCase()
        if (pendidikan.includes("S3") || pendidikan.includes("DOKTOR")) {
          item.pendidikan_tertinggi = "S3"
        } else if (
          pendidikan.includes("S2") ||
          pendidikan.includes("MAGISTER")
        ) {
          item.pendidikan_tertinggi = "S2"
        } else if (
          pendidikan.includes("S1") ||
          pendidikan.includes("SARJANA")
        ) {
          item.pendidikan_tertinggi = "S1"
        } else if (pendidikan.includes("D4")) {
          item.pendidikan_tertinggi = "D4"
        } else if (pendidikan.includes("D3")) {
          item.pendidikan_tertinggi = "D3"
        }
      } else {
        item.pendidikan_tertinggi = "S1" // Default
      }

      // Deteksi source dan prodi
      const prodiIndex = detectedIndices.prodi || 8
      const rowProdi = row[prodiIndex]
      const isUserProdi =
        String(rowProdi || "").toLowerCase() ===
        String(prodiName || "").toLowerCase()
      const isPolban = String(rowProdi || "").toLowerCase() === "polban"

      item.source = isUserProdi ? "prodi" : isPolban ? "polban" : "other"
      item.prodi = rowProdi || prodiName

      // Mark prodi data as selected by default
      if (isUserProdi) {
        item.selected = true
      }

      return item
    })
  },

  initializeData(config, prodiName, sectionCode, existingData = {}) {
    console.log("Initializing Faculty data for section", sectionCode)
    const initialTableData = {}

    if (config && config.tables) {
      config.tables.forEach((table) => {
        const tableCode = typeof table === "object" ? table.code : table

        // Gunakan data yang sudah ada jika tersedia
        if (
          existingData &&
          existingData[tableCode] &&
          existingData[tableCode].length > 0
        ) {
          console.log(
            `Using existing ${existingData[tableCode].length} rows for table ${tableCode}`
          )
          initialTableData[tableCode] = existingData[tableCode]
        } else {
          initialTableData[tableCode] = []
          console.log(
            `No existing data for table ${tableCode}, using empty array`
          )
        }
      })
    }

    return initialTableData
  },

  calculateScore(data, config, NDTPS) {
    // Kalkulasi skor untuk section Faculty
    if (!config || !config.formula) {
      return { score: null, scoreDetail: null }
    }

    // Cara khusus untuk menghitung skor Faculty jika diperlukan
    const calculatedScore = calculateScore(config, data, NDTPS)

    // Buat detail skor tambahan jika diperlukan
    const scoreDetail = {
      totalDosen: data.length,
      dosenS3: data.filter((item) => item.pendidikan_tertinggi === "S3").length,
      dosenS2: data.filter((item) => item.pendidikan_tertinggi === "S2").length,
      dosenTetap: data.filter((item) => item.is_dosen_tetap === true).length,
    }

    return {
      scores: [
        {
          butir : 'Tidak digunakan',
          nilai : calculatedScore
        }
      ],
      scoreDetail,
    }
  },

  normalizeData(data) {
    console.log("Before normalization:", data)
    // Normalisasi data dengan perlakuan khusus untuk Faculty
    const normalizedData = normalizeDataConsistency(data)
    console.log("After normalization:", normalizedData)

    // Tambahan normalisasi khusus Faculty
    return normalizedData.map((item) => ({
      ...item,
      is_dosen_tetap: !!item.is_dosen_tetap,
      status_aktif: item.status_aktif !== false, // Default true kecuali explisit false
    }))
  },

  prepareDataForSaving(data, userData) {
    // Persiapan data untuk disimpan khusus Faculty
    return data.map((item, index) => ({
      ...item,
      no: index + 1,
      _timestamp: new Date().getTime(),
      // Pastikan field boolean disimpan dengan benar
      is_dosen_tetap: !!item.is_dosen_tetap,
      status_aktif: item.status_aktif !== false,
    }))
  },

  validateData(data) {
    const errors = []

    // Validasi khusus Faculty
    data.forEach((item, index) => {
      // Validasi nama dosen
      if (!item.nama_dosen || item.nama_dosen.trim() === "") {
        errors.push(`Row ${index + 1}: Nama dosen harus diisi`)
      }

      // Validasi pendidikan tertinggi
      if (
        item.pendidikan_tertinggi &&
        !["S1", "S2", "S3", "D3", "D4"].includes(item.pendidikan_tertinggi)
      ) {
        errors.push(
          `Row ${index + 1}: Pendidikan tertinggi tidak valid (${
            item.pendidikan_tertinggi
          })`
        )
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  },

  // Metode untuk membuat baris baru
  createNewRow(tableCode, tableConfig, prodiName) {
    return {
      key: `new-${Date.now()}`,
      source: "prodi",
      prodi: prodiName,
      selected: true,
      is_dosen_tetap: true,
      status_aktif: true,
      pendidikan_tertinggi: "S2", // Default
      nama_dosen: "",
      nip: "",
      gelar_akademik: "",
      bidang_keahlian: "",
    }
  },
}

export default FacultyPlugin
