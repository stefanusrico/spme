import { useState, useEffect, useMemo } from "react"
import { useUser } from "../context/userContext"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import {
  Calendar,
  Clock,
  FileText,
  Users,
  CheckCircle,
  Circle,
  AlertCircle,
  Loader2,
} from "lucide-react"
import axiosInstance from "../utils/axiosConfig"

import { LoadingScreen } from "./LoadingSpinner"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

const CircularProgress = ({ value, status, label }) => {
  const colorMap = {
    submitted: "text-green-600",
    inprogress: "text-yellow-600",
    notstarted: "text-red-600",
  }

  const bgColorMap = {
    submitted: "bg-green-100",
    inprogress: "bg-yellow-100",
    notstarted: "bg-red-100",
  }

  return (
    <div
      className={`relative w-24 h-24 rounded-full ${bgColorMap[status]} flex items-center justify-center`}
    >
      <div className="absolute w-20 h-20 rounded-full bg-white flex items-center justify-center">
        <div className={`text-2xl font-bold ${colorMap[status]}`}>{value}%</div>
      </div>
      <div className="absolute -bottom-6 w-full text-center text-sm font-medium">
        {label}
      </div>
    </div>
  )
}

const TaskCard = ({ title, count, icon, className }) => {
  return (
    <Card className={`w-full ${className}`}>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{count}</p>
        </div>
        <div className="rounded-full p-3 bg-primary/10">{icon}</div>
      </CardContent>
    </Card>
  )
}

// Badge status component
const StatusBadge = ({ status }) => {
  const statusMap = {
    UNASSIGNED: (
      <Badge variant="outline" className="bg-gray-100 text-gray-800">
        Unassigned
      </Badge>
    ),
    ACTIVE: (
      <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
        In Progress
      </Badge>
    ),
    COMPLETED: (
      <Badge variant="outline" className="bg-green-100 text-green-800">
        Completed
      </Badge>
    ),
    "Not Started": (
      <Badge variant="outline" className="bg-red-100 text-red-800">
        Not Started
      </Badge>
    ),
  }

  return statusMap[status] || <Badge variant="outline">{status}</Badge>
}

