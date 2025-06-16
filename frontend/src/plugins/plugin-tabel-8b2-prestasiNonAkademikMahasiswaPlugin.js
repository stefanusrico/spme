/**
 * Plugin khusus untuk section Prestasi Non-Akademik Mahasiswa
 */
import { processExcelDataBase } from "../utils/tableUtils"; // Pastikan path ini benar

const PrestasiNonAkademikMahasiswaPlugin = {
  getInfo: function () {
    return {
      code: "8b2", // Sesuai dengan Tabel 8.b.2
      name: "Prestasi Non-Akademik Mahasiswa Plugin",
      description:
        "Plugin for student non-academic achievements data processing",
    };
  },

  configureSection: function (config) {
    return {
      ...config,
      isPrestasiNonAkademikMahasiswaSection: true,
    };
  },

  processExcelData: async function (
    workbook,
    tableCode,
    config,
    prodiName,
    sectionCode
  ) {
    const { rawData, detectedIndices } =
      await processExcelDataBase(workbook, tableCode, config, prodiName);

    console.log("=== DEBUG: Detected Indices (Prestasi Non-Akademik) ===");
    console.table(detectedIndices);
    // console.log("=== DEBUG: Raw Data (Prestasi Non-Akademik) ===");
    // console.table(rawData); // Bisa sangat panjang

    if (rawData.length === 0) return { allRows: [] };

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
        key: `excel-nonakademik-<span class="math-inline">\{index \+ 1\}\-</span>{Date.now()}`,
        no: index + 1,
        selected: true,
        nama_kegiatan: "",
        tingkat_lokal_wilayah: false,
        tingkat_nasional: false,
        tingkat_internasional: false,
        prestasi_yang_dicapai: "", // Field ini ada di kode lama, tapi tidak di gambar. Sesuaikan jika perlu.
        waktu_perolehan_hh_bb_tttt: null,
      };

      const defaultColMapping = {
        nama_kegiatan: 1,
        waktu_perolehan_hh_bb_tttt: 2,
        tingkat_internasional: 3,
        tingkat_nasional: 4,
        tingkat_lokal_wilayah: 5,
      };

      Object.keys(item).forEach(fieldName => {
        if (fieldName === 'key' || fieldName === 'selected' || fieldName === 'no') return;
        const colIndex = detectedIndices && detectedIndices[fieldName] !== undefined ? detectedIndices[fieldName] : defaultColMapping[fieldName];
        if (colIndex === undefined || colIndex < 0 || colIndex >= row.length) return;
        const value = row[colIndex];
        if (fieldName === "prestasi_yang_dicapai" || fieldName === "nama_kegiatan") item[fieldName] = value ? String(value).trim() : "";
        else if (fieldName.startsWith("tingkat_")) item[fieldName] = typeof value === "boolean" ? value : typeof value === "string" ? ["ya", "yes", "v", "1", "true", "√", "✓", "x"].includes(value.toLowerCase().trim()) : typeof value === "number" ? value > 0 : false;
        else if (fieldName === "waktu_perolehan_hh_bb_tttt") item[fieldName] = typeof value === "number" && value > 20000 && value < 60000 ? value : value instanceof Date ? Math.floor((value.getTime() - new Date(1899, 11, 30).getTime()) / (24 * 60 * 60 * 1000)) > 0 ? Math.floor((value.getTime() - new Date(1899, 11, 30).getTime()) / (24 * 60 * 60 * 1000)) : null : typeof value === "string" && String(value).trim() !== "" ? !isNaN(new Date(value).getTime()) ? Math.floor((new Date(value).getTime() - new Date(1899, 11, 30).getTime()) / (24 * 60 * 60 * 1000)) > 0 ? Math.floor((new Date(value).getTime() - new Date(1899, 11, 30).getTime()) / (24 * 60 * 60 * 1000)) : null : null : null;
      });
      return item;
    });
    console.log("=== DEBUG: Processed Data (Prestasi Non-Akademik) ===");
    console.table(processedData);
    return { allRows: processedData, shouldReplaceExisting: true };
  },

  initializeData: function (config, prodiName, sectionCode, existingData = {}) {
    const initialTableData = {};
    if (config && config.tables) {
      config.tables.forEach((table) => {
        const tableCode = typeof table === "object" ? table.code : table;
        initialTableData[tableCode] = (existingData && existingData[tableCode] && existingData[tableCode].length > 0)
          ? existingData[tableCode] : [];
      });
    }
    return initialTableData;
  },

  /**
   * Menghitung skor prestasi non-akademik mahasiswa.
   * @param {Array} data - Array objek prestasi (output dari processExcelData.allRows).
   * @param {number} jumlahMahasiswaTS - Jumlah mahasiswa aktif pada Tahun Survei (NM).
   */
  calculateScore: function (data, jumlahMahasiswaTS) {
    const allRows = data && data.allRows ? data.allRows : (Array.isArray(data) ? data : []);
    const NM = jumlahMahasiswaTS = 50; // ntar ngambil dari sumber yg real

    let NI = 0, NN = 0, NW = 0; // Jumlah prestasi Internasional, Nasional, Wilayah/Lokal

    if (!allRows || allRows.length === 0) {
      // Tidak ada data prestasi, skor akan 0 terlepas dari NM
      console.warn("Prestasi Non-Akademik: Tidak ada data prestasi untuk diproses.");
    } else {
        allRows.forEach((item) => {
          if (item.tingkat_internasional === true) NI++;
          else if (item.tingkat_nasional === true) NN++;
          else if (item.tingkat_lokal_wilayah === true) NW++;
        });
    }

    if (typeof NM !== 'number' || NM <= 0) {
      console.warn(`Prestasi Non-Akademik: Jumlah Mahasiswa TS (NM) tidak valid: ${NM}. Skor dihitung sebagai 0.`);
      return {
        scores: [{ butir: "60", nilai: 0 }],
        scoreDetail: { NI, NN, NW, NM: NM || 0 },
      };
    }

    const RI = NI / NM;
    const RN = NN / NM;
    const RW = NW / NM;

    // Faktor a, b, c (dalam desimal) untuk NON-AKADEMIK
    const a = 0.002; // 0.2%
    const b = 0.02;  // 2%
    const c = 0.04;  // 4%

    let skor = 0;
    if (RI > a && RN > b) {
      skor = 4;
    } else {
      const nilaiKompleks = 3.75 * (
        ((RI / a) + (RN / b) + (RW / c) / 2) -
        ((RI / a) * (RN / b)) -
        (((RI / a) * (RW / c)) / 2) -
        (((RN / b) * (RW / c)) / 2) +
        (((RI / a) * (RN / b) * (RW / c)) / 2)
      );
      skor = Math.max(0, nilaiKompleks);
    }

    const skorFinal = parseFloat(Math.max(0, Math.min(4, skor)).toFixed(2));

    console.log("=== DEBUG: Perhitungan Skor Prestasi Non-Akademik ===");
    console.log(`NI: ${NI}, NN: ${NN}, NW: ${NW}, NM: ${NM}`);
    console.log(`RI: ${RI.toFixed(5)}, RN: ${RN.toFixed(5)}, RW: ${RW.toFixed(5)}`);
    console.log(`Skor Final: ${skorFinal}`);

    return {
      scores: [
        { butir: "60", nilai: skorFinal }
      ],
      scoreDetail: {
        NI, NN, NW, NM,
        RI: parseFloat(RI.toFixed(5)),
        RN: parseFloat(RN.toFixed(5)),
        RW: parseFloat(RW.toFixed(5)),
      },
    };
  },

  normalizeData: function (data) { // data di sini adalah allRows
    return data.map((item) => {
      const result = { ...item };
      const booleanFields = [
        "tingkat_nasional", "tingkat_internasional", "tingkat_lokal_wilayah",
      ];
      booleanFields.forEach((field) => {
        if (result[field] !== undefined && result[field] !== null) {
          if (typeof result[field] === 'string') {
            const norm = result[field].toLowerCase().trim();
            result[field] = ["ya", "yes", "v", "1", "true", "√", "✓", "x"].includes(norm);
          } else {
            result[field] = Boolean(result[field]);
          }
        } else {
          result[field] = false;
        }
      });
      return result;
    });
  },

  validateData: function (data) { // data di sini adalah allRows
    const errors = [];
      if (!Array.isArray(data)) {
        errors.push("Data utama harus berupa array.");
        return { valid: false, errors };
      }
    data.forEach((item, index) => {
      if (!item.nama_kegiatan || String(item.nama_kegiatan).trim() === "") {
        errors.push(`Baris ${index + 1}: Nama Kegiatan harus diisi.`);
      }

      const nasional = item.tingkat_nasional === true;
      const internasional = item.tingkat_internasional === true;
      const lokal = item.tingkat_lokal_wilayah === true;

      if (!nasional && !internasional && !lokal) {
        errors.push(`Baris ${index + 1}: Minimal satu tingkat (Lokal/Wilayah, Nasional, atau Internasional) harus dipilih untuk prestasi '${item.nama_kegiatan}'.`);
      } else {
        let countSelectedLevels = 0;
        if (nasional) countSelectedLevels++;
        if (internasional) countSelectedLevels++;
        if (lokal) countSelectedLevels++;
        if (countSelectedLevels > 1) {
          errors.push(`Baris ${index + 1}: Prestasi '${item.nama_kegiatan}' hanya boleh untuk satu tingkat. Terpilih ${countSelectedLevels} tingkat.`);
        }
      }
    });
    return { valid: errors.length === 0, errors };
  },

  prepareDataForSaving: function (data) { // data di sini adalah allRows
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

export default PrestasiNonAkademikMahasiswaPlugin;