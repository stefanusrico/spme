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

    // Pemetaan dari Excel ke field yang kita inginkan
    // Asumsi:
    // row[0] atau detectedIndices['no'] -> Nomor (jika ada)
    // row[1] atau detectedIndices['aspek_yang_diukur'] -> Aspek yang diukur (TKM1, TKM2, ...)
    // row[2] atau detectedIndices['tingkat_sangat_baik'] -> Jumlah Sangat Baik
    // row[3] atau detectedIndices['tingkat_baik'] -> Jumlah Baik
    // row[4] atau detectedIndices['tingkat_cukup'] -> Jumlah Cukup
    // row[5] atau detectedIndices['tingkat_kurang'] -> Jumlah Kurang
    // row[6] atau detectedIndices['rencana_tindak_lanjut_oleh_upps_ps'] -> Rencana Tindak Lanjut

    const processedData = filteredData.map((row, index) => {
      // Fungsi untuk mengambil nilai berdasarkan detectedIndices jika tersedia, atau fallback ke index kolom
      const getValue = (fieldName, columnIndex, isNumeric = false) => {
        const value = detectedIndices && detectedIndices[fieldName] !== undefined ? row[detectedIndices[fieldName]] : row[columnIndex];
        if (isNumeric) {
          return parseFloat(String(value || "0").replace(/[^0-9.-]+/g, "")) || 0;
        }
        return value || "";
      };
      
      return {
        key: `excel-${index + 1}-${Date.now()}`,
        no: index + 1, // Nomor urut internal
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
          // Default struktur data jika kosong, sesuaikan jika perlu 5 baris default
          initialTableData[tableCode] = [];
        }
      });
    }
    return initialTableData;
  },

  calculateScore(data) {
    // 'data' di sini adalah allRows dari processExcelData
    const allRows = data && data.allRows ? data.allRows : (Array.isArray(data) ? data : []);

    if (!allRows || allRows.length === 0) {
      console.warn("Kepuasan Mahasiswa: Tidak ada data untuk dihitung skornya.");
      return {
        scores: [{ butir: "C.6.4.i", subButir: 52, nilai: 0, deskripsi: "Tingkat kepuasan mahasiswa terhadap proses pendidikan" }],
        scoreDetail: {
          aspekKepuasan: [],
          TKM_avg_skala_1_4: 0,
          TKM_persen_final: 0,
          formula_skor_akhir: "Tidak ada data.",
          note: "Tidak ada data yang diterima untuk perhitungan.",
        },
      };
    }

    const aspekKepuasanDetails = [];
    let totalNilaiTKM_i = 0;
    let jumlahAspekDenganResponden = 0;

    allRows.forEach((item, index) => {
      const sangatBaik = Number(item.tingkat_sangat_baik || 0);
      const baik = Number(item.tingkat_baik || 0);
      const cukup = Number(item.tingkat_cukup || 0);
      const kurang = Number(item.tingkat_kurang || 0);

      const totalRespondenAspek = sangatBaik + baik + cukup + kurang;

      let ai = 0, bi = 0, ci = 0, di = 0; // Persentase
      let TKM_i_skala_1_4 = 0; // Skor TKM untuk aspek ini (skala 1-4)

      if (totalRespondenAspek > 0) {
        ai = sangatBaik / totalRespondenAspek;
        bi = baik / totalRespondenAspek;
        ci = cukup / totalRespondenAspek;
        di = kurang / totalRespondenAspek;

        TKM_i_skala_1_4 = (4 * ai) + (3 * bi) + (2 * ci) + (1 * di);
        totalNilaiTKM_i += TKM_i_skala_1_4;
        jumlahAspekDenganResponden++;
      }

      aspekKepuasanDetails.push({
        aspek: item.aspek_yang_diukur || `Aspek ${index + 1}`,
        responden: { sangatBaik, baik, cukup, kurang, total: totalRespondenAspek },
        persentase: { 
            sangatBaik: (ai * 100).toFixed(2) + '%', 
            baik: (bi * 100).toFixed(2) + '%', 
            cukup: (ci * 100).toFixed(2) + '%', 
            kurang: (di * 100).toFixed(2) + '%' 
        },
        TKM_i_skala_1_4: parseFloat(TKM_i_skala_1_4.toFixed(3)),
        formula_TKM_i: totalRespondenAspek > 0 ? `(4*${ai.toFixed(3)}) + (3*${bi.toFixed(3)}) + (2*${ci.toFixed(3)}) + (1*${di.toFixed(3)})` : "Tidak ada responden"
      });
    });
    
    // Gambar menyatakan TKM = Sigma TKM_i / 5.
    // Jika jumlah aspek yang diinput (allRows.length) kurang dari 5, atau
    // jumlah aspek dengan responden kurang dari 5, perlu ada penyesuaian atau asumsi.
    // Untuk akurasi sesuai gambar, idealnya ada 5 aspek yang dinilai.
    const JUMLAH_ASPEK_SEHARUSNYA = 5;
    // Jika jumlah baris dari Excel kurang dari 5, TKM tetap dibagi 5 (nilai TKM_i yang tidak ada dianggap 0)
    // Namun, jika kita menggunakan totalNilaiTKM_i yang dihitung hanya dari aspek dengan responden,
    // pembaginya harusnya JUMLAH_ASPEK_SEHARUSNYA agar TKM tidak bias tinggi jika ada aspek kosong.
    // totalNilaiTKM_i sudah mengakumulasi nilai TKM_i dari aspek yang punya responden.
    // Jika ada aspek tanpa responden, TKM_i-nya 0 dan sudah benar.
    const TKM_avg_skala_1_4 = totalNilaiTKM_i / JUMLAH_ASPEK_SEHARUSNYA;


    // Konversi TKM ke persentase (skala 0-100%)
    // TKM_persen = ((TKM_avg_skala_1_4 - NilaiSkalaMin) / (NilaiSkalaMax - NilaiSkalaMin)) * 100
    // NilaiSkalaMin = 1 (asumsi skor terendah jika semua menjawab 'Kurang')
    // NilaiSkalaMax = 4 (asumsi skor tertinggi jika semua menjawab 'Sangat Baik')
    const TKM_persen = TKM_avg_skala_1_4 > 0 ? ((TKM_avg_skala_1_4 - 1) / (4 - 1)) * 100 : 0;
    const TKM_persen_final = Math.max(0, TKM_persen); // Pastikan tidak negatif

    let skorAkhir = 0;
    let formulaSkorAkhir = "";
    const TKM_persen_desimal_untuk_rumus = TKM_persen_final / 100;

    if (TKM_persen_final >= 75) {
      skorAkhir = 4;
      formulaSkorAkhir = `Skor = 4 (TKM ${TKM_persen_final.toFixed(2)}% >= 75%)`;
    } else if (TKM_persen_final >= 25 && TKM_persen_final < 75) {
      skorAkhir = (8 * TKM_persen_desimal_untuk_rumus) - 2;
      formulaSkorAkhir = `Skor = (8 * ${TKM_persen_desimal_untuk_rumus.toFixed(3)}) - 2 = ${skorAkhir.toFixed(3)}`;
    } else { // TKM_persen_final < 25
      skorAkhir = 0;
      formulaSkorAkhir = `Skor = 0 (TKM ${TKM_persen_final.toFixed(2)}% < 25%)`;
    }

    skorAkhir = Math.max(0, Math.min(4, parseFloat(skorAkhir.toFixed(2)))); // Pembulatan dan clamping

    console.log("=== DEBUG: Perhitungan Skor Kepuasan Mahasiswa ===");
    console.log("Detail per Aspek:", aspekKepuasanDetails);
    console.log(`Total Nilai TKM_i: ${totalNilaiTKM_i.toFixed(3)}`);
    console.log(`Jumlah Aspek dengan Responden: ${jumlahAspekDenganResponden}`);
    console.log(`TKM Rata-rata (skala 1-4): ${TKM_avg_skala_1_4.toFixed(3)}`);
    console.log(`TKM Persentase Final: ${TKM_persen_final.toFixed(2)}%`);
    console.log(`Skor Akhir: ${skorAkhir}`);


    return {
      scores: [
        {
          butir: "C.6.4.i", 
          subButir: 52, 
          nilai: skorAkhir,
          deskripsi: "Tingkat kepuasan mahasiswa terhadap proses pendidikan"
        },
      ],
      scoreDetail: {
        aspekKepuasan: aspekKepuasanDetails,
        TKM_avg_skala_1_4: parseFloat(TKM_avg_skala_1_4.toFixed(3)),
        TKM_persen_final: parseFloat(TKM_persen_final.toFixed(2)),
        formula_TKM_avg: `${totalNilaiTKM_i.toFixed(3)} / ${JUMLAH_ASPEK_SEHARUSNYA}`,
        formula_TKM_persen: TKM_avg_skala_1_4 > 0 ? `((${TKM_avg_skala_1_4.toFixed(3)} - 1) / 3) * 100` : "TKM avg <= 0",
        formula_skor_akhir: formulaSkorAkhir,
        note: `Perhitungan TKM didasarkan pada ${JUMLAH_ASPEK_SEHARUSNYA} aspek yang diharapkan. ${jumlahAspekDenganResponden} aspek memiliki data responden dari ${allRows.length} baris data yang diterima.`,
      },
    };
  },

  normalizeData(data) {
    return data.map((item) => {
      return {
        ...item,
        // Pastikan nama field di sini (tingkat_sangat_baik, dll.)
        // sama dengan yang dihasilkan oleh processExcelData
        tingkat_sangat_baik: parseFloat(String(item.tingkat_sangat_baik || "0").replace(/[^0-9.-]+/g, "")) || 0,
        tingkat_baik: parseFloat(String(item.tingkat_baik || "0").replace(/[^0-9.-]+/g, "")) || 0,
        tingkat_cukup: parseFloat(String(item.tingkat_cukup || "0").replace(/[^0-9.-]+/g, "")) || 0,
        tingkat_kurang: parseFloat(String(item.tingkat_kurang || "0").replace(/[^0-9.-]+/g, "")) || 0,
        // aspek_yang_diukur dan rencana_tindak_lanjut_oleh_upps_ps sudah string
      };
    });
  },

  validateData(data) {
    const errors = [];
    if (!Array.isArray(data)) {
        errors.push("Data utama harus berupa array.");
        return { valid: false, errors };
    }

    // Idealnya, harus ada 5 baris data untuk 5 aspek TKM
    // if (data.length !== 5) {
    //   errors.push(`Diharapkan ada 5 baris data untuk aspek kepuasan, ditemukan ${data.length} baris.`);
    // }

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
      // Opsional: cek jika semua tingkat 0 padahal aspek diisi
      // if (String(item.aspek_yang_diukur).trim() !== "" && rowTotalResponden === 0) {
      //    errors.push(`Baris ${index + 1}: Aspek '${item.aspek_yang_diukur}' diisi tetapi tidak ada data responden (semua tingkat kepuasan 0).`);
      // }
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