import { BasePlugin } from "../../core/BasePlugin.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { fetchScoreDetails } from "../../../utils/fetchScoreDetail.js"

export class ProdukJasaDtpsYangDiadopsiOlehIndustriMasyarakatPlugin extends BasePlugin {
  constructor() {
    super({
      code: "3b7",
      name: "Produk/Jasa DTPS yang Diadopsi oleh Industri/Masyarakat",
      description:
        "Plugin for processing Produk/Jasa DTPS yang Diadopsi oleh Industri/Masyarakat",
    })
  }

  configureSection(config) {
    return {
      ...config,
      isProdukJasaDtps: true,
    }
  }

  hasDefaultData() {
    return false
  }

  // ✅ Use dynamic base processing
  async processExcelData(workbook, tableCode, config, prodiName, sectionCode) {
    return super.processExcelData(
      workbook,
      tableCode,
      config,
      prodiName,
      sectionCode
    )
  }

  // ✅ Dynamic field mapping
  mapProdukJasaFields(sampleItem) {
    return {
      nama_dosen: this.findFieldByPattern(sampleItem, [
        "nama_dosen",
        "nama",
        "dosen",
      ]),
      nama_produk_jasa: this.findFieldByPattern(sampleItem, [
        "nama_produk",
        "produk",
        "jasa",
      ]),
      deskripsi: this.findFieldByPattern(sampleItem, [
        "deskripsi",
        "keterangan",
      ]),
      bukti: this.findFieldByPattern(sampleItem, ["bukti", "dokumen"]),
    }
  }

  // ✅ Dynamic validation
  validateData(data) {
    const errors = []

    data.forEach((item, index) => {
      const fieldMap = this.mapProdukJasaFields(item)

      const requiredFields = [
        { field: fieldMap.nama_dosen, name: "Nama Dosen" },
        { field: fieldMap.nama_produk_jasa, name: "Nama produk/jasa" },
        { field: fieldMap.deskripsi, name: "Deskripsi produk/jasa" },
      ]

      requiredFields.forEach(({ field, name }) => {
        if (field && !item[field]?.trim()) {
          errors.push(`Row ${index + 1}: ${name} harus diisi`)
        }
      })
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  // ✅ Helper method
  findFieldByPattern(item, patterns) {
    const fields = Object.keys(item)

    for (const pattern of patterns) {
      const field = fields.find((f) =>
        f.toLowerCase().includes(pattern.toLowerCase())
      )
      if (field) return field
    }

    return null
  }
}

export const produkJasaDtpsYangDiadopsiOlehIndustriMasyarakatPlugin =
  new ProdukJasaDtpsYangDiadopsiOlehIndustriMasyarakatPlugin()
export default produkJasaDtpsYangDiadopsiOlehIndustriMasyarakatPlugin
