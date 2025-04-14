import axiosInstance from "../utils/axiosConfig"

// Sections with data selection capability
export const sectionsWithDataSelection = [
  "1-1", // Kerjasama Tridharma - Pendidikan
  "1-2", // Kerjasama Tridharma - Penelitian
  "1-3", // Kerjasama Tridharma - Pengabdian
]

// Helper function for checking if a section allows selection
export const isSelectionAllowedForSection = (sectionCode) => {
  return sectionsWithDataSelection.includes(sectionCode)
}

// Fallback structure when API fails
const fallbackStructure = [
  {
    code: "1",
    title: "Kerjasama Tridharma Perguruan Tinggi",
    subSections: [
      {
        code: "1-1",
        title: "Kerjasama Tridharma Perguruan Tinggi - Pendidikan",
      },
      {
        code: "1-2",
        title: "Kerjasama Tridharma Perguruan Tinggi - Penelitian",
      },
      {
        code: "1-3",
        title: "Kerjasama Tridharma Perguruan Tinggi - Pengabdian",
      },
    ],
  },
  {
    code: "2",
    title: "Mahasiswa",
    subSections: [
      { code: "2a1", title: "Seleksi Mahasiswa (S1/S.Tr/S2/M.Tr/S3/D.Tr)" },
      { code: "2a2", title: "Seleksi Mahasiswa (D3)" },
      { code: "2a3", title: "Seleksi Mahasiswa (D2)" },
      { code: "2a4", title: "Seleksi Mahasiswa (D1)" },
      { code: "2b", title: "Mahasiswa Asing" },
    ],
  },
  {
    code: "3",
    title: "Dosen",
    subSections: [
      { code: "3a1", title: "Dosen Tetap Perguruan Tinggi" },
      { code: "3a2", title: "Dosen Pembimbing Utama Tugas Akhir" },
      { code: "3a3", title: "EWMP Dosen Tetap Perguruan Tinggi" },
      { code: "3a4", title: "Dosen Tidak Tetap" },
      { code: "3a5", title: "Dosen Industri/Praktisi" },
      { code: "3b1", title: "Pengakuan/Rekognisi Dosen" },
      { code: "3b2", title: "Penelitian DTPS" },
      { code: "3b3", title: "PkM DTPS" },
      { code: "3b4", title: "Publikasi Ilmiah DTPS" },
      { code: "3b5", title: "Karya Ilmiah DTPS yang Disitasi" },
      { code: "3b6", title: "Produk/Jasa DTPS yang Diadopsi" },
      { code: "3b7", title: "Luaran Penelitian/PkM Lainnya oleh DTPS" },
    ],
  },
]

// Helper to determine parent title based on section code and first subsection title
function getParentTitle(parentCode, subsectionTitle) {
  const parentTitles = {
    1: "Kerjasama Tridharma Perguruan Tinggi",
    2: "Mahasiswa",
    3: "Dosen",
    4: "Keuangan, Sarana, dan Prasarana",
    5: "Pembelajaran",
    6: "Penelitian",
    7: "Pengabdian kepada Masyarakat",
    8: "Luaran dan Capaian",
  }

  if (parentTitles[parentCode]) {
    return parentTitles[parentCode]
  }

  // Try to extract parent title from subsection title
  if (subsectionTitle && subsectionTitle.includes("-")) {
    return subsectionTitle.split("-")[0].trim()
  }

  return `Section ${parentCode}`
}

// Build nested section structure from flat API data
const buildSectionStructure = (sections) => {
  const groupedSections = {}

  sections.forEach((section) => {
    // Extract parent code (everything before dash or first character)
    const codeParts = section.code.split("-")
    const parentCode = codeParts[0]

    if (!groupedSections[parentCode]) {
      groupedSections[parentCode] = {
        code: parentCode,
        title: getParentTitle(parentCode, section.title),
        subSections: [],
      }
    }

    // Add as subsection
    groupedSections[parentCode].subSections.push({
      code: section.code,
      title: section.title,
    })
  })

  // Convert object to array and sort by code
  return Object.values(groupedSections).sort((a, b) =>
    a.code.localeCompare(b.code, undefined, { numeric: true })
  )
}

