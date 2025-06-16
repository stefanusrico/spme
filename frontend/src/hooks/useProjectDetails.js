import { useQuery, useQueryClient } from "@tanstack/react-query"
import axiosInstance from "../utils/axiosConfig"

export function useProjectDetails(projectId) {
  const queryClient = useQueryClient()

  const availableRoles = [
    {
      id: "admin",
      name: "Admin",
      description: "Dapat mengelola anggota proyek dan tugas",
    },
    {
      id: "user",
      name: "User",
      description: "Dapat mengerjakan tugas yang diberikan",
    },
  ]

  // --- Main Query for Dashboard Data ---
  // This query now fetches the comprehensive structure needed for the Dashboard
  const {
    data: projectDetails, // Keep the name as DashboardProject expects 'projectDetails'
    isLoading: isLoadingDetails,
    error: detailsError,
    refetch: refetchDetails,
  } = useQuery({
    queryKey: ["project", projectId, "details"], // Key identifies this comprehensive fetch
    queryFn: async () => {
      const response = await axiosInstance.get(`/projects/${projectId}`)
      // The API directly returns the structure we need in response.data.data
      return response.data.status === "success" ? response.data.data : null
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    enabled: !!projectId, // Only run if projectId exists
  })

  // --- Query for Members (Still needed for Members tab and user role) ---
  const {
    data: projectMembers,
    isLoading: isLoadingMembers,
    error: membersError,
    refetch: refetchMembers,
  } = useQuery({
    queryKey: ["project", projectId, "members"],
    queryFn: async () => {
      const response = await axiosInstance.get(`/projects/${projectId}/members`)
      return response.data.status === "success" && response.data.data?.members
        ? response.data.data.members
        : []
    },
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    enabled: !!projectId,
  })

  // --- Query for Task Lists (Potentially for the separate 'Tasks' tab component) ---
  // Decide if the Tasks component needs this specific flat structure or can use projectDetails.tasks
  const {
    data: taskLists, // This holds the flatMap structure
    isLoading: isLoadingTasks,
    error: tasksError,
    refetch: refetchTasks,
  } = useQuery({
    queryKey: ["project", projectId, "taskListsFlat"], // Changed key slightly for clarity
    queryFn: async () => {
      // This endpoint might be `/projects/${projectId}/lists` or `/projects/${projectId}`
      // Assuming it's /lists based on previous code, adjust if needed
      const response = await axiosInstance.get(`/projects/${projectId}/lists`)

      // This formatting might be specific to the 'Tasks' tab component
      if (response.data.status === "success" && response.data.data?.taskLists) {
        const formattedData = response.data.data.taskLists.flatMap((list) => [
          {
            id: `group-${list.id}`,
            isGroupHeader: true,
            criteria: list.name, // Using list.name from API
          },
          ...list.tasks.map((task) => ({
            ...task,
            criteria: list.name, // Using list.name from API
            // Ensure task structure matches what Tasks component expects
          })),
        ])
        return formattedData
      }
      return []
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!projectId,
  })

  // --- Mutation Functions (remain the same) ---
  const updateMemberRole = async (userId, newRole) => {
    // ... implementation ...
    try {
      const response = await axiosInstance.put(
        `/projects/${projectId}/member-role`,
        { userId, role: newRole }
      )
      if (response.data.status === "success") {
        queryClient.invalidateQueries({
          queryKey: ["project", projectId, "members"],
        })
        queryClient.invalidateQueries({
          queryKey: ["project", projectId, "details"],
        }) // Also invalidate details if role affects resource allocation display
        return response.data
      }
      throw new Error(response.data.message || "Failed to update role")
    } catch (error) {
      console.error("Error updating role:", error)
      throw error
    }
  }

  const addMember = async (memberData) => {
    // ... implementation ...
    try {
      const response = await axiosInstance.post(
        `/projects/${projectId}/members`,
        memberData
      )
      if (response.data.status === "success") {
        queryClient.invalidateQueries({
          queryKey: ["project", projectId, "members"],
        })
        queryClient.invalidateQueries({
          queryKey: ["project", projectId, "details"],
        }) // Invalidate details for resource allocation
        return response.data
      }
      throw new Error(response.data.message || "Failed to add member")
    } catch (error) {
      console.error("Error adding member:", error)
      throw error
    }
  }

  const removeMember = async (userId) => {
    try {
      // Ensure the endpoint is correct, backend used /removemember/{projectId} POST
      const response = await axiosInstance.post(`/removemember/${projectId}`, {
        userId,
      })
      if (response.data.status === "success") {
        queryClient.invalidateQueries({
          queryKey: ["project", projectId, "members"],
        })
        queryClient.invalidateQueries({
          queryKey: ["project", projectId, "details"],
        }) // Invalidate details for resource allocation
        return response.data
      }
      throw new Error(response.data.message || "Failed to remove member")
    } catch (error) {
      console.error("Error removing member:", error)
      throw error // Re-throw the error after logging
    }
  }

  const updateTask = async (taskId, updates) => {
    // ... implementation ...
    try {
      // Ensure endpoint and method are correct, backend used PATCH /projects/{projectId}/tasks/{taskId}/assign
      const response = await axiosInstance.patch(
        `/projects/${projectId}/tasks/${taskId}/assign`,
        updates
      )
      if (response.data.status === "success") {
        // Invalidate both details (for dashboard stats) and taskLists (if used by Tasks tab)
        queryClient.invalidateQueries({
          queryKey: ["project", projectId, "details"],
        })
        queryClient.invalidateQueries({
          queryKey: ["project", projectId, "taskListsFlat"],
        })
        return response.data
      }
      throw new Error(response.data.message || "Failed to update task")
    } catch (error) {
      console.error("Error updating task:", error)
      throw error
    }
  }

  // Refetch all relevant queries
  const refetchAll = () => {
    refetchDetails()
    refetchMembers()
    refetchTasks() // Refetch the flat task list if it's used
  }

  return {
    projectDetails, // This now holds the rich data structure
    projectMembers,
    taskLists, // For the separate Tasks tab component (if needed)
    availableRoles,
    isLoading: isLoadingDetails || isLoadingMembers || isLoadingTasks, // Combined loading
    errors: {
      // Combined errors
      details: detailsError,
      members: membersError,
      tasks: tasksError,
    },
    refetchAll, // Consolidated refetch
    // Keep individual refetches if needed elsewhere
    refetchDetails,
    refetchMembers,
    refetchTasks,
    // Mutations
    updateMemberRole,
    addMember,
    removeMember,
    updateTask,
  }
}
