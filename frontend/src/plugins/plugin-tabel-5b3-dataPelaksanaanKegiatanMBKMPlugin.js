/**
 * Plugin khusus untuk section Kepuasan Mahasiswa
 */
import { processExcelDataBase } from "../utils/tableUtils"

const dataPelaksanaanKegiatanMBKMPlugin = {
  getInfo() {
    return {
      code: "5b3",
      name: "dataPelaksanaanKegiatanMBKMPlugin",
      description: "Plugin for student satisfaction data processing",
    }
  },

  configureSection(config) {
    return {
      ...config,
      isKepuasanMahasiswaSection: true,
    }
  },

  async processExcelData(workbook, tableCode, config, prodiName, sectionCode) {
    // ... (kode processExcelData seperti sebelumnya)
    const { rawData, detectedIndices } = await processExcelDataBase(
      workbook,
      tableCode,
      config,
      prodiName
    );

    console.log("=== DEBUG: Detected Indices ===");
    console.table(detectedIndices);

    console.log("=== DEBUG: Raw Data ===");
    console.table(rawData);

    if (rawData.length === 0) return { allRows: [] };

    const filteredData = rawData.filter((row) => {
      if (!row || row.length === 0) return false;

      const nonEmptyValues = row.filter(
        (val) => val !== undefined && val !== null && val !== ""
      );
      if (nonEmptyValues.length <= 1) return false;

      const isSequentialNumbersRow = nonEmptyValues.every((val, idx) => {
        const num = parseInt(val);
        return !isNaN(num) && num === idx + 1;
      });
      if (isSequentialNumbersRow) return false;

      const hasSummaryLabel = row.some((cell) => {
        if (typeof cell !== "string") return false;
        const normalized = String(cell).toLowerCase().trim();
        return (
          normalized === "jumlah" ||
          normalized === "total" ||
          normalized === "sum" ||
          normalized === "rata-rata" ||
          normalized === "average"
        );
      });
      if (hasSummaryLabel) return false;

      return true;
    });

    const processedData = filteredData.map((row, index) => {
      return {
        key: `excel-<span class="math-inline">\{index \+ 1\}\-</span>{Date.now()}`,
        no: index + 1,
        selected: false,
        nama_kegiatan: row[1] || "",
        periode_pelaksanaan_durasi: row[2] || 0,
        jenis_kegiatan_mbkm: row[3] || 0,
        mata_kuliah_yang_setara_kode_nama: row[4] || 0,
        sks_mk_yang_setara: row[5] || 0,
        jumlah_mahasiswa_ps_yang_mengikuti: parseInt(row[6]) || 0,
        nama_lembaga_mitra: row[7] || "",
        nama_dtps_yang_menjadi_pembimbing:  row[8] || "",
      };
    });

    return {
      allRows: processedData,
      shouldReplaceExisting: true,
    };
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
          initialTableData[tableCode] = []
        }
      })
    }

    return initialTableData
  },

  calculateScore(data) {
    if (!data || data.length === 0) {
      return {
        scores: [
          {
            butir: 49,
            nilai: 0,
          },
        ],
        scoreDetail: {
          jumlah_total_mahasiswa_mengikuti_mbkm: 0,
        },
      }
    }

    let jumlahTotalMahasiswaMengikutiMBKM = 0;
    data.forEach(item => {
      jumlahTotalMahasiswaMengikutiMBKM += item.jumlah_mahasiswa_ps_yang_mengikuti;
    });

    let nilai = 0;
    // Penilaian sangat kasar berdasarkan jumlah mahasiswa, perlu disesuaikan dengan % total mhs
    // if (jumlahTotalMahasiswaMengikutiMBKM >= 25) nilai = 4;
    // else if (jumlahTotalMahasiswaMengikutiMBKM >= 40) nilai = 3;
    // else if (jumlahTotalMahasiswaMengikutiMBKM >= 20) nilai = 2;
    // else if (jumlahTotalMahasiswaMengikutiMBKM > 0) nilai = 1;

    return {
      scores: [
        {
          butir: 49,
          nilai,
        },
      ],
      scoreDetail: {
        
      },
    }
  },

  normalizeData(data) {
    return data.map((item) => {
      return {
        ...item,
        periode_pelaksanaan_durasi: parseInt(item.periode_pelaksanaan_durasi) || 0,
        jenis_kegiatan_mbkm: parseInt(item.jenis_kegiatan_mbkm) || 0,
        sks_mk_yang_setara: parseInt(item.sks_mk_yang_setara) || 0,
        jumlah_mahasiswa_ps_yang_mengikuti: parseInt(item.jumlah_mahasiswa_ps_yang_mengikuti) || 0,
      }
    })
  },

  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      if (!item.aspek) {
        errors.push(`Row ${index + 1}: Aspek harus diisi`)
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  },

  prepareDataForSaving(data) {
    return data.map((item, index) => {
      return {
        ...item,
        no: index + 1,
        _timestamp: new Date().getTime(),
        selected: true,
      }
    })
  },
}

export default dataPelaksanaanKegiatanMBKMPlugin
