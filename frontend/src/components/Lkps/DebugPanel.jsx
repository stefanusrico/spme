import React from "react"
import { Card, Button, Space, Typography, message } from "antd"
import { getFormulaReference } from "../../utils/formulaUtils"

const { Text } = Typography

/**
 * Debug panel for development-only tools
 * Only shown in development mode
 */
const DebugPanel = ({
  sectionCode,
  config,
  score,
  setScore,
  debugMode,
  setDebugMode,
  calculateScoreData,
  tableData,
  fetchFormulaForSection,
  setConfig,
}) => {
  // Only render in development mode
  if (process.env.NODE_ENV !== "development") {
    return null
  }

  /**
   * Manual calculation function for debugging
   */
  /**
   * Manual calculation function for debugging - bypasses the server
   */
  const manualCalculateScore = () => {
    if (!config) {
      message.error("No configuration loaded")
      return
    }

    const tableCode =
      typeof config.tables[0] === "string"
        ? config.tables[0]
        : config.tables[0]?.code

    const data = tableData[tableCode] || []
    if (data.length === 0) {
      message.warning("No data available for calculation")
      return
    }

    console.log("=== MANUAL CALCULATION ===")
    console.log("Section:", sectionCode)
    console.log("Formula:", config.formula)
    console.log("Data sample:", data[0])
    console.log("Data count:", data.length)

    try {
      // Special handling for section 2a2 - Keketatan seleksi
      if (sectionCode === "2a2") {
        // Sum up the "Pendaftar" values
        const totalApplicants = data.reduce(
          (sum, row) => sum + (parseInt(row.pendaftar) || 0),
          0
        )

        // Sum up the "Lulus Seleksi" values
        const acceptedStudents = data.reduce(
          (sum, row) => sum + (parseInt(row.lulus_seleksi) || 0),
          0
        )

        // Calculate Rasio
        const Rasio =
          acceptedStudents > 0 ? totalApplicants / acceptedStudents : 0

        // Calculate B based on conditions
        let B = 0
        if (Rasio >= 3) {
          B = 4 // If Ratio ≥ 3, then B = 4
        } else {
          B = (4 * Rasio) / 3 // If Ratio < 3, then B = (4 * Ratio) / 3
        }

        // For the formula to work, we need to create variables object with exactly these names
        const variables = {
          NA: totalApplicants,
          NB: acceptedStudents,
          Rasio: Rasio,
          B: B,
          A: 0, // Placeholder
        }

        console.log("Manual calculation:")
        console.log("Total applicants:", totalApplicants)
        console.log("Accepted students:", acceptedStudents)
        console.log("Rasio:", Rasio.toFixed(2))
        console.log("B value:", B.toFixed(2))

        // Final score would be (A + B) / 2, but A is not available yet
        // So we'll just return B for now

        message.success(
          `Selection ratio calculated: ${Rasio.toFixed(
            2
          )}, B value: ${B.toFixed(2)}`
        )

        // If you want to actually set the score in the UI
        // setScore(B); // Uncomment this if you want to display B as the current score

        // Return the variables for use in the formula evaluation
        return variables
      } else {
        // For other sections, use the standard calculation
        const calculatedScore = calculateScore(config, data, NDTPS, sectionCode)

        console.log("Calculation result:", calculatedScore)

        if (calculatedScore !== null) {
          setScore(calculatedScore)
          message.success(`Score calculated: ${calculatedScore}`)
        } else {
          console.error("Calculation returned null")
          message.error("Calculation failed")
        }
      }
    } catch (error) {
      console.error("Manual calculation error:", error)
      message.error("Calculation failed: " + error.message)
    }
  }

  /**
   * Debug function to inspect the data structure
   */
  const inspectData = () => {
    if (!config) return

    const tableCode =
      typeof config.tables[0] === "string"
        ? config.tables[0]
        : config.tables[0]?.code

    const data = tableData[tableCode] || []
    console.log("Data sample:", data.length > 0 ? data[0] : "No data")

    // Count key fields for debugging
    const internasionalCount = data.filter(
      (item) => item.internasional === true
    ).length
    const nasionalCount = data.filter((item) => item.nasional === true).length
    const lokalCount = data.filter((item) => item.lokal === true).length
    const pendidikanCount = data.filter(
      (item) => item.pendidikan === true
    ).length
    const penelitianCount = data.filter(
      (item) => item.penelitian === true
    ).length
    const pkmCount = data.filter((item) => item.pkm === true).length

    message.info(
      `Data counts: International=${internasionalCount}, National=${nasionalCount}, Local=${lokalCount}, Education=${pendidikanCount}, Research=${penelitianCount}, Service=${pkmCount}`
    )
  }

  /**
   * Manually fetch formula for the current section
   */
  const handleFetchFormula = async () => {
    try {
      const formula = await fetchFormulaForSection()
      console.log("Formula:", formula)
      if (formula) {
        message.success(`Formula fetched: ${formula.nomor}${formula.sub}`)
        // Update the config with the formula
        setConfig((prev) => ({
          ...prev,
          formula: formula,
        }))
      } else {
        message.error("Failed to fetch formula")
      }
    } catch (error) {
      console.error("Error fetching formula:", error)
      message.error("Failed to fetch formula")
    }
  }

  return (
    <Card style={{ marginBottom: 16 }}>
      <Space>
        <Button type="link" onClick={() => setDebugMode(!debugMode)}>
          {debugMode ? "Hide Debug Tools" : "Show Debug Tools"}
        </Button>
      </Space>

      {debugMode && (
        <div style={{ marginTop: 8 }}>
          <Space wrap>
            <Button onClick={manualCalculateScore} type="primary">
              Calculate Score
            </Button>
            <Button onClick={inspectData}>Inspect Data</Button>
            <Button onClick={handleFetchFormula}>Fetch Formula</Button>
            <Button
              onClick={() => {
                setScore(3.75)
                message.success("Test score set to 3.75")
              }}
            >
              Set Test Score
            </Button>
          </Space>

          <div style={{ marginTop: 8 }}>
            <Text>Score: {score !== null ? score : "None"}</Text>
            <br />
            <Text>Has formula: {config?.formula ? "Yes" : "No"}</Text>
            {config?.formula && (
              <>
                <br />
                <Text>Formula: {config.formula.main_formula}</Text>
                <br />
                <Text>
                  Conditions:{" "}
                  {config.formula.conditions
                    ? config.formula.conditions.length
                    : 0}
                </Text>
              </>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}

export default DebugPanel