const DashboardKoprodi = () => {
  const { userData, isLoading: userLoading } = useUser()

  const [projectData, setProjectData] = useState(null)
  const [members, setMembers] = useState([])
  const [membersLoading, setMembersLoading] = useState(true)
  const [membersError, setMembersError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [taskStatusFilter, setTaskStatusFilter] = useState("ALL")

  // Load user data from local storage if needed
  const userProjects = useMemo(() => {
    const storedUser = localStorage.getItem("user")
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser)
        return parsedUser.projects || []
      } catch (e) {
        console.error("Error parsing user data from localStorage", e)
        return []
      }
    }
    return []
  }, [])

  const projectId = useMemo(() => {
    if (userProjects.length === 0) return null
    return userProjects[userProjects.length - 1].projectId
  }, [userProjects])

  const activities = useMemo(
    () => [
      {
        description: "Butir 1-A submitted by wowow",
        timestamp: "2025-04-15T10:30:00",
      },
      {
        description: "Butir 6-A marked as in progress",
        timestamp: "2025-04-14T14:20:00",
      },
      {
        description: "Butir 13-A assigned to wowow",
        timestamp: "2025-04-14T09:45:00",
      },
      {
        description: "Project created",
        timestamp: "2025-04-13T08:30:00",
      },
    ],
    []
  )

  useEffect(() => {
    const fetchProjectData = async () => {
      if (!projectId) {
        setError(
          "No project found. Please make sure you are assigned to a project."
        )
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const response = await axiosInstance.get(`projects/${projectId}/lists`)
        setProjectData(response.data.data)
      } catch (err) {
        console.error("Error fetching project data:", err)
        setError("Failed to load project data. Please try again later.")
        toast.error(
          "Could not load project data. Please try refreshing the page."
        )
      } finally {
        setLoading(false)
      }
    }

    fetchProjectData()
  }, [projectId, toast])

  useEffect(() => {
    const fetchProjectMembers = async () => {
      if (!projectId) {
        setMembersLoading(false)
        return
      }

      try {
        setMembersLoading(true)
        setMembersError(null)
        const response = await axiosInstance.get(
          `projects/${projectId}/members`
        )

        if (response.data.status === "success" && response.data.data.members) {
          const formattedMembers = response.data.data.members.map((member) => ({
            _id: member.userId,
            name: member.name,
            email: member.email,
            role: member.role,
            profile_picture: member.profile_picture,
            joinedAt: member.joinedAt,
            tasksCount: 0,
          }))

          setMembers(formattedMembers)
        } else {
          setMembers([])
        }
      } catch (err) {
        console.error("Error fetching project members:", err)
        setMembersError("Failed to load team members.")
        toast.error(
          "Could not load team member data. Please try refreshing the page."
        )
      } finally {
        setMembersLoading(false)
      }
    }

    fetchProjectMembers()
  }, [projectId, toast])

  const getAllTasks = useMemo(() => {
    if (!projectData || !projectData.taskLists) return []

    return projectData.taskLists.flatMap((taskList) =>
      taskList.tasks.map((task) => ({
        ...task,
        criteria: taskList.name, // Add criteria name from parent task list
        criteriaCode: taskList.c, // Add criteria code
      }))
    )
  }, [projectData])

  // Update task count for members based on task assignments
  useEffect(() => {
    if (members.length > 0 && getAllTasks.length > 0) {
      // Create a map to count tasks for each member
      const taskCountMap = new Map()

      // Initialize with 0 for all members
      members.forEach((member) => {
        taskCountMap.set(member._id, 0)
      })

      // Count tasks for each member
      getAllTasks.forEach((task) => {
        if (task.owners && task.owners.length > 0) {
          task.owners.forEach((owner) => {
            if (taskCountMap.has(owner.id)) {
              taskCountMap.set(owner.id, taskCountMap.get(owner.id) + 1)
            }
          })
        }
      })

      // Update the members array with task counts
      const updatedMembers = members.map((member) => ({
        ...member,
        tasksCount: taskCountMap.get(member._id) || 0,
      }))

      setMembers(updatedMembers)
    }
  }, [members, getAllTasks])

  // Filter tasks based on selected status
  const getFilteredTasks = useMemo(() => {
    if (taskStatusFilter === "ALL") return getAllTasks
    return getAllTasks.filter((task) => task.status === taskStatusFilter)
  }, [getAllTasks, taskStatusFilter])

  // Group tasks by criteria
  const groupTasksByCriteria = useMemo(() => {
    const filteredTasks = getFilteredTasks
    const grouped = {}

    filteredTasks.forEach((task) => {
      if (!grouped[task.criteria]) {
        grouped[task.criteria] = []
      }
      grouped[task.criteria].push(task)
    })

    return grouped
  }, [getFilteredTasks])

  const calculateTaskStats = useMemo(() => {
    if (!projectData || !projectData.statistics) {
      const allTasks = getAllTasks
      const total = allTasks.length
      const completed = allTasks.filter(
        (task) => task.status === "COMPLETED"
      ).length
      const inProgress = allTasks.filter(
        (task) => task.status === "ACTIVE"
      ).length
      const unassigned = allTasks.filter(
        (task) => task.status === "UNASSIGNED"
      ).length
      const completionPercentage =
        total === 0 ? 0 : Math.round((completed / total) * 100)

      return {
        total,
        completed,
        inProgress,
        unassigned,
        completionPercentage,
      }
    } else {
      const { totalTasks, completedTasks, inProgressTasks, notStartedTasks } =
        projectData.statistics
      const completionPercentage =
        totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100)

      return {
        total: totalTasks,
        completed: completedTasks,
        inProgress: inProgressTasks,
        unassigned: notStartedTasks,
        completionPercentage,
      }
    }
  }, [getAllTasks, projectData])

  const formatDate = (dateString) => {
    if (!dateString) return "-"
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return "-"
      }
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    } catch (e) {
      console.error("Error formatting date:", dateString, e)
      return "-"
    }
  }

  const calculateDaysLeft = (endDate) => {
    if (!endDate) return "N/A"
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const deadline = new Date(endDate)
      deadline.setHours(0, 0, 0, 0)

      if (isNaN(deadline.getTime())) {
        return "N/A"
      }

      const diffTime = deadline - today
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays >= 0 ? diffDays : 0
    } catch (e) {
      console.error("Error calculating days left:", endDate, e)
      return "N/A"
    }
  }

  if (userLoading || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingScreen />
      </div>
    )
  }

  // Show error message if fetching failed
  if (error && !projectData) {
    return (
      <div className="flex justify-center items-center h-64 text-red-500">
        <AlertCircle className="h-8 w-8 mr-2" />
        {error}
      </div>
    )
  }

  // Show message if no project ID is found (user not assigned)
  if (!projectId) {
    return (
      <div className="flex flex-col justify-center items-center h-64 text-center p-4">
        <FileText className="h-16 w-16 mb-4 text-gray-300" />
        <h3 className="text-xl font-medium mb-2">No Project Found</h3>
        <p className="text-muted-foreground max-w-md">
          It seems you are not assigned to any project yet. Please contact your
          administrator if you believe this is an error.
        </p>
      </div>
    )
  }

  // Show message if project data couldn't be loaded but projectId exists
  if (!projectData) {
    return (
      <div className="flex justify-center items-center h-64">
        <FileText className="h-8 w-8 mr-2 text-gray-400" />
        <span>No project data available to display.</span>
      </div>
    )
  }

  // --- Prepare data for rendering ---
  const groupedTasks = groupTasksByCriteria
  const taskStats = calculateTaskStats

  // Calculate the earliest start date and latest end date from tasks
  const allTasksForDates = getAllTasks
  const startDates = allTasksForDates
    .map((task) => task.startDate && new Date(task.startDate))
    .filter((d) => d instanceof Date && !isNaN(d))
  const endDates = allTasksForDates
    .map((task) => task.endDate && new Date(task.endDate))
    .filter((d) => d instanceof Date && !isNaN(d))

  const earliestStartDate =
    startDates.length > 0 ? new Date(Math.min(...startDates)) : null
  const latestEndDate =
    endDates.length > 0 ? new Date(Math.max(...endDates)) : null

  // Calculate days left using the latest end date found
  const daysLeft = calculateDaysLeft(latestEndDate)

  // Create a project object from the API data and calculated values
  const project = {
    _id: projectData.projectId,
    prodiName: projectData.projectName || "Unnamed Project",
    startDate: earliestStartDate?.toISOString().split("T")[0] || null,
    targetDate: latestEndDate?.toISOString().split("T")[0] || null,
    progress: taskStats.completionPercentage,
    daysLeft,
    activities,
  }

  return (
    <div className="w-full space-y-6 p-4 md:p-6">
      {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      {/* Project Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">{project.prodiName}</h1>
          <p className="text-sm text-muted-foreground">
            Project ID: {project._id}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="flex items-center gap-1 text-xs sm:text-sm"
          >
            <Calendar className="h-3 w-3" />
            Started: {formatDate(project.startDate)}
          </Badge>
          <Badge
            variant="outline"
            className="flex items-center gap-1 text-xs sm:text-sm"
          >
            <Calendar className="h-3 w-3" />
            Target: {formatDate(project.targetDate)}
          </Badge>
        </div>
      </div>

      {/* Project Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Overall Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {taskStats.completionPercentage}%
            </div>
            <Progress
              value={taskStats.completionPercentage}
              className="mt-2 h-2"
              aria-label={`Project progress: ${taskStats.completionPercentage}%`}
            />
            <p className="text-xs text-muted-foreground mt-2">
              {taskStats.completed} of {taskStats.total} tasks completed
            </p>
          </CardContent>
        </Card>

        <TaskCard
          title="Completed Tasks"
          count={taskStats.completed}
          icon={<CheckCircle className="h-5 w-5 text-green-500" />}
        />

        <TaskCard
          title="In Progress"
          count={taskStats.inProgress}
          icon={<Circle className="h-5 w-5 text-yellow-500" />}
        />

        <TaskCard
          title="Not Started"
          count={taskStats.unassigned}
          icon={<AlertCircle className="h-5 w-5 text-red-500" />}
        />
      </div>

      {/* Detailed content - tabs */}
      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:w-auto md:inline-flex">
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <h3 className="text-lg font-semibold">Task Management</h3>
            <div className="flex items-center gap-2">
              <Select
                value={taskStatusFilter}
                onValueChange={setTaskStatusFilter}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="ACTIVE">In Progress</SelectItem>
                  <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm">
                Assign Tasks
              </Button>
            </div>
          </div>

          {/* Task list grouped by criteria */}
          <div className="space-y-6">
            {Object.keys(groupedTasks).length > 0 ? (
              Object.keys(groupedTasks).map((criteria) => (
                <div key={criteria} className="space-y-3">
                  <h4 className="font-medium text-base bg-gray-100 p-2 rounded sticky top-0 z-10">
                    {criteria}
                  </h4>
                  <div className="space-y-2">
                    {groupedTasks[criteria].map((task) => (
                      <div
                        key={task.id || task.taskId}
                        className="bg-white p-3 md:p-4 rounded-lg border flex flex-col md:flex-row justify-between gap-3"
                      >
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h5 className="font-medium text-sm md:text-base">
                              {task.name}
                            </h5>
                            <StatusBadge status={task.status} />
                          </div>
                          <p className="text-xs md:text-sm text-muted-foreground">
                            ID: {task.taskId || "N/A"}
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-end gap-2 md:gap-4 text-right">
                          <div className="text-xs md:text-sm text-muted-foreground flex items-center gap-1 justify-end">
                            <Calendar className="h-3 w-3" />
                            <span>Due: {formatDate(task.endDate)}</span>
                          </div>
                          {task.owners && task.owners.length > 0 && (
                            <div className="flex -space-x-2 justify-end items-center mt-1 md:mt-0">
                              {task.owners.slice(0, 3).map((owner, index) => (
                                <div
                                  key={owner.id || index}
                                  className="w-6 h-6 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600"
                                  title={owner.name || "Unknown"}
                                >
                                  {owner.name
                                    ? owner.name.charAt(0).toUpperCase()
                                    : "?"}
                                </div>
                              ))}
                              {task.owners.length > 3 && (
                                <div
                                  className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-500"
                                  title={`${task.owners.length - 3} more`}
                                >
                                  +{task.owners.length - 3}
                                </div>
                              )}
                            </div>
                          )}
                          {(!task.owners || task.owners.length === 0) && (
                            <div className="text-xs text-muted-foreground italic mr-1">
                              Unassigned
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-gray-300" />
                <p className="mt-3 text-sm text-muted-foreground">
                  No tasks match the current filter.
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <div>
                <CardTitle>Project Team</CardTitle>
              </div>
              <Button size="sm" variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            </CardHeader>
            <CardContent>
              {membersLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2">Loading team members...</span>
                </div>
              ) : membersError ? (
                <div className="flex justify-center items-center py-8 text-red-500">
                  <AlertCircle className="h-6 w-6 mr-2" />
                  {membersError}
                </div>
              ) : (
                <div className="border rounded-lg overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Joined
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Assigned Tasks
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {members.length > 0 ? (
                        members.map((member) => (
                          <tr key={member._id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                                  {member.profile_picture &&
                                  member.profile_picture !==
                                    "default_picture.jpg" ? (
                                    <img
                                      src={member.profile_picture}
                                      alt={member.name}
                                      className="w-full h-full rounded-full object-cover"
                                    />
                                  ) : member.name ? (
                                    member.name.charAt(0).toUpperCase()
                                  ) : (
                                    "?"
                                  )}
                                </div>
                                <span className="text-sm font-medium text-gray-900">
                                  {member.name}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                              {member.email || "-"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <Badge
                                variant={
                                  member.role?.toLowerCase() === "owner" ||
                                  member.role?.toLowerCase() === "admin" ||
                                  member.role?.toLowerCase() === "koprodi"
                                    ? "default"
                                    : "secondary"
                                }
                                className="capitalize text-xs"
                              >
                                {member.role || "member"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                              {formatDate(member.joinedAt)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                              {member.tasksCount ?? 0} tasks
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan="5"
                            className="px-4 py-8 text-center text-sm text-gray-500"
                          >
                            No team members found for this project.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Project Overview Card */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Project Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Project Details Section */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Project Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Program Studi</p>
                      <p className="font-medium">{project.prodiName}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Started On</p>
                      <p className="font-medium">
                        {formatDate(project.startDate)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Target Completion</p>
                      <p className="font-medium">
                        {formatDate(project.targetDate)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Current Status</p>
                      <div className="font-medium">
                        <StatusBadge
                          status={
                            project.progress === 100
                              ? "COMPLETED"
                              : project.progress > 0
                              ? "ACTIVE"
                              : "Not Started"
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Task Completion by Criteria Section */}
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium mb-3">
                    Task Completion by Criteria
                  </h4>
                  <div className="space-y-3">
                    {projectData.taskLists?.length > 0 ? (
                      projectData.taskLists.map((taskList) => {
                        const criteriaTasksTotal = taskList.tasks?.length || 0
                        const completedCount =
                          taskList.tasks?.filter(
                            (t) => t.status === "COMPLETED"
                          ).length || 0
                        const completionPercent =
                          criteriaTasksTotal === 0
                            ? 0
                            : Math.round(
                                (completedCount / criteriaTasksTotal) * 100
                              )

                        return (
                          <div key={taskList.id} className="text-sm">
                            <div className="flex justify-between items-center mb-1">
                              <p
                                className="truncate mr-2"
                                title={taskList.name}
                              >
                                {taskList.name || `Criteria ${taskList.id}`}
                              </p>
                              <p className="font-medium whitespace-nowrap">
                                {completionPercent}%
                              </p>
                            </div>
                            <Progress
                              value={completionPercent}
                              className="h-2"
                              aria-label={`${
                                taskList.name || "Criteria"
                              } progress: ${completionPercent}%`}
                            />
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No task criteria found.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Right Column Cards (Activity & Progress) */}
            <div className="space-y-6">
              {/* Recent Activity Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                    {project.activities?.length > 0 ? (
                      project.activities.slice(0, 10).map((activity, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className="mt-1 w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm leading-snug">
                              {activity.description}
                            </p>
                            <div className="flex items-center text-xs text-muted-foreground mt-0.5">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatDate(activity.timestamp)}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No recent activity recorded.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Completion Progress Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Completion Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-4">
                    <CircularProgress
                      value={taskStats.completionPercentage}
                      status={
                        taskStats.completionPercentage === 100
                          ? "submitted"
                          : taskStats.completionPercentage > 0
                          ? "inprogress"
                          : "notstarted"
                      }
                      label="Overall"
                    />
                    <div className="text-center">
                      <div className="text-sm font-medium mb-1 text-muted-foreground">
                        Deadline
                      </div>
                      <div className="text-3xl font-bold">
                        {project.daysLeft}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        days left
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default DashboardKoprodi
