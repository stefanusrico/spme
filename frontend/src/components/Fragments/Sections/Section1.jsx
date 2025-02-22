import React, { useState, useEffect, useCallback } from "react";
import { Table, Button, Upload, message, Tooltip, Checkbox, Input, DatePicker } from "antd";
import { ScissorOutlined, UploadOutlined } from "@ant-design/icons";
import * as XLSX from "xlsx";
import { evaluate } from "mathjs";
import dayjs from 'dayjs';
import { debounce } from 'lodash';

// Custom Hooks 
const useUserData = () => {
  const [id, setId] = useState(null);
  const [prodi, setProdi] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [userError, setUserError] = useState(null);
  


  useEffect(() => {
    const fetchUserId = async () => {
      setLoadingUser(true);
      setUserError(null);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setUserError("Token tidak ditemukan. Silakan login kembali.");
          return;
        }
        const response = await fetch("http://localhost:8000/api/user", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const userData = await response.json();
        if (userData && userData.id && userData.jurusan) {
          setId(userData.id);
          setProdi(userData.jurusan);
        } else {
          setUserError("Gagal mendapatkan ID user atau data prodi");
        }
      } catch (error) {
        console.error("Error fetching user ID:", error);
        setUserError("Terjadi kesalahan saat mengambil ID user.");
      } finally {
        setLoadingUser(false);
      }
    };
    fetchUserId();
  }, []);

  return { id, prodi, loadingUser, userError };
};

