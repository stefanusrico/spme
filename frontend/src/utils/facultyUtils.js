/**
 * Utilities for managing Faculty sections (3a*, 3b*, etc.)
 * Contains functions specific to faculty data processing and calculations
 */
import axiosInstance from "./axiosConfig"

/**
 * Check if a section is a faculty section
 * @param {string} sectionCode - The section code to check
 * @returns {boolean} - True if the section is a faculty section
 */
export const isFacultySection = (sectionCode) => {
  return sectionCode.startsWith("3")
}

/**
 * Extracts variables specific to Faculty sections (3a*, 3b*, etc.)
 * @param {string} sectionCode - The section code
 * @param {Array} data - The table data
 * @param {object} variables - The variables object to populate
 */
export const extractFacultyVariables = (sectionCode, data, variables) => {
  // Extract faculty-related variables based on the specific section
  if (sectionCode.startsWith("3a")) {
    // Faculty composition variables
    variables.NDS = data.filter((item) => item.sdoctor === true).length || 0
    variables.NDT = data.filter((item) => item.smaster === true).length || 0
    variables.NL = data.filter((item) => item.lecturer === true).length || 0
    variables.NAA =
      data.filter((item) => item.assistantprofessor === true).length || 0
    variables.NAP =
      data.filter((item) => item.associateprofessor === true).length || 0
    variables.NGB = data.filter((item) => item.professor === true).length || 0
  } else if (sectionCode.startsWith("3b")) {
    // Faculty performance variables
    variables.NP = data.filter((item) => item.research === true).length || 0
    variables.NK = data.filter((item) => item.publication === true).length || 0
    variables.NM = data.filter((item) => item.community === true).length || 0
  }

  console.log("Faculty variables extracted:", variables)
}

/**
 * Check if all required faculty sections are saved
 * @param {object} userData - User data containing prodiId
 * @param {Array} sectionCodes - Array of section codes to check
 * @returns {Promise<boolean>} - Promise resolving to true if all sections are saved
 */
export const checkAllFacultySectionsSaved = async (userData, sectionCodes) => {
  try {
    // Check status of the specified sections
    for (const sectionCode of sectionCodes) {
      try {
        await axiosInstance.get(`/lkps/sections/${sectionCode}/data`, {
          params: { prodiId: userData?.prodiId },
        })
      } catch (error) {
        console.error(`Error checking section ${sectionCode}:`, error)
        return false
      }
    }

    console.log("All faculty sections are available")
    return true
  } catch (error) {
    console.error("Error checking faculty sections:", error)
    return false
  }
}

/**
 * Fetch data from all faculty sections
 * @param {object} userData - User data containing prodiId
 * @param {Array} sectionCodes - Array of section codes to fetch
 * @returns {Promise<object|null>} - Promise resolving to section data object or null
 */
export const fetchAllFacultySectionsData = async (userData, sectionCodes) => {
  try {
    if (!userData?.prodiId) return null

    const sectionData = {}

    // Fetch data for each section
    for (const sectionCode of sectionCodes) {
      try {
        const response = await axiosInstance.get(
          `/lkps/sections/${sectionCode}/data`,
          {
            params: { prodiId: userData.prodiId },
          }
        )

        if (response.data && response.data.tables) {
          sectionData[sectionCode] = response.data
        }
      } catch (error) {
        console.error(`Error fetching section ${sectionCode}:`, error)
      }
    }

    return sectionData
  } catch (error) {
    console.error("Error fetching all faculty section data:", error)
    return null
  }
}

/**
 * Calculate ratio of lecturers by qualification
 * @param {Array} data - Faculty data
 * @returns {object} Various qualification ratios
 */
export const calculateFacultyQualificationRatios = (data) => {
  const totalLecturers = data.length || 1 // Avoid division by zero

  const doctorateCount = data.filter((f) => f.sdoctor === true).length
  const mastersCount = data.filter((f) => f.smaster === true).length
  const professorCount = data.filter((f) => f.professor === true).length
  const assocProfCount = data.filter(
    (f) => f.associateprofessor === true
  ).length
  const assistProfCount = data.filter(
    (f) => f.assistantprofessor === true
  ).length

  return {
    doctorateRatio: doctorateCount / totalLecturers,
    mastersRatio: mastersCount / totalLecturers,
    professorRatio: professorCount / totalLecturers,
    assocProfRatio: assocProfCount / totalLecturers,
    assistProfRatio: assistProfCount / totalLecturers,
  }
}

/**
 * Calculate research and publication metrics
 * @param {Array} data - Faculty research data
 * @returns {object} Research and publication metrics
 */
export const calculateResearchMetrics = (data) => {
  const totalLecturers = data.length || 1 // Avoid division by zero

  const researchCount = data.filter((f) => f.research === true).length
  const publicationCount = data.filter((f) => f.publication === true).length
  const communityServiceCount = data.filter((f) => f.community === true).length

  // Additional metrics can be calculated here

  return {
    researchPerFaculty: researchCount / totalLecturers,
    publicationsPerFaculty: publicationCount / totalLecturers,
    communityServicePerFaculty: communityServiceCount / totalLecturers,
  }
}

/**
 * Calculate combined score for faculty sections if needed
 * @param {object} userData - User data containing prodiId
 * @param {Array} sectionCodes - Array of relevant section codes
 * @returns {Promise<object|null>} - Score details or null
 */
export const calculateFacultyCombinedScore = async (userData, sectionCodes) => {
  // This function would implement any special combined calculations
  // needed for faculty sections, similar to the tridharma calculation

  // For now, this is just a placeholder - implement as needed
  return null
}
