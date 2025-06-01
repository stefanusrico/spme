import axiosInstance from "./axiosConfig"

const scoreDetailCache = new Map()
const pendingRequests = new Map()

export const fetchScoreDetails = async (tableCode, projectId) => {
  const cacheKey = `${projectId}-${tableCode}`

  if (scoreDetailCache.has(cacheKey)) {
    console.log(`Using cached score details for table ${tableCode}`)
    return scoreDetailCache.get(cacheKey)
  }

  // Return pending request if already in progress
  if (pendingRequests.has(cacheKey)) {
    console.log(`Waiting for pending request for table ${tableCode}`)
    return pendingRequests.get(cacheKey)
  }

  // Create new request
  const requestPromise = (async () => {
    try {
      const response = await axiosInstance.get("/score-details", {
        params: {
          projectId,
          tableCode,
        },
      })

      const scoreDetail = response.data.detailNilai || {}

      // Store in cache
      scoreDetailCache.set(cacheKey, scoreDetail)

      console.log(
        `Fetched and cached score details for table ${tableCode}:`,
        scoreDetail
      )
      return scoreDetail
    } catch (error) {
      console.error(
        `Error fetching score details for table ${tableCode}:`,
        error
      )
      return {}
    } finally {
      // Remove from pending requests
      pendingRequests.delete(cacheKey)
    }
  })()

  pendingRequests.set(cacheKey, requestPromise)

  return requestPromise
}

export const fetchMultipleScoreDetails = async (tableCodes, projectId) => {
  const requests = tableCodes.map((tableCode) =>
    fetchScoreDetails(tableCode, projectId)
  )

  const results = await Promise.all(requests)

  const batchResult = {}
  tableCodes.forEach((tableCode, index) => {
    batchResult[tableCode] = results[index]
  })

  return batchResult
}

export const clearScoreDetailCache = (projectId = null) => {
  if (projectId) {
    for (const key of scoreDetailCache.keys()) {
      if (key.startsWith(`${projectId}-`)) {
        scoreDetailCache.delete(key)
      }
    }
  } else {
    scoreDetailCache.clear()
  }
}