// Cache for section structure
let cachedSectionStructure = null

export const fetchSectionStructure = async (forceRefresh = false) => {
  try {
    // Return cached data if available and refresh is not forced
    if (cachedSectionStructure && !forceRefresh) {
      return cachedSectionStructure
    }

    // Make the API call
    try {
      const response = await axiosInstance.get("/get-all-sections")

      console.log("API Response:", response.data)

      // Check if the response has data property with an array
      if (
        response.data &&
        response.data.data &&
        Array.isArray(response.data.data)
      ) {
        const sections = response.data.data
        console.log("Successfully fetched sections:", sections.length)
        cachedSectionStructure = buildSectionStructure(sections)
        return cachedSectionStructure
      } else if (response.data && Array.isArray(response.data)) {
        // Handle case where the response might be a direct array
        console.log("Successfully fetched sections:", response.data.length)
        cachedSectionStructure = buildSectionStructure(response.data)
        return cachedSectionStructure
      }

      // If we reach here, the response format was unexpected
      console.warn("Unexpected response format, using fallback:", response.data)
      cachedSectionStructure = fallbackStructure
      return fallbackStructure
    } catch (apiError) {
      console.error("API error:", apiError)
      cachedSectionStructure = fallbackStructure
      return fallbackStructure
    }
  } catch (error) {
    console.error("Error in fetchSectionStructure:", error)
    cachedSectionStructure = fallbackStructure
    return fallbackStructure
  }
}

// Initial structure with fallback data
export const sectionStructure = fallbackStructure

// Synchronous versions that use the provided structure for component usage
export const findSectionByCodeSync = (code, structure) => {
  if (!structure || !structure.length) {
    // Use fallback if structure is empty
    structure = fallbackStructure
  }

  // First check if it's a main section
  const mainSection = structure.find((section) => section.code === code)
  if (mainSection) return mainSection

  // Then look in subsections
  for (const section of structure) {
    if (section.subSections) {
      const subSection = section.subSections.find((sub) => sub.code === code)
      if (subSection) {
        return {
          ...subSection,
          parentCode: section.code,
          parentTitle: section.title,
        }
      }
    }
  }

  return null
}

export const getAdjacentSectionsSync = (currentCode, structure) => {
  if (!structure || !structure.length) {
    // Use fallback if structure is empty
    structure = fallbackStructure
  }

  // Flatten the section structure
  const flatSections = []
  structure.forEach((section) => {
    if (section.subSections && section.subSections.length > 0) {
      section.subSections.forEach((sub) => flatSections.push(sub.code))
    } else {
      flatSections.push(section.code)
    }
  })

  const currentIndex = flatSections.indexOf(currentCode)
  if (currentIndex === -1) return { prev: null, next: null }

  return {
    prev: currentIndex > 0 ? flatSections[currentIndex - 1] : null,
    next:
      currentIndex < flatSections.length - 1
        ? flatSections[currentIndex + 1]
        : null,
  }
}

export const getAllSectionsSync = (structure) => {
  if (!structure || !structure.length) {
    // Use fallback if structure is empty
    structure = fallbackStructure
  }

  const sections = []
  structure.forEach((mainSection) => {
    if (mainSection.subSections && mainSection.subSections.length > 0) {
      mainSection.subSections.forEach((sub) => {
        sections.push({
          code: sub.code,
          title: `${sub.code} - ${sub.title}`,
          parent: mainSection.title,
        })
      })
    } else {
      sections.push({
        code: mainSection.code,
        title: `${mainSection.code} - ${mainSection.title}`,
        parent: null,
      })
    }
  })
  return sections
}
