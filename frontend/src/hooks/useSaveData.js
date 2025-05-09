import { useState, useCallback } from "react"
import { message } from "antd"
import axiosInstance from "../utils/axiosConfig"

export const useSaveData = (
  sectionCode,
  userData,
  tableData,
  score,
  lkpsId,
  savedSections,
  setSavedSections,
  setScore,
  setScoreDetail,
  setShowCreateModal,
  plugin
) => {
  const [saving, setSaving] = useState(false)

  const handleSave = useCallback(
    async (config) => {
      if (!userData) {
        message.error("User information not found")
        return
      }

      setSaving(true)
      const loadingKey = "saveData"
      message.loading({
        content: "Saving data...",
        key: loadingKey,
        duration: 0,
      })

      const payload = {
        data: [],
        nilai: null,
        detailNilai: {},
      }

      let hasData = false
      try {
        // Prepare data for each table
        for (const tableConfig of config.tables) {
          const tableCode =
            typeof tableConfig === "string" ? tableConfig : tableConfig.code
          const tableRows = tableData[tableCode] || []

          if (tableRows.length > 0) {
            hasData = true
            // Use the table data directly - our backend expects this format
            payload.data = plugin?.prepareDataForSaving
              ? plugin.prepareDataForSaving(tableRows, userData)
              : tableRows.map((row, index) => ({
                  ...row,
                  no: index + 1,
                  _timestamp: new Date().getTime(),
                }))
          }
        }

        if (!hasData) {
          message.warning({ content: "No data to save", key: loadingKey })
          setSaving(false)
          return
        }

        // Calculate score if needed
        let calculatedScores = null
        if (plugin?.calculateScore) {
          try {
            const firstTableCode =
              typeof config.tables[0] === "string"
                ? config.tables[0]
                : config.tables[0]?.code
            const data = tableData[firstTableCode] || []

            message.loading({
              content: "Calculating score...",
              key: loadingKey,
              duration: 0,
            })

            const result = await plugin.calculateScore(data, config, {
              userData,
              currentConfig: config,
              forcedCalculation: true,
            })

            if (result) {
              // Handle scores array from plugin
              if (
                result.scores &&
                Array.isArray(result.scores) &&
                result.scores.length > 0
              ) {
                // Save the full scores array directly in the nilai field
                calculatedScores = result.scores
                payload.nilai = result.scores

                // For UI display, set the array
                setScore(result.scores)
                console.log("Setting UI scores array:", result.scores)
              }
              // Fallback to single score value if present
              else if (result.score !== undefined && result.score !== null) {
                const numericScore = parseFloat(result.score) || 0
                calculatedScores = [{ butir: 1, nilai: numericScore }]
                payload.nilai = calculatedScores
                setScore(calculatedScores)
                console.log("Setting single score as array:", calculatedScores)
              }

              if (result.scoreDetail) {
                payload.detailNilai = result.scoreDetail
                setScoreDetail(result.scoreDetail)
                console.log("Setting score details:", result.scoreDetail)
              }
            }
          } catch (error) {
            console.error("Error calculating score:", error)
          }
        }

        // Save data using the new API endpoint
        const response = await axiosInstance.post(
          `/lkps/data/${sectionCode}`,
          payload
        )

        if (response.data || response.status === 200) {
          // Format scores for display in the success message
          let scoreMessage = ""
          if (calculatedScores && Array.isArray(calculatedScores)) {
            scoreMessage = calculatedScores
              .map((s) => `${s.butir}: ${parseFloat(s.nilai).toFixed(2)}`)
              .join(", ")
          }

          message.success({
            content: `Data saved successfully${
              scoreMessage ? `. Score: ${scoreMessage}` : ""
            }`,
            key: loadingKey,
          })

          if (Array.isArray(savedSections)) {
            if (!savedSections.includes(sectionCode)) {
              setSavedSections([...savedSections, sectionCode])
            }
          } else {
            setSavedSections([sectionCode])
          }

          // After successful save, update state with response data
          if (response.data) {
            // If the server returned scores, update them
            if (response.data.nilai !== undefined) {
              setScore(response.data.nilai)
            }

            // Update score details if available
            if (response.data.detailNilai !== undefined) {
              setScoreDetail(response.data.detailNilai)
            }
          }
        } else {
          message.error({
            content: `Failed to save data: ${
              response.data?.message || "Unknown error"
            }`,
            key: loadingKey,
          })
        }
      } catch (error) {
        console.error("Error saving data:", error)
        message.error({
          content: `Error saving data: ${
            error.response?.data?.message || error.message || "Unknown error"
          }`,
          key: loadingKey,
        })
      } finally {
        setSaving(false)
      }
    },
    [
      sectionCode,
      tableData,
      userData,
      score,
      savedSections,
      setSavedSections,
      setScore,
      setScoreDetail,
      plugin,
    ]
  )

  const handleLkpsCreated = useCallback((lkps, setLkpsId, setLkpsInfo) => {
    if (lkps && lkps._id) {
      const newLkpsId =
        typeof lkps._id === "object" && lkps._id.$oid ? lkps._id.$oid : lkps._id
      setLkpsId(newLkpsId)
      setLkpsInfo({
        periode: lkps.periode,
        tahunAkademik: lkps.tahunAkademik,
        status: lkps.status || "draft",
      })
      message.success("LKPS created successfully. You can now save data.")
    }
  }, [])

  return {
    saving,
    handleSave,
    handleLkpsCreated,
  }
}
