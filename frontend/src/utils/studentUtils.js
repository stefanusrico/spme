import { message } from "antd"
import axiosInstance from "./axiosConfig"
import * as math from "mathjs"

let formulaCache = {}

/**
 * Get formula definition with caching
 */
export const getFormulaDefinition = async (nomor, sub) => {
  const cacheKey = `${nomor}-${sub}`

  if (formulaCache[cacheKey]) {
    return formulaCache[cacheKey]
  }

  try {
    const response = await axiosInstance.get(`/rumus/nomor/${nomor}/${sub}`)

    if (response.data) {
      formulaCache[cacheKey] = response.data
      return response.data
    }

    return null
  } catch (error) {
    console.error(`Error fetching formula ${nomor}${sub}:`, error)
    return null
  }
}

/**
 * Get Variable A from API
 */
export const getVariableA = async () => {
  console.log("getVariableA called")
  try {
    console.log("Making API request to /get-scores")
    const response = await axiosInstance.get("/get-scores")
    console.log("API response status:", response.status)
    const result = response.data

    console.log("API response data:", result)

    if (result.status === "success" && Array.isArray(result.data)) {
      console.log("Found", result.data.length, "score records")
      const scoreData = result.data.find((item) => {
        const matches =
          item.task && item.task.no === 13 && item.task.sub === "A"

        console.log("Checking item:", {
          taskNo: item.task?.no,
          taskSub: item.task?.sub,
          matches: matches,
        })

        return matches
      })

      console.log("Found matching score data:", scoreData)

      if (scoreData && typeof scoreData.nilai === "number") {
        console.log("Found valid score value:", scoreData.nilai)
        return {
          value: scoreData.nilai,
          taskId: scoreData.taskId,
          updatedAt: scoreData.updated_at,
        }
      }
    }

    console.log("No valid score data found")
    return null
  } catch (error) {
    console.error("Error fetching Variable A from API:", error)
    console.error("Error details:", error.message)
    if (error.response) {
      console.error("Response data:", error.response.data)
      console.error("Response status:", error.response.status)
    }
    return null
  }
}

/**
 * Log formula evaluation steps
 */
export const logFormulaStep = (step, data) => {
  const logEntry = {
    step,
    timestamp: new Date().toISOString(),
    ...data,
  }

  console.log(`FORMULA_LOG: ${JSON.stringify(logEntry, null, 2)}`)
  return logEntry
}

/**
 * Evaluate formula using mathjs
 */
