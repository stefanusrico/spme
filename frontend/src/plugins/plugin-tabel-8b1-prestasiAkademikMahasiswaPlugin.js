/**
 * Plugin khusus untuk section Prestasi Akademik Mahasiswa
 */
import { processExcelDataBase } from "../utils/tableUtils"; // Pastikan path ini benar

const PrestasiAkademikMahasiswaPlugin = {
  getInfo: function () {
    return {
      code: "8b1",
      name: "Prestasi Akademik Mahasiswa Plugin",
      description: "Plugin for student academic achievements data processing",
    };
  },

  configureSection: function (config) {
    return {
      ...config,
      isPrestasiAkademikMahasiswaSection: true,
    };
  },

  processExcelData: async function (
    workbook,
    tableCode,
    config,
    prodiName,
    sectionCode
  ) {
    const { rawData, detectedIndices /*, jsonData, headerRowIndex*/ } = // jsonData & headerRowIndex tidak digunakan
      await processExcelDataBase(workbook, tableCode, config, prodiName);

    console.log("=== DEBUG: Detected Indices (Prestasi Akademik) ===");
    console.table(detectedIndices);
    console.log("=== DEBUG: Raw Data (Prestasi Akademik) ===");
    // console.table(rawData); // Bisa sangat panjang, mungkin log sebagian jika perlu

    if (rawData.length === 0) return { allRows: [] };

    const filteredData = rawData.filter((row) => {
      if (!row || row.length === 0) return false;
      const nonEmptyValues = row.filter(
        (val) => val !== undefined && val !== null && String(val).trim() !== ""
      );
      if (nonEmptyValues.length <= 1 && detectedIndices) { // Jika hanya satu sel, itu mungkin bukan data prestasi
        // Kecuali jika tidak ada detectedIndices, kita mungkin lebih permisif
        if (Object.keys(detectedIndices).length > 2 && nonEmptyValues.length < 2) return false;
      }


      // Filter baris yang semua nilainya adalah angka (biasanya bukan baris data prestasi)
      const allNumbersOrEmpty = nonEmptyValues.every((val) => {
        return (
          typeof val === "number" ||
          (typeof val === "string" && !isNaN(parseFloat(val)) && val.trim() !== "")
        );
      });
      if (allNumbersOrEmpty && nonEmptyValues.length > 0 && nonEmptyValues.length < 3) { // Jika hanya 1-2 angka, mungkin bukan data
          // Cek apakah ini adalah baris judul numerik atau subtotal yang lolos filter lain
          // Ini heuristik, mungkin perlu disesuaikan
          if (nonEmptyValues.every(v => String(v).length < 4)) return false;
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

      // Pastikan ada nama kegiatan atau prestasi yang diisi jika menggunakan detectedIndices
      if (detectedIndices && detectedIndices.nama_kegiatan !== undefined && detectedIndices.prestasi_yang_dicapai !== undefined) {
          const namaKegiatan = row[detectedIndices.nama_kegiatan];
          const prestasiDicapai = row[detectedIndices.prestasi_yang_dicapai];
          if ((namaKegiatan === null || String(namaKegiatan).trim() === "") && 
              (prestasiDicapai === null || String(prestasiDicapai).trim() === "")) {
              // Jika kedua field utama ini kosong, anggap bukan baris data valid
              // return false; // Bisa terlalu ketat, tergantung data
          }
      }


      return true;
    });

    const processedData = filteredData.map((row, index) => {
      const item = {
        key: `excel-${index + 1}-${Date.now()}`,
        no: index + 1, // Nomor urut internal
        selected: true, // Default
        nama_kegiatan: "",
        tingkat_lokal_wilayah: false,
        tingkat_nasional: false,
        tingkat_internasional: false,
        prestasi_yang_dicapai: "",
        waktu_perolehan_hh_bb_tttt: null, // Akan diisi sebagai Excel serial date number
      };

      // Helper untuk mengambil nilai berdasarkan detectedIndices jika tersedia, atau fallback ke index kolom default
      // Ini contoh, Anda perlu mapping yang benar jika tidak ada detectedIndices
      const defaultMapping = {
        no: 0, // Contoh jika 'no' ada di kolom pertama
        nama_kegiatan: 1, // Contoh
        waktu_perolehan_hh_bb_tttt: 2, // Contoh
        tingkat_internasional: 3, // Contoh kolom untuk centang Internasional
        tingkat_nasional: 4,      // Contoh kolom untuk centang Nasional
        tingkat_lokal_wilayah: 5, // Contoh kolom untuk centang Lokal/Wilayah
        prestasi_yang_dicapai: 6, // Contoh
      };

      Object.keys(item).forEach(fieldName => {
        if (fieldName === 'key' || fieldName === 'selected' || fieldName === 'no') return; // Skip internal fields

        const colIndex = detectedIndices && detectedIndices[fieldName] !== undefined 
                            ? detectedIndices[fieldName] 
                            : defaultMapping[fieldName]; // Fallback jika tidak ada detectedIndices
        
        if (colIndex === undefined || colIndex < 0 || colIndex >= row.length) return;

        const value = row[colIndex];

        if (fieldName === "prestasi_yang_dicapai" || fieldName === "nama_kegiatan") {
          item[fieldName] = value ? String(value).trim() : "";
        } else if (fieldName.startsWith("tingkat_")) {
          if (typeof value === "boolean") {
            item[fieldName] = value;
          } else if (typeof value === "string") {
            const normalized = value.toLowerCase().trim();
            item[fieldName] = ["ya", "yes", "v", "1", "true", "√", "✓"].includes(normalized);
          } else if (typeof value === "number") {
            item[fieldName] = value > 0;
          } else {
            item[fieldName] = false;
          }
        } else if (fieldName === "waktu_perolehan_hh_bb_tttt") {
          if (typeof value === "number" && value > 0) { // Excel date serial number
            // Pastikan ini bukan angka biasa yang besar
            if (value > 20000 && value < 60000) { // Rentang umum untuk Excel dates
                 item[fieldName] = value; // Simpan sebagai Excel date serial
            } else {
                 item[fieldName] = null; // Mungkin bukan tanggal valid
            }
          } else if (value instanceof Date) {
            const excelEpoch = new Date(1899, 11, 30);
            const daysDiff = Math.floor((value.getTime() - excelEpoch.getTime()) / (24 * 60 * 60 * 1000));
            item[fieldName] = daysDiff > 0 ? daysDiff : null;
          } else if (typeof value === "string" && String(value).trim() !== "") {
            try {
              const date = new Date(value);
              if (!isNaN(date.getTime())) {
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
    console.log("=== DEBUG: Processed Data (Prestasi Akademik) ===");
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
   * Menghitung skor prestasi akademik mahasiswa.
   * @param {Array} data - Array objek prestasi (output dari processExcelData.allRows).
   * @param {number} jumlahMahasiswaTS - Jumlah mahasiswa aktif pada Tahun Survei (NM).
   */
  calculateScore: function (data, jumlahMahasiswaTS) {
    const allRows = data && data.allRows ? data.allRows : (Array.isArray(data) ? data : []);
    const NM = jumlahMahasiswaTS;

    let NI = 0, NN = 0, NW = 0; // Jumlah prestasi Internasional, Nasional, Wilayah/Lokal

    if (!allRows || allRows.length === 0) {
      console.warn("Prestasi Akademik: Tidak ada data prestasi untuk diproses.");
      // Skor tetap 0 jika tidak ada prestasi, NM tidak relevan di sini.
    } else {
        allRows.forEach((item) => {
            if (item.tingkat_internasional === true) NI++;
            else if (item.tingkat_nasional === true) NN++;
            else if (item.tingkat_lokal_wilayah === true) NW++;
        });
    }
    
    if (typeof NM !== 'number' || NM <= 0) {
      console.warn(`Prestasi Akademik: Jumlah Mahasiswa TS (NM) tidak valid: ${NM}. Skor dihitung sebagai 0.`);
      // Jika NM tidak valid, semua rasio akan tak terdefinisi atau salah, jadi skor 0.
      return {
        scores: [{ butir: "8.b.1", subButir: 59, nilai: 0, deskripsi: "Prestasi akademik mahasiswa" }],
        scoreDetail: { NI, NN, NW, NM: NM || 0, RI_aktual:0, RN_aktual:0, RW_aktual:0, skor_final:0, formula_yang_digunakan:"NM tidak valid.", catatan_perhitungan: "Jumlah Mahasiswa TS (NM) harus angka positif." },
      };
    }

    const RI_aktual = NI / NM;
    const RN_aktual = NN / NM;
    const RW_aktual = NW / NM;

    const a = 0.001; // 0.1%
    const b = 0.01;  // 1%
    const c = 0.02;  // 2%

    let skor = 0;
    let formulaSkor = "";
    let noteSkor = `NI=${NI}, NN=${NN}, NW=${NW}, NM=${NM}. RI=${RI_aktual.toFixed(5)}, RN=${RN_aktual.toFixed(5)}, RW=${RW_aktual.toFixed(5)}. a=${a}, b=${b}, c=${c}.`;
    let A_val = 0, B_val = 0, C_val = 0; // Untuk detail
    let RI_c = RI_aktual, RN_c = RN_aktual, RW_c = RW_aktual; // Untuk detail rasio yang di-adjust

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
        
        RI_c = RI_calc; RN_c = RN_calc; RW_c = RW_calc; // Simpan untuk detail

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
        skor = 0; // Default jika tidak memenuhi kondisi skor 4 atau syarat rumus kedua
        formulaSkor = "Skor = 0 (Tidak memenuhi kondisi skor 4 atau syarat rumus kedua)";
        if (RI_aktual === 0 && RN_aktual === 0 && RW_aktual === 0 && (NI+NN+NW === 0)) {
            noteSkor += " Tidak ada prestasi sama sekali.";
        } else {
            noteSkor += " Tidak masuk kondisi skor 4 dan tidak memenuhi syarat aktivasi rumus kompleks.";
        }
      }
    }

    const skorFinal = parseFloat(Math.max(0, Math.min(4, skor)).toFixed(2));

    console.log("=== DEBUG: Perhitungan Skor Prestasi Akademik ===");
    console.log(noteSkor);
    console.log(`Skor Mentah: ${skor}, Skor Final: ${skorFinal}`);

    return {
      scores: [
        { butir: "8.b.1", subButir: 59, nilai: skorFinal, deskripsi: "Prestasi mahasiswa di bidang akademik" }
      ],
      scoreDetail: {
        NI, NN, NW, NM,
        RI_aktual: parseFloat(RI_aktual.toFixed(5)),
        RN_aktual: parseFloat(RN_aktual.toFixed(5)),
        RW_aktual: parseFloat(RW_aktual.toFixed(5)),
        thresholds: { a, b, c },
        rasio_yang_disesuaikan_untuk_ABC: { RI_c: parseFloat(RI_c.toFixed(5)), RN_c: parseFloat(RN_c.toFixed(5)), RW_c: parseFloat(RW_c.toFixed(5))},
        ABC_values: { A: parseFloat(A_val.toFixed(3)), B: parseFloat(B_val.toFixed(3)), C: parseFloat(C_val.toFixed(3)) },
        skor_hitung_mentah: parseFloat(skor.toFixed(5)), // Skor sebelum clamping dan pembulatan akhir
        skor_final: skorFinal,
        formula_yang_digunakan: formulaSkor,
        catatan_perhitungan: noteSkor,
      },
    };
  },

  normalizeData: function (data) {
    return data.map((item) => {
      const result = { ...item };
      const booleanFields = [
        "tingkat_nasional", "tingkat_internasional", "tingkat_lokal_wilayah",
      ];
      booleanFields.forEach((field) => {
        if (result[field] !== undefined && result[field] !== null) {
            if (typeof result[field] === 'string') {
                const norm = result[field].toLowerCase().trim();
                result[field] = ["ya", "yes", "v", "1", "true", "√", "✓"].includes(norm);
            } else {
                 result[field] = Boolean(result[field]);
            }
        } else {
            result[field] = false; // Default jika undefined atau null
        }
      });
      // Waktu perolehan sudah dihandle di processExcelData, pastikan formatnya konsisten (misal, null jika tidak valid)
      if (item.waktu_perolehan_hh_bb_tttt && typeof item.waktu_perolehan_hh_bb_tttt !== 'number') {
          // Jika bukan angka (Excel serial), mungkin null atau string. Pastikan jadi null jika tidak valid.
          // processExcelData seharusnya sudah menghasilkan angka atau null.
      }
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
      // Tidak ada field 'prestasi_yang_dicapai' pada gambar, jadi validasi ini mungkin perlu disesuaikan
      // if (!item.prestasi_yang_dicapai) {
      //   errors.push(`Row ${index + 1}: Prestasi Yang Dicapai harus diisi`);
      // }

      const nasional = item.tingkat_nasional === true;
      const internasional = item.tingkat_internasional === true;
      const lokal = item.tingkat_lokal_wilayah === true;

      if (!nasional && !internasional && !lokal) {
        errors.push(`Baris ${index + 1}: Minimal satu tingkat (Lokal/Wilayah, Nasional, atau Internasional) harus dipilih untuk prestasi '${item.nama_kegiatan}'.`);
      } else if ((nasional && internasional) || (nasional && lokal) || (internasional && lokal)) {
        // Jika lebih dari satu tingkat terpilih untuk satu item prestasi
        if ((nasional && internasional && lokal) || 
            (nasional && internasional && !lokal) || 
            (nasional && !internasional && lokal) || 
            (!nasional && internasional && lokal)) {
             errors.push(`Baris ${index + 1}: Prestasi '${item.nama_kegiatan}' hanya boleh untuk satu tingkat (Lokal/Wilayah, Nasional, atau Internasional). Terpilih lebih dari satu.`);
        }
      }
      // Validasi waktu_perolehan_hh_bb_tttt jika diperlukan (misalnya, harus diisi dan dalam 3 tahun terakhir)
      // if (item.waktu_perolehan_hh_bb_tttt === null || item.waktu_perolehan_hh_bb_tttt === undefined) {
      //    errors.push(`Baris ${index + 1}: Waktu Perolehan untuk '${item.nama_kegiatan}' harus diisi.`);
      // }
    });
    return { valid: errors.length === 0, errors };
  },

  prepareDataForSaving: function (data) { // data di sini adalah allRows
    return data.map((item, index) => {
      return {
        ...item,
        no: index + 1, // Pastikan nomor urut benar
        _timestamp: new Date().getTime(),
        selected: typeof item.selected === 'boolean' ? item.selected : true,
      };
    });
  },
};

export default PrestasiAkademikMahasiswaPlugin;