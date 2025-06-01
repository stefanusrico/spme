import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { processExcelDataBase } from "../../../utils/tableUtils"

export class MataKuliahBasicSciencePlugin extends BasePlugin {
  constructor() {
    super({
      code: "5a3",
      name: "Mata Kuliah Basic Science dan Matematika Plugin",
      description: "Plugin untuk mata kuliah basic science dan matematika",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isMataKuliahBasicScienceSection: true,
    }
  }

  hasDefaultData() {
    return true
  }

  getDefaultData(tableCode, config = {}) {
    const now = Date.now()

    return [
      {
        key: `default-1-${now}-${Math.random().toString(36).substr(2, 5)}`,
        no: 1,
        selected: true,
        nama_mata_kuliah_basic_science_dan_matematika: "",
        semester: 0,
        jumlah_sks: 0,
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
        nama_mata_kuliah_basic_science_dan_matematika: "",
        semester: 0,
        jumlah_sks: 0,
      }

      // Process each detected field
      Object.entries(detectedIndices).forEach(([fieldName, colIndex]) => {
        if (colIndex === undefined || colIndex < 0) return

        const value = row[colIndex]

        if (fieldName === "nama_mata_kuliah_basic_science_dan_matematika") {
          item[fieldName] = PluginUtils.normalizeTextField(value)
        } else {
          item[fieldName] = PluginUtils.parseNumber(value, 0)
        }
      })

      return item
    })

    return {
      allRows: processedData,
      shouldReplaceExisting: true,
    }
  }

  async calculateScore(data, config, additionalData = {}) {
    console.log("Calculating Basic Science score with data:", data)

    if (!data || data.length === 0) {
      return {
        scores: [
          {
            butir: 47,
            nilai: 0,
          },
        ],
        scoreDetail: {
          totalSKS: 0,
        },
      }
    }

    // Filter out empty or invalid entries
    const validData = data.filter(
      (item) =>
        item.nama_mata_kuliah_basic_science_dan_matematika &&
        item.nama_mata_kuliah_basic_science_dan_matematika.trim() !== ""
    )

    // Calculate total SKS
    const totalSks = validData.reduce((sum, item) => {
      return sum + PluginUtils.parseNumber(item.jumlah_sks, 0)
    }, 0)

    // Scoring based on total SKS according to the provided criteria
    let nilai = 0
    if (totalSks >= 4) {
      nilai = 4 // PS menyediakan mata kuliah basic sciences dan matematika ≥ 4 SKS
    } else if (totalSks === 3) {
      nilai = 3 // PS menyediakan mata kuliah basic sciences dan matematika 3 SKS
    } else if (totalSks === 2) {
      nilai = 2 // PS menyediakan mata kuliah basic sciences dan matematika 2 SKS
    } else if (totalSks >= 1) {
      nilai = 1 // PS menyediakan mata kuliah basic sciences dan matematika < 2 SKS (tapi ≥ 1)
    } else {
      nilai = 0 // Tidak ada atau kurang dari 1 SKS
    }

    console.log("Basic Science Score Details:")
    console.log("- Jumlah MK:", validData.length)
    console.log("- Total SKS:", totalSks)
    console.log("- Score:", nilai)

    return {
      scores: [
        {
          butir: 47,
          nilai: nilai,
        },
      ],
      scoreDetail: {
        totalSKS: totalSks,
      },
    }
  }

  normalizeData(data, config = {}) {
    if (!Array.isArray(data)) return []

    return data
      .filter((item) => {
        // Filter out any invalid rows
        if (!item.nama_mata_kuliah_basic_science_dan_matematika) return true
        const normalized = String(
          item.nama_mata_kuliah_basic_science_dan_matematika
        )
          .toLowerCase()
          .trim()
        return !["jumlah", "total", "sum", "rata-rata", "average"].includes(
          normalized
        )
      })
      .map((item, index) => {
        const result = {
          ...item,
          id: item.id || `row-${Math.random().toString(36).substring(2, 9)}`,
          key: item.key || `row-${Math.random().toString(36).substring(2, 9)}`,
          no: index + 1,
        }

        // Normalize text fields
        result.nama_mata_kuliah_basic_science_dan_matematika =
          PluginUtils.normalizeTextField(
            result.nama_mata_kuliah_basic_science_dan_matematika
          )

        // Normalize numeric fields
        result.semester = PluginUtils.parseNumber(result.semester, 0)
        result.jumlah_sks = PluginUtils.parseNumber(result.jumlah_sks, 0)

        return result
      })
  }

  prepareDataForSaving(data, config = {}) {
    return data
      .filter((item) => {
        if (!item.nama_mata_kuliah_basic_science_dan_matematika) return true
        const normalized = String(
          item.nama_mata_kuliah_basic_science_dan_matematika
        )
          .toLowerCase()
          .trim()
        return !["jumlah", "total", "sum", "rata-rata", "average"].includes(
          normalized
        )
      })
      .map((item, index) => {
        const { id, key, _editing, _selected, ...cleanRow } = item
        return {
          ...cleanRow,
          no: index + 1,
          selected: true,
        }
      })
  }

  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      if (!item.nama_mata_kuliah_basic_science_dan_matematika) {
        errors.push(
          `Baris ${index + 1}: Nama Mata Kuliah Basic Science wajib diisi`
        )
      }

      const semester = PluginUtils.parseNumber(item.semester, 0)
      if (semester < 1 || semester > 8) {
        errors.push(
          `Baris ${index + 1}: Semester harus antara 1-8, nilai: ${semester}`
        )
      }

      const sks = PluginUtils.parseNumber(item.jumlah_sks, 0)
      if (sks < 0 || sks > 6) {
        errors.push(
          `Baris ${index + 1}: Jumlah SKS harus antara 0-6, nilai: ${sks}`
        )
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  // Method to handle field value processing
  processFieldValue(field, value, sectionCode) {
    if (field === "nama_mata_kuliah_basic_science_dan_matematika") {
      return PluginUtils.normalizeTextField(value)
    }

    if (field === "semester" || field === "jumlah_sks") {
      return PluginUtils.parseNumber(value, 0)
    }

    return value
  }
}

export const mataKuliahBasicSciencePlugin = new MataKuliahBasicSciencePlugin()

export default mataKuliahBasicSciencePlugin
