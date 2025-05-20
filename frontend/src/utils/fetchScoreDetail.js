import axiosInstance from "./axiosConfig"

export const fetchScoreDetails = async (prodiId, tableCode) => {
  try {
    const response = await axiosInstance.get("score-details", {
      params: {
        prodiId,
        tableCode: tableCode,
      },
    })

    return response.data
  } catch (error) {
    console.error("Terjadi kesalahan saat mengambil score-details:", error)
    throw error
  }
}
