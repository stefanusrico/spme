/**
 * Generic formula processing utilities
 */
import * as math from "mathjs"

import { extractTridharmaVariables } from "./tridharmaUtils"
import { extractFacultyVariables } from "./facultyUtils"

/**
 * Processes a formula string by replacing variable placeholders with their values
 */
export const processFormulaString = (formulaString, variables) => {
  if (!formulaString) {
    console.error("Empty formula string received")
    return ""
  }

  let processedFormula = formulaString
  if (formulaString.includes("=")) {
    processedFormula = formulaString.split("=")[1].trim()
  }

  Object.keys(variables).forEach((key) => {
    const regex = new RegExp(key, "g")
    processedFormula = processedFormula.replace(regex, variables[key])
  })

  return processedFormula
}

/**
 * Extracts variables from data based on section code
 */
export const extractVariablesFromData = (
  sectionCode,
  tableCode,
  data,
  NDTPS = 0
) => {
  const variables = {
    NDTPS: NDTPS,
  }

  if (sectionCode.startsWith("1-")) {
    extractTridharmaVariables(sectionCode, data, variables)
  } else if (sectionCode.startsWith("2")) {
    extractStudentVariables(sectionCode, data, variables)
  } else if (sectionCode.startsWith("3")) {
    extractFacultyVariables(sectionCode, data, variables)
  } else {
    extractGenericVariables(sectionCode, data, variables)
  }

  return variables
}

/**
 * Extract generic variables for sections without specific extractors
 */
const extractGenericVariables = (sectionCode, data, variables) => {
  variables.TOTAL = data.length

  const booleanFields = [
    "active",
    "completed",
    "ongoing",
    "international",
    "national",
    "local",
    "verified",
  ]

  booleanFields.forEach((field) => {
    const count = data.filter((item) => item[field] === true).length
    variables[field.toUpperCase()] = count
  })
}

/**
 * Calculate score based on the provided formula and data
 */
export const calculateScore = (config, tableData, NDTPS = 0, sectionCode) => {
  if (!config?.formula) {
    return null
  }

  try {
    const tableCode =
      typeof config.tables[0] === "string"
        ? config.tables[0]
        : config.tables[0]?.code

    let variables = extractVariablesFromData(
      sectionCode,
      tableCode,
      tableData,
      NDTPS
    )

    if (config.formula.parameters) {
      Object.entries(config.formula.parameters).forEach(([key, value]) => {
        variables[key] = value
      })
    }

    let mainFormula = config.formula.main_formula
    if (!mainFormula) {
      console.error("Main formula is empty")
      return null
    }

    const processedFormula = processFormulaString(mainFormula, variables)

    let mainResult
    try {
      mainResult = math.evaluate(processedFormula)
    } catch (error) {
      console.error("Error evaluating main formula:", error, processedFormula)
      return null
    }

    let calculatedScore = null

    if (config.formula.conditions && config.formula.conditions.length > 0) {
      for (const condition of config.formula.conditions) {
        let conditionToEvaluate = condition.condition.replace(/RK/g, mainResult)

        let conditionMet = false
        try {
          conditionMet = math.evaluate(conditionToEvaluate)
        } catch (error) {
          continue
        }

        if (conditionMet) {
          if (condition.formula === "RK") {
            calculatedScore = mainResult
          } else if (!isNaN(Number(condition.formula))) {
            calculatedScore = Number(condition.formula)
          } else {
            let formulaToEvaluate = condition.formula.replace(/RK/g, mainResult)

            try {
              calculatedScore = math.evaluate(formulaToEvaluate)
            } catch (error) {
              console.error(
                "Error evaluating formula:",
                error,
                formulaToEvaluate
              )
            }
          }

          if (calculatedScore !== null) {
            break
          }
        }
      }
    }

    if (calculatedScore === null) {
      calculatedScore = mainResult >= 4 ? 4 : mainResult
    }

    if (isNaN(calculatedScore)) {
      return 0
    }

    calculatedScore = Math.round(calculatedScore * 100) / 100

    return calculatedScore
  } catch (err) {
    console.error("Error calculating score:", err)
    return null
  }
}

/**
 * Get the formula reference for a section code
 */
export const getFormulaReference = (sectionCode) => {
  const formulaMapping = {
    "1-1": { number: "10", sub: "A" },
    "1-2": { number: "10", sub: "A" },
    "1-3": { number: "10", sub: "A" },
    "2a1": { number: "11", sub: "A" },
    "2a2": { number: "13", sub: "B" },
    "2a3": { number: "11", sub: "C" },
    "2a4": { number: "11", sub: "D" },
    "2b": { number: null, sub: null },
    "3a1": { number: "13", sub: "A" },
    "3a2": { number: null, sub: null },
    "3a3": { number: null, sub: null },

    "8a": { number: null, sub: null },
    "8b1": { number: null, sub: null },
    "8b2": { number: null, sub: null },
  }

  return formulaMapping[sectionCode] || { number: "10", sub: "A" }
}
