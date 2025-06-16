import { UploadOutlined } from "@ant-design/icons"
import {
  Button,
  Checkbox,
  DatePicker,
  Input,
  message,
  Table,
  Tooltip,
  Upload,
} from "antd"
import dayjs from "dayjs"
import { debounce } from "lodash"
import React, { useCallback, useEffect, useState } from "react"
import * as XLSX from "xlsx"
import { useUser } from "../../../context/userContext"
import axiosInstance from "../../../utils/axiosConfig"
import * as math from "mathjs"

const useFormulaData = (nomor, sub) => {
  const [formula, setFormula] = useState(null)
  const [loadingFormula, setLoadingFormula] = useState(true)
  const [formulaError, setFormulaError] = useState(null)

  useEffect(() => {
    const fetchFormula = async () => {
      setLoadingFormula(true)
      setFormulaError(null)
      try {
        const response = await axiosInstance.get(`/rumus/nomor/${nomor}/${sub}`)
        const result = response.data

        if (result) {
          setFormula(result)
        } else {
          setFormulaError("Gagal mengambil rumus dari backend.")
        }
      } catch (error) {
        console.error("Error fetching formula:", error)
        setFormulaError("Terjadi kesalahan saat mengambil rumus.")
      } finally {
        setLoadingFormula(false)
      }
    }
    fetchFormula()
  }, [nomor, sub])

  return { formula, loadingFormula, formulaError }
}

const DataTable = ({
  columns,
  dataSource,
  pagination = false,
  bordered = true,
  size = "small",
}) => (
  <Table
    columns={columns}
    dataSource={dataSource}
    pagination={pagination}
    bordered={bordered}
    size={size}
  />
)
const ProdiDataTable = ({ data, prodi, columns }) => {
  const prodiColumns = columns.map((col) => ({ ...col, align: "center" }))

  return (
    <DataTable
      dataSource={data}
      columns={prodiColumns}
      pagination={false}
      bordered
      size="small"
    />
  )
}

const PolbanDataTable = ({ data, columns, handleCheckboxChange }) => {
  const polbanActionColumn = {
    title: "Action",
    dataIndex: "key",
    key: "key",
    width: 5,
    align: "center",
    render: (key) => {
      const item = data.find((item) => item.key === key)
      return item?.prodi === "Polban" ? (
        <Checkbox
          checked={item?.selected ?? false}
          onChange={() => handleCheckboxChange(key)}
        />
      ) : null
    },
  }

  const polbanColumns = [
    ...columns.map((col) => ({ ...col, align: "center" })),
    polbanActionColumn,
  ]

  return (
    <DataTable
      dataSource={data}
      columns={polbanColumns}
      pagination={false}
      bordered
      size="small"
    />
  )
}

const ScoreDisplay = ({ score }) => {
  const scoreRounded = score !== null ? score.toFixed(2) : null
  const isGoodScore = scoreRounded > 3
  const style = {
    marginTop: "16px",
    padding: "12px",
    borderRadius: "6px",
    backgroundColor: isGoodScore ? "#d4edda" : "#f8d7da",
    color: isGoodScore ? "#155724" : "#721c24",
    border: isGoodScore ? "1px solid #c3e6cb" : "1px solid #f5c6cb",
    textAlign: "center",
    fontWeight: "bold",
  }

  return scoreRounded !== null ? (
    <div style={style}>Skor Hasil Perhitungan: {scoreRounded}</div>
  ) : null
}

