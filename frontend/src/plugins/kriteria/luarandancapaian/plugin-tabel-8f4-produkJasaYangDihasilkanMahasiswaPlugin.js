import { processExcelDataBase } from "../../../utils/tableUtils"
import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"

export class ProdukJasaYangDihasilkanMahasiswaPlugin extends BasePlugin {
  constructor() {
    super({
      code: "8f4",
      name: "Produk/Jasa yang Dihasilkan Mahasiswa yang Diadopsi oleh Industri/Masyarakat",
      description: "Plugin for processing student innovation products",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isProdukJasaYangDihasilkanMahasiswa: true,
    }
  }

  hasDefaultData() {
    return true
  }

  getDefaultData() {
    return [
      {
        key: `default-produk-jasa-mahasiswa-${Date.now()}`,
        no: 1,
        selected: true,
        nama_mahasiswa: "",
        nama_produk_jasa: "",
        deskripsi_produk_jasa: "",
        bukti: "",
      },
    ]
  }

  async processExcelData(workbook, tableCode, config, prodiName, sectionCode) {
    const { rawData, detectedIndices } = await processExcelDataBase(
      workbook,
      tableCode,
      config,
      prodiName
    )

    if (rawData.length === 0) return { allRows: [] }

    const filteredData = PluginUtils.filterDataRows(rawData)

    const processedData = filteredData.map((row, index) => {
      const item = {
        key: `excel-${index + 1}-${Date.now()}`,
        no: index + 1,
        selected: true,
        nama_mahasiswa: "",
        nama_produk_jasa: "",
        deskripsi_produk_jasa: "",
        bukti: "",
      }

      Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
        if (colIndex === undefined || colIndex < 0) return

        const value = row[colIndex]
        item[fieldName] = PluginUtils.normalizeTextField(value)
      })

      return item
    })

    return {
      allRows: processedData,
      shouldReplaceExisting: true,
    }
  }

  normalizeData(data) {
    return data.map((item) => {
      const result = { ...item }

      const textFields = [
        "nama_mahasiswa",
        "nama_produk_jasa",
        "deskripsi_produk_jasa",
        "bukti",
      ]

      textFields.forEach((field) => {
        result[field] = PluginUtils.normalizeTextField(result[field])
      })

      return result
    })
  }

  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      if (!item.nama_mahasiswa) {
        errors.push(`Row ${index + 1}: Nama mahasiswa harus diisi`)
      }
      if (!item.nama_produk_jasa) {
        errors.push(`Row ${index + 1}: Nama produk atau jasa harus diisi`)
      }
      if (!item.deskripsi_produk_jasa) {
        errors.push(`Row ${index + 1}: Deskripsi produk atau jasa harus diisi`)
      }
      if (!item.bukti) {
        errors.push(`Row ${index + 1}: Bukti harus diisi`)
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

export const produkJasaYangDihasilkanMahasiswaPlugin =
  new ProdukJasaYangDihasilkanMahasiswaPlugin()

export default produkJasaYangDihasilkanMahasiswaPlugin
