import { useQuery, useQueryClient } from "@tanstack/react-query"
import axiosInstance from "../utils/axiosConfig"

export function useProjectDetails(projectId) {
  const queryClient = useQueryClient()

  const availableRoles = [
    {
      id: "owner",
      name: "Owner",
      description: "Full control over the project and can manage all aspects",
    },
    {
      id: "admin",
      name: "Admin",
      description: "Can manage project members and tasks",
    },
    {
      id: "user",
      name: "User",
      description: "Can work on assigned tasks",
    },
  ]

  const {
    data: projectDetails,
    isLoading: isLoadingDetails,
    error: detailsError,
    refetch: refetchDetails,
  } = useQuery({
    queryKey: ["project", projectId, "details"],
    queryFn: async () => {
      const response = await axiosInstance.get(`/projects/${projectId}`)
      return response.data.status === "success" ? response.data.data : null
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!projectId,
  })

  const {
    data: projectMembers,
    isLoading: isLoadingMembers,
    error: membersError,
    refetch: refetchMembers,
  } = useQuery({
    queryKey: ["project", projectId, "members"],
    queryFn: async () => {
      const response = await axiosInstance.get(`/projects/${projectId}/members`)
      return response.data.status === "success"
        ? response.data.data.members
        : []
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!projectId,
  })

  const {
    data: taskLists,
    isLoading: isLoadingTasks,
    error: tasksError,
    refetch: refetchTasks,
  } = useQuery({
    queryKey: ["project", projectId, "tasks"],
    queryFn: async () => {
      const response = await axiosInstance.get(`/projects/${projectId}/lists`)

      if (response.data.status === "success") {
        const formattedData = response.data.data.taskLists.flatMap((list) => [
          {
            id: `group-${list.id}`,
            isGroupHeader: true,
            criteria: list.name,
          },
          ...list.tasks.map((task) => ({
            ...task,
            criteria: list.name,
          })),
        ])
        return formattedData
      }
      return []
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!projectId,
  })

  const updateMemberRole = async (userId, newRole) => {
    try {
      const response = await axiosInstance.put(
        `/projects/${projectId}/member-role`,
        {
          userId,
          role: newRole,
        }
      )

      if (response.data.status === "success") {
        queryClient.invalidateQueries(["project", projectId, "members"])
        return response.data
      }
      throw new Error(response.data.message || "Failed to update role")
    } catch (error) {
      console.error("Error updating role:", error)
      throw error
    }
  }

  const addMember = async (memberData) => {
    try {
      const response = await axiosInstance.post(
        `/projects/${projectId}/members`,
        memberData
      )

      if (response.data.status === "success") {
        queryClient.invalidateQueries(["project", projectId, "members"])
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
      const response = await axiosInstance.post(`/removemember/${projectId}`, {
        userId,
      })

      if (response.data.status === "success") {
        queryClient.invalidateQueries(["project", projectId, "members"])
        return response.data
      }
      throw new Error(response.data.message || "Failed to remove member")
    } catch (error) {
      console.error("Error removing member:", error)
      throw error
    }
  }

  const updateTask = async (taskId, updates) => {
    try {
      const response = await axiosInstance.patch(
        `/projects/${projectId}/tasks/${taskId}/assign`,
        updates
      )

      if (response.data.status === "success") {
        queryClient.invalidateQueries(["project", projectId, "tasks"])
        return response.data
      }
      throw new Error(response.data.message || "Failed to update task")
    } catch (error) {
      console.error("Error updating task:", error)
      throw error
    }
  }

  return {
    projectDetails,
    projectMembers,
    taskLists,
    availableRoles,
    isLoadingDetails,
    isLoadingMembers,
    isLoadingTasks,
    isLoading: isLoadingDetails || isLoadingMembers || isLoadingTasks,
    errors: {
      details: detailsError,
      members: membersError,
      tasks: tasksError,
    },
    refetchDetails,
    refetchMembers,
    refetchTasks,
    updateMemberRole,
    addMember,
    removeMember,
    updateTask,
  }
}
