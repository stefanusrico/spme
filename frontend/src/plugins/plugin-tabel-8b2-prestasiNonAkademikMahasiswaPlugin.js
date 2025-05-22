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
    const { rawData, detectedIndices /*, jsonData, headerRowIndex*/ } =
      await processExcelDataBase(workbook, tableCode, config, prodiName);

    console.log("=== DEBUG: Detected Indices (Prestasi Non-Akademik) ===");
    console.table(detectedIndices);
    // console.log("=== DEBUG: Raw Data (Prestasi Non-Akademik) ===");
    // console.table(rawData); // Bisa sangat panjang

    if (rawData.length === 0) return { allRows: [] };

    const filteredData = rawData.filter((row) => {
      if (!row || row.length === 0) return false;
      const nonEmptyValues = row.filter(
        (val) => val !== undefined && val !== null && String(val).trim() !== ""
      );
      // Jika hanya satu sel yang terisi, kemungkinan bukan baris data prestasi yang valid
      if (nonEmptyValues.length <= 1 && detectedIndices && Object.keys(detectedIndices).length > 2) return false;


      const allNumbersOrEmpty = nonEmptyValues.every((val) => {
        return (
          typeof val === "number" ||
          (typeof val === "string" && !isNaN(parseFloat(String(val).trim())) && String(val).trim() !== "")
        );
      });
       if (allNumbersOrEmpty && nonEmptyValues.length > 0 && nonEmptyValues.length < 3) {
          if (nonEmptyValues.every(v => String(v).length < 4)) return false; // Hindari baris seperti "1", "2"
      }

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
        key: `excel-nonakademik-${index + 1}-${Date.now()}`,
        no: index + 1,
        selected: true,
        nama_kegiatan: "",
        tingkat_lokal_wilayah: false,
        tingkat_nasional: false,
        tingkat_internasional: false,
        prestasi_yang_dicapai: "", // Field ini ada di kode lama, tapi tidak di gambar. Sesuaikan jika perlu.
        waktu_perolehan_hh_bb_tttt: null,
      };
      
      // Default mapping jika detectedIndices tidak ada atau tidak lengkap
      // Sesuaikan nomor kolom ini dengan struktur Excel Anda jika tidak menggunakan detectedIndices secara penuh
      const defaultColMapping = {
        // no: 0, // Biasanya 'no' tidak dihitung untuk skor, tapi untuk tampilan
        nama_kegiatan: 1, // Kolom B
        waktu_perolehan_hh_bb_tttt: 2, // Kolom C
        tingkat_internasional: 3, // Kolom D
        tingkat_nasional: 4, // Kolom E
        tingkat_lokal_wilayah: 5, // Kolom F
        // prestasi_yang_dicapai: 6, // Kolom G (jika ada dan digunakan)
      };

      Object.keys(item).forEach(fieldName => {
        if (fieldName === 'key' || fieldName === 'selected' || fieldName === 'no') return;

        const colIndex = detectedIndices && detectedIndices[fieldName] !== undefined 
                            ? detectedIndices[fieldName] 
                            : defaultColMapping[fieldName];
        
        if (colIndex === undefined || colIndex < 0 || colIndex >= row.length) {
            // console.warn(`[Prestasi Non-Akademik] Field '${fieldName}' tidak ditemukan mapping kolomnya atau diluar batas.`);
            return;
        }

        const value = row[colIndex];

        if (fieldName === "prestasi_yang_dicapai" || fieldName === "nama_kegiatan") {
          item[fieldName] = value ? String(value).trim() : "";
        } else if (fieldName.startsWith("tingkat_")) {
          if (typeof value === "boolean") {
            item[fieldName] = value;
          } else if (typeof value === "string") {
            const normalized = value.toLowerCase().trim();
            item[fieldName] = ["ya", "yes", "v", "1", "true", "√", "✓", "x"].includes(normalized); // Tambahkan 'x' jika umum
          } else if (typeof value === "number") {
            item[fieldName] = value > 0;
          } else {
            item[fieldName] = false;
          }
        } else if (fieldName === "waktu_perolehan_hh_bb_tttt") {
           if (typeof value === "number" && value > 20000 && value < 60000) { // Excel date serial
            item[fieldName] = value;
          } else if (value instanceof Date) {
            const excelEpoch = new Date(1899, 11, 30);
            const daysDiff = Math.floor((value.getTime() - excelEpoch.getTime()) / (24 * 60 * 60 * 1000));
            item[fieldName] = daysDiff > 0 ? daysDiff : null;
          } else if (typeof value === "string" && String(value).trim() !== "") {
            try {
              // Coba parse format umum DD/MM/YYYY atau YYYY-MM-DD atau MM/DD/YYYY
              let dateParts = String(value).split(/[\/\-.]/);
              let date;
              if (dateParts.length === 3) {
                  let day, month, year;
                  if (parseInt(dateParts[2]) > 1000 && parseInt(dateParts[1]) <=12 && parseInt(dateParts[0]) <=31) { // YYYY-MM-DD or DD.MM.YYYY (if parts[2] is year)
                      year = parseInt(dateParts[0].length === 4 ? dateParts[0] : dateParts[2]);
                      month = parseInt(dateParts[1]);
                      day = parseInt(dateParts[0].length === 4 ? dateParts[2] : dateParts[0]);
                  } else if (parseInt(dateParts[0]) <=12 && parseInt(dateParts[1]) <=31 && parseInt(dateParts[2]) > 100) { // MM/DD/YYYY
                      month = parseInt(dateParts[0]);
                      day = parseInt(dateParts[1]);
                      year = parseInt(dateParts[2]);
                  }
                  if (year && month && day) date = new Date(year, month - 1, day);
              }
              if (date && !isNaN(date.getTime())) {
                const excelEpoch = new Date(1899, 11, 30);
                const daysDiff = Math.floor((date.getTime() - excelEpoch.getTime()) / (24 * 60 * 60 * 1000));
                item[fieldName] = daysDiff > 0 ? daysDiff : null;
              } else { item[fieldName] = null; }
            } catch (e) { item[fieldName] = null; }
          } else {
            item[fieldName] = null;
          }
        }
      });
      return item;
    });
    console.log("=== DEBUG: Processed Data (Prestasi Non-Akademik) ===");
    console.table(processedData);
    return { allRows: processedData, shouldReplaceExisting: true };
  },

  initializeData: function (config, prodiName, sectionCode, existingData = {}) {
    // Sama seperti plugin akademik
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
    const NM = jumlahMahasiswaTS;

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
        scores: [{ butir: "8.b.2", subButir: 60, nilai: 0, deskripsi: "Prestasi non-akademik mahasiswa" }],
        scoreDetail: { NI, NN, NW, NM: NM || 0, RI_aktual:0, RN_aktual:0, RW_aktual:0, skor_final:0, formula_yang_digunakan:"NM tidak valid.", catatan_perhitungan: "Jumlah Mahasiswa TS (NM) harus angka positif." },
      };
    }

    const RI_aktual = NI / NM;
    const RN_aktual = NN / NM;
    const RW_aktual = NW / NM;

    // Faktor a, b, c (dalam desimal) untuk NON-AKADEMIK
    const a = 0.002; // 0.2%
    const b = 0.02;  // 2%
    const c = 0.04;  // 4%

    let skor = 0;
    let formulaSkor = "";
    let noteSkor = `NI=${NI}, NN=${NN}, NW=${NW}, NM=${NM}. RI=${RI_aktual.toFixed(5)}, RN=${RN_aktual.toFixed(5)}, RW=${RW_aktual.toFixed(5)}. a=${a}, b=${b}, c=${c}.`;
    let A_val = 0, B_val = 0, C_val = 0;
    let RI_c = RI_aktual, RN_c = RN_aktual, RW_c = RW_aktual;


    if (RI_aktual > a && RN_aktual > b) {
      skor = 4;
      formulaSkor = "Skor = 4 (RI > a DAN RN > b)";
      noteSkor += " Kondisi skor 4 terpenuhi.";
    } else {
      const syaratRumusKedua = 
        (RI_aktual > 0 && RI_aktual <= a) ||
        (RN_aktual > 0 && RN_aktual <= b) ||
        (RW_aktual > 0 && RW_aktual <= c);

      if (syaratRumusKedua) {
        let RI_calc = RI_aktual;
        let RN_calc = RN_aktual;
        let RW_calc = RW_aktual;

        if (RI_aktual >= a && RN_aktual < b) RI_calc = a;
        if (RI_aktual < a && RN_aktual >= b) RN_calc = b;
        if (RW_aktual >= c) RW_calc = c;
        
        RI_c = RI_calc; RN_c = RN_calc; RW_c = RW_calc;

        A_val = a > 0 ? RI_calc / a : 0;
        B_val = b > 0 ? RN_calc / b : 0;
        C_val = c > 0 ? RW_calc / c : 0;
        
        const term1 = (A_val + B_val + C_val) / 2;
        const term2 = A_val * B_val;
        const term3 = (A_val * C_val) / 2;
        const term4 = (B_val * C_val) / 2;
        const term5 = (A_val * B_val * C_val) / 2;
        
        const isiKurungSiku = term1 + term2 - term3 - term4 + term5;
        skor = 3.75 * isiKurungSiku;

        formulaSkor = "Skor = 3.75 * [((A+B+C)/2) + (A*B) - (A*C)/2 - (B*C)/2 + (A*B*C)/2]";
        noteSkor += ` Rumus kompleks digunakan. RI_calc=${RI_calc.toFixed(5)}, RN_calc=${RN_calc.toFixed(5)}, RW_calc=${RW_calc.toFixed(5)}. A=${A_val.toFixed(3)}, B=${B_val.toFixed(3)}, C=${C_val.toFixed(3)}.`;
      } else {
        skor = 0;
        formulaSkor = "Skor = 0 (Tidak memenuhi kondisi skor 4 atau syarat rumus kedua)";
         if (RI_aktual === 0 && RN_aktual === 0 && RW_aktual === 0 && (NI+NN+NW === 0)) {
            noteSkor += " Tidak ada prestasi sama sekali.";
        } else {
            noteSkor += " Tidak masuk kondisi skor 4 dan tidak memenuhi syarat aktivasi rumus kompleks.";
        }
      }
    }

    const skorFinal = parseFloat(Math.max(0, Math.min(4, skor)).toFixed(2));
    
    console.log("=== DEBUG: Perhitungan Skor Prestasi Non-Akademik ===");
    console.log(noteSkor);
    console.log(`Skor Mentah: ${skor}, Skor Final: ${skorFinal}`);

    return {
      scores: [
        { butir: "8.b.2", subButir: 60, nilai: skorFinal, deskripsi: "Prestasi non-akademik mahasiswa" } // Butir dan subButir disesuaikan
      ],
      scoreDetail: {
        NI, NN, NW, NM,
        RI_aktual: parseFloat(RI_aktual.toFixed(5)),
        RN_aktual: parseFloat(RN_aktual.toFixed(5)),
        RW_aktual: parseFloat(RW_aktual.toFixed(5)),
        thresholds: { a, b, c },
        rasio_yang_disesuaikan_untuk_ABC: { RI_c: parseFloat(RI_c.toFixed(5)), RN_c: parseFloat(RN_c.toFixed(5)), RW_c: parseFloat(RW_c.toFixed(5))},
        ABC_values: { A: parseFloat(A_val.toFixed(3)), B: parseFloat(B_val.toFixed(3)), C: parseFloat(C_val.toFixed(3)) },
        skor_hitung_mentah: parseFloat(skor.toFixed(5)),
        skor_final: skorFinal,
        formula_yang_digunakan: formulaSkor,
        catatan_perhitungan: noteSkor,
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
      // Field 'prestasi_yang_dicapai' ada di kode lama, tapi tidak di gambar LKPS.
      // Jika memang tidak diperlukan untuk skor (hanya untuk catatan), validasi ini bisa opsional.
      // if (!item.prestasi_yang_dicapai || String(item.prestasi_yang_dicapai).trim() === "") {
      //   errors.push(`Baris ${index + 1}: Prestasi Yang Dicapai harus diisi.`);
      // }

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