import { useQuery } from "@tanstack/react-query"
import axiosInstance from "../utils/axiosConfig"

export function useProjects() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const response = await axiosInstance.get("/projects/all")
      return response.data.status === "success" ? response.data.data : []
    },
  })

  const projects = data || []

  const stats = {
    submitted: projects.filter((p) => p.progress === 100).length,
    inProgress: projects.filter((p) => p.progress > 0 && p.progress < 100)
      .length,
    notStarted: projects.filter((p) => !p.progress || p.progress === 0).length,
    total: projects.length,
    isLoading,
  }

  return { projects, stats, isLoading, error, refetch }
}
