import { message } from "antd"
import axiosInstance from "./axiosConfig"
import * as math from "mathjs"

let sectionTableMappingsCache = null

let formulaCache = {}

let calculationInProgress = false
let lastCalculationTimestamp = 0
const CALCULATION_THROTTLE_MS = 3000 

/**
 * Get table code mappings from section code to table code
 */
export const getSectionTableMappings = async (forceRefresh = false) => {
  if (sectionTableMappingsCache && !forceRefresh) {
    return sectionTableMappingsCache
  }

  try {
    const sections = ["1-1", "1-2", "1-3"]
    const mappings = {}

    for (const sectionCode of sections) {
      try {
        const response = await axiosInstance.get(
          `/lkps/sections/${sectionCode}/config`
        )
        if (response.data?.tables?.length > 0) {
          const tableCode =
            typeof response.data.tables[0] === "string"
              ? response.data.tables[0]
              : response.data.tables[0].code

          mappings[sectionCode] = tableCode
        }
      } catch (err) {
        console.error(`Error fetching config for section ${sectionCode}:`, err)
      }
    }

    // Cache only if we have all mappings
    if (Object.keys(mappings).length === sections.length) {
      sectionTableMappingsCache = mappings
    }

    return mappings
  } catch (error) {
    console.error("Error fetching section-table mappings:", error)
    return {}
  }
}

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
 * Get table code for a section
 */
export const getTableCodeForSection = async (sectionCode, config = null) => {
  // First try to get from provided config
  if (config?.id === sectionCode && config?.tables?.length > 0) {
    return typeof config.tables[0] === "string"
      ? config.tables[0]
      : config.tables[0].code
  }

  // Then try to get from cache
  const mappings = await getSectionTableMappings()
  if (mappings[sectionCode]) {
    return mappings[sectionCode]
  }

  // Fallback to hardcoded values
  const fallbackMappings = {
    "1-1": "kerjasama_pendidikan",
    "1-2": "kerjasama_penelitian",
    "1-3": "kerjasama_pkm",
  }

  return fallbackMappings[sectionCode] || null
}

/**
 * Check if a section is a Tridharma section
 */
export const isTridharmaSection = (sectionCode) => {
  return ["1-1", "1-2", "1-3"].includes(sectionCode)
}

/**
 * Check if scoring should be deferred
 */
export const shouldDeferScoring = (sectionCode) => {
  return isTridharmaSection(sectionCode)
}

/**
 * Normalize data consistency for fields and column types
 */
