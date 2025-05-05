import axiosInstance from "./axiosConfig"

export const fetchScoreDetails = async (sectionCode) => {
  try {
    const response = await axiosInstance.get("score-details", {
      params: {
        section_code: sectionCode,
      },
    })

    return response.data
  } catch (error) {
    console.error("Terjadi kesalahan saat mengambil score-details:", error)
    throw error
  }
}
