/**
 * Plugin untuk mendata pagelaran/pameran/presentasi mahasiswa
 * Berdasarkan Tabel 8.f.2 LKPS
 */
import { processExcelDataBase } from "../utils/tableUtils";

const pagelaranPameranPlugin = {
  /**
   * Mengembalikan informasi dasar tentang plugin.
   */
  getInfo() {
    return {
      code: "8f2",
      name: "Pagelaran Pameran Plugin",
      description: "Plugin untuk mendata pagelaran/pameran/presentasi mahasiswa",
    };
  },

  /**
   * Mengkonfigurasi bagian (section) terkait.
   * @param {object} config - Konfigurasi awal.
   * @returns {object} Konfigurasi yang diperbarui.
   */
  configureSection(config) {
    return {
      ...config,
      isPagelaranPameranSection: true,
    };
  },

  /**
   * Memproses data dari file Excel.
   * @param {object} workbook - Objek workbook Excel.
   * @param {string} tableCode - Kode tabel.
   * @param {object} config - Konfigurasi tabel.
   * @param {string} prodiName - Nama program studi.
   * @param {string} sectionCode - Kode bagian.
   * @returns {Promise<object>} Objek berisi data yang telah diproses.
   */
  async processExcelData(workbook, tableCode, config, prodiName) {
    const { rawData, detectedIndices } = await processExcelDataBase(
      workbook,
      tableCode,
      config,
      prodiName
    );

    console.log("=== DEBUG: Detected Indices (Pagelaran/Pameran) ===");
    console.table(detectedIndices);
    console.log("=== DEBUG: Raw Data (Pagelaran/Pameran) ===");
    console.table(rawData);

    // Jika tidak ada data mentah, kembalikan array kosong.
    if (rawData.length === 0) return { allRows: [] };

    // Filter baris yang tidak relevan (kosong atau hanya berisi nomor).
    const filteredData = rawData.filter((row) => {
      if (!row || row.length === 0) return false;
      const nonEmptyValues = row.filter(
        (val) => val !== undefined && val !== null && String(val).trim() !== ""
      );
      // Minimal harus ada Jenis Publikasi (lebih dari 1 kolom terisi).
      return nonEmptyValues.length > 1;
    });

    // Proses dan format data yang sudah difilter.
    const processedData = filteredData.map((row, index) => {
      // Perhatikan indeks kolom, sesuaikan jika perlu berdasarkan struktur Excel LKPS 8.f.2
      // Asumsi: [0]=No, [1]=Jenis, [2]=TS-2, [3]=TS-1, [4]=TS, [5]=Jumlah
      // Kode asli menggunakan [2], [4], [5], [6]. Saya sesuaikan ke [2], [3], [4], [5].
      // Mohon verifikasi kembali urutan kolom ini.
      return {
        key: `excel-pagelaran-${index + 1}-${Date.now()}`, // Template literal diperbaiki
        no: index + 1,
        selected: false,
        jenis_publikasi: row[1] || "",
        ts_2_jumlah_judul: parseInt(row[2]) || 0,
        ts_1_jumlah_judul: parseInt(row[3]) || 0, // Diubah dari row[4]
        ts_jumlah_judul: parseInt(row[4]) || 0, // Diubah dari row[5]
        jumlah: parseInt(row[5]) || 0, // Diubah dari row[6]
      };
    });

    return {
      allRows: processedData,
      shouldReplaceExisting: true, // Menandakan data ini akan menggantikan data lama.
    };
  },

  /**
   * Menginisialisasi data awal untuk tabel.
   * @param {object} config - Konfigurasi.
   * @param {string} prodiName - Nama program studi.
   * @param {string} sectionCode - Kode bagian.
   * @param {object} existingData - Data yang sudah ada (opsional).
   * @returns {object} Data awal.
   */
  initializeData(config, prodiName, sectionCode, existingData = {}) {
    const initialTableData = {};
    if (config && config.tables) {
      config.tables.forEach((table) => {
        const tableCode = typeof table === "object" ? table.code : table;
        initialTableData[tableCode] =
          existingData?.[tableCode]?.length > 0 ? existingData[tableCode] : [];
      });
    }
    return initialTableData;
  },

  /**
   * Menghitung skor berdasarkan data yang diberikan dan jumlah mahasiswa TS.
   * @param {object | Array} data - Data pagelaran/pameran.
   * @param {number} jumlahMahasiswaTS - Jumlah mahasiswa TS.
   * @returns {object} Objek berisi skor dan detail perhitungan.
   */
  calculateScore(data, jumlahMahasiswaTS) {
    const allRows =
      data && data.allRows ? data.allRows : Array.isArray(data) ? data : [];
    const NM = jumlahMahasiswaTS = 50 || 1; // Hindari pembagian dengan nol.

    let NC1 = 0, NC2 = 0, NC3 = 0; // Wilayah, Nasional, Internasional

    // Hitung jumlah karya berdasarkan tingkat.
    allRows.forEach((item) => {
      const jenis = String(item.jenis_publikasi).toLowerCase();
      if (jenis.includes("wilayah")) NC1 += item.jumlah || 0;
      else if (jenis.includes("nasional")) NC2 += item.jumlah || 0;
      else if (jenis.includes("internasional")) NC3 += item.jumlah || 0;
    });

    // Hitung rasio.
    const RL = (NC1 / NM) * 100;
    const RN = (NC2 / NM) * 100;
    const RI = (NC3 / NM) * 100;

    // Batas persentase.
    const a = 1; // 1%
    const b = 10; // 10%
    const c = 50; // 50%

    let skor = 0;

    // Logika perhitungan skor berdasarkan matriks BAN-PT.
    if (RI > a && RN > b) {
      skor = 4;
    } else {
      const RI_calc = RI >= a && RN < b ? a : RI;
      const RN_calc = RI < a && RN >= b ? b : RN;
      const RL_calc = RL >= c ? c : RL;

      const A_calc = RI_calc / a;
      const B_calc = RN_calc / b;
      const C_calc = RL_calc / c;

      skor =
        3.75 *
        (A_calc +
          B_calc +
          C_calc / 2 -
          A_calc * B_calc -
          (A_calc * C_calc) / 2 -
          (B_calc * C_calc) / 2 +
          (A_calc * B_calc * C_calc) / 2);

      // Pastikan skor tidak negatif.
      skor = Math.max(0, skor);
    }

    // Batasi skor antara 0 dan 4, lalu format ke 2 desimal.
    const skorFinal = parseFloat(Math.max(0, Math.min(4, skor)).toFixed(2));

    return {
      scores: [{ butir: "69", nilai: skorFinal }],
      scoreDetail: {
        RL: parseFloat(RL.toFixed(2)),
        RN: parseFloat(RN.toFixed(2)),
        RI: parseFloat(RI.toFixed(2)),
        NM,
      },
    };
  },

  /**
   * Memastikan tipe data angka sudah benar (integer).
   * @param {Array} data - Data yang akan dinormalisasi.
   * @returns {Array} Data yang sudah dinormalisasi.
   */
  normalizeData(data) {
    return data.map((item) => ({
      ...item,
      ts_2_jumlah_judul: parseInt(item.ts_2_jumlah_judul, 10) || 0,
      ts_1_jumlah_judul: parseInt(item.ts_1_jumlah_judul, 10) || 0,
      ts_jumlah_judul: parseInt(item.ts_jumlah_judul, 10) || 0,
      jumlah: parseInt(item.jumlah, 10) || 0,
    }));
  },

  /**
   * Memvalidasi data, memastikan kolom yang wajib diisi sudah terisi.
   * @param {Array} data - Data yang akan divalidasi.
   * @returns {object} Objek berisi status validasi dan daftar error.
   */
  validateData(data) {
    const errors = [];
    data.forEach((item, index) => {
      if (!item.jenis_publikasi || String(item.jenis_publikasi).trim() === "") {
        errors.push(`Baris ${index + 1}: Jenis Publikasi harus diisi.`);
      }
      // Anda bisa menambahkan validasi lain di sini jika diperlukan.
    });
    return {
      valid: errors.length === 0,
      errors,
    };
  },

  /**
   * Menyiapkan data untuk disimpan (menambahkan nomor, timestamp, dll.).
   * @param {Array} data - Data yang akan disimpan.
   * @returns {Array} Data yang siap disimpan.
   */
  prepareDataForSaving(data) {
    return data.map((item, index) => ({
      ...item,
      no: index + 1,
      _timestamp: new Date().getTime(),
      selected: true, // Mungkin untuk menandai data ini dipilih untuk disimpan.
    }));
  },
};

export default pagelaranPameranPlugin;