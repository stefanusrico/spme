import { useState, useCallback } from "react"
import { message } from "antd"
import { calculateScore } from "../utils/formulaUtils"
import {
  isTridharmaSection,
  shouldDeferScoring,
  checkAllRequiredSectionsSaved,
  calculateCombinedScore,
  checkAndCalculateAfterSave,
  normalizeDataConsistency,
} from "../utils/tridharmaUtils"

/**
 * Custom hook for managing LKPS score calculation
 * @param {string} sectionCode - Current section code
 * @param {object} configRef - Reference to the configuration
 * @param {number} NDTPS - NDTPS value from user data
 * @param {object} userData - Current user data
 * @returns {object} Score state and calculation functions
 */
const useLkpsScore = (sectionCode, configRef, NDTPS, userData) => {
  const [score, setScore] = useState(null)
  const [scoreDetail, setScoreDetail] = useState(null)

  /**
   * Calculate score using data for the current section
   */
  const calculateScoreData = useCallback(
    async (data) => {
      console.log("Calculating score with data:", data?.length || 0, "rows")

      if (!data || data.length === 0) {
        console.log("No data available for calculation")
        return
      }

      try {
        console.log("Using local calculation with config:", configRef.current)

        if (!configRef.current?.formula) {
          console.error("No formula in configuration")
          return
        }

        // Normalize data to ensure boolean flags match tingkat_* fields
        const normalizedData = normalizeDataConsistency(data)

        // Check if we should defer calculation for Tridharma sections
        if (shouldDeferScoring(sectionCode)) {
          // Check if all required sections are saved
          const allSaved = await checkAllRequiredSectionsSaved(userData)

          if (!allSaved) {
            console.log(
              "Deferring score calculation until all required sections are saved"
            )
            setScore(null)
            message.info(
              "Score will be calculated after all data in sections 1-1, 1-2, and 1-3 are saved."
            )
            return
          }

          // If all sections are saved, calculate the combined score
          const result = await calculateCombinedScore(userData, NDTPS)
          if (result !== null) {
            setScore(result.score)
            setScoreDetail(result.scoreDetail)
            console.log("Combined score calculated:", result.score)
          }
          return
        }

        // For other sections, use the regular calculation
        const calculatedScore = calculateScore(
          configRef.current,
          normalizedData,
          NDTPS,
          sectionCode
        )

        console.log("Calculation result:", calculatedScore)

        if (calculatedScore !== null) {
          setScore(calculatedScore)
        } else {
          console.error("Calculation returned null")
        }
      } catch (error) {
        console.error("Error in calculation:", error)
        message.error("Failed to calculate score: " + error.message)
      }
    },
    [NDTPS, sectionCode, userData]
  )

  /**
   * Check if score calculation should be performed after save
   */
  const handleAfterSave = useCallback(async () => {
    await checkAndCalculateAfterSave(
      sectionCode,
      userData,
      NDTPS,
      setScore,
      setScoreDetail
    )
  }, [sectionCode, userData, NDTPS])

  return {
    score,
    setScore,
    scoreDetail,
    setScoreDetail,
    calculateScoreData,
    handleAfterSave,
  }
}

export default useLkpsScore
