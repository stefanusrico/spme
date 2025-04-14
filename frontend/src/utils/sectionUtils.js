import { fetchSectionStructure } from "../constants/sectionStructure"

// Function to find a section by its code
export const findSectionByCode = async (code) => {
  try {
    // Get the latest structure
    const structure = await fetchSectionStructure()

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
  } catch (error) {
    console.error("Error finding section by code:", error)
  }

  return null
}

// Function to get next and previous section codes
export const getAdjacentSections = async (currentCode) => {
  try {
    // Get the latest structure
    const structure = await fetchSectionStructure()

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
  } catch (error) {
    console.error("Error getting adjacent sections:", error)
    return { prev: null, next: null }
  }
}

// Get all available sections for dropdown
export const getAllSections = async () => {
  try {
    // Get the latest structure
    const structure = await fetchSectionStructure()

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
  } catch (error) {
    console.error("Error getting all sections:", error)
    return []
  }
}

// Synchronous versions that use the provided structure for component usage
export const findSectionByCodeSync = (code, structure) => {
  if (!structure || !structure.length) return null

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
  if (!structure || !structure.length) return { prev: null, next: null }

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
  if (!structure || !structure.length) return []

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
