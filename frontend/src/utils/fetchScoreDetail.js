import axiosInstance from "./axiosConfig"

export const fetchScoreDetails = async (prodiId, sectionCode) => {
  try {
    const response = await axiosInstance.get("score-details", {
      params: {
        prodiId,
        section_code: sectionCode,
      },
    })

    return response.data
  } catch (error) {
    console.error("Terjadi kesalahan saat mengambil score-details:", error)
    throw error
  }
}
