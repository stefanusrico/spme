import { useState, useEffect, useMemo } from "react"
import { useUser } from "../context/userContext"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
  CheckCircle2,
  AlertCircle,
  Clock3,
  CheckCircle,
  User,
  Users,
  Bell,
  Loader2,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import axiosInstance from "../utils/axiosConfig"

import { LoadingScreen } from "./LoadingSpinner"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

// Status badge component
const StatusBadge = ({ status }) => {
  const statusMap = {
    COMPLETED: (
      <Badge variant="outline" className="bg-green-100 text-green-800">
        Completed
      </Badge>
    ),
    ACTIVE: (
      <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
        In Progress
      </Badge>
    ),
    UNASSIGNED: (
      <Badge variant="outline" className="bg-red-100 text-red-800">
        Not Started
      </Badge>
    ),
  }

  return statusMap[status] || <Badge variant="outline">{status}</Badge>
}

const DashboardTimPenyusun = () => {
  const { userData, isLoading: userLoading } = useUser()
  const [activeTaskFilter, setActiveTaskFilter] = useState("ALL")
  const [assignedTasks, setAssignedTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [members, setMembers] = useState([])
  const [membersLoading, setMembersLoading] = useState(true)
  const [membersError, setMembersError] = useState(null)

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

  // Get the most recent project ID
  const projectId = useMemo(() => {
    if (userProjects.length === 0) return null
    // Return the most recent project (assuming it's the last one in the array)
    return userProjects[userProjects.length - 1].projectId
  }, [userProjects])

  // Mock notifications (to be replaced with API data)
  const notifications = [
    {
      id: 1,
      text: "Deadline approaching for assigned tasks",
      timestamp: "Yesterday at 08:15",
      read: true,
    },
    {
      id: 2,
      text: "You have been assigned to a new task",
      timestamp: "2 days ago",
      read: true,
    },
    {
      id: 3,
      text: "Project has been updated",
      timestamp: "3 days ago",
      read: true,
    },
  ]

  // Fetch project tasks from API
  useEffect(() => {
    const fetchProjectTasks = async () => {
      if (!projectId || !userData) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const response = await axiosInstance.get(`projects/${projectId}/lists`)

        if (
          response.data.status === "success" &&
          response.data.data.taskLists
        ) {
          // Extract tasks assigned to the current user
          const allTasks = []

          response.data.data.taskLists.forEach((taskList) => {
            taskList.tasks.forEach((task) => {
              // Check if task is assigned to current user
              if (
                task.owners &&
                task.owners.some((owner) => owner.id === userData.id)
              ) {
                allTasks.push({
                  id: task.id,
                  taskId: task.taskId,
                  name: task.name,
                  description: task.description || "",
                  criteria: taskList.name,
                  status: task.status,
                  dueDate: task.endDate,
                  progress: task.progress || 0,
                  createdAt: task.startDate,
                  assignedBy:
                    task.owners.length > 0 ? task.owners[0].name : "Admin",
                  owners: task.owners,
                })
              }
            })
          })

          setAssignedTasks(allTasks)
        }
      } catch (err) {
        console.error("Error fetching project tasks:", err)
        setError("Failed to load your tasks. Please try again later.")
        toast.error(
          "Could not load your tasks. Please try refreshing the page."
        )
      } finally {
        setLoading(false)
      }
    }

    fetchProjectTasks()
  }, [projectId, userData])

  // Fetch project members from API
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
          setMembers(
            response.data.data.members.map((member) => ({
              id: member.userId,
              name: member.name,
              email: member.email,
              role: member.role,
              profile_picture: member.profile_picture,
              tasksCount: 0, // Will be calculated later
            }))
          )
        } else {
          setMembers([])
        }
      } catch (err) {
        console.error("Error fetching project members:", err)
        setMembersError("Failed to load team members.")
        toast.error("Could not load team member data.")
      } finally {
        setMembersLoading(false)
      }
    }

    fetchProjectMembers()
  }, [projectId])

  // Calculate member task counts
  useEffect(() => {
    if (members.length > 0 && !loading && assignedTasks.length > 0) {
      // Create a map to count tasks for each member
      const taskCountMap = new Map()

      // Initialize with 0 for all members
      members.forEach((member) => {
        taskCountMap.set(member.id, 0)
      })

      // For this user's tasks, increment the task count
      assignedTasks.forEach((task) => {
        if (task.owners) {
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
        tasksCount: taskCountMap.get(member.id) || 0,
      }))

      setMembers(updatedMembers)
    }
  }, [members, assignedTasks, loading])

  // Filter tasks based on selected status
  const filteredTasks = useMemo(() => {
    return activeTaskFilter === "ALL"
      ? assignedTasks
      : assignedTasks.filter((task) => task.status === activeTaskFilter)
  }, [assignedTasks, activeTaskFilter])

  // Calculate stats
  const stats = useMemo(() => {
    const total = assignedTasks.length
    const completed = assignedTasks.filter(
      (task) => task.status === "COMPLETED"
    ).length
    const inProgress = assignedTasks.filter(
      (task) => task.status === "ACTIVE"
    ).length
    const notStarted = assignedTasks.filter(
      (task) => task.status === "UNASSIGNED"
    ).length

    // Calculate overall progress as average of all task progress
    const overallProgress =
      total === 0
        ? 0
        : Math.round(
            assignedTasks.reduce((acc, task) => acc + (task.progress || 0), 0) /
              total
          )

    return {
      total,
      completed,
      inProgress,
      notStarted,
      overallProgress,
    }
  }, [assignedTasks])

  // Format date
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

  // Calculate days left
  const getDaysLeft = (dueDate) => {
    if (!dueDate) return 0
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const due = new Date(dueDate)
      due.setHours(0, 0, 0, 0)

      if (isNaN(due.getTime())) {
        return 0
      }

      const diffTime = due - today
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays
    } catch (e) {
      console.error("Error calculating days left:", e)
      return 0
    }
  }

  // Handle mark as complete
  const handleMarkComplete = async (taskId) => {
    try {
      // Update task status to completed
      await axiosInstance.patch(`tasks/${taskId}`, {
        status: "COMPLETED",
        progress: 100,
      })

      // Update local state
      setAssignedTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === taskId
            ? { ...task, status: "COMPLETED", progress: 100 }
            : task
        )
      )

      toast.success("Task marked as complete!")
    } catch (error) {
      console.error("Error updating task:", error)
      toast.error("Failed to update task status. Please try again.")
    }
  }

  // Show loading state
  if (userLoading || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingScreen />
      </div>
    )
  }

  // Show error message
  if (error) {
    return (
      <div className="flex justify-center items-center h-64 text-red-500">
        <AlertCircle className="h-8 w-8 mr-2" />
        {error}
      </div>
    )
  }

  // Show message if no project ID is found
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

  return (
    <div className="w-full space-y-6">
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

      {/* Header with user info */}
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={userData?.profile_picture} />
            <AvatarFallback>{userData?.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-semibold">{userData?.name}</h1>
            <p className="text-sm text-muted-foreground">
              {userData?.role} •{" "}
              {userData?.prodi?.name ||
                (typeof userData?.prodi === "string" ? userData?.prodi : "")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1">
            <Bell className="h-4 w-4" />
            <span className="h-2 w-2 rounded-full bg-red-500 absolute top-0 right-0"></span>
          </Button>
        </div>
      </header>

      {/* Task Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              My Overall Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.overallProgress}%</div>
            <Progress value={stats.overallProgress} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {stats.completed} of {stats.total} tasks completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="rounded-full p-3 bg-green-100">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Completed
              </p>
              <p className="text-2xl font-bold">{stats.completed}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="rounded-full p-3 bg-yellow-100">
              <Clock3 className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                In Progress
              </p>
              <p className="text-2xl font-bold">{stats.inProgress}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="rounded-full p-3 bg-red-100">
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Not Started
              </p>
              <p className="text-2xl font-bold">{stats.notStarted}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs - Removed "activities" tab as requested */}
      <Tabs defaultValue="mytasks" className="w-full">
        <TabsList>
          <TabsTrigger value="mytasks">My Tasks</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        {/* My Tasks Tab */}
        <TabsContent value="mytasks" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">My Assigned Tasks</h2>
            <Select
              value={activeTaskFilter}
              onValueChange={setActiveTaskFilter}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Tasks</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="ACTIVE">In Progress</SelectItem>
                <SelectItem value="UNASSIGNED">Not Started</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Task List */}
          <div className="space-y-4">
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task) => (
                <Card key={task.id} className="overflow-hidden">
                  <CardHeader className="pb-3 bg-gray-50 border-b">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">
                            {task.name}
                          </CardTitle>
                          <StatusBadge status={task.status} />
                        </div>
                        <CardDescription>{task.criteria}</CardDescription>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5 mr-1" />
                          Due: {formatDate(task.dueDate)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {getDaysLeft(task.dueDate) <= 0
                            ? "Overdue"
                            : `${getDaysLeft(task.dueDate)} days left`}
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="py-4">
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-sm font-medium">Progress</h4>
                          <span className="text-sm font-medium">
                            {task.progress}%
                          </span>
                        </div>
                        <Progress value={task.progress} className="h-2" />
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="flex justify-between items-center bg-gray-50 border-t">
                    <div className="text-xs text-muted-foreground">
                      Assigned on {formatDate(task.createdAt)}
                    </div>
                    {task.status !== "COMPLETED" && (
                      <Button
                        size="sm"
                        variant="default"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleMarkComplete(task.id)}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Mark Complete
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="text-center py-10 bg-gray-50 rounded-lg">
                <FileText className="h-12 w-12 mx-auto text-gray-300" />
                <p className="mt-2 text-muted-foreground">
                  {assignedTasks.length === 0
                    ? "You don't have any assigned tasks yet"
                    : "No tasks match the selected filter"}
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team">
          <Card>
            <CardHeader>
              <CardTitle>Project Team</CardTitle>
              <CardDescription>
                Members working on this accreditation project
              </CardDescription>
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
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {members.map((member) => (
                      <Card
                        key={member.id}
                        className={
                          member.id === userData?.id
                            ? "bg-primary/5 border-primary/20"
                            : ""
                        }
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              {member.profile_picture &&
                              member.profile_picture !==
                                "default_picture.jpg" ? (
                                <AvatarImage src={member.profile_picture} />
                              ) : null}
                              <AvatarFallback>
                                {member.name
                                  ? member.name.charAt(0).toUpperCase()
                                  : "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{member.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {member.role === "owner"
                                  ? "Project Coordinator"
                                  : member.role === "admin"
                                  ? "Admin"
                                  : "Team Member"}
                              </p>
                            </div>
                          </div>
                          <Separator className="my-3" />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span>{member.email}</span>
                            </div>
                            <Badge variant="outline" size="sm">
                              {member.role === "owner"
                                ? "Owner"
                                : member.role === "admin"
                                ? "Admin"
                                : "Member"}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="mt-6">
                    <h3 className="text-sm font-medium mb-3">
                      Task Distribution
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {members.map((member) => (
                        <div key={member.id} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{member.name}</span>
                            <span>{member.tasksCount} tasks</span>
                          </div>
                          <Progress
                            value={
                              member.tasksCount > 0
                                ? (member.tasksCount /
                                    Math.max(
                                      ...members.map((m) => m.tasksCount || 1)
                                    )) *
                                  100
                                : 0
                            }
                            className="h-2"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default DashboardTimPenyusun