export const evaluateFormula = (formula, variables) => {
  try {
    logFormulaStep("FORMULA_START", {
      formula,
      variables: { ...variables },
    })

    let processedFormula = formula
    const replacements = []

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\b${key}\\b`, "g")
      let match
      while ((match = regex.exec(processedFormula)) !== null) {
        replacements.push({
          variable: key,
          value: value,
          position: match.index,
        })
      }
      processedFormula = processedFormula.replace(regex, value)
    })

    logFormulaStep("VARIABLE_SUBSTITUTION", {
      original_formula: formula,
      substitutions: replacements,
      processed_formula: processedFormula,
    })

    const result = math.evaluate(processedFormula)

    logFormulaStep("FORMULA_RESULT", {
      processed_formula: processedFormula,
      result,
    })

    return result
  } catch (error) {
    logFormulaStep("FORMULA_ERROR", {
      formula,
      error: error.message,
    })

    console.error("Error evaluating formula:", error, "Formula:", formula)
    return 0
  }
}

/**
 * Evaluate condition to determine which formula to use
 */
export const evaluateCondition = (condition, variables) => {
  try {
    logFormulaStep("CONDITION_START", {
      condition,
      variables: { ...variables },
    })

    //"Rasio >= 3"
    const comparisonRegex = /(\w+)\s*(>=|<=|>|<|==|!=)\s*(\d+(\.\d+)?)/
    const matches = condition.match(comparisonRegex)

    if (matches) {
      const [_, variableName, operator, valueStr] = matches
      const variable = variables[variableName]
      const value = parseFloat(valueStr)

      let result = false

      switch (operator) {
        case ">=":
          result = variable >= value
          break
        case "<=":
          result = variable <= value
          break
        case ">":
          result = variable > value
          break
        case "<":
          result = variable < value
          break
        case "==":
          result = variable == value
          break
        case "!=":
          result = variable != value
          break
        default:
          result = false
      }

      logFormulaStep("CONDITION_EVALUATION", {
        condition,
        variable_name: variableName,
        variable_value: variable,
        operator,
        comparison_value: value,
        result,
      })

      return result
    }

    const result = math.evaluate(condition, variables)

    logFormulaStep("DIRECT_CONDITION_EVALUATION", {
      condition,
      result,
    })

    return result
  } catch (error) {
    logFormulaStep("CONDITION_ERROR", {
      condition,
      error: error.message,
    })

    console.error("Error evaluating condition:", error, "Condition:", condition)
    return false
  }
}

/**
 * Evaluate formula based on API formula definition and variables
 */
export const evaluateApiFormula = (formulaData, variables) => {
  if (!formulaData) return null

  logFormulaStep("API_FORMULA_START", {
    formula_id: `${formulaData.nomor}${formulaData.sub}`,
    formula_type: formulaData.formula_type,
    description: formulaData.description,
    variables: { ...variables },
  })

  const log = {
    formula_id: `${formulaData.nomor}${formulaData.sub}`,
    main_formula: formulaData.main_formula,
    conditions: formulaData.conditions || [],
    parameters: formulaData.parameters || {},
    applied_condition: null,
    applied_formula: null,
    result: null,
  }

  let result = null

  if (formulaData.conditions && formulaData.conditions.length > 0) {
    for (const conditionObj of formulaData.conditions) {
      const conditionResult = evaluateCondition(
        conditionObj.condition,
        variables
      )

      if (conditionResult) {
        log.applied_condition = conditionObj.condition
        log.applied_formula = conditionObj.formula

        logFormulaStep("CONDITION_MATCHED", {
          condition: conditionObj.condition,
          formula: conditionObj.formula,
        })

        result = evaluateFormula(conditionObj.formula, variables)
        break
      }
    }
  }

  // pakai main formula kalau ga kondisi
  if (result === null && formulaData.main_formula) {
    log.applied_formula = formulaData.main_formula

    logFormulaStep("USING_MAIN_FORMULA", {
      formula: formulaData.main_formula,
    })

    result = evaluateFormula(formulaData.main_formula, variables)
  }

  log.result = result

  logFormulaStep("API_FORMULA_RESULT", log)

  return result
}

/**
 * Calculate student selection ratio and score using formula 13.B
 */
export const calculateStudentSelectionScore = async (
  data,
  forcedCalculation = true
) => {
  try {
    if (!forcedCalculation) {
      return {
        skipped: true,
        message: "Calculations only performed on save",
      }
    }

    const calculationLog = {
      timestamp: new Date().toISOString(),
      calculation_type: "STUDENT_SELECTION_SCORE",
      data_count: data?.length || 0,
      steps: [],
      results: {},
    }

    logFormulaStep("CALCULATION_START", {
      type: "STUDENT_SELECTION_SCORE",
      data_count: data?.length || 0,
    })

    let variableA = null
    let variableASource = "Not available"

    console.log("Attempting to fetch Variable A")
    const variableAResult = await getVariableA()
    console.log("Variable A API result:", variableAResult)

    if (variableAResult && variableAResult.value !== undefined) {
      variableA = variableAResult.value
      variableASource = `API Task 13A (${variableAResult.taskId})`
      console.log("Retrieved Variable A value:", variableA)
    } else {
      console.log("No valid result returned from getVariableA")
    }

    const tsData = data.filter((item) => {
      if (!item.tahun_akademik) return false
      const normalized = String(item.tahun_akademik).toLowerCase().trim()
      return normalized === "ts"
    })

    if (tsData.length === 0) {
      logFormulaStep("FALLBACK", {
        message: "Using all available data instead of just TS year",
      })
    }

    const dataToUse = tsData.length > 0 ? tsData : data

    const filteredData = dataToUse.filter((item) => {
      if (!item.tahun_akademik) return true
      const normalized = String(item.tahun_akademik).toLowerCase().trim()
      return !["jumlah", "total", "sum", "rata-rata", "average"].includes(
        normalized
      )
    })

    let pendaftar = 0
    let dayaTampung = 0

    filteredData.forEach((item) => {
      pendaftar += parseFloat(item.pendaftar_jumlah_calon_mahasiswa) || 0
      dayaTampung += parseFloat(item.daya_tampung) || 0
    })

    const Rasio = dayaTampung > 0 ? pendaftar / dayaTampung : 0

    let B = 0
    if (Rasio >= 3) {
      B = 4
    } else {
      B = (4 * Rasio) / 3
    }

    const A = variableA

    logFormulaStep("VARIABLES_CALCULATION", {
      pendaftar,
      dayaTampung,
      Rasio,
      B,
      A,
      A_source: variableASource,
      data_source:
        tsData.length > 0
          ? "TS year data"
          : "All available data (TS not found)",
    })

    calculationLog.steps.push({
      step: "Calculate Component B",
      description: "Rasio = pendaftar / dayaTampung",
      values: { pendaftar, dayaTampung, Rasio },
      calculation: Rasio >= 3 ? "B = 4" : `B = (4 * ${Rasio}) / 3 = ${B}`,
      result: B,
    })

    calculationLog.steps.push({
      step: "Get Component A",
      description: `A is ${
        variableA !== null ? "retrieved from" : "not available from"
      } API`,
      values: { A, source: variableASource },
      calculation: variableA !== null ? `A = ${variableA}` : "A = null",
      result: A,
    })

    const formula = await getFormulaDefinition(13, "B")

    let finalScore
    let mainFormulaDescription = ""

    if (formula && formula.main_formula) {
      const actualFormula = formula.main_formula.replace("Skor =", "").trim()
      const variables = {
        A: variableA !== null ? variableA : 0,
        B: B,
      }

      logFormulaStep("MAIN_FORMULA_CALCULATION", {
        original_formula: formula.main_formula,
        extracted_formula: actualFormula,
        variables,
        note:
          variableA !== null
            ? `A is ${variableA} from API`
            : "A is null, treating as 0 for calculation",
      })

      finalScore = evaluateFormula(actualFormula, variables)
      mainFormulaDescription = `Using main formula: ${
        formula.main_formula
      } with A = ${variables.A} ${
        variableA !== null ? `(from ${variableASource})` : "(null treated as 0)"
      } and B = ${B}`

      calculationLog.steps.push({
        step: "Apply Main Formula",
        description: mainFormulaDescription,
        values: { A: variables.A, A_source: variableASource, B },
        calculation: `${actualFormula} = ${finalScore}`,
        result: finalScore,
      })
    } else {
      finalScore = B
      mainFormulaDescription =
        "No main formula available, using B as the final score"

      calculationLog.steps.push({
        step: "Fallback Calculation",
        description: mainFormulaDescription,
        values: { B },
        calculation: `finalScore = B = ${B}`,
        result: finalScore,
      })
    }

    calculationLog.results = {
      pendaftar,
      dayaTampung,
      Rasio,
      A,
      A_source: variableASource,
      B,
      finalScore,
      mainFormula: formula?.main_formula || "N/A",
      data_source:
        tsData.length > 0 ? "TS year only" : "All years (TS not found)",
    }

    return {
      score: finalScore,
      scoreDetail: {
        pendaftar,
        dayaTampung,
        Rasio,
        A,
        A_source: variableASource,
        B,
        finalScore,
        formula:
          formula?.main_formula ||
          `Formula 13B: B = Rasio >= 3 ? 4 : (4 * Rasio) / 3 where Rasio = pendaftar / dayaTampung`,
        mainFormulaDescription,
        data_source:
          tsData.length > 0 ? "TS year only" : "All years (TS not found)",
      },
      calculationLog,
    }
  } catch (error) {
    console.error("Error calculating student selection score:", error)
    message.error("Failed to calculate score: " + error.message)
    return {
      score: 0,
      error: error.message,
    }
  }
}

/**
 * Create default academic years for student sections
 */
export const createDefaultAcademicYears = (sectionCode, prodiName = "") => {
  const years = ["TS-3", "TS-2", "TS-1", "TS"]

  return years.map((year) => ({
    key: `default-${year}-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 5)}`,
    tahun_akademik: year,
    daya_tampung: 0,
    pendaftar_jumlah_calon_mahasiswa: 0,
    lulus_seleksi_jumlah_calon_mahasiswa: 0,
    reguler_jumlah_mahasiswa_baru: 0,
    transfer_jumlah_mahasiswa_baru: 0,
    reguler_jumlah_mahasiswa_aktif: 0,
    transfer_jumlah_mahasiswa_aktif: 0,
    selected: true,
    prodi_name: prodiName,
  }))
}

/**
 * Check if a section should have default academic years
 */
export const shouldHaveDefaultAcademicYears = (sectionCode) => {
  const sectionsWithYears = ["2a1", "2a2", "2a3", "2a4"]
  return sectionsWithYears.includes(sectionCode)
}

/**
 * Initialize student section data with defaults if empty
 */
export const initializeStudentSectionData = (
  sectionCode,
  config,
  existingData = {},
  prodiName = ""
) => {
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
      } else if (shouldHaveDefaultAcademicYears(sectionCode)) {
        initialTableData[tableCode] = createDefaultAcademicYears(
          sectionCode,
          prodiName
        )
      } else {
        initialTableData[tableCode] = []
      }
    })
  }

  return initialTableData
}
