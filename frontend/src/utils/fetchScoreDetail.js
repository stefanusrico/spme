import axiosInstance from "./axiosConfig"

export const fetchScoreDetails = async (tableCode, projectId) => {
  try {
    const response = await axiosInstance.get("/score-details", {
      params: {
        projectId,
        tableCode,
      },
    })

    console.log(`Fetched score details for table ${tableCode}:`, response.data)
    return response.data.detailNilai || {}
  } catch (error) {
    console.error(`Error fetching score details for table ${tableCode}:`, error)
    return {}
  }
}
