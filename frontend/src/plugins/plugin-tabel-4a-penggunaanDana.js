/**
 * Plugin khusus untuk bagian Penggunaan Dana
 */

import { processExcelDataBase } from "../utils/tableUtils";

const penggunaanDanaPlugin = {
  getInfo() {
    return {
      code: "4a",
      name: "Penggunaan Dana Plugin",
      description: "Plugin for processing budget usage data in LKPS Table 4.a",
    };
  },

  configureSection(config) {
    return {
      ...config,
      isPenggunaanDanaSection: true,
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
      const item = {
        key: `excel-${index + 1}-${Date.now()}`,
        no: index + 1,
        selected: false,
        jenis_penggunaan: "",
        ts_2_unit_pengelola_program_studi_rupiah: 0,
        ts_1_unit_pengelola_program_studi_rupiah: 0,
        ts_unit_pengelola_program_studi_rupiah: 0,
        rata_rata_unit_pengelola_program_studi_rupiah: 0,
        ts_2_program_studi_rupiah: 0,
        ts_1_program_studi_rupiah: 0,
        ts_program_studi_rupiah: 0,
        rata_rata_program_studi_rupiah: 0,
      };

      Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
        if (colIndex === undefined || colIndex < 0) return;
        const value = row[colIndex];

        if (fieldName === "jenis_penggunaan") {
          item[fieldName] = value ? String(value).trim() : "";
        } else {
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
        initialTableData[tableCode] = existingData[tableCode] || [];
      });
    }

    return initialTableData;
  },

  calculateScore(data) {
    console.log("=== DEBUG: Calculating score for Penggunaan Dana ===");
    console.log("=== DEBUG: Input data for score calculation ===", data);

    let skorDanaOperasional = 0;
    let skorDanaPenelitian = 0;
    let skorDanaPengabdian = 0;
    let DOP = 0;
    let DPD = 0;
    let DPKMD = 0;

    // Identify rows related to "Biaya Operasional Pendidikan" sub-categories
    const operationalSubCategories = [
      "a. biaya dosen",
      "b. biaya tenaga kependidikan",
      "c. biaya operasional pembelajaran",
      "d. biaya operasional tidak langsung",
      "biaya operasional kemahasiswaan" // This is item 2 in the excel, also part of operational
    ];

    const danaOperasionalSubRows = data.filter(item =>
      operationalSubCategories.some(keyword =>
        String(item.jenis_penggunaan).toLowerCase().includes(keyword)
      )
    );

    console.log("=== DEBUG: Found 'Operasional Pendidikan' sub-rows ===", danaOperasionalSubRows);

    // Sum the 'rata_rata_unit_pengelola_program_studi_rupiah' from these sub-rows for DOP
    DOP = danaOperasionalSubRows.reduce((sum, row) => sum + (row.rata_rata_unit_pengelola_program_studi_rupiah || 0), 0);

    // Find the row for Research Fund (Butir 35)
    const danaPenelitianRow = data.find(item =>
      String(item.jenis_penggunaan).toLowerCase().includes("dana penelitian dtps") ||
      String(item.jenis_penggunaan).toLowerCase().includes("penelitian")
    );

    // Find the row for Community Service Fund (Butir 36)
    const danaPengabdianRow = data.find(item =>
      String(item.jenis_penggunaan).toLowerCase().includes("dana pengabdian kepada masyarakat dtps") ||
      String(item.jenis_penggunaan).toLowerCase().includes("pengabdian") ||
      String(item.jenis_penggunaan).toLowerCase().includes("pkm") ||
      String(item.jenis_penggunaan).toLowerCase().includes("masyarakat")
    );

    console.log("=== DEBUG: Found 'Penelitian' row ===", danaPenelitianRow);
    console.log("=== DEBUG: Found 'Pengabdian' row ===", danaPengabdianRow);

    // Calculate score for Butir 34 (Operational Fund)
    console.log("=== DEBUG: DOP (Total Rata-rata Dana Operasional Pendidikan) value ===", DOP);
    if (DOP >= 20000000) {
      skorDanaOperasional = 4;
      console.log("=== DEBUG: DOP >= 20,000,000 -> skorDanaOperasional ===", skorDanaOperasional);
    } else if (DOP < 20000000 && DOP > 0) {
      skorDanaOperasional = DOP / 5000000;
      console.log("=== DEBUG: 0 < DOP < 20,000,000 -> skorDanaOperasional ===", skorDanaOperasional);
    } else {
      skorDanaOperasional = 0;
      console.log("=== DEBUG: DOP <= 0 -> skorDanaOperasional ===", skorDanaOperasional);
    }


    // Calculate score for Butir 35 (Research Fund)
    if (danaPenelitianRow) {
      DPD = danaPenelitianRow.rata_rata_unit_pengelola_program_studi_rupiah || 0;
      console.log("=== DEBUG: DPD (Rata-rata Dana Penelitian) value ===", DPD);
      if (DPD >= 10000000) {
        skorDanaPenelitian = 4;
        console.log("=== DEBUG: DPD >= 10,000,000 -> skorDanaPenelitian ===", skorDanaPenelitian);
      } else if (DPD < 10000000 && DPD > 0) {
        skorDanaPenelitian = (2 * DPD) / 5000000;
        console.log("=== DEBUG: 0 < DPD < 10,000,000 -> skorDanaPenelitian ===", skorDanaPenelitian);
      } else {
        skorDanaPenelitian = 0;
        console.log("=== DEBUG: DPD <= 0 -> skorDanaPenelitian ===", skorDanaPenelitian);
      }
    } else {
      console.log("=== DEBUG: 'Penelitian' row not found, skorDanaPenelitian remains 0.");
    }

    // Calculate score for Butir 36 (Community Service Fund)
    if (danaPengabdianRow) {
      DPKMD = danaPengabdianRow.rata_rata_unit_pengelola_program_studi_rupiah || 0;
      console.log("=== DEBUG: DPKMD (Rata-rata Dana Pengabdian) value ===", DPKMD);
      if (DPKMD >= 5000000) {
        skorDanaPengabdian = 4;
        console.log("=== DEBUG: DPKMD >= 5,000,000 -> skorDanaPengabdian ===", skorDanaPengabdian);
      } else if (DPKMD < 5000000 && DPKMD > 0) {
        skorDanaPengabdian = (4 * DPKMD) / 5000000;
        console.log("=== DEBUG: 0 < DPKMD < 5,000,000 -> skorDanaPengabdian ===", skorDanaPengabdian);
      } else {
        skorDanaPengabdian = 0;
        console.log("=== DEBUG: DPKMD <= 0 -> skorDanaPengabdian ===", skorDanaPengabdian);
      }
    } else {
      console.log("=== DEBUG: 'Pengabdian' row not found, skorDanaPengabdian remains 0.");
    }

    console.log("=== DEBUG: Final Scores ===", {
      butir34: skorDanaOperasional,
      butir35: skorDanaPenelitian,
      butir36: skorDanaPengabdian
    });
    console.log("=== DEBUG: Final Score Detail ===", {
      DOP: DOP,
      DPD: DPD,
      DPKMD: DPKMD
    });

    return {
      scores: [
        { butir: 34, nilai: skorDanaOperasional },
        { butir: 35, nilai: skorDanaPenelitian },
        { butir: 36, nilai: skorDanaPengabdian },
      ],
      scoreDetail: {
        DOP: DOP,
        DPD: DPD,
        DPKMD: DPKMD,
      },
    };
  },

  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item };

      // Pastikan properti yang digunakan untuk perhitungan dinormalisasi dengan benar
      result.ts_2_unit_pengelola_program_studi_rupiah = !isNaN(parseFloat(result.ts_2_unit_pengelola_program_studi_rupiah)) ? Math.max(0, parseFloat(result.ts_2_unit_pengelola_program_studi_rupiah)) : 0;
      result.ts_1_unit_pengelola_program_studi_rupiah = !isNaN(parseFloat(result.ts_1_unit_pengelola_program_studi_rupiah)) ? Math.max(0, parseFloat(result.ts_1_unit_pengelola_program_studi_rupiah)) : 0;
      result.ts_unit_pengelola_program_studi_rupiah = !isNaN(parseFloat(result.ts_unit_pengelola_program_studi_rupiah)) ? Math.max(0, parseFloat(result.ts_unit_pengelola_program_studi_rupiah)) : 0;
      result.rata_rata_unit_pengelola_program_studi_rupiah = !isNaN(parseFloat(result.rata_rata_unit_pengelola_program_studi_rupiah)) ? Math.max(0, parseFloat(result.rata_rata_unit_pengelola_program_studi_rupiah)) : 0;
      result.ts_2_program_studi_rupiah = !isNaN(parseFloat(result.ts_2_program_studi_rupiah)) ? Math.max(0, parseFloat(result.ts_2_program_studi_rupiah)) : 0;
      result.ts_1_program_studi_rupiah = !isNaN(parseFloat(result.ts_1_program_studi_rupiah)) ? Math.max(0, parseFloat(result.ts_1_program_studi_rupiah)) : 0;
      result.ts_program_studi_rupiah = !isNaN(parseFloat(result.ts_program_studi_rupiah)) ? Math.max(0, parseFloat(result.ts_program_studi_rupiah)) : 0;
      result.rata_rata_program_studi_rupiah = !isNaN(parseFloat(result.rata_rata_program_studi_rupiah)) ? Math.max(0, parseFloat(result.rata_rata_program_studi_rupiah)) : 0;

      return result;
    });
  },

  validateData(data) {
    const errors = [];

    data.forEach((item, index) => {
      if (!item.jenis_penggunaan || item.jenis_penggunaan.trim() === "") {
        errors.push(`Row ${index + 1}: Jenis Penggunaan harus diisi`);
      }

      [
        "ts_2_unit_pengelola_program_studi_rupiah",
        "ts_1_unit_pengelola_program_studi_rupiah",
        "ts_unit_pengelola_program_studi_rupiah",
        "rata_rata_unit_pengelola_program_studi_rupiah",
        "ts_2_program_studi_rupiah",
        "ts_1_program_studi_rupiah",
        "ts_program_studi_rupiah",
        "rata_rata_program_studi_rupiah",
      ].forEach((field) => {
        const val = parseFloat(item[field]);
        if (isNaN(val) || val < 0) {
          errors.push(`Row ${index + 1}: Nilai ${field} tidak valid`);
        }
      });
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  prepareDataForSaving(data) {
    return data.map((item, index) => {
      return {
        ...item,
        no: index + 1,
        _timestamp: new Date().getTime(),
        selected: true,
      };
    });
  },
};

export default penggunaanDanaPlugin;