export const normalizeDataConsistency = (data, sectionCode = "") => {
  if (!data || !Array.isArray(data)) return data

  // Fields that should be numeric
  const numericFields = [
    "pendaftar_jumlah_calon_mahasiswa",
    "lulus_seleksi_jumlah_calon_mahasiswa",
    "reguler_jumlah_mahasiswa_baru",
    "transfer_jumlah_mahasiswa_baru",
    "reguler_jumlah_mahasiswa_aktif",
    "transfer_jumlah_mahasiswa_aktif",
    "daya_tampung",
    "durasi_dalam_tahun",
  ]

  return data.map((row) => {
    const updatedRow = { ...row }

    // Convert numeric fields
    numericFields.forEach((field) => {
      if (updatedRow[field] !== undefined && updatedRow[field] !== null) {
        if (typeof updatedRow[field] === "string") {
          updatedRow[field] = parseFloat(updatedRow[field]) || 0
        }
      }
    })

    // Handle Tridharma-specific fields
    if (sectionCode.startsWith("1-") || sectionCode === "") {
      const booleanFields = [
        "tingkat_internasional",
        "tingkat_nasional",
        "tingkat_lokal_wilayah",
      ]

      // Normalize boolean fields
      booleanFields.forEach((field) => {
        if (updatedRow[field] !== undefined) {
          if (typeof updatedRow[field] === "boolean") {
            // No change needed
          } else if (typeof updatedRow[field] === "string") {
            const value = updatedRow[field].toLowerCase().trim()
            if (["true", "ya", "yes", "1"].includes(value)) {
              updatedRow[field] = true
            } else if (["false", "tidak", "no", "0", ""].includes(value)) {
              updatedRow[field] = false
            }
          } else if (typeof updatedRow[field] === "number") {
            updatedRow[field] = updatedRow[field] === 1
          }
        } else {
          updatedRow[field] = false
        }
      })

      // Handle legacy fields conversion
      if (
        updatedRow.internasional !== undefined &&
        updatedRow.tingkat_internasional === undefined
      ) {
        updatedRow.tingkat_internasional = !!updatedRow.internasional
      }

      if (
        updatedRow.nasional !== undefined &&
        updatedRow.tingkat_nasional === undefined
      ) {
        updatedRow.tingkat_nasional = !!updatedRow.nasional
      }

      if (
        (updatedRow.lokal !== undefined ||
          updatedRow.lokal_wilayah !== undefined) &&
        updatedRow.tingkat_lokal_wilayah === undefined
      ) {
        updatedRow.tingkat_lokal_wilayah = !!(
          updatedRow.lokal || updatedRow.lokal_wilayah
        )
      }

      // Remove legacy fields
      delete updatedRow.internasional
      delete updatedRow.nasional
      delete updatedRow.lokal
      delete updatedRow.lokal_wilayah
    }

    return updatedRow
  })
}

/**
 * Check if all required sections have been saved
 */
export const checkAllRequiredSectionsSaved = async (userData) => {
  try {
    const sections = ["1-1", "1-2", "1-3"]
    const requests = sections.map((section) =>
      axiosInstance.get(`/lkps/sections/${section}/data`, {
        params: { prodiId: userData?.prodiId },
      })
    )

    await Promise.all(requests)
    console.log("All Tridharma sections data is available")
    return true
  } catch (error) {
    console.error("Error checking sections:", error)
    return false
  }
}

/**
 * Extract variables for Tridharma sections
 */
export const extractTridharmaVariables = (data) => {
  const normalizedData = normalizeDataConsistency(data)

  const variables = {
    // Location-based counts
    NI:
      normalizedData.filter((item) => item.tingkat_internasional === true)
        .length || 0,
    NN:
      normalizedData.filter((item) => item.tingkat_nasional === true).length ||
      0,
    NW:
      normalizedData.filter((item) => item.tingkat_lokal_wilayah === true)
        .length || 0,

    // Activity-type counts
    N1: normalizedData.filter((item) => item.pendidikan === true).length || 0,
    N2: normalizedData.filter((item) => item.penelitian === true).length || 0,
    N3: normalizedData.filter((item) => item.pkm === true).length || 0,
  }

  return variables
}

/**
 * Detailed formula logging utility
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
 * Evaluate formula conditions based on variables
 */
