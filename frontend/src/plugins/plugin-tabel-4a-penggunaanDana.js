/**
 * Plugin khusus untuk bagian Penggunaan Dana
 */
import { processExcelDataBase } from "../utils/tableUtils" // Asumsi path ini benar

const penggunaanDanaPlugin = {
  getInfo() {
    return {
      code: "4a",
      name: "Penggunaan Dana Plugin",
      description: "Plugin for processing budget usage data in LKPS Table 4.a",
    }
  },

  configureSection(config) {
    return {
      ...config,
      isPenggunaanDanaSection: true,
    }
  },

  async processExcelData(workbook, tableCode, config, prodiName, sectionCode) {
    const { rawData, detectedIndices } = await processExcelDataBase(
      workbook,
      tableCode,
      config,
      prodiName
    )

    console.log("=== DEBUG: Detected Indices (Penggunaan Dana) ===")
    console.table(detectedIndices)

    console.log("=== DEBUG: Raw Data (Penggunaan Dana) ===")
    console.table(rawData)

    if (rawData.length === 0) return { allRows: [] }

    const filteredData = rawData.filter((row) => {
      if (!row || row.length === 0) return false

      const nonEmptyValues = row.filter(
        (val) => val !== undefined && val !== null && val !== ""
      )
      if (nonEmptyValues.length <= 1) return false // Baris harus punya lebih dari 1 sel berisi

      // Hapus baris yang hanya berisi nomor urut (misal: 1, 2, 3, ...)
      const isSequentialNumbersRow = nonEmptyValues.every((val, idx) => {
        // Cek apakah semua nilai adalah angka dan merupakan urutan dari 1
        // Hanya berlaku jika semua nilai yang tidak kosong adalah angka
        if (nonEmptyValues.every(v => !isNaN(parseFloat(v)))) {
            const num = parseInt(val)
            return !isNaN(num) && num === idx + 1
        }
        return false;
      })
      if (isSequentialNumbersRow && nonEmptyValues.length > 1) return false // Lebih dari 1 angka berurutan

      const hasSummaryLabel = row.some((cell) => {
        if (typeof cell !== "string") return false
        const normalized = String(cell).toLowerCase().trim()
        return (
          normalized === "jumlah" ||
          normalized === "total" ||
          normalized === "sum" ||
          normalized === "rata-rata" || // Hati-hati jika "rata-rata" adalah nama item yang valid
          normalized === "average"
        )
      })
      // Izinkan baris "rata-rata" jika itu adalah jenis penggunaan yang valid,
      // tapi filter jika itu adalah baris summary umum dari Excel.
      // Untuk sekarang, kita biarkan filter ini aktif, dengan asumsi "rata-rata" di sini adalah summary.
      if (hasSummaryLabel) return false

      return true
    })

    const processedData = filteredData.map((row, index) => {
      const item = {
        key: `excel-${index + 1}-${Date.now()}`,
        no: index + 1, // Nomor urut berdasarkan data yang diproses
        selected: false,
        jenis_penggunaan: "",
        // Kolom untuk Unit Pengelola Program Studi (UPPS)
        ts_2_unit_pengelola_program_studi_rupiah: 0,
        ts_1_unit_pengelola_program_studi_rupiah: 0,
        ts_unit_pengelola_program_studi_rupiah: 0,
        rata_rata_unit_pengelola_program_studi_rupiah: 0, // Biasanya ini dihitung atau dari Excel
        // Kolom untuk Program Studi (PS)
        ts_2_program_studi_rupiah: 0,
        ts_1_program_studi_rupiah: 0,
        ts_program_studi_rupiah: 0,
        rata_rata_program_studi_rupiah: 0, // Biasanya ini dihitung atau dari Excel
      }

      Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
        if (colIndex === undefined || colIndex < 0) return
        const value = row[colIndex]

        if (fieldName === "jenis_penggunaan") {
          item[fieldName] = value ? String(value).trim() : ""
        } else {
          // Untuk semua field numerik lainnya
          const num = parseFloat(String(value).replace(/[^0-9.-]+/g,"")); // Bersihkan format angka
          item[fieldName] = !isNaN(num) ? Math.max(0, num) : 0
        }
      })
      return item
    })

    return {
      allRows: processedData,
      shouldReplaceExisting: true,
    }
  },

  initializeData(config, prodiName, sectionCode, existingData = {}) {
    const initialTableData = {}
    if (config && config.tables) {
      config.tables.forEach((table) => {
        const tableCode = typeof table === "object" ? table.code : table
        initialTableData[tableCode] = existingData[tableCode] || []
      })
    }
    return initialTableData
  },

  /**
   * Menghitung skor berdasarkan data penggunaan dana yang telah diproses.
   * Mengacu pada aturan skor yang diberikan dalam gambar.
   */
  calculateScore(data) {
    const allRows = data && data.allRows ? data.allRows : (Array.isArray(data) ? data : []);
    if (!allRows || allRows.length === 0) {
      console.warn("calculateScore (Penggunaan Dana): Tidak ada data (allRows) untuk diproses.");
      return {
        scores: [
          { butir: "C.5.4.a", subButir: 34, deskripsi: "Biaya operasional pendidikan", nilai: 0, rawValue: 0, formula: "Tidak ada data", sumber: "" },
          { butir: "35", subButir: 35, deskripsi: "Dana penelitian DTPS", nilai: 0, rawValue: 0, formula: "Tidak ada data", sumber: "" },
          { butir: "36", subButir: 36, deskripsi: "Dana pengabdian kepada masyarakat DTPS", nilai: 0, rawValue: 0, formula: "Tidak ada data", sumber: "" },
        ],
        scoreDetail: {
          note: "Tidak ada data (allRows) untuk diproses. Skor tidak dapat dihitung.",
          DOP: { value: 0, score: 0, note: "Data tidak ditemukan." },
          DPD: { value: 0, score: 0, note: "Data tidak ditemukan." },
          DPkMD: { value: 0, score: 0, note: "Data tidak ditemukan." },
        },
      };
    }

    // --- KONFIGURASI KATA KUNCI (HARUS DISESUAIKAN!) ---
    // Sesuaikan string ini agar cocok dengan teks di kolom 'jenis_penggunaan' Excel Anda (setelah di-lowercase dan trim).
    // Menggunakan .includes() untuk pencocokan yang lebih fleksibel.
    const KEY_BIAYA_OPERASIONAL_PENDIDIKAN = "biaya operasional pendidikan"; // Ini harus menghasilkan nilai DOP (rata-rata dana operasional pendidikan/mahasiswa/tahun)
    const KEY_DANA_PENELITIAN_DTPS = "dana penelitian dtps";
    const KEY_DANA_PENGABDIAN_DTPS = "dana pengabdian kepada masyarakat dtps"; // atau "dana pkm dtps"

    let DOP = 0; // Rata-rata dana operasional pendidikan/mahasiswa/tahun dalam 3 tahun terakhir
    let DPD = 0; // Rata-rata dana penelitian DTPS/tahun dalam 3 tahun terakhir
    let DPkMD = 0; // Rata-rata dana PkM DTPS/tahun dalam 3 tahun terakhir

    let sumberDOP = "Tidak ditemukan";
    let sumberDPD = "Tidak ditemukan";
    let sumberDPkMD = "Tidak ditemukan";

    // Helper untuk mendapatkan nilai rata-rata dari sebuah item.
    // Prioritaskan 'rata_rata_program_studi_rupiah'. Jika tidak ada/nol, hitung dari TS, TS-1, TS-2.
    // Anda mungkin perlu menyesuaikan field mana yang digunakan (program_studi vs unit_pengelola_program_studi)
    // dan bagaimana rata-rata dihitung jika tidak tersedia langsung.
    const getAverageValueForItem = (item, context) => {
      // Coba ambil dari kolom rata-rata yang mungkin sudah ada (sesuaikan nama field jika perlu)
      // Misalnya, jika data Anda ada di 'rata_rata_program_studi_rupiah'
      if (item && typeof item.rata_rata_program_studi_rupiah === 'number' && item.rata_rata_program_studi_rupiah > 0) {
        console.log(`[${context}] Menggunakan rata_rata_program_studi_rupiah: ${item.rata_rata_program_studi_rupiah}`);
        return item.rata_rata_program_studi_rupiah;
      }
      // Jika tidak, coba hitung dari 3 tahun terakhir (Program Studi)
      if (item) {
        const ts2 = typeof item.ts_2_program_studi_rupiah === 'number' ? item.ts_2_program_studi_rupiah : 0;
        const ts1 = typeof item.ts_1_program_studi_rupiah === 'number' ? item.ts_1_program_studi_rupiah : 0;
        const ts  = typeof item.ts_program_studi_rupiah === 'number'  ? item.ts_program_studi_rupiah  : 0;
        const avg = (ts2 + ts1 + ts) / 3;
        console.log(`[${context}] Menghitung rata-rata dari PS: (TS-2: ${ts2}, TS-1: ${ts1}, TS: ${ts}) / 3 = ${avg}`);
        return avg;
      }
      console.log(`[${context}] Tidak dapat menemukan atau menghitung nilai rata-rata.`);
      return 0;
    };

    allRows.forEach(row => {
      const jenisPenggunaanNormalized = String(row.jenis_penggunaan || "").toLowerCase().trim();

      // Mencari Biaya Operasional Pendidikan
      if (jenisPenggunaanNormalized.includes(KEY_BIAYA_OPERASIONAL_PENDIDIKAN)) {
        DOP = getAverageValueForItem(row, "DOP");
        sumberDOP = row.jenis_penggunaan || "Jenis Penggunaan Kosong";
      }
      // Mencari Dana Penelitian DTPS
      else if (jenisPenggunaanNormalized.includes(KEY_DANA_PENELITIAN_DTPS)) {
        DPD = getAverageValueForItem(row, "DPD");
        sumberDPD = row.jenis_penggunaan || "Jenis Penggunaan Kosong";
      }
      // Mencari Dana Pengabdian kepada Masyarakat DTPS
      else if (jenisPenggunaanNormalized.includes(KEY_DANA_PENGABDIAN_DTPS)) {
        DPkMD = getAverageValueForItem(row, "DPkMD");
        sumberDPkMD = row.jenis_penggunaan || "Jenis Penggunaan Kosong";
      }
    });

    console.log("=== DEBUG: Nilai Indikator Mentah (Penggunaan Dana) ===");
    console.log(`DOP dari '${sumberDOP}': ${DOP.toLocaleString('id-ID')}`);
    console.log(`DPD dari '${sumberDPD}': ${DPD.toLocaleString('id-ID')}`);
    console.log(`DPkMD dari '${sumberDPkMD}': ${DPkMD.toLocaleString('id-ID')}`);

    // --- Perhitungan Skor ---
    let skorDOP = 0;
    let formulaDOP = "";
    const THRESHOLD_DOP = 20000000;
    const PEMBAGI_DOP = 5000000;

    if (sumberDOP !== "Tidak ditemukan") {
        if (DOP >= THRESHOLD_DOP) {
            skorDOP = 4;
            formulaDOP = `Skor = 4 (DOP ${DOP.toLocaleString('id-ID')} >= ${THRESHOLD_DOP.toLocaleString('id-ID')})`;
        } else {
            skorDOP = DOP / PEMBAGI_DOP;
            formulaDOP = `Skor = ${DOP.toLocaleString('id-ID')} / ${PEMBAGI_DOP.toLocaleString('id-ID')} = ${skorDOP.toFixed(3)}`;
        }
        skorDOP = Math.max(0, Math.min(4, skorDOP)); // Pastikan skor antara 0 dan 4
    } else {
        formulaDOP = "Data sumber DOP tidak ditemukan.";
    }


    let skorDPD = 0;
    let formulaDPD = "";
    const THRESHOLD_DPD = 10000000;
    const PEMBAGI_DPD = 5000000;

    if (sumberDPD !== "Tidak ditemukan") {
        if (DPD >= THRESHOLD_DPD) {
            skorDPD = 4;
            formulaDPD = `Skor = 4 (DPD ${DPD.toLocaleString('id-ID')} >= ${THRESHOLD_DPD.toLocaleString('id-ID')})`;
        } else {
            skorDPD = (2 * DPD) / PEMBAGI_DPD;
            formulaDPD = `Skor = (2 * ${DPD.toLocaleString('id-ID')}) / ${PEMBAGI_DPD.toLocaleString('id-ID')} = ${skorDPD.toFixed(3)}`;
        }
        skorDPD = Math.max(0, Math.min(4, skorDPD));
    } else {
        formulaDPD = "Data sumber DPD tidak ditemukan.";
    }


    let skorDPkMD = 0;
    let formulaDPkMD = "";
    const THRESHOLD_DPKMD = 5000000;
    const PEMBAGI_DPKMD = 5000000;

    if (sumberDPkMD !== "Tidak ditemukan") {
        if (DPkMD >= THRESHOLD_DPKMD) {
            skorDPkMD = 4;
            formulaDPkMD = `Skor = 4 (DPkMD ${DPkMD.toLocaleString('id-ID')} >= ${THRESHOLD_DPKMD.toLocaleString('id-ID')})`;
        } else {
            skorDPkMD = (4 * DPkMD) / PEMBAGI_DPKMD;
            formulaDPkMD = `Skor = (4 * ${DPkMD.toLocaleString('id-ID')}) / ${PEMBAGI_DPKMD.toLocaleString('id-ID')} = ${skorDPkMD.toFixed(3)}`;
        }
        skorDPkMD = Math.max(0, Math.min(4, skorDPkMD));
    } else {
        formulaDPkMD = "Data sumber DPkMD tidak ditemukan.";
    }

    const scores = [
      { butir: "C.5.4.a", subButir: 34, deskripsi: "Biaya operasional pendidikan", nilai: parseFloat(skorDOP.toFixed(2)), rawValue: DOP, formula: formulaDOP, sumber: sumberDOP },
      { butir: "35", subButir: 35, deskripsi: "Dana penelitian DTPS", nilai: parseFloat(skorDPD.toFixed(2)), rawValue: DPD, formula: formulaDPD, sumber: sumberDPD },
      { butir: "36", subButir: 36, deskripsi: "Dana pengabdian kepada masyarakat DTPS", nilai: parseFloat(skorDPkMD.toFixed(2)), rawValue: DPkMD, formula: formulaDPkMD, sumber: sumberDPkMD },
    ];

    const noteDOP = `DOP (Rata-rata dana operasional pendidikan/MAHASISWA/tahun). Pastikan nilai ${DOP.toLocaleString('id-ID')} dari sumber '${sumberDOP}' sudah memperhitungkan pembagian dengan jumlah mahasiswa rata-rata selama 3 tahun terakhir. Jika belum, skor mungkin tidak akurat.`;

    const scoreDetail = {
      notes: [
        noteDOP,
        `Perhitungan skor Dana Penelitian DTPS (butir 35) menggunakan DPD = ${DPD.toLocaleString('id-ID')} dari sumber '${sumberDPD}'.`,
        `Perhitungan skor Dana Pengabdian Masyarakat DTPS (butir 36) menggunakan DPkMD = ${DPkMD.toLocaleString('id-ID')} dari sumber '${sumberDPkMD}'.`,
      ],
      DOP: { value: DOP, score: parseFloat(skorDOP.toFixed(2)), threshold: THRESHOLD_DOP, sumber: sumberDOP, formula: formulaDOP, note: `Skor: Jika DOP >= ${THRESHOLD_DOP.toLocaleString('id-ID')} -> 4, lainnya DOP / ${PEMBAGI_DOP.toLocaleString('id-ID')}. ${noteDOP}` },
      DPD: { value: DPD, score: parseFloat(skorDPD.toFixed(2)), threshold: THRESHOLD_DPD, sumber: sumberDPD, formula: formulaDPD, note: `Skor: Jika DPD >= ${THRESHOLD_DPD.toLocaleString('id-ID')} -> 4, lainnya (2 * DPD) / ${PEMBAGI_DPD.toLocaleString('id-ID')}.` },
      DPkMD: { value: DPkMD, score: parseFloat(skorDPkMD.toFixed(2)), threshold: THRESHOLD_DPKMD, sumber: sumberDPkMD, formula: formulaDPkMD, note: `Skor: Jika DPkMD >= ${THRESHOLD_DPKMD.toLocaleString('id-ID')} -> 4, lainnya (4 * DPkMD) / ${PEMBAGI_DPKMD.toLocaleString('id-ID')}.` },
    };
    
    console.log("=== DEBUG: Hasil Perhitungan Skor (Penggunaan Dana) ===");
    console.table(scores);
    console.log("Score Detail (Penggunaan Dana):", JSON.stringify(scoreDetail, null, 2));

    return { scores, scoreDetail };
  },

  normalizeData(data) {
    // Normalisasi ini mungkin perlu disesuaikan jika struktur data berbeda
    // atau jika ada field lain yang perlu dinormalisasi.
    return data.map((item) => {
      const result = { ...item }; // Salin item

      // Contoh normalisasi untuk field yang mungkin ada, sesuaikan dengan field Anda
      const fieldsToNormalize = [
        'ts_2_unit_pengelola_program_studi_rupiah', 'ts_1_unit_pengelola_program_studi_rupiah', 'ts_unit_pengelola_program_studi_rupiah',
        'rata_rata_unit_pengelola_program_studi_rupiah',
        'ts_2_program_studi_rupiah', 'ts_1_program_studi_rupiah', 'ts_program_studi_rupiah',
        'rata_rata_program_studi_rupiah'
      ];

      fieldsToNormalize.forEach(field => {
        if (result[field] !== undefined) {
          const val = parseFloat(String(result[field]).replace(/[^0-9.-]+/g,""));
          result[field] = !isNaN(val) ? Math.max(0, val) : 0;
        } else {
          // Jika field tidak ada, mungkin default ke 0
          result[field] = 0;
        }
      });
      
      // Normalisasi untuk field 'ts2', 'ts1', 'ts' jika ini adalah alias yang digunakan di tempat lain
      // Kode asli Anda memiliki ini, tetapi tidak jelas field mana yang mereka referensikan.
      // Jika 'ts2' adalah alias untuk 'ts_2_program_studi_rupiah', dll., maka:
      // result.ts2 = result.ts_2_program_studi_rupiah;
      // result.ts1 = result.ts_1_program_studi_rupiah;
      // result.ts  = result.ts_program_studi_rupiah;

      return result;
    });
  },

  validateData(data) {
    const errors = [];
    data.forEach((item, index) => {
      if (!item.jenis_penggunaan || String(item.jenis_penggunaan).trim() === "") {
        errors.push(`Baris ${index + 1}: Jenis Penggunaan harus diisi.`);
      }

      // Validasi untuk field-field numerik utama yang digunakan untuk perhitungan
      // Sesuaikan field yang divalidasi jika perlu
      const numericFields = [
        'ts_2_program_studi_rupiah', 'ts_1_program_studi_rupiah', 'ts_program_studi_rupiah'
        // Mungkin juga 'rata_rata_program_studi_rupiah' jika itu input langsung
      ];

      numericFields.forEach(field => {
        const val = item[field]; // Sudah dinormalisasi menjadi angka atau 0
        if (typeof val !== 'number' || val < 0) {
          // Seharusnya sudah ditangani oleh normalizeData, tapi sebagai double check
          errors.push(`Baris ${index + 1}: Nilai ${field} tidak valid (harus angka >= 0). Ditemukan: ${item[field]}`);
        }
      });
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  prepareDataForSaving(data) {
    return data.map((item, index) => ({
      ...item,
      no: index + 1, // Pastikan 'no' diupdate saat menyimpan
      _timestamp: new Date().getTime(),
      selected: typeof item.selected === 'boolean' ? item.selected : true, // Default ke true jika tidak ada
    }));
  },
};

export default penggunaanDanaPlugin;