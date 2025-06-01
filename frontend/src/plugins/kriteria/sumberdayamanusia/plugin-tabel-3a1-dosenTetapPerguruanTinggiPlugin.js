import { DosenPluginBase } from "../../base/DosenPluginBase.js"
import { fetchScoreDetails } from "../../../utils/fetchScoreDetail.js"
import { PluginUtils } from "../../utils/PluginUtils.js"
import { dosenTetapFieldMapping } from "../../config/fieldMappings.js"
import { dosenTetapScoring } from "../../config/scoringMatrix.js"

export class DosenTetapPlugin extends DosenPluginBase {
  constructor() {
    super(
      {
        code: "3a1",
        name: "Dosen Tetap Perguruan Tinggi",
        description: "Plugin for processing permanent university lecturer data",
      },
      dosenTetapFieldMapping
    )
  }

  configureSection(config) {
    return { ...config, isDosenTetapSection: true }
  }

  async calculateScore(data, config, additionalData = {}) {
    const metrics = await this.calculateMetrics(data, additionalData)
    const scores = this.calculateDetailedScores(metrics)

    return {
      scores: scores.map((s) => ({ butir: s.butir, nilai: s.nilai })),
      scoreDetail: this.formatScoreDetail(metrics),
    }
  }

  async calculateMetrics(data, additionalData) {
    const { projectId } = additionalData
    let NM = 0
    let NDTT = 0

    if (projectId) {
      try {
        const scoreDetail2a1 = await fetchScoreDetails("2a1", projectId)
        const scoreDetail3a4 = await fetchScoreDetails("3a4", projectId)
        NM = scoreDetail2a1?.NM || 0
        NDTT = scoreDetail3a4?.NDTT || 0
      } catch (error) {
        console.warn("Failed to fetch NDTT:", error)
      }
    }

    // Basic counts
    const NDT = this.countDosenByCriteria(data, {
      nidn_nidk: (val) => val?.trim(),
    })

    const NDTPS = this.countDosenByCriteria(data, {
      nidn_nidk: (val) => val?.trim(),
      kesesuaian_dengan_kompetensi_inti_ps_3: (val) => this.hasKesesuaian(val),
    })

    const NDS3 = this.countDosenByCriteria(data, {
      nama_dosen: (val) => val?.trim(),
      doktor_doktor_terapan_nama_prodi_pasca_sarjana_1: (val) => val?.trim(),
      kesesuaian_dengan_kompetensi_inti_ps_3: (val) => this.hasKesesuaian(val),
    })

    const NDSK = this.countDosenByCriteria(data, {
      nama_dosen: (val) => val?.trim(),
      bidang_sertifikasi_sertifikat_kompetensi_profesi_industri_5: (val) =>
        val?.trim(),
      lembaga_penerbit_sertifikat_kompetensi_profesi_industri_5: (val) =>
        val?.trim(),
    })

    // Jabatan counts
    const NDGB = this.countByJabatan(data, [
      "guru besar",
      "profesor",
      "professor",
    ])
    const NDLK = this.countByJabatan(data, ["lektor kepala"])
    const NDL = this.countByJabatan(data, ["lektor"], ["lektor kepala"])

    // Calculate percentages and ratios
    const metrics = {
      NDT,
      NDTPS,
      NDS3,
      NDSK,
      NDGB,
      NDLK,
      NDL,
      NDTT,
      NM,
    }

    metrics.PDS3 = NDTPS > 0 ? (NDS3 / NDTPS) * 100 : 0
    metrics.PDSK = NDTPS > 0 ? (NDSK / NDTPS) * 100 : 0
    metrics.PGBLKL = NDTPS > 0 ? ((NDGB + NDLK + NDL) / NDTPS) * 100 : 0
    metrics.PDTT = NDT + NDTT > 0 ? (NDTT / (NDT + NDTT)) * 100 : 0
    metrics.RMD = NDTPS > 0 ? NM / NDTPS : 0

    return metrics
  }

  countByJabatan(data, includes = [], excludes = []) {
    return this.countDosenByCriteria(data, {
      nidn_nidk: (val) => val?.trim(),
      kesesuaian_dengan_kompetensi_inti_ps_3: (val) => this.hasKesesuaian(val),
      jabatan_akademik: (val) => {
        if (!val) return false
        const jabatanLower = val.toLowerCase()

        // Check excludes first
        if (excludes.some((exc) => jabatanLower.includes(exc))) {
          return false
        }

        // Then check includes
        return includes.some((inc) => jabatanLower.includes(inc))
      },
    })
  }

  calculateDetailedScores(metrics) {
    return [
      {
        butir: 16,
        nilai: PluginUtils.roundToDecimal(dosenTetapScoring.kecukupan(metrics)),
      },
      {
        butir: 17,
        nilai: PluginUtils.roundToDecimal(
          dosenTetapScoring.kualifikasi(metrics)
        ),
      },
      {
        butir: 18,
        nilai: PluginUtils.roundToDecimal(
          dosenTetapScoring.sertifikasi(metrics)
        ),
      },
      {
        butir: 19,
        nilai: PluginUtils.roundToDecimal(dosenTetapScoring.jabatan(metrics)),
      },
      {
        butir: 20,
        nilai: PluginUtils.roundToDecimal(dosenTetapScoring.rasio(metrics)),
      },
    ]
  }

  formatScoreDetail(metrics) {
    return {
      ...metrics,
      PDS3: `${PluginUtils.roundToDecimal(metrics.PDS3)}%`,
      PDSK: `${PluginUtils.roundToDecimal(metrics.PDSK)}%`,
      PGBLKL: `${PluginUtils.roundToDecimal(metrics.PGBLKL)}%`,
      PDTT: `${PluginUtils.roundToDecimal(metrics.PDTT)}%`,
      RMD: PluginUtils.roundToDecimal(metrics.RMD),
    }
  }

  validateData = PluginUtils.createValidator([
    { fieldName: "nama_dosen", required: true },
    {
      fieldName: "nidn_nidk",
      required: true,
      pattern: /^\d+$/,
      message: "NIDN/NIDK harus berupa angka",
    },
    {
      fieldName: "mata_kuliah_yang_diampu_pada_ps_yang_diakreditasi_6",
      required: true,
    },
  ])
}

export default new DosenTetapPlugin()