const TataPamongSection = () => {
  const [showPolbanTable, setShowPolbanTable] = useState(false)
  const [data, setData] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [polbanData, setPolbanData] = useState([])
  const [isUploaded, setIsUploaded] = useState(false)
  const [score, setScore] = useState(null)
  const [editingKey, setEditingKey] = useState(null)

  const NDTPS = 87
  const prodiId = "99999"
  const nomorRumus = "10"
  const subRumus = "A"

  const { userData, isLoading: loadingUser, error: userError } = useUser()
  const { formula, loadingFormula, formulaError } = useFormulaData(
    nomorRumus,
    subRumus
  )
  console.log("userData: ", userData)
  const prodi = userData?.prodi || ""
  console.log("Prodi: ", prodi)

  const processExcelData = useCallback(
    (workbook, prodi) => {
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const merges = sheet["!merges"] || []

      const getProdiFromMerge = (row, col) => {
        for (const merge of merges) {
          if (
            row >= merge.s.r &&
            row <= merge.e.r &&
            col >= merge.s.c &&
            col <= merge.e.c
          ) {
            const cellAddress = XLSX.utils.encode_cell({
              r: merge.s.r,
              c: merge.s.c,
            })
            return sheet[cellAddress]?.v
          }
        }
        return null
      }

      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 2 })
      const requiredColumns = {
        lembagamitra: 6,
        judulkegiatankerjasama: 8,
        manfaat: 18,
        tanggalawal: 14,
        tanggalakhir: 15,
        buktikerjasama: 13,
        internasional: 16,
        nasional: 17,
        lokal: 18,
        prodi: 3,
      }

      let processedData = jsonData
        .filter((row) => row[requiredColumns.lembagamitra])
        .map((row, index) => {
          const currentProdi =
            getProdiFromMerge(index + 1, requiredColumns.prodi) ||
            row[requiredColumns.prodi] ||
            ""
          return {
            key: (index + 1).toString(),
            lembagamitra: row[requiredColumns.lembagamitra] || "",
            judulkegiatankerjasama:
              row[requiredColumns.judulkegiatankerjasama] || "",
            tanggalawal: "",
            tanggalakhir: "",
            buktikerjasama: row[requiredColumns.buktikerjasama] || "",
            internasional: Boolean(row[requiredColumns.internasional]),
            nasional: Boolean(row[requiredColumns.nasional]),
            lokal: Boolean(row[requiredColumns.lokal]),
            manfaat: row[requiredColumns.manfaat] || "",
            pendidikan: row[10] === true,
            penelitian: row[11] === true,
            pkm: row[12] === true,
            selected: false,
            prodi: currentProdi,
          }
        })

      const userProdiData = processedData.filter((item) => item.prodi === prodi)
      const unselectedPolbanData = processedData.filter(
        (item) => item.prodi === "Polban" && !item.selected
      )

      console.log("Data setelah di-process dari Excel:", userProdiData)
      console.log("Data setelah proses:", unselectedPolbanData)
      return { processedData, userProdiData, unselectedPolbanData }
    },
    [prodi]
  )

  const calculateScore = useCallback(
    (dataToScore) => {
      if (formula) {
        console.log("Formula yang diterima:", formula)

        const N1 = dataToScore.filter((item) => item.pendidikan).length
        const N2 = dataToScore.filter((item) => item.penelitian).length
        const N3 = dataToScore.filter((item) => item.pkm).length

        console.log("Nilai input:", { N1, N2, N3, NDTPS })

        try {
          const params = formula.parameters || {}
          const a = params.a || 2
          const b = params.b || 1
          const c = params.c || 3

          const formulaPart = formula.main_formula.split("=")[1].trim()
          const mainFormulaString = formulaPart
            .replace(/a/g, a)
            .replace(/b/g, b)
            .replace(/c/g, c)
            .replace(/N1/g, N1)
            .replace(/N2/g, N2)
            .replace(/N3/g, N3)
            .replace(/NDTPS/g, NDTPS)

          console.log("Main Formula String:", mainFormulaString)

          // Ganti eval dengan math.evaluate
          const RK = math.evaluate(mainFormulaString)
          console.log("Nilai RK yang dihitung:", RK)

          let calculatedScore = null

          if (formula.conditions && formula.conditions.length > 0) {
            for (const condition of formula.conditions) {
              console.log("Memeriksa kondisi:", condition.condition)

              let conditionString = condition.condition
                .replace(/RK/g, RK)
                .replace(/NDTPS/g, NDTPS)
                .replace(/N1/g, N1)
                .replace(/N2/g, N2)
                .replace(/N3/g, N3)

              console.log("Kondisi untuk dievaluasi:", conditionString)

              let conditionMet = false
              try {
                // Ganti eval dengan math.evaluate
                conditionMet = math.evaluate(conditionString)
              } catch (condErr) {
                console.error("Error dalam evaluasi kondisi:", condErr)
              }

              if (conditionMet) {
                console.log(
                  "Kondisi terpenuhi, menggunakan formula:",
                  condition.formula
                )

                let formulaString = condition.formula
                  .replace(/RK/g, RK)
                  .replace(/NDTPS/g, NDTPS)
                  .replace(/N1/g, N1)
                  .replace(/N2/g, N2)
                  .replace(/N3/g, N3)

                console.log("Formula untuk dievaluasi:", formulaString)

                try {
                  // Ganti eval dengan math.evaluate
                  calculatedScore = math.evaluate(formulaString)
                  console.log("Hasil perhitungan:", calculatedScore)
                  break
                } catch (evalErr) {
                  console.error("Error dalam evaluasi formula:", evalErr)
                }
              }
            }
          }

          if (calculatedScore === null) {
            calculatedScore = RK >= 4 ? 4 : RK
            console.log("Menggunakan nilai RK langsung:", calculatedScore)
          }

          setScore(calculatedScore)
        } catch (err) {
          console.error("Error dalam perhitungan:", err)
          message.error("Gagal menghitung hasil berdasarkan rumus.")
          setScore(null)
        }
      } else {
        console.warn("Formula belum tersedia")
        message.warning("Rumus belum tersedia, silakan coba lagi.")
        setScore(null)
      }
    },
    [formula]
  )

  const handleUpload = (info) => {
    const file = info.file
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: "binary" })
        const { processedData, userProdiData, unselectedPolbanData } =
          processExcelData(workbook, prodi)

        setFilteredData(userProdiData)
        setPolbanData(unselectedPolbanData)
        setData(processedData)
        calculateScore(userProdiData)

        setIsUploaded(true)
        setShowPolbanTable(true)
        message.success("File berhasil diunggah!")
      } catch (error) {
        message.error("Format file tidak valid.")
        console.error("Error saat upload:", error)
      }
    }
    reader.readAsBinaryString(file)
  }

  const handleCheckboxChange = useCallback(
    (key) => {
      const newData = data.map((item) =>
        item.key === key ? { ...item, selected: !item.selected } : item
      )
      setData(newData)

      const selectedPolbanData = newData.filter(
        (item) => item.prodi === "Polban" && item.selected
      )
      const userProdiData = newData.filter((item) => item.prodi === prodi)
      const combinedData = userProdiData.concat(selectedPolbanData)

      setFilteredData(combinedData)
      setPolbanData(
        newData.filter((item) => item.prodi === "Polban" && !item.selected)
      )
      calculateScore(combinedData)
    },
    [data, prodi, calculateScore]
  )

  const handleSaveData = useCallback(() => {
    const selectedPolbanItems = data.filter(
      (item) => item.selected && item.prodi === "Polban"
    )
    const prodiItems = data.filter(
      (item) => item.prodi === prodi && !item.selected
    )
    const combinedData = [...prodiItems, ...selectedPolbanItems]

    setData(combinedData)
    setFilteredData(combinedData)
    setPolbanData([])
    setShowPolbanTable(false)
    message.success("Data berhasil disimpan.")
  }, [data, prodi])

  const handleDataChange = useCallback(
    (key, dataIndex, newValue) => {
      const newData = data.map((item) => {
        if (item.key === key) {
          return { ...item, [dataIndex]: newValue }
        }
        return item
      })
      setData(newData)
      console.log("Data setelah perubahan:", newData)

      const selectedPolbanData = newData.filter(
        (item) => item.prodi === "Polban" && item.selected
      )
      const userProdiData = newData.filter((item) => item.prodi === prodi)
      const combinedData = userProdiData.concat(selectedPolbanData)
      setFilteredData(combinedData)
      console.log("Filtered Data setelah perubahan:", combinedData)
    },
    [data, setData, filteredData]
  )

  const debouncedHandleDataChange = useCallback(
    debounce(handleDataChange, 300),
    [handleDataChange]
  )

  const handleAddRow = useCallback(() => {
    const newData = [...data]
    const newRow = {
      key: Date.now(),
      prodi: prodi,
      lembagamitra: "",
      internasional: null,
      nasional: null,
      lokal: null,
      judulkegiatankerjasama: "",
      manfaat: "",
      tanggalawal: null,
      tanggalakhir: null,
      buktikerjasama: "",
      selected: false,
    }
    newData.push(newRow)
    setData(newData)

    const selectedPolbanData = newData.filter(
      (item) => item.prodi === "Polban" && item.selected
    )
    const userProdiData = newData.filter((item) => item.prodi === prodi)
    const combinedData = userProdiData.concat(selectedPolbanData)
    setFilteredData(combinedData)
    console.log("Baris baru ditambahkan:", newRow)
  }, [data, setData, prodi, setFilteredData])

  const prodiDataTableColumns = [
    {
      title: "No",
      dataIndex: "key",
      key: "key",
      width: 10,
      render: (text, record, index) => index + 1,
    },
    {
      title: "Lembaga Mitra",
      dataIndex: "lembagamitra",
      key: "lembagamitra",
      width: 10,
      render: (text, record) => {
        const isEditing = record.key === editingKey
        return isEditing ? (
          <Input
            defaultValue={text}
            onChange={(e) =>
              debouncedHandleDataChange(
                record.key,
                "lembagamitra",
                e.target.value
              )
            }
            onBlur={() => setEditingKey(null)}
          />
        ) : (
          <span
            onClick={() => setEditingKey(record.key)}
            style={{ cursor: "pointer" }}
          >
            {text || "-"}
          </span>
        )
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
            const isEditing = record.key === editingKey
            return isEditing ? (
              <Checkbox
                checked={Boolean(text)}
                onChange={(e) => {
                  console.log("Internasional Checkbox onChange TERPICU!")
                  console.log("  e.target.checked:", e.target.checked)
                  console.log(
                    "  Mengirim ke debouncedHandleDataChange:",
                    e.target.checked
                  )
                  debouncedHandleDataChange(
                    record.key,
                    "internasional",
                    e.target.checked
                  )
                }}
                placeholder={!text ? "❌" : ""}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              />
            ) : (
              <span
                onClick={() => setEditingKey(record.key)}
                style={{ cursor: "pointer" }}
              >
                {text ? "✅" : text === false ? "❌" : "-"}
              </span>
            )
          },
        },
        {
          title: "Nasional",
          dataIndex: "nasional",
          key: "nasional",
          width: 3,
          render: (text, record) => {
            const isEditing = record.key === editingKey
            return isEditing ? (
              <Checkbox
                checked={Boolean(text)}
                onChange={(e) => {
                  console.log("Nasional Checkbox onChange TERPICU!")
                  console.log("  e.target.checked:", e.target.checked)
                  console.log(
                    "  Mengirim ke debouncedHandleDataChange:",
                    e.target.checked
                  )
                  debouncedHandleDataChange(
                    record.key,
                    "nasional",
                    e.target.checked
                  )
                }}
                placeholder={!text ? "❌" : ""}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              />
            ) : (
              <span
                onClick={() => setEditingKey(record.key)}
                style={{ cursor: "pointer" }}
              >
                {text ? "✅" : text === false ? "❌" : "-"}
              </span>
            )
          },
        },
        {
          title: "lokal",
          dataIndex: "lokal",
          key: "lokal",
          width: 3,
          render: (text, record) => {
            const isEditing = record.key === editingKey
            return isEditing ? (
              <Checkbox
                checked={Boolean(text)}
                onChange={(e) => {
                  console.log("Lokal Checkbox onChange TERPICU!")
                  console.log("  e.target.checked:", e.target.checked)
                  console.log(
                    "  Mengirim ke debouncedHandleDataChange:",
                    e.target.checked
                  )
                  debouncedHandleDataChange(
                    record.key,
                    "lokal",
                    e.target.checked
                  )
                }}
                placeholder={!text ? "❌" : ""}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              />
            ) : (
              <span
                onClick={() => setEditingKey(record.key)}
                style={{ cursor: "pointer" }}
              >
                {text ? "✅" : text === false ? "❌" : "-"}
              </span>
            )
          },
        },
      ],
    },
    {
      title: "Judul Kegiatan Kerjasama",
      dataIndex: "judulkegiatankerjasama",
      key: "judulkegiatankerjasama",
      width: 5,
      render: (text, record) => {
        const isEditing = record.key === editingKey
        return isEditing ? (
          <Input
            defaultValue={text}
            onChange={(e) =>
              debouncedHandleDataChange(
                record.key,
                "judulkegiatankerjasama",
                e.target.value
              )
            }
            onBlur={() => setEditingKey(null)}
          />
        ) : (
          <span
            onClick={() => setEditingKey(record.key)}
            style={{ cursor: "pointer" }}
          >
            {text || "-"}
          </span>
        )
      },
    },
    {
      title: "Manfaat bagi PS yang diakreditasi",
      dataIndex: "manfaat",
      key: "manfaat",
      width: 600,
      render: (text, record) => {
        const isEditing = record.key === editingKey
        return isEditing ? (
          <Input
            defaultValue={text}
            onChange={(e) =>
              debouncedHandleDataChange(record.key, "manfaat", e.target.value)
            }
            onBlur={() => setEditingKey(null)}
          />
        ) : (
          <span
            onClick={() => setEditingKey(record.key)}
            style={{ cursor: "pointer" }}
          >
            {text || "Tuliskan Manfaat!"}
          </span>
        )
      },
    },
    {
      title: "Tanggal Awal Kerjasama",
      dataIndex: "tanggalawal",
      key: "tanggalawal",
      width: 130,
      render: (text, record) => {
        const isEditing = record.key === editingKey
        return isEditing ? (
          <DatePicker
            defaultValue={text ? dayjs(text) : null}
            format="YYYY-MM-DD"
            onChange={(date, dateString) => {
              console.log(
                "DatePicker Tanggal Awal onChange TERPICU! Nilai dateString:",
                dateString
              )
              debouncedHandleDataChange(record.key, "tanggalawal", dateString)
            }}
          />
        ) : (
          <span
            onClick={() => setEditingKey(record.key)}
            style={{ cursor: "pointer" }}
          >
            {text || "Pilih tanggal"}
          </span>
        )
      },
    },
    {
      title: "Tanggal Akhir Kerjasama",
      dataIndex: "tanggalakhir",
      key: "tanggalakhir",
      width: 130,
      render: (text, record) => {
        const isEditing = record.key === editingKey
        return isEditing ? (
          <DatePicker
            defaultValue={text ? dayjs(text) : null}
            format="YYYY-MM-DD"
            onChange={(date, dateString) => {
              console.log(
                "DatePicker Tanggal Akhir onChange TERPICU! Nilai dateString:",
                dateString
              )
              debouncedHandleDataChange(record.key, "tanggalakhir", dateString)
            }}
          />
        ) : (
          <span
            onClick={() => setEditingKey(record.key)}
            style={{ cursor: "pointer" }}
          >
            {text || "Pilih tanggal"}
          </span>
        )
      },
    },
    {
      title: "Bukti Kerjasama",
      dataIndex: "buktikerjasama",
      key: "buktikerjasama",
      render: (text, record) => {
        const isEditing = record.key === editingKey
        return isEditing ? (
          <Input
            defaultValue={text}
            onChange={(e) =>
              debouncedHandleDataChange(
                record.key,
                "buktikerjasama",
                e.target.value
              )
            }
            onBlur={() => setEditingKey(null)}
          />
        ) : text ? (
          <a href={text} target="_blank" rel="noopener noreferrer">
            Link
          </a>
        ) : (
          <span
            onClick={() => setEditingKey(record.key)}
            style={{ cursor: "pointer" }}
          >
            {text || "Masukkan Link"}
          </span>
        )
      },
    },
  ]

  const polbanDataTableColumns = [...prodiDataTableColumns]

  if (loadingUser || loadingFormula) return <div>Loading...</div>
  if (userError || formulaError)
    return <div>Error: {userError || formulaError}</div>

  return (
    <div>
      <h2>1. Tata Pamong, Tata Kelola, dan Kerjasama</h2>
      <h3>a. Kerjasama</h3>
      {formula && (
        <div style={{ marginBottom: "16px" }}>
          <h4>Rumus:</h4>
          <p>{formula.main_formula}</p>
          <p>{formula.description}</p>
          <p>NDTPS: {NDTPS}</p>
          <p>Catatan: {formula.notes}</p>
        </div>
      )}
      <Upload
        beforeUpload={() => false}
        onChange={handleUpload}
        showUploadList={false}
        accept=".xlsx,.xls"
      >
        <Tooltip title="Unggah file Excel">
          <Button icon={<UploadOutlined />}>
            {isUploaded ? "File Diupload!" : "Upload Excel"}
          </Button>
        </Tooltip>
      </Upload>

      <Button
        onClick={handleAddRow}
        type="primary"
        style={{ marginBottom: 16 }}
      >
        Tambah Baris Baru
      </Button>
      <ScoreDisplay score={score} />
      {/* Tabel data prodi */}
      <ProdiDataTable data={filteredData} columns={prodiDataTableColumns} />

      <Button
        type="primary"
        onClick={handleSaveData}
        style={{ marginTop: "16px" }}
      >
        Simpan Data
      </Button>

      {/* Tabel data polban */}
      {showPolbanTable && (
        <PolbanDataTable
          data={polbanData}
          columns={polbanDataTableColumns}
          handleCheckboxChange={handleCheckboxChange}
        />
      )}
    </div>
  )
}

export default TataPamongSection