const useFormulaData = (rumusId) => {
  const [formula, setFormula] = useState("");
  const [loadingFormula, setLoadingFormula] = useState(true);
  const [formulaError, setFormulaError] = useState(null);

  useEffect(() => {
    const fetchFormula = async () => {
      setLoadingFormula(true);
      setFormulaError(null);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setFormulaError("Token tidak ditemukan. Silakan login kembali.");
          return;
        }
        const response = await fetch(`http://localhost:8000/api/rumus/${rumusId}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const result = await response.json();
        if (result && result.rumus) {
          setFormula(result.rumus);
        } else {
          setFormulaError("Gagal mengambil rumus dari backend.");
        }
      } catch (error) {
        console.error("Error fetching formula:", error);
        setFormulaError("Terjadi kesalahan saat mengambil rumus.");
      } finally {
        setLoadingFormula(false);
      }
    };
    fetchFormula(rumusId);
  }, [rumusId]);

  return { formula, loadingFormula, formulaError };
};

// Table Components
const DataTable = ({ columns, dataSource, pagination = false, bordered = true, size = "small" }) => (
  <Table
    columns={columns}
    dataSource={dataSource}
    pagination={pagination}
    bordered={bordered}
    size={size}
  />
);

const ProdiDataTable = ({ data, prodi, columns }) => {
  const prodiColumns = columns.map(col => ({...col, align: 'center'})); // Align all prodi columns to center

  return (
    <DataTable
      dataSource={data}
      columns={prodiColumns}
      pagination={false}
      bordered
      size="small"
    />
  );
};


const PolbanDataTable = ({ data, columns, handleCheckboxChange }) => {

  const polbanActionColumn = {
    title: "Action",
    dataIndex: "key",
    key: "key",
    width: 5,
    align: 'center',
    render: (key) => {
      const item = data.find(item => item.key === key);
      return item?.prodi === "Polban" ? (
        <Checkbox
          checked={item?.selected ?? false}
          onChange={() => handleCheckboxChange(key)}
        />
      ) : null;
    },
  };

  const polbanColumns = [...columns.map(col => ({...col, align: 'center'})), polbanActionColumn]; // Align all polban columns to center and add action column

  return (
    <DataTable
      dataSource={data}
      columns={polbanColumns}
      pagination={false}
      bordered
      size="small"
    />
  );
};


// Score Display Component
const ScoreDisplay = ({ score }) => {
  const scoreRounded = score !== null ? score.toFixed(2) : null;
  const isGoodScore = scoreRounded > 3;
  const style = {
    marginTop: "16px",
    padding: "12px",
    borderRadius: "6px",
    backgroundColor: isGoodScore ? "#d4edda" : "#f8d7da",
    color: isGoodScore ? "#155724" : "#721c24",
    border: isGoodScore ? "1px solid #c3e6cb" : "1px solid #f5c6cb",
    textAlign: "center",
    fontWeight: "bold"
  };

  return scoreRounded !== null ? (
    <div style={style}>
      Skor Hasil Perhitungan: {scoreRounded}
    </div>
  ) : null;
};


const TataPamongSection = () => {
  const [showPolbanTable, setShowPolbanTable] = useState(false);
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [polbanData, setPolbanData] = useState([]);
  const [isUploaded, setIsUploaded] = useState(false);
  const [score, setScore] = useState(null);
  const [formula, setFormula] = useState("");
  const [editingKey, setEditingKey] = useState(null);

  const prodiId = "99999";
  const a = 2, b = 1, c = 3;
  const NDTPS = 87;
  const idRumus = '67ac99a45185102e280c5fa2';

  const { id: userId, prodi, loadingUser, userError } = useUserData();
  const { formula: fetchedFormula, loadingFormula, formulaError } = useFormulaData(idRumus);


  useEffect(() => {
    if (fetchedFormula) {
      setFormula(fetchedFormula);
    }
  }, [fetchedFormula]);

  // Excel Processing and Data Handling
  const processExcelData = useCallback((workbook, prodi) => {
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const merges = sheet["!merges"] || [];

    const getProdiFromMerge = (row, col) => {
      for (const merge of merges) {
        if (row >= merge.s.r && row <= merge.e.r && col >= merge.s.c && col <= merge.e.c) {
          const cellAddress = XLSX.utils.encode_cell({ r: merge.s.r, c: merge.s.c });
          return sheet[cellAddress]?.v;
        }
      }
      return null;
    };

    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 2 });
    const requiredColumns = { lembagamitra: 6, judulkegiatankerjasama: 8, manfaat: 18, tanggalawal: 14, tanggalakhir: 15, buktikerjasama: 13, internasional: 16, nasional: 17, lokal: 18, prodi: 3 };

    let processedData = jsonData.filter(row => row[requiredColumns.lembagamitra])
      .map((row, index) => {
        const currentProdi = getProdiFromMerge(index + 1, requiredColumns.prodi) || row[requiredColumns.prodi] || "";
        return {
          key: (index + 1).toString(),
                lembagamitra: row[requiredColumns.lembagamitra] || "",
                judulkegiatankerjasama: row[requiredColumns.judulkegiatankerjasama] || "",
                tanggalawal:  "",
                tanggalakhir:  "",
                buktikerjasama: row[requiredColumns.buktikerjasama] || "",
                internasional: Boolean(row[requiredColumns.internasional]), // <-- Perbaikan 1: Konversi ke Boolean
                nasional: Boolean(row[requiredColumns.nasional]),     // <-- Perbaikan 1: Konversi ke Boolean
                lokal: Boolean(row[requiredColumns.lokal]),        // <-- Perbaikan 1: Konversi ke Boolean
                manfaat: row[requiredColumns.manfaat] || "",
                pendidikan: row[10] === true,
                penelitian: row[11] === true,
                pkm: row[12] === true,
                selected: false,
                prodi: currentProdi,
        };
      });

    const userProdiData = processedData.filter(item => item.prodi === prodi);
    const unselectedPolbanData = processedData.filter(item => item.prodi === "Polban" && !item.selected);

    console.log("Data setelah di-process dari Excel:", userProdiData);
    console.log("Data setelah proses:" ,unselectedPolbanData);
    return { processedData, userProdiData, unselectedPolbanData };

  }, [prodi]);


  const calculateScore = useCallback((dataToScore) => {
    if (formula) {
      const N1 = dataToScore.filter(item => item.pendidikan).length;
      const N2 = dataToScore.filter(item => item.penelitian).length;
      const N3 = dataToScore.filter(item => item.pkm).length;
      try {
        const calculatedScore = evaluate(formula, { N1, N2, N3, a, b, c, NDTPS });
        setScore(calculatedScore);
      } catch (err) {
        message.error("Gagal menghitung hasil berdasarkan rumus.");
        setScore(null);
      }
    } else {
      message.warning("Rumus belum tersedia, silakan coba lagi.");
      setScore(null);
    }
  }, [formula, a, b, c, NDTPS]);


  const handleUpload = (info) => {
    const file = info.file;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: "binary" });
        const { processedData, userProdiData, unselectedPolbanData } = processExcelData(workbook, prodi);

        setFilteredData(userProdiData);
        setPolbanData(unselectedPolbanData);
        setData(processedData); // Store all processed data
        calculateScore(userProdiData);


        setIsUploaded(true);
        setShowPolbanTable(true);
        message.success("File berhasil diunggah!");


      } catch (error) {
        message.error("Format file tidak valid.");
        console.error("Error saat upload:", error);
      }
    };
    reader.readAsBinaryString(file);
  };


  const handleCheckboxChange = useCallback((key) => {
    const newData = data.map(item =>
      item.key === key ? { ...item, selected: !item.selected } : item
    );
    setData(newData);

    const selectedPolbanData = newData.filter(item => item.prodi === "Polban" && item.selected);
    const userProdiData = newData.filter(item => item.prodi === prodi);
    const combinedData = userProdiData.concat(selectedPolbanData);


    setFilteredData(combinedData);
    setPolbanData(newData.filter(item => item.prodi === "Polban" && !item.selected));
    calculateScore(combinedData);

  }, [data, prodi, calculateScore]);


  const handleSaveData = useCallback(() => {
    const selectedPolbanItems = data.filter(item => item.selected && item.prodi === 'Polban');
    const prodiItems = data.filter(item => item.prodi === prodi && !item.selected);
    const combinedData = [...prodiItems, ...selectedPolbanItems];


    setData(combinedData); // Update main data state
    setFilteredData(combinedData);
    setPolbanData([]);
    setShowPolbanTable(false);
    message.success("Data berhasil disimpan.");
  }, [data, prodi]);

  const handleDataChange = useCallback((key, dataIndex, newValue) => {
    const newData = data.map(item => {
        if (item.key === key) {
            return { ...item, [dataIndex]: newValue };
        }
        return item;
    });
    setData(newData);
    console.log("Data setelah perubahan:", newData);
    
    const selectedPolbanData = newData.filter(item => item.prodi === "Polban" && item.selected);
    const userProdiData = newData.filter(item => item.prodi === prodi);
    const combinedData = userProdiData.concat(selectedPolbanData);
    setFilteredData(combinedData); // Perbarui filteredData
    console.log("Filtered Data setelah perubahan:", combinedData); // Log combinedData yang sudah difilter
}, [data, setData, filteredData]);

  const debouncedHandleDataChange = useCallback(debounce(handleDataChange, 300), [handleDataChange]); // 300ms delay

  const handleAddRow = useCallback(() => {
    const newData = [...data]; // Salin data state yang sudah ada
    const newRow = { // Buat objek data baris baru dengan nilai default kosong
        key: Date.now(), // Gunakan timestamp sebagai key unik (bisa juga menggunakan library uuid)
        prodi: prodi, // Set prodi sesuai dengan prodi user saat ini
        lembagamitra: "",
        internasional: null,
        nasional: null,
        lokal: null,
        judulkegiatankerjasama: "",
        manfaat: "",
        tanggalawal: null,
        tanggalakhir: null,
        buktikerjasama: "",
        selected: false, // Default selected false untuk baris baru
    };
    newData.push(newRow); // Tambahkan baris baru ke newData
    setData(newData); // Update state data dengan baris baru

    // Update filteredData agar baris baru langsung muncul di tabel
    const selectedPolbanData = newData.filter(item => item.prodi === "Polban" && item.selected);
    const userProdiData = newData.filter(item => item.prodi === prodi);
    const combinedData = userProdiData.concat(selectedPolbanData);
    setFilteredData(combinedData);
    console.log("Baris baru ditambahkan:", newRow); // Log untuk debugging
}, [data, setData, prodi, setFilteredData]);

  const prodiDataTableColumns = [
    { title: "No", dataIndex: "key", key: "key", width: 10, render: (text, record, index) => index + 1 },
    {
      title: "Lembaga Mitra",
      dataIndex: "lembagamitra",
      key: "lembagamitra",
      width: 10,
      render: (text, record) => {
          const isEditing = record.key === editingKey;
          return isEditing ? (
              <Input
                  defaultValue={text}
                  onChange={(e) => debouncedHandleDataChange(record.key, "lembagamitra", e.target.value)}
                  onBlur={() => setEditingKey(null)}
              />
          ) : (
              <span onClick={() => setEditingKey(record.key)} style={{ cursor: 'pointer' }}>{text || "-"}</span>
          );
      },
  },
  {
    title: "Tingkat",
    children: [
        {
            title: "Internasional",
            dataIndex: "internasional",
            key: "internasional",
            width: 3,
            render: (text, record) => {
                const isEditing = record.key === editingKey;
                return isEditing ? (
                    <Checkbox
                        checked={Boolean(text)}
                        onChange={(e) => {
                            console.log("Internasional Checkbox onChange TERPICU!"); // Tambahkan console.log
                            console.log("  e.target.checked:", e.target.checked); // Log nilai e.target.checked
                            console.log("  Mengirim ke debouncedHandleDataChange:", e.target.checked); // Log nilai yang dikirim
                            debouncedHandleDataChange(record.key, "internasional", e.target.checked);
                        }}
                        placeholder={!Boolean(text) ? '❌' : ''}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    />
                ) : (
                    <span onClick={() => setEditingKey(record.key)} style={{ cursor: 'pointer' }}>
                        {Boolean(text) ? '✅' : (text === false ? '❌' : '-')}
                    </span>
                );
            },
        },
        {
            title: "Nasional",
            dataIndex: "nasional",
            key: "nasional",
            width: 3,
            render: (text, record) => {
                const isEditing = record.key === editingKey;
                return isEditing ? (
                    <Checkbox
                        checked={Boolean(text)}
                        onChange={(e) => {
                            console.log("Nasional Checkbox onChange TERPICU!"); // Tambahkan console.log
                            console.log("  e.target.checked:", e.target.checked); // Log nilai e.target.checked
                            console.log("  Mengirim ke debouncedHandleDataChange:", e.target.checked); // Log nilai yang dikirim
                            debouncedHandleDataChange(record.key, "nasional", e.target.checked);
                        }}
                        placeholder={!Boolean(text) ? '❌' : ''}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    />
                ) : (
                    <span onClick={() => setEditingKey(record.key)} style={{ cursor: 'pointer' }}>
                        {Boolean(text) ? '✅' : (text === false ? '❌' : '-')}
                    </span>
                );
            },
        },
        {
            title: "lokal",
            dataIndex: "lokal",
            key: "lokal",
            width: 3,
            render: (text, record) => {
                const isEditing = record.key === editingKey;
                return isEditing ? (
                    <Checkbox
                        checked={Boolean(text)}
                        onChange={(e) => {
                            console.log("Lokal Checkbox onChange TERPICU!"); // Tambahkan console.log
                            console.log("  e.target.checked:", e.target.checked); // Log nilai e.target.checked
                            console.log("  Mengirim ke debouncedHandleDataChange:", e.target.checked); // Log nilai yang dikirim
                            debouncedHandleDataChange(record.key, "lokal", e.target.checked);
                        }}
                        placeholder={!Boolean(text) ? '❌' : ''}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    />
                ) : (
                    <span onClick={() => setEditingKey(record.key)} style={{ cursor: 'pointer' }}>
                        {Boolean(text) ? '✅' : (text === false ? '❌' : '-')}
                    </span>
                );
            },
        }
    ]
},
  {
    title: "Judul Kegiatan Kerjasama",
    dataIndex: "judulkegiatankerjasama",
    key: "judulkegiatankerjasama",
    width: 5,
    render: (text, record) => {
        const isEditing = record.key === editingKey;
        return isEditing ? (
            <Input
                defaultValue={text}
                onChange={(e) => debouncedHandleDataChange(record.key, "judulkegiatankerjasama", e.target.value)}
                onBlur={() => setEditingKey(null)}
            />
        ) : (
            <span onClick={() => setEditingKey(record.key)} style={{ cursor: 'pointer' }}>{text || "-"}</span>
        );
    },
},
    {
      title: "Manfaat bagi PS yang diakreditasi",
      dataIndex: "manfaat",
      key: "manfaat",
      width: 600,
      render: (text, record) => {
        const isEditing = record.key === editingKey;
        return isEditing ? (
            <Input
                defaultValue={text}
                onChange={(e) => debouncedHandleDataChange(record.key, "manfaat", e.target.value)}
                onBlur={() => setEditingKey(null)}
            />
        ) : (
            // Kondisi DIHAPUS: Input selalu bisa di-trigger, bahkan saat kolom kosong
            <span onClick={() => setEditingKey(record.key)} style={{ cursor: 'pointer' }}>{text || "Tuliskan Manfaat!"}</span>
            // Placeholder "-" tetap ditampilkan jika text kosong
        );
    },
    },
    {
      title: "Tanggal Awal Kerjasama",
      dataIndex: "tanggalawal",
      key: "tanggalawal",
      width: 130,
      render: (text, record) => {
        const isEditing = record.key === editingKey;
        return isEditing ? (
          <DatePicker // <-- Kembali ke onChange, HAPUS onBlur dan onOpenChange
                defaultValue={text ? dayjs(text) : null}
                format="YYYY-MM-DD"
                onChange={(date, dateString) => { // <-- Gunakan kembali onChange
                    console.log("DatePicker Tanggal Awal onChange TERPICU! Nilai dateString:", dateString);
                    debouncedHandleDataChange(record.key, "tanggalawal", dateString); // <-- Kembalikan debouncedHandleDataChange
                }}
                // onBlur={() => setEditingKey(null)} // <-- HAPUS onBlur sepenuhnya
                // onOpenChange={() => { if (!open) { setEditingKey(null); } }} // <-- HAPUS onOpenChange sepenuhnya
            />
        ) : (
            // Kondisi DIHAPUS: Input selalu bisa di-trigger, bahkan saat kolom kosong
            <span onClick={() => setEditingKey(record.key)} style={{ cursor: 'pointer' }}>{text || "Pilih tanggal"}</span>
            // Placeholder "-" tetap ditampilkan jika text kosong
        );
    },

    },
    {
      title: "Tanggal Akhir Kerjasama",
      dataIndex: "tanggalakhir",
      key: "tanggalakhir",
      width: 130,
      render: (text, record) => {
        const isEditing = record.key === editingKey;
        return isEditing ? (
          <DatePicker // <-- Kembali ke onChange, HAPUS onBlur dan onOpenChange
          defaultValue={text ? dayjs(text) : null}
          format="YYYY-MM-DD"
          onChange={(date, dateString) => { // <-- Gunakan kembali onChange
              console.log("DatePicker Tanggal Akhir onChange TERPICU! Nilai dateString:", dateString);
              debouncedHandleDataChange(record.key, "tanggalakhir", dateString); // <-- Kembalikan debouncedHandleDataChange
          }}
          // onBlur={() => setEditingKey(null)} // <-- HAPUS onBlur sepenuhnya
          // onOpenChange={() => { if (!open) { setEditingKey(null); } }} // <-- HAPUS onOpenChange sepenuhnya
      />
        ) : (
            // Kondisi DIHAPUS: Input selalu bisa di-trigger, bahkan saat kolom kosong
            <span onClick={() => setEditingKey(record.key)} style={{ cursor: 'pointer' }}>{text || "Pilih tanggal"}</span>
            // Placeholder "-" tetap ditampilkan jika text kosong
        );
    },

    },
    {
      title: "Bukti Kerjasama",
      dataIndex: "buktikerjasama",
      key: "buktikerjasama",
      render: (text, record) => { // Modifikasi fungsi render
          const isEditing = record.key === editingKey;
          return isEditing ? (
              <Input // Mode Edit: Tampilkan Input
                  defaultValue={text}
                  onChange={(e) => debouncedHandleDataChange(record.key, "buktikerjasama", e.target.value)}
                  onBlur={() => setEditingKey(null)}
              />
          ) : ( // Mode Tampilan: Tampilkan Link atau "-"
              text ? ( // Pastikan text tidak kosong atau null
                  <a href={text} target="_blank" rel="noopener noreferrer">
                      Link
                  </a>
              ) : (
                <span onClick={() => setEditingKey(record.key)} style={{ cursor: 'pointer' }}>{text || "Masukkan Link"}</span> // Atau tampilan lain jika tidak ada link, contoh: "-" atau "Tidak Ada"
              )
          );
      },
  },
  ];

  const polbanDataTableColumns = [...prodiDataTableColumns]; // Re-use prodi columns, Polban table has same columns

  if (loadingUser || loadingFormula) return <div>Loading...</div>;
  if (userError || formulaError) return <div>Error: {userError || formulaError}</div>;


  return (
    <div>
      <h2>1. Tata Pamong, Tata Kelola, dan Kerjasama</h2>
      <h3>a. Kerjasama</h3>
      <Upload beforeUpload={() => false} onChange={handleUpload} showUploadList={false} accept=".xlsx,.xls">
        <Tooltip title="Unggah file Excel">
          <Button icon={<UploadOutlined />}>{isUploaded ? "File Diupload!" : "Upload Excel"}</Button>
        </Tooltip>
      </Upload>

      <Button onClick={handleAddRow} type="primary" style={{ marginBottom: 16 }}>
      Tambah Baris Baru
      </Button>
      <ScoreDisplay score={score}/>
      {/* Tabel data prodi */}
      <ProdiDataTable
        data={filteredData}
        columns={prodiDataTableColumns}
      />

      <Button type="primary" onClick={handleSaveData} style={{marginTop: '16px'}}>Simpan Data</Button>

      {/* Tabel data polban */}
      {showPolbanTable && (
        <PolbanDataTable
          data={polbanData}
          columns={polbanDataTableColumns}
          handleCheckboxChange={handleCheckboxChange}
        />
      )}
    </div>
  );
};

export default TataPamongSection;