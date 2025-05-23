/**
 * Plugin untuk mendata masa studi lulusan
 * Berdasarkan Tabel 8.c LKPS
 */
import { processExcelDataBase } from "../utils/tableUtils"

const masaStudiLulusanPlugin = {
  getInfo() {
    return {
      code: "8c",
      name: "Masa Studi Lulusan Plugin",
      description: "Plugin untuk mendata masa studi lulusan dari tabel 8.c LKPS",
    };
  },

  configureSection(config) {
    return {
      ...config,
      isMasaStudiLulusanSection: true,
    };
  },

  async processExcelData(workbook, tableCode, config, prodiName, sectionCode) {
    const { rawData, detectedIndices } = await processExcelDataBase(
      workbook,
      tableCode,
      config,
      prodiName
    );

    console.log("=== DEBUG: Detected Indices (Masa Studi Lulusan) ===");
    console.table(detectedIndices);
    console.log("=== DEBUG: Raw Data (Masa Studi Lulusan) ===");
    console.table(rawData);

    if (rawData.length === 0) return { allRows: [] };

    const filteredData = rawData.filter((row) => {
      if (!row || row.length === 0) return false;
      const nonEmptyValues = row.filter(
        (val) => val !== undefined && val !== null && String(val).trim() !== ""
      );
      return nonEmptyValues.length > 1; // Minimal ada tahun masuk dan satu data lain
    });

    const processedData = filteredData.map((row, index) => {
      const item = {
        key: `excel-masa-studi-${index + 1}-${Date.now()}`,
        no: index + 1,
        selected: false,
        tahun_masuk: "",
        jumlah_mhs_ts6: 0,
        jumlah_mhs_ts5: 0,
        jumlah_mhs_ts4: 0,
        jumlah_mhs_ts3: 0,
        jumlah_mhs_ts2: 0,
        jumlah_mhs_ts1: 0,
        jumlah_mhs_ts: 0,
        jumlah_lulusan_sd_ts: 0,
      };

      Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
        if (colIndex === undefined || colIndex < 0) return;
        const value = row[colIndex];

        if (fieldName === "tahun_masuk") {
          item[fieldName] = value ? String(value).trim() : "";
        } else if (fieldName.startsWith("jumlah_mhs_ts") || fieldName === "jumlah_lulusan_sd_ts") {
          const num = parseFloat(value);
          item[fieldName] = !isNaN(num) ? Math.max(0, num) : 0;
        }
      });

      return item;
    });

    return {
      allRows: processedData,
      shouldReplaceExisting: true,
    };
  },

  initializeData(config, prodiName, sectionCode, existingData = {}) {
    const initialTableData = {};
    if (config && config.tables) {
      config.tables.forEach((table) => {
        const tableCode = typeof table === "object" ? table.code : table;
        initialTableData[tableCode] = (existingData && existingData[tableCode] && existingData[tableCode].length > 0)
          ? existingData[tableCode]
          : [];
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
        jumlah_mhs_ts6: parseInt(item.jumlah_mhs_ts6) || 0,
        jumlah_mhs_ts5: parseInt(item.jumlah_mhs_ts5) || 0,
        jumlah_mhs_ts4: parseInt(item.jumlah_mhs_ts4) || 0,
        jumlah_mhs_ts3: parseInt(item.jumlah_mhs_ts3) || 0,
        jumlah_mhs_ts2: parseInt(item.jumlah_mhs_ts2) || 0,
        jumlah_mhs_ts1: parseInt(item.jumlah_mhs_ts1) || 0,
        jumlah_mhs_ts: parseInt(item.jumlah_mhs_ts) || 0,
        jumlah_lulusan_sd_ts: parseInt(item.jumlah_lulusan_sd_ts) || 0,
      };
    });
  },

  validateData(data) {
    const errors = [];
    data.forEach((item, index) => {
      if (!item.tahun_masuk) {
        errors.push(`Baris ${index + 1}: Tahun Masuk harus diisi`);
      }
      const tahunMasuk = String(item.tahun_masuk).trim();
      if (tahunMasuk.length !== 4 || isNaN(parseInt(tahunMasuk))) {
        errors.push(`Baris ${index + 1}: Format Tahun Masuk tidak valid (YYYY)`);
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
      _timestamp: new Date().getTime(),
      selected: true,
    }));
  },
};

export default masaStudiLulusanPlugin;
