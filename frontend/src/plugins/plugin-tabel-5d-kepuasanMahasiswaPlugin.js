/**
 * Plugin khusus untuk section Kepuasan Mahasiswa
 */
import { processExcelDataBase } from "../utils/tableUtils"; // Pastikan path ini benar

const kepuasanMahasiswaPlugin = {
  getInfo() {
    return {
      code: "5d",
      name: "Kepuasan Mahasiswa Plugin",
      description: "Plugin for student satisfaction data processing",
    };
  },

  configureSection(config) {
    return {
      ...config,
      isKepuasanMahasiswaSection: true,
    };
  },

  async processExcelData(workbook, tableCode, config, prodiName, sectionCode) {
    const { rawData, detectedIndices } = await processExcelDataBase(
      workbook,
      tableCode,
      config,
      prodiName
    );

    console.log("=== DEBUG: Detected Indices (Kepuasan Mahasiswa) ===");
    console.table(detectedIndices);

    console.log("=== DEBUG: Raw Data (Kepuasan Mahasiswa) ===");
    console.table(rawData);

    if (rawData.length === 0) return { allRows: [] };

    const filteredData = rawData.filter((row) => {
      if (!row || row.length === 0) return false;

      const nonEmptyValues = row.filter(
        (val) => val !== undefined && val !== null && val !== ""
      );
      if (nonEmptyValues.length <= 1) return false; // Harus ada lebih dari satu sel yang terisi

      // Filter baris yang hanya berisi nomor urut, contoh: 1, 2, 3, ...
      const isSequentialNumbersRow = nonEmptyValues.every((val, idx) => {
        if (nonEmptyValues.every(v => !isNaN(parseFloat(String(v).trim())))) { // Cek jika semua adalah angka
          const num = parseInt(String(val).trim());
          return !isNaN(num) && num === idx + 1;
        }
        return false;
      });
      if (isSequentialNumbersRow && nonEmptyValues.length > 1) return false;


      const hasSummaryLabel = row.some((cell) => {
        if (typeof cell !== "string") return false;
        const normalized = String(cell).toLowerCase().trim();
        return (
          normalized === "jumlah" ||
          normalized === "total" ||
          normalized === "sum" ||
          // Hati-hati dengan "rata-rata" jika itu adalah nama aspek yang valid
          (normalized === "rata-rata" && nonEmptyValues.length > 2) || // Asumsi baris rata-rata umum punya banyak angka
          normalized === "average"
        );
      });
      if (hasSummaryLabel) return false;

      return true;
    });


    const processedData = filteredData.map((row, index) => {
      const getValue = (fieldName, columnIndex, isNumeric = false) => {
        const value = detectedIndices && detectedIndices[fieldName] !== undefined ? row[detectedIndices[fieldName]] : row[columnIndex];
        if (isNumeric) {
          return parseFloat(String(value || "0").replace(/[^0-9.-]+/g, "")) || 0;
        }
        return value || "";
      };
      
      return {
        key: `excel-<span class="math-inline">\{index \+ 1\}\-</span>{Date.now()}`,
        no: index + 1,
        selected: false,
        aspek_yang_diukur: String(getValue('aspek_yang_diukur', 1)).trim(),
        tingkat_sangat_baik: getValue('tingkat_sangat_baik', 2, true),
        tingkat_baik: getValue('tingkat_baik', 3, true),
        tingkat_cukup: getValue('tingkat_cukup', 4, true),
        tingkat_kurang: getValue('tingkat_kurang', 5, true),
        rencana_tindak_lanjut_oleh_upps_ps: String(getValue('rencana_tindak_lanjut_oleh_upps_ps', 6)).trim(),
      };
    });

    console.log("=== DEBUG: Processed Data (Kepuasan Mahasiswa) ===");
    console.table(processedData);

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
        if (
          existingData &&
          existingData[tableCode] &&
          existingData[tableCode].length > 0
        ) {
          initialTableData[tableCode] = existingData[tableCode];
        } else {
          initialTableData[tableCode] = [];
        }
      });
    }
    return initialTableData;
  },

  calculateScore(data) {
    const allRows = data && data.allRows ? data.allRows : (Array.isArray(data) ? data : []);

    if (!allRows || allRows.length === 0) {
      console.warn("Kepuasan Mahasiswa: Tidak ada data untuk dihitung skornya.");
      return {
        scores: [{ butir: 52, nilai: 0 }],
        scoreDetail: {
          TKMi: [],
          TKM: 0,
        },
      };
    }

    const TKMiValues = [];
    let totalNilaiTKM_i = 0;
    const JUMLAH_ASPEK_SEHARUSNYA = 5;

    allRows.forEach((item) => {
      const sangatBaik = Number(item.tingkat_sangat_baik || 0);
      const baik = Number(item.tingkat_baik || 0);
      const cukup = Number(item.tingkat_cukup || 0);
      const kurang = Number(item.tingkat_kurang || 0);

      const totalRespondenAspek = sangatBaik + baik + cukup + kurang;

      let ai = 0, bi = 0, ci = 0, di = 0; // Persentase
      let TKMi = 0;

      if (totalRespondenAspek > 0) {
        ai = sangatBaik / totalRespondenAspek;
        bi = baik / totalRespondenAspek;
        ci = cukup / totalRespondenAspek;
        di = kurang / totalRespondenAspek;
        TKMi = parseFloat(((4 * ai) + (3 * bi) + (2 * ci) + (1 * di)).toFixed(3));
        totalNilaiTKM_i += TKMi;
        TKMiValues.push(TKMi);
      } else {
        TKMiValues.push(0); // Jika tidak ada responden, TKMi = 0
      }
    });

    const TKM_avg_skala_1_4 = totalNilaiTKM_i / JUMLAH_ASPEK_SEHARUSNYA;
    const TKM_persen_final = TKM_avg_skala_1_4 > 0 ? ((TKM_avg_skala_1_4 - 1) / 3) * 100 : 0;
    const skorAkhir = 
      TKM_persen_final >= 75 ? 4 : 
      TKM_persen_final >= 25 ? (8 * (TKM_persen_final / 100)) - 2 : 0;

    return {
      scores: [
        {
          butir: 52,
          nilai: Math.max(0, Math.min(4, parseFloat(skorAkhir.toFixed(2)))),
        },
      ],
      scoreDetail: {
        TKMi: TKMiValues,
        TKM: parseFloat(TKM_persen_final.toFixed(2)),
      },
    };
  },

  normalizeData(data) {
    return data.map((item) => {
      return {
        ...item,
        tingkat_sangat_baik: parseFloat(String(item.tingkat_sangat_baik || "0").replace(/[^0-9.-]+/g, "")) || 0,
        tingkat_baik: parseFloat(String(item.tingkat_baik || "0").replace(/[^0-9.-]+/g, "")) || 0,
        tingkat_cukup: parseFloat(String(item.tingkat_cukup || "0").replace(/[^0-9.-]+/g, "")) || 0,
        tingkat_kurang: parseFloat(String(item.tingkat_kurang || "0").replace(/[^0-9.-]+/g, "")) || 0,
      };
    });
  },

  validateData(data) {
    const errors = [];
    if (!Array.isArray(data)) {
      errors.push("Data utama harus berupa array.");
      return { valid: false, errors };
    }

    data.forEach((item, index) => {
      if (!item.aspek_yang_diukur || String(item.aspek_yang_diukur).trim() === "") {
        errors.push(`Baris ${index + 1}: 'aspek_yang_diukur' harus diisi.`);
      }

      const satisfactionLevels = [
        'tingkat_sangat_baik',
        'tingkat_baik',
        'tingkat_cukup',
        'tingkat_kurang'
      ];
      let rowTotalResponden = 0;
      satisfactionLevels.forEach(level => {
        const val = item[level];
        if (typeof val !== 'number' || val < 0) {
          errors.push(`Baris ${index + 1}: '${level}' harus berupa angka non-negatif. Ditemukan: ${val}`);
        }
        rowTotalResponden += (typeof val === 'number' ? val : 0);
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
        selected: typeof item.selected === 'boolean' ? item.selected : true,
      };
    });
  },
};

export default kepuasanMahasiswaPlugin;