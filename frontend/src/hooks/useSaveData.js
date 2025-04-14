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
      message.loading({ content: "Saving data...", key: "saveData" })

      try {
        const payload = {
          prodiId: userData.prodiId,
          score: score,
          tahunAkademik:
            new Date().getFullYear() + "/" + (new Date().getFullYear() + 1),
        }

        let hasData = false
        config.tables.forEach((tableConfig) => {
          const tableCode =
            typeof tableConfig === "string" ? tableConfig : tableConfig.code

          const tableRows = tableData[tableCode] || []

          if (tableRows.length > 0) {
            hasData = true
            if (plugin && plugin.prepareDataForSaving) {
              payload[tableCode] = plugin.prepareDataForSaving(
                tableRows,
                userData
              )
            } else {
              payload[tableCode] = tableRows.map((row, index) => ({
                ...row,
                no: index + 1,
                _timestamp: new Date().getTime(),
              }))
            }
          } else {
            payload[tableCode] = []
          }
        })

        if (!hasData) {
          message.warning("No data to save")
          setSaving(false)
          return
        }

        if (plugin && typeof plugin.calculateScore === "function") {
          const tableCode =
            typeof config.tables[0] === "string"
              ? config.tables[0]
              : config.tables[0]?.code

          const data = payload[tableCode] || []

          try {
            message.loading({
              content: "Calculating score...",
              key: "saveData",
            })

            const result = await plugin.calculateScore(data, config, {
              userData,
              currentConfig: config,
              forcedCalculation: true,
              NDTPS: userData?.NDTPS || 0,
            })

            if (result && result.score !== undefined && result.score !== null) {
              payload.score = result.score
              setScore(result.score)

              if (result.scoreDetail) {
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

        const response = await axiosInstance.post(
          `/lkps/sections/${sectionCode}/data`,
          payload
        )

        if (response.data.success || response.status === 200) {
          if (payload.score !== null && payload.score !== undefined) {
            message.success({
              content: `Data saved successfully. Score: ${payload.score}`,
              key: "saveData",
            })
          } else {
            message.success({
              content: "Data saved successfully",
              key: "saveData",
            })
          }

          if (Array.isArray(savedSections)) {
            if (!savedSections.includes(sectionCode)) {
              setSavedSections([...savedSections, sectionCode])
            }
          } else {
            setSavedSections([sectionCode])
          }

          if (
            response.data.score !== undefined &&
            response.data.score !== null
          ) {
            setScore(response.data.score)
          }

          if (
            response.data.scoreDetail !== undefined &&
            response.data.scoreDetail !== null
          ) {
            setScoreDetail(response.data.scoreDetail)
          }

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
            content:
              "Failed to save data: " +
              (response.data.message || "Unknown error"),
            key: "saveData",
          })
        }
      } catch (error) {
        console.error("Error saving data:", error)
        message.error({
          content:
            "Error saving data: " +
            (error.response?.data?.message || error.message || "Unknown error"),
          key: "saveData",
        })
      }

      setSaving(false)
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
      let newLkpsId = null
      if (typeof lkps._id === "object" && lkps._id.$oid) {
        newLkpsId = lkps._id.$oid
      } else {
        newLkpsId = lkps._id
      }

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
