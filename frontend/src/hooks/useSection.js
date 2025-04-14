import { useState, useEffect, useCallback } from "react"
import {
  fetchSectionStructure,
  findSectionByCodeSync,
  getAdjacentSectionsSync,
} from "../constants/sectionStructure"

export const useSection = (sectionCode, navigate) => {
  const [sectionStructure, setSectionStructure] = useState([])
  const [structureLoading, setStructureLoading] = useState(true)
  const [savedSections, setSavedSections] = useState([])

  // Load section structure
  useEffect(() => {
    const loadSectionStructure = async () => {
      try {
        setStructureLoading(true)
        const structure = await fetchSectionStructure()
        setSectionStructure(structure)
        console.log("Section structure loaded:", structure.length, "sections")
      } catch (error) {
        console.error("Error in loadSectionStructure:", error)
      } finally {
        setStructureLoading(false)
      }
    }

    loadSectionStructure()
  }, [])

  // Get current section and navigation
  const currentSection = findSectionByCodeSync(sectionCode, sectionStructure)
  const { prev, next } = getAdjacentSectionsSync(sectionCode, sectionStructure)

  // Navigation handlers
  const handlePrev = useCallback(() => {
    if (prev) navigate(`/lkps/${prev}`)
  }, [navigate, prev])

  const handleNext = useCallback(() => {
    if (next) navigate(`/lkps/${next}`)
  }, [navigate, next])

  const handleSectionChange = useCallback(
    (newSection) => {
      navigate(`/lkps/${newSection}`)
    },
    [navigate]
  )

  return {
    sectionStructure,
    structureLoading,
    currentSection,
    savedSections,
    setSavedSections,
    prev,
    next,
    handlePrev,
    handleNext,
    handleSectionChange,
  }
}