export const evaluateFormula = (formula, variables) => {
  try {
    // Create a log entry for the original formula and variables
    logFormulaStep("FORMULA_START", {
      formula,
      variables: { ...variables },
    })

    // Replace any variables in the formula
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

    // Log the variable substitution process
    logFormulaStep("VARIABLE_SUBSTITUTION", {
      original_formula: formula,
      substitutions: replacements,
      processed_formula: processedFormula,
    })

    // Evaluate the formula
    const result = math.evaluate(processedFormula)

    // Log the result
    logFormulaStep("FORMULA_RESULT", {
      processed_formula: processedFormula,
      result,
    })

    return result
  } catch (error) {
    // Log any errors
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
    // Log the start of condition evaluation
    logFormulaStep("CONDITION_START", {
      condition,
      variables: { ...variables },
    })

    // Handle AND conditions
    if (condition.includes("&&")) {
      const parts = condition.split("&&").map((part) => part.trim())
      const results = parts.map((part) => {
        const result = evaluateCondition(part, variables)
        return { part, result }
      })

      const finalResult = results.every((r) => r.result)

      // Log AND condition results
      logFormulaStep("CONDITION_AND", {
        condition,
        parts_evaluation: results,
        result: finalResult,
      })

      return finalResult
    }

    // Handle OR conditions
    if (condition.includes("||")) {
      const parts = condition.split("||").map((part) => part.trim())
      const results = parts.map((part) => {
        const result = evaluateCondition(part, variables)
        return { part, result }
      })

      const finalResult = results.some((r) => r.result)

      // Log OR condition results
      logFormulaStep("CONDITION_OR", {
        condition,
        parts_evaluation: results,
        result: finalResult,
      })

      return finalResult
    }

    let result = false
    let conditionType = "UNKNOWN"
    let details = {}

    // Handle range conditions like "0 < NI < a"
    if (
      /\d+\s*<\s*\w+\s*<\s*\w+/.test(condition) ||
      /\w+\s*<\s*\w+\s*<\s*\d+/.test(condition)
    ) {
      const matches = condition.match(/(\d+|\w+)\s*<\s*(\w+)\s*<\s*(\w+|\d+)/)
      if (matches) {
        conditionType = "RANGE_EXCLUSIVE"
        const [_, left, middle, right] = matches
        const leftValue = isNaN(left) ? variables[left] : Number(left)
        const middleValue = variables[middle]
        const rightValue = isNaN(right) ? variables[right] : Number(right)

        details = {
          left,
          middle,
          right,
          left_value: leftValue,
          middle_value: middleValue,
          right_value: rightValue,
        }

        result = leftValue < middleValue && middleValue < rightValue
      }
    }
    // Handle range conditions like "0 < NI <= a"
    else if (
      /\d+\s*<\s*\w+\s*<=\s*\w+/.test(condition) ||
      /\w+\s*<\s*\w+\s*<=\s*\d+/.test(condition)
    ) {
      const matches = condition.match(/(\d+|\w+)\s*<\s*(\w+)\s*<=\s*(\w+|\d+)/)
      if (matches) {
        conditionType = "RANGE_INCLUSIVE"
        const [_, left, middle, right] = matches
        const leftValue = isNaN(left) ? variables[left] : Number(left)
        const middleValue = variables[middle]
        const rightValue = isNaN(right) ? variables[right] : Number(right)

        details = {
          left,
          middle,
          right,
          left_value: leftValue,
          middle_value: middleValue,
          right_value: rightValue,
        }

        result = leftValue < middleValue && middleValue <= rightValue
      }
    }
    // Handle simple comparisons like "NI >= a"
    else {
      const comparisonRegex = /(\w+|\d+)\s*(>=|<=|>|<|==|!=)\s*(\w+|\d+)/
      const matches = condition.match(comparisonRegex)

      if (matches) {
        conditionType = "COMPARISON"
        const [_, leftSide, operator, rightSide] = matches
        const leftValue = isNaN(leftSide)
          ? variables[leftSide]
          : Number(leftSide)
        const rightValue = isNaN(rightSide)
          ? variables[rightSide]
          : Number(rightSide)

        details = {
          left: leftSide,
          operator,
          right: rightSide,
          left_value: leftValue,
          right_value: rightValue,
        }

        switch (operator) {
          case ">=":
            result = leftValue >= rightValue
            break
          case "<=":
            result = leftValue <= rightValue
            break
          case ">":
            result = leftValue > rightValue
            break
          case "<":
            result = leftValue < rightValue
            break
          case "==":
            result = leftValue == rightValue
            break
          case "!=":
            result = leftValue != rightValue
            break
          default:
            result = false
        }
      } else {
        // Try direct evaluation
        conditionType = "DIRECT_EVALUATION"
        result = math.evaluate(condition, variables)
      }
    }

    // Log the condition evaluation result
    logFormulaStep("CONDITION_EVALUATION", {
      condition,
      type: conditionType,
      details,
      result,
    })

    return result
  } catch (error) {
    // Log any errors
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

  // Log the start of API formula evaluation
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

  // Check if formula has conditions
  if (formulaData.conditions && formulaData.conditions.length > 0) {
    // Try each condition in order
    for (const conditionObj of formulaData.conditions) {
      const conditionResult = evaluateCondition(
        conditionObj.condition,
        variables
      )

      if (conditionResult) {
        log.applied_condition = conditionObj.condition
        log.applied_formula = conditionObj.formula

        // Log matched condition
        logFormulaStep("CONDITION_MATCHED", {
          condition: conditionObj.condition,
          formula: conditionObj.formula,
        })

        result = evaluateFormula(conditionObj.formula, variables)
        break
      }
    }
  }

  // If no conditions match or no conditions exist, use main formula
  if (result === null && formulaData.main_formula) {
    log.applied_formula = formulaData.main_formula

    // Log using main formula
    logFormulaStep("USING_MAIN_FORMULA", {
      formula: formulaData.main_formula,
    })

    result = evaluateFormula(formulaData.main_formula, variables)
  }

  log.result = result

  // Log the final result
  logFormulaStep("API_FORMULA_RESULT", log)

  return result
}

/**
 * Calculate combined score from all Tridharma sections using API formula definitions
 * With lock mechanism to prevent concurrent calculations
 */
export const calculateCombinedScore = async (
  userData,
  NDTPS,
  currentConfig = null,
  forcedCalculation = false
) => {
  // Check if calculation is already in progress
  if (calculationInProgress && !forcedCalculation) {
    console.log("Calculation already in progress, skipping")
    return { skipped: true, message: "Calculation already in progress" }
  }

  // Check throttle
  const now = Date.now()
  if (
    !forcedCalculation &&
    now - lastCalculationTimestamp < CALCULATION_THROTTLE_MS
  ) {
    console.log(
      `Throttled calculation, last one was ${
        now - lastCalculationTimestamp
      }ms ago`
    )
    return { skipped: true, message: "Calculation throttled" }
  }

  // Set calculation lock
  calculationInProgress = true
  lastCalculationTimestamp = now

  try {
    console.log("Starting combined score calculation...")

    // Create a log object to track the entire calculation process
    const calculationLog = {
      timestamp: new Date().toISOString(),
      calculation_type: "TRIDHARMA_COMBINED_SCORE",
      inputs: {
        NDTPS,
      },
      steps: [],
      results: {},
    }

    // Log the calculation start
    logFormulaStep("CALCULATION_START", {
      type: "TRIDHARMA_COMBINED_SCORE",
      NDTPS,
    })

    // Get table codes for the sections
    const tableCodes = await getSectionTableMappingsWithFallback()
    calculationLog.steps.push({
      step: "Get table codes",
      table_codes: tableCodes,
    })

    // Get data from all required sections
    const sectionData = await fetchAllSectionsData(userData, tableCodes)
    if (!sectionData) {
      logFormulaStep("CALCULATION_ERROR", {
        error: "Failed to fetch section data",
      })
      calculationInProgress = false
      return null
    }

    const {
      normalizedPendidikanTable,
      normalizedPenelitianTable,
      normalizedPkmTable,
    } = sectionData

    // Data counts for logging
    calculationLog.steps.push({
      step: "Fetch section data",
      counts: {
        pendidikan: normalizedPendidikanTable.length,
        penelitian: normalizedPenelitianTable.length,
        pkm: normalizedPkmTable.length,
      },
    })

    // Combine all data for analysis
    const allData = [
      ...normalizedPendidikanTable,
      ...normalizedPenelitianTable,
      ...normalizedPkmTable,
    ]

    logFormulaStep("DATA_COUNTS", {
      pendidikan: normalizedPendidikanTable.length,
      penelitian: normalizedPenelitianTable.length,
      pkm: normalizedPkmTable.length,
      total: allData.length,
    })

    // Calculate variables
    const pendidikanVars = extractTridharmaVariables(normalizedPendidikanTable)
    const penelitianVars = extractTridharmaVariables(normalizedPenelitianTable)
    const pkmVars = extractTridharmaVariables(normalizedPkmTable)

    // Get activity counts for formula A
    const N1 = pendidikanVars.N1
    const N2 = penelitianVars.N2
    const N3 = pkmVars.N3

    // Count cooperation levels across all data
    let NI = 0,
      NN = 0,
      NW = 0

    allData.forEach((row) => {
      if (row.tingkat_internasional === true) {
        NI += 1
      } else if (row.tingkat_nasional === true) {
        NN += 1
      } else if (row.tingkat_lokal_wilayah === true) {
        NW += 1
      }
    })

    // Add variable counts to log
    calculationLog.steps.push({
      step: "Calculate variables",
      variables: { N1, N2, N3, NI, NN, NW, NDTPS },
    })

    logFormulaStep("VARIABLE_COUNTS", {
      N1,
      N2,
      N3,
      NI,
      NN,
      NW,
      NDTPS,
    })

    // Get formulas from API or cache
    const formula10A = await getFormulaDefinition(10, "A")
    const formula10B = await getFormulaDefinition(10, "B")

    if (!formula10A || !formula10B) {
      logFormulaStep("CALCULATION_ERROR", {
        error: "Failed to get formula definitions",
      })
      console.error("Failed to get formula definitions")
      calculationInProgress = false
      return null
    }

    // Add formula definitions to log
    calculationLog.steps.push({
      step: "Fetch formula definitions",
      formulas: {
        "10A": formula10A,
        "10B": formula10B,
      },
    })

    // Log full formula definitions
    logFormulaStep("FORMULA_DEFINITIONS", {
      formula_10A: formula10A,
      formula_10B: formula10B,
    })

    // Get parameters from formula definitions
    const paramsA = formula10A.parameters || {}
    const paramsB = formula10B.parameters || {}

    // === Calculate Score 10A ===
    const aA = paramsA.a || 2
    const bA = paramsA.b || 1
    const cA = paramsA.c || 3

    // Calculate RK according to main formula
    const RK = (aA * N1 + bA * N2 + cA * N3) / NDTPS

    // Add RK calculation to log
    calculationLog.steps.push({
      step: "Calculate RK",
      formula: `(${aA} * ${N1} + ${bA} * ${N2} + ${cA} * ${N3}) / ${NDTPS}`,
      result: RK,
    })

    logFormulaStep("RK_CALCULATION", {
      formula: `(${aA} * ${N1} + ${bA} * ${N2} + ${cA} * ${N3}) / ${NDTPS}`,
      a: aA,
      b: bA,
      c: cA,
      N1,
      N2,
      N3,
      NDTPS,
      result: RK,
    })

    // Calculate variables for formula evaluation
    const variables10A = {
      RK,
      N1,
      N2,
      N3,
      NDTPS,
      a: aA,
      b: bA,
      c: cA,
    }

    // Evaluate formula 10A using API formula definition
    const scoreA = evaluateApiFormula(formula10A, variables10A)

    // Add score A calculation to log
    calculationLog.steps.push({
      step: "Calculate Score 10A",
      variables: variables10A,
      result: scoreA,
    })

    logFormulaStep("SCORE_A_RESULT", {
      score: scoreA,
    })

    // === Calculate Score 10B ===
    const aB = paramsB.a || 1
    const bB = paramsB.b || 4
    const cB = paramsB.c || 6

    // Calculate derived variables
    const A = aB > 0 ? NI / aB : 0
    const B = bB > 0 ? NN / bB : 0
    const C = cB > 0 ? NW / cB : 0

    // Add derived variables calculation to log
    calculationLog.steps.push({
      step: "Calculate derived variables",
      formulas: {
        A: `${NI} / ${aB}`,
        B: `${NN} / ${bB}`,
        C: `${NW} / ${cB}`,
      },
      results: { A, B, C },
    })

    logFormulaStep("DERIVED_VARIABLES", {
      A: {
        formula: `${NI} / ${aB}`,
        result: A,
      },
      B: {
        formula: `${NN} / ${bB}`,
        result: B,
      },
      C: {
        formula: `${NW} / ${cB}`,
        result: C,
      },
    })

    // Variables for formula 10B
    const variables10B = {
      NI,
      NN,
      NW,
      A,
      B,
      C,
      a: aB,
      b: bB,
      c: cB,
    }

    // Evaluate formula 10B using API formula definition
    const scoreB = evaluateApiFormula(formula10B, variables10B)

    // Add score B calculation to log
    calculationLog.steps.push({
      step: "Calculate Score 10B",
      variables: variables10B,
      result: scoreB,
    })

    logFormulaStep("SCORE_B_RESULT", {
      score: scoreB,
    })

    // Use score A as final score (per requirements)
    const finalScore = scoreA

    // Add final score to log
    calculationLog.results = {
      scoreA,
      scoreB,
      finalScore,
    }

    // Prepare score details for UI
    const scoreDetail = {
      scoreA: scoreA,
      scoreB: scoreB,
      N1,
      N2,
      N3,
      NI,
      NN,
      NW,
      RK,
      A,
      B,
      C,
    }

    // Log final score
    logFormulaStep("FINAL_SCORE", {
      scoreA,
      scoreB,
      finalScore,
      details: scoreDetail,
    })

    // Skip updating scores on non-forced calculation to prevent recursive updates
    if (forcedCalculation) {
      // Update scores in all related sections
      const updatePayload = {
        "1-1": normalizedPendidikanTable,
        "1-2": normalizedPenelitianTable,
        "1-3": normalizedPkmTable,
      }

      await updateScoreForAllRelatedSections(
        finalScore,
        userData,
        updatePayload,
        currentConfig
      )
    } else {
      console.log("Skipping score update for non-forced calculation")
    }

    // Log the complete calculation process as a JSON object
    console.log(
      "COMPLETE_CALCULATION_LOG:",
      JSON.stringify(calculationLog, null, 2)
    )

    // Release the calculation lock
    calculationInProgress = false

    return {
      score: finalScore,
      scoreDetail: scoreDetail,
      calculationLog,
    }
  } catch (error) {
    logFormulaStep("CALCULATION_ERROR", {
      error: error.message,
      stack: error.stack,
    })
    console.error("Error calculating combined score:", error)

    // Release the calculation lock on error
    calculationInProgress = false

    return null
  }
}

/**
 * Get section table mappings with fallback
 */
async function getSectionTableMappingsWithFallback() {
  const mappings = await getSectionTableMappings()
  const fallbackMappings = {
    "1-1": "kerjasama_pendidikan",
    "1-2": "kerjasama_penelitian",
    "1-3": "kerjasama_pkm",
  }

  return {
    "1-1": mappings["1-1"] || fallbackMappings["1-1"],
    "1-2": mappings["1-2"] || fallbackMappings["1-2"],
    "1-3": mappings["1-3"] || fallbackMappings["1-3"],
  }
}

/**
 * Fetch and normalize data from all required sections
 */
async function fetchAllSectionsData(userData, tableCodes) {
  try {
    // Fetch data from all required sections
    const [section1Data, section2Data, section3Data] = await Promise.all([
      axiosInstance.get(`/lkps/sections/1-1/data`, {
        params: { prodiId: userData?.prodiId },
      }),
      axiosInstance.get(`/lkps/sections/1-2/data`, {
        params: { prodiId: userData?.prodiId },
      }),
      axiosInstance.get(`/lkps/sections/1-3/data`, {
        params: { prodiId: userData?.prodiId },
      }),
    ])

    // Extract table data
    const pendidikanTable = section1Data.data?.tables?.[tableCodes["1-1"]] || []
    const penelitianTable = section2Data.data?.tables?.[tableCodes["1-2"]] || []
    const pkmTable = section3Data.data?.tables?.[tableCodes["1-3"]] || []

    // Normalize data
    return {
      normalizedPendidikanTable: normalizeDataConsistency(pendidikanTable),
      normalizedPenelitianTable: normalizeDataConsistency(penelitianTable),
      normalizedPkmTable: normalizeDataConsistency(pkmTable),
    }
  } catch (error) {
    console.error("Error fetching section data:", error)
    return null
  }
}

/**
 * Update the score for all related sections
 */
export const updateScoreForAllRelatedSections = async (
  score,
  userData,
  normalizedData = null,
  currentConfig = null
) => {
  try {
    const sections = ["1-1", "1-2", "1-3"]

    // Get table codes for all sections
    const tableCodes = await getTableCodesFromConfig(sections, currentConfig)

    // Update each section
    for (const section of sections) {
      const tableCode = tableCodes[section]
      if (!tableCode) {
        console.error(`Cannot find table code for section ${section}`)
        continue
      }

      // Get section data
      let sectionData = normalizedData?.[section]

      if (!sectionData) {
        // Fetch existing data if not provided
        sectionData = await fetchSectionData(section, tableCode, userData)
      }

      // Create payload
      const payload = {
        prodiId: userData?.prodiId,
        score: score,
      }

      if (sectionData && sectionData.length > 0) {
        payload[tableCode] = sectionData
      }

      // Save data with new score
      try {
        await axiosInstance.post(`/lkps/sections/${section}/data`, payload)
        console.log(`Score for section ${section} successfully updated`)
      } catch (error) {
        console.error(`Error updating score for section ${section}:`, error)
      }
    }

    return true
  } catch (error) {
    console.error("Error updating scores for all sections:", error)
    return false
  }
}

/**
 * Get table codes from config or fallback
 */
async function getTableCodesFromConfig(sections, currentConfig) {
  const tableCodes = {}

  // First use current config if available
  if (
    currentConfig?.id &&
    isTridharmaSection(currentConfig.id) &&
    currentConfig.tables?.length > 0
  ) {
    const tableCode =
      typeof currentConfig.tables[0] === "string"
        ? currentConfig.tables[0]
        : currentConfig.tables[0].code

    tableCodes[currentConfig.id] = tableCode
  }

  // Get mappings for remaining sections
  const mappings = await getSectionTableMappings()

  // Use mappings for any missing table codes
  for (const section of sections) {
    if (!tableCodes[section] && mappings[section]) {
      tableCodes[section] = mappings[section]
    }
  }

  // Fallback for any still missing
  const fallbackMappings = {
    "1-1": "kerjasama_pendidikan",
    "1-2": "kerjasama_penelitian",
    "1-3": "kerjasama_pkm",
  }

  for (const section of sections) {
    if (!tableCodes[section]) {
      tableCodes[section] = fallbackMappings[section]
    }
  }

  return tableCodes
}

/**
 * Fetch section data and normalize it
 */
async function fetchSectionData(section, tableCode, userData) {
  try {
    const response = await axiosInstance.get(`/lkps/sections/${section}/data`, {
      params: { prodiId: userData?.prodiId },
    })

    if (response.data?.tables) {
      const sectionData = response.data.tables[tableCode] || []
      return normalizeDataConsistency(sectionData)
    }

    return []
  } catch (error) {
    console.error(`Error fetching data for section ${section}:`, error)
    return []
  }
}

/**
 * Check if calculation is needed after save and perform it
 * Modified to use forcedCalculation flag and respect locks
 */
export const checkAndCalculateAfterSave = async (
  sectionCode,
  userData,
  NDTPS,
  setScore,
  setScoreDetail,
  currentConfig = null
) => {
  if (!isTridharmaSection(sectionCode)) {
    return null
  }

  try {
    const allAvailable = await checkAllRequiredSectionsSaved(userData)

    if (allAvailable) {
      console.log("All sections available, calculating combined score...")

      // Force calculation on save to ensure score is updated
      const result = await calculateCombinedScore(
        userData,
        NDTPS,
        currentConfig,
        true // forcedCalculation=true
      )

      if (result !== null && !result.skipped) {
        setScore(result.score)
        if (setScoreDetail) {
          setScoreDetail(result.scoreDetail)
        }
        message.success(`All data saved! Combined score: ${result.score}`)
        return result
      } else if (result && result.skipped) {
        message.info(`Data saved. ${result.message}`)
      }
    } else {
      message.info(
        "Data saved. Score will be calculated after all sections 1-1, 1-2, and 1-3 are saved."
      )
    }
  } catch (error) {
    console.error("Error calculating combined score:", error)
    message.error("Failed to calculate combined score")
  }

  return null
}

/**
 * Database migration utility for data consistency
 */
export const migrateDataConsistency = async (userData) => {
  if (!userData || userData.role !== "admin") {
    return { success: false, message: "Unauthorized" }
  }

  try {
    console.log("Starting data consistency migration...")

    const sections = ["1-1", "1-2", "1-3"]
    const tableCodes = await getSectionTableMappingsWithFallback()
    let totalFixed = 0

    for (const sectionCode of sections) {
      console.log(`Processing section ${sectionCode}...`)
      const tableCode = tableCodes[sectionCode]

      if (!tableCode) {
        console.warn(`No table code for section ${sectionCode}, skipping`)
        continue
      }

      // Get all data for this section
      const records = await fetchAllSectionData(sectionCode)
      if (!records || records.length === 0) {
        console.log(`No data found for section ${sectionCode}`)
        continue
      }

      console.log(`Found ${records.length} records for section ${sectionCode}`)

      // Process each record
      for (const record of records) {
        if (
          !record.tables?.[tableCode] ||
          !Array.isArray(record.tables[tableCode])
        ) {
          continue
        }

        // Normalize data
        const normalizedData = normalizeDataConsistency(
          record.tables[tableCode]
        )

        // Check if any changes were made
        if (hasDataChanged(normalizedData, record.tables[tableCode])) {
          totalFixed++

          // Update record
          await updateRecord(sectionCode, record, tableCode, normalizedData)
        }
      }
    }

    console.log(`Migration completed. Fixed ${totalFixed} records.`)
    return {
      success: true,
      message: `Migration completed successfully. Fixed ${totalFixed} records.`,
    }
  } catch (error) {
    console.error("Error in data migration:", error)
    return {
      success: false,
      message: `Error in migration: ${error.message}`,
    }
  }
}

/**
 * Fetch all data for a section
 */
async function fetchAllSectionData(sectionCode) {
  try {
    const response = await axiosInstance.get(
      `/lkps/sections/${sectionCode}/all-data`
    )
    return Array.isArray(response.data) ? response.data : []
  } catch (error) {
    console.error(`Error fetching all data for section ${sectionCode}:`, error)
    return []
  }
}

/**
 * Check if normalized data differs from original
 */
function hasDataChanged(normalizedData, originalData) {
  if (normalizedData.length !== originalData.length) return true

  for (let i = 0; i < normalizedData.length; i++) {
    if (JSON.stringify(normalizedData[i]) !== JSON.stringify(originalData[i])) {
      return true
    }
  }

  return false
}

/**
 * Update record with normalized data
 */
async function updateRecord(sectionCode, record, tableCode, normalizedData) {
  const payload = {
    prodiId: record.prodiId,
    score: record.score,
  }

  payload[tableCode] = normalizedData

  await axiosInstance.post(`/lkps/sections/${sectionCode}/data`, payload)
  console.log(`Updated record for prodiId: ${record.prodiId}`)
}
