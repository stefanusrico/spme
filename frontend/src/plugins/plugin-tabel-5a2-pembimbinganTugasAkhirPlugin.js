/**
 * Plugin untuk mendata pembimbingan tugas akhir
 * Berdasarkan Tabel 5.a.2 LKPS
 */
import { processExcelDataBase } from "../utils/tableUtils"

const pembimbinganTugasAKirPlugin = {
  getInfo() {
    return {
      code: "5a2",
      name: "Pembimbingan Tugas Akhir Plugin",
      description: "Plugin untuk mendata pembimbingan tugas akhir dari tabel 5.a.2 LKPS",
    };
  },

  configureSection(config) {
    return {
      ...config,
      isPembimbinganTugasAkhirSection: true,
    };
  },

  async processExcelData(workbook, tableCode, config, prodiName, sectionCode) {
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

    if (rawData.length === 0) {
      return { allRows: [] };
    }

    const filteredData = rawData.filter((row) => {
      if (!row || row.length === 0) {
        return false;
      }

      const nonEmptyValues = row.filter(
        (val) => val !== undefined && val !== null && val !== ""
      );
      return nonEmptyValues.length > 2; // Minimal nama dosen dan salah satu kolom lain
    });

    const processedData = filteredData.map((row, index) => {
      return {
        key: `excel-${index + 1}-${Date.now()}`,
        no: index + 1,
        selected: false,
        nama_dosen_pembimbing: row[1] || "",
        strata_pendidikan_status_dosen_pembimbing: row[2] || "",
        jabatan_akademik_status_dosen_pembimbing: row[3] || "",
        ts_2_jumlah_mahasiswa: parseInt(row[4]) || 0,
        ts_1_jumlah_mahasiswa: parseInt(row[5]) || 0,
        ts_jumlah_mahasiswa: parseInt(row[6]) || 0,
        ts_2_jumlah_pertemuan_dengan_mahasiswa: parseInt(row[7]) || 0,
        ts_1_jumlah_pertemuan_dengan_mahasiswa: parseInt(row[8]) || 0,
        ts_jumlah_pertemuan_dengan_mahasiswa: parseInt(row[9]) || 0,
        ts_2_lama_penyelesaian_tugas_akhir_bulan: parseInt(row[10]) || 0,
        ts_1_lama_penyelesaian_tugas_akhir_bulan: parseInt(row[11]) || 0,
        ts_lama_penyelesaian_tugas_akhir_bulan: parseInt(row[12]) || 0,
      };
    });

    return {
      allRows: processedData,
      shouldReplaceExisting: true,
    };
  },

  initializeData(config, prodiName, sectionCode, existingData = {}) {
    const initialTableData = {};

    if (config?.tables) {
      config.tables.forEach((table) => {
        const tableCode = typeof table === "object" ? table.code : table;
        initialTableData[tableCode] = existingData?.[tableCode] || [];
      });
    }

    return initialTableData;
  },

  calculateScore(data) {
    return {
      scores: [
        {
          butir: 0, // Akan diisi setelah ada aturan scoring
          nilai: 0,
        },
      ],
      scoreDetail: {}, // Akan diisi setelah ada aturan scoring
    };
  },

  normalizeData(data) {
    return data.map((item) => {
      return {
        ...item,
        ts_2_jumlah_mahasiswa: parseInt(item.ts_2_jumlah_mahasiswa) || 0,
        ts_1_jumlah_mahasiswa: parseInt(item.ts_2_jumlah_mahasiswa) || 0,
        ts_jumlah_mahasiswa: parseInt(item.ts_2_jumlah_mahasiswa) || 0,
        ts_2_jumlah_pertemuan_dengan_mahasiswa: parseInt(item.ts_2_jumlah_pertemuan_dengan_mahasiswa) || 0,
        ts_1_jumlah_pertemuan_dengan_mahasiswa: parseInt(item.ts_1_jumlah_pertemuan_dengan_mahasiswa) || 0,
        ts_jumlah_pertemuan_dengan_mahasiswa: parseInt(item.ts_jumlah_pertemuan_dengan_mahasiswa) || 0,
        ts_2_lama_penyelesaian_tugas_akhir_bulan: parseInt(item.ts_2_lama_penyelesaian_tugas_akhir_bulan) || 0,
       ts_2_lama_penyelesaian_tugas_akhir_bulan: parseInt(item.ts_2_lama_penyelesaian_tugas_akhir_bulan) || 0,
        ts_2_lama_penyelesaian_tugas_akhir_bulan: parseInt(item.ts_2_lama_penyelesaian_tugas_akhir_bulan) || 0,
      };
    });
  },

  validateData(data) {
    const errors = [];

    data.forEach((item, index) => {
      if (!item.nama_dosen_pembimbing) {
        errors.push(`Baris ${index + 1}: Nama Dosen Pembimbing harus diisi`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  prepareDataForSaving(data) {
    return data.map((item, index) => ({
      ...item,
      no: index + 1,
      selected: true,
      _timestamp: new Date().getTime(),
    }));
  },
};

export default pembimbinganTugasAKirPlugin;