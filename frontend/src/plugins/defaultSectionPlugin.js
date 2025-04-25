/**
 * Default plugin used when no specific plugin is available
 */
import { normalizeDataConsistency } from "../utils/tridharmaUtils"
import { processExcelData as processExcelDataUtil } from "../utils/tableUtils"
import { evaluateApiFormula, logFormulaStep } from "../utils/tridharmaUtils"
import axiosInstance from "../utils/axiosConfig"

const DefaultSectionPlugin = {
  getInfo() {
    return {
      code: "default",
      name: "Default Section Plugin",
      description:
        "Default implementation for all sections without specific plugins",
    }
  },

  configureSection(config) {
    return config
  },

  async processExcelData(workbook, tableCode, config, prodiName, sectionCode) {
    return await processExcelDataUtil(
      workbook,
      tableCode,
      config,
      prodiName,
      sectionCode
    )
  },

  initializeData(config, prodiName, sectionCode, existingData = {}) {
    const initialTableData = {}

    if (config && config.tables) {
      config.tables.forEach((table) => {
        const tableCode = typeof table === "object" ? table.code : table

        if (
          existingData &&
          existingData[tableCode] &&
          existingData[tableCode].length > 0
        ) {
          initialTableData[tableCode] = existingData[tableCode]
        } else {
          initialTableData[tableCode] = []
        }
      })
    }

    return initialTableData
  },

  async calculateScore(data, config, additionalData = {}) {
    if (!config?.formula) {
      return {
        score: null,
        scoreDetail: null,
        message: "No formula defined for this section",
      }
    }

    try {
      const calculationLog = {
        timestamp: new Date().toISOString(),
        section_id: config?.id || "unknown",
        data_count: data?.length || 0,
        steps: [],
        result: null,
      }

      logFormulaStep("SCORE_CALCULATION_START", {
        section_id: config?.id || "unknown",
        formula_type: config.formula.formula_type || "standard",
        data_count: data?.length || 0,
      })

      const variables = this.extractVariables(data, additionalData)

      calculationLog.steps.push({
        step: "Extract Variables",
        variables: { ...variables },
      })

      logFormulaStep("EXTRACTED_VARIABLES", variables)

      let formulaDefinition = config.formula

      if (config.formula.nomor && config.formula.sub) {
        try {
          const response = await axiosInstance.get(
            `/rumus/nomor/${config.formula.nomor}/${config.formula.sub}`
          )

          if (response.data) {
            formulaDefinition = response.data

            logFormulaStep("FORMULA_FETCHED", {
              nomor: config.formula.nomor,
              sub: config.formula.sub,
              formula: response.data,
            })
          }
        } catch (err) {
          console.error("Failed to fetch formula from API:", err)
        }
      }

      calculationLog.steps.push({
        step: "Get Formula Definition",
        formula: formulaDefinition,
      })

      if (formulaDefinition.parameters) {
        Object.entries(formulaDefinition.parameters).forEach(([key, value]) => {
          variables[key] = value
        })

        calculationLog.steps.push({
          step: "Apply Formula Parameters",
          parameters: { ...formulaDefinition.parameters },
          updated_variables: { ...variables },
        })

        logFormulaStep("FORMULA_PARAMETERS", formulaDefinition.parameters)
      }

      const result = evaluateApiFormula(formulaDefinition, variables)

      calculationLog.steps.push({
        step: "Calculate Score",
        result: result,
      })

      logFormulaStep("FINAL_SCORE", {
        section: config?.id || "unknown",
        score: result,
      })

      calculationLog.result = result

      console.log(
        "COMPLETE_CALCULATION_LOG:",
        JSON.stringify(calculationLog, null, 2)
      )

      return {
        scores: [
          {
            butir : 'default',
            nilai : result !== null ? result : 0
          }
        ],
        scoreDetail: {
          ...variables,
          mainResult: result,
        },
        log: calculationLog,
      }
    } catch (error) {
      console.error("Error calculating score:", error)
      return {
        score: 0,
        scoreDetail: null,
        error: error.message,
      }
    }
  },

  extractVariables(data, additionalData = {}) {
    const variables = { ...additionalData }

    if (!Array.isArray(data) || data.length === 0) {
      return variables
    }

    variables.TOTAL = data.length

    const allProperties = new Set()
    data.forEach((item) => {
      Object.keys(item).forEach((key) => allProperties.add(key))
    })

    const booleanProperties = []
    allProperties.forEach((prop) => {
      const isBooleanProp = data
        .slice(0, Math.min(5, data.length))
        .some((item) => typeof item[prop] === "boolean")

      if (isBooleanProp) {
        booleanProperties.push(prop)
        const count = data.filter((item) => item[prop] === true).length
        variables[prop.toUpperCase()] = count
      }
    })

    const numericProperties = []
    allProperties.forEach((prop) => {
      const numericValues = data.filter(
        (item) =>
          item[prop] !== null &&
          item[prop] !== undefined &&
          !isNaN(Number(item[prop]))
      )

      if (numericValues.length > 0) {
        numericProperties.push(prop)
        const sum = numericValues.reduce(
          (total, item) => total + Number(item[prop]),
          0
        )
        variables[`SUM_${prop.toUpperCase()}`] = sum

        if (numericValues.length > 0) {
          variables[`AVG_${prop.toUpperCase()}`] = sum / numericValues.length
        }
      }
    })

    const potentialCategoryFields = [
      "status",
      "type",
      "level",
      "category",
      "tingkat",
      "jenis",
    ]

    potentialCategoryFields.forEach((field) => {
      if (allProperties.has(field)) {
        const uniqueValues = new Set()
        data.forEach((item) => {
          if (item[field] !== null && item[field] !== undefined) {
            uniqueValues.add(String(item[field]).toLowerCase())
          }
        })

        uniqueValues.forEach((value) => {
          const count = data.filter(
            (item) =>
              item[field] !== null &&
              item[field] !== undefined &&
              String(item[field]).toLowerCase() === value
          ).length

          const variableName = `${field.toUpperCase()}_${value.toUpperCase()}`
          variables[variableName] = count
        })
      }
    })

    return variables
  },

  normalizeData(data) {
    return normalizeDataConsistency(data)
  },

  prepareDataForSaving(data, userData) {
    return data.map((item, index) => ({
      ...item,
      no: index + 1,
      _timestamp: new Date().getTime(),
    }))
  },

  validateData(data) {
    return { valid: true, errors: [] }
  },
}

export default DefaultSectionPlugin
