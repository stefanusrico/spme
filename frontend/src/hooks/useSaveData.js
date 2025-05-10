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
      if (!lkpsId) {
        message.error("No LKPS ID found. Please create LKPS first")
        setShowCreateModal(true)
        return
      }

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
        prodiId: userData.prodiId,
        score: score,
        tahunAkademik: `${new Date().getFullYear()}/${
          new Date().getFullYear() + 1
        }`,
        scoreDetail: {},
      }

      let hasData = false
      try {
        // Prepare data
        for (const tableConfig of config.tables) {
          const tableCode =
            typeof tableConfig === "string" ? tableConfig : tableConfig.code
          const tableRows = tableData[tableCode] || []

          if (tableRows.length > 0) {
            hasData = true
            payload[tableCode] = plugin?.prepareDataForSaving
              ? plugin.prepareDataForSaving(tableRows, userData)
              : tableRows.map((row, index) => ({
                  ...row,
                  no: index + 1,
                  _timestamp: new Date().getTime(),
                }))
          } else {
            payload[tableCode] = []
          }
        }

        if (!hasData) {
          message.warning({ content: "No data to save", key: loadingKey })
          setSaving(false)
          return
        }

        // Calculate score if needed
        if (plugin?.calculateScore) {
          try {
            const firstTableCode =
              typeof config.tables[0] === "string"
                ? config.tables[0]
                : config.tables[0]?.code
            const data = payload[firstTableCode] || []

            message.loading({
              content: "Calculating score...",
              key: loadingKey,
              duration: 0,
            })
            const result = await plugin.calculateScore(data, config, {
              userData,
              currentConfig: config,
              forcedCalculation: true,
              NDTPS: userData?.NDTPS || 0,
            })

            if (result) {
              if (result.scores !== undefined && result.scores !== null) {
                payload.score = result.scores
                setScore(result.scores)
              }
              if (result.scoreDetail) {
                payload.scoreDetail = result.scoreDetail
                setScoreDetail(result.scoreDetail)
              }
            }
          } catch (error) {
            console.error(
              `Error calculating score for section ${sectionCode}:`,
              error
            )
          }
        }

        // Save data
        const response = await axiosInstance.post(
          `/lkps/sections/${sectionCode}/data`,
          payload
        )

        if (response.data.success || response.status === 200) {
          message.success({
            content:
              payload.score !== undefined
                ? `Data saved successfully. Score: ${
                    Array.isArray(payload.score)
                      ? payload.score
                          .map((item) => `Butir ${item.butir}: ${item.nilai}`)
                          .join(", ")
                      : JSON.stringify(payload.score)
                  }`
                : "Data saved successfully",
            key: loadingKey,
          })

          if (Array.isArray(savedSections)) {
            if (!savedSections.includes(sectionCode)) {
              setSavedSections([...savedSections, sectionCode])
            }
          } else {
            setSavedSections([sectionCode])
          }

          if (response.data.score !== undefined) setScore(response.data.score)
          if (response.data.scoreDetail !== undefined)
            setScoreDetail(response.data.scoreDetail)

          if (sectionCode.startsWith("1-") && payload.score !== null) {
            try {
              await axiosInstance.post(`/lkps/sections/update-scores`, {
                prodiId: userData.prodiId,
                sections: ["1-1", "1-2", "1-3"],
                score: payload.score,
              })
            } catch (updateError) {
              console.error(
                "Error updating related section scores:",
                updateError
              )
            }
          }
        } else {
          message.error({
            content: `Failed to save data: ${
              response.data.message || "Unknown error"
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
      lkpsId,
      tableData,
      userData,
      score,
      savedSections,
      setSavedSections,
      setScore,
      setScoreDetail,
      setShowCreateModal,
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
