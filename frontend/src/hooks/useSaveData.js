import { useState, useCallback } from "react"
import { message } from "antd"
import { toast } from "react-toastify"
import axiosInstance from "../utils/axiosConfig"

export const useSaveData = (
  tableCode,
  userData,
  tableData,
  score,
  lkpsId,
  savedTables,
  setSavedTables,
  setScore,
  setScoreDetail,
  plugin,
  projectId
) => {
  const [saving, setSaving] = useState(false)

  const handleSave = async (config) => {
    setSaving(true)
    try {
      // Prepare your data for saving
      const tables = config.tables.map((table) => {
        // Get the actual table code
        const actualTableCode =
          typeof table === "string" ? table : table.code || table.kode
        return {
          tableCode: actualTableCode,
          data: tableData[actualTableCode] || [],
        }
      })

      // Save each table with API calls
      const savePromises = tables.map(async (tableInfo) => {
        const { tableCode: code, data } = tableInfo

        // Initialize payload with basic structure
        let payload = {
          data,
          nilai: score, // Start with current score
          detailNilai: {},
          projectId,
          tableCode: code,
        }

        // Calculate score if plugin supports it
        if (plugin?.calculateScore) {
          try {
            const result = await plugin.calculateScore(data, config, {
              userData,
              currentConfig: config,
              forcedCalculation: true,
              projectId,
              NDTPS: 0,
            })

            console.log("ini result dari plugincaclculatescore", result)

            if (result) {
              // Update payload with calculated values
              if (result.scores !== undefined && result.scores !== null) {
                payload.nilai = result.scores // Use 'nilai' for API
                setScore(result.scores)
              }
              if (result.scoreDetail) {
                payload.detailNilai = result.scoreDetail // Use 'detailNilai' for API
                setScoreDetail(result.scoreDetail)
              }
            }
          } catch (error) {
            console.error(`Error calculating score for section ${code}:`, error)
          }
        }

        // If you have a task ID from existing data
        if (lkpsId) {
          payload.taskId = lkpsId
        }

        console.log("Final payload being sent:", {
          ...payload,
          data: `[${payload.data.length} items]`, // Don't log full data
        })

        try {
          const response = await axiosInstance.post(
            `/lkps/data/${code}`,
            payload
          )
          return response.data
        } catch (error) {
          console.error(`Error saving table ${code}:`, error)
          throw error
        }
      })

      const results = await Promise.all(savePromises)

      // Update UI based on save results
      setSavedTables([...savedTables, tableCode])

      // Update score if returned from API
      if (results[0]) {
        if (results[0].nilai !== undefined && results[0].nilai !== null) {
          setScore(results[0].nilai)
        }
        if (results[0].detailNilai) {
          setScoreDetail(results[0].detailNilai)
        }
      }

      // ✅ PERBAIKAN: Fetch data terbaru setelah save berhasil
      try {
        const fetchResponse = await axiosInstance.get(`lkps/data`, {
          params: {
            projectId,
            tableCode,
          },
        })

        if (fetchResponse.data) {
          // Update score dari response terbaru
          if (
            fetchResponse.data.nilai &&
            Array.isArray(fetchResponse.data.nilai)
          ) {
            setScore(fetchResponse.data.nilai)
          } else if (
            fetchResponse.data.nilai !== null &&
            fetchResponse.data.nilai !== undefined
          ) {
            setScore([{ butir: null, nilai: fetchResponse.data.nilai }])
          }

          // Update score detail dari response terbaru
          if (fetchResponse.data.detailNilai) {
            setScoreDetail(fetchResponse.data.detailNilai)
          }

          console.log("Updated score after save:", fetchResponse.data.nilai)
          console.log(
            "Updated scoreDetail after save:",
            fetchResponse.data.detailNilai
          )
        }
      } catch (fetchError) {
        console.error("Error fetching updated data after save:", fetchError)
        // Tidak perlu throw error karena save sudah berhasil
      }

      toast.success("Data saved successfully!")
    } catch (error) {
      console.error("Error saving data:", error)

      // Better error handling for specific error cases
      if (error.response) {
        // Handle specific HTTP error responses
        if (
          error.response.status === 404 &&
          error.response.data.message.includes("Project not found")
        ) {
          toast.error(
            "Project not found. Please make sure you are working in a valid project."
          )
        } else if (
          error.response.status === 403 &&
          error.response.data.message.includes("inactive")
        ) {
          toast.error(
            "Cannot save data for inactive projects. Please contact your administrator."
          )
        } else {
          toast.error(
            `Error: ${error.response.data.message || "Unknown error occurred"}`
          )
        }
      } else {
        toast.error(`Error saving data: ${error.message}`)
      }
    } finally {
      setSaving(false)
    }
  }

  return { saving, handleSave }
}
