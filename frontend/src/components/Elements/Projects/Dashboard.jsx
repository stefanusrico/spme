// src/components/Elements/Projects/Dashboard.jsx
import React from "react"
import { Chart, registerables } from "chart.js"
import { Doughnut, Bar } from "react-chartjs-2"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Activity,
  Percent,
  ListTodo,
  FolderClock,
} from "lucide-react"

Chart.register(...registerables)

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"

const TaskItem = ({ task, date, owner, status }) => {
  const statusConfig = {
    ACTIVE: { color: "bg-blue-100 text-blue-800", icon: Clock },
    COMPLETED: { color: "bg-green-100 text-green-800", icon: CheckCircle },
    UNASSIGNED: { color: "bg-gray-100 text-gray-800", icon: Users },
    OVERDUE: { color: "bg-red-100 text-red-800", icon: AlertTriangle },
  }
  const config = statusConfig[status] || statusConfig.UNASSIGNED
  const Icon = config.icon

  const getInitials = (name) => {
    if (!name || typeof name !== "string") return "??"
    return name
      .split(" ")
      .map((n) => n[0])
      .filter((char) => char && char.match(/[a-zA-Z0-9]/))
      .slice(0, 2)
      .join("")
      .toUpperCase()
  }

  return (
    <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg border border-gray-100 transition-colors duration-150">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar className="h-9 w-9 flex-shrink-0 border">
          {" "}
          <AvatarImage
            src={
              owner?.profile_picture
                ? `${API_BASE_URL}/storage/${owner.profile_picture}`
                : undefined
            }
            alt={owner?.name ?? "Unassigned"}
          />
          <AvatarFallback className="bg-gray-200 text-gray-600 text-xs font-semibold">
            {getInitials(owner?.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col min-w-0">
          <span
            className="text-sm font-medium text-gray-900 truncate"
            title={task}
          >
            {task}
          </span>
          {status && (
            <Badge
              variant="secondary"
              className={`${config.color} mt-1.5 text-xs font-medium w-fit px-2 py-0.5`}
            >
              {" "}
              <Icon className="h-3.5 w-3.5 mr-1.5" />
              {status}
            </Badge>
          )}
        </div>
      </div>
      {date && (
        <div className="flex items-center text-xs text-gray-600 ml-2 flex-shrink-0 whitespace-nowrap">
          <Calendar className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
          {new Date(date).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
          })}
        </div>
      )}
    </div>
  )
}

const TaskProgressCard = ({
  title,
  value,
  total,
  icon,
  colorClass = "bg-blue-500",
}) => {
  const Icon = icon
  const displayValue = value ?? 0
  const displayTotal = total ?? 0
  const isProgress = title === "Overall Progress"
  const percentage =
    isProgress && displayTotal > 0
      ? Math.round((displayValue / displayTotal) * 100)
      : 0

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">
          {title}
        </CardTitle>
        {Icon && <Icon className="h-4 w-4 text-gray-400" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">
          {isProgress ? `${percentage}%` : displayValue}
        </div>
        {isProgress && (
          <p className="text-xs text-gray-500 pt-1">
            {displayValue} of {displayTotal} tasks completed
          </p>
        )}
      </CardContent>
      {isProgress && (
        <CardFooter className="pt-0 pb-3 px-6">
          <Progress
            value={percentage}
            className={`h-2 ${colorClass}`}
            aria-label={`${title} progress ${percentage}%`}
          />
        </CardFooter>
      )}
    </Card>
  )
}

const TaskStatusChart = ({ statistics }) => {
  const active = statistics?.activeTasks ?? 0
  const completed = statistics?.completedTasks ?? 0
  const unassigned = statistics?.unassignedTasks ?? 0
  const overdue = statistics?.overdueTasks ?? 0
  const cancelled = statistics?.cancelledTasks ?? 0

  const chartLabels = ["Active", "Completed", "Unassigned"]
  const chartData = [active, completed, unassigned]
  const chartBackgroundColors = ["#38bdf8", "#4ade80", "#FF0000"]
  const chartBorderColors = ["#0284c7", "#16a34a", "#FF0000"]

  if (overdue > 0) {
    chartLabels.push("Overdue")
    chartData.push(overdue)
    chartBackgroundColors.push("#f87171")
    chartBorderColors.push("#dc2626")
  }
  if (cancelled > 0) {
    chartLabels.push("Cancelled")
    chartData.push(cancelled)
    chartBackgroundColors.push("#facc15")
    chartBorderColors.push("#ca8a04")
  }

  const data = {
    labels: chartLabels,
    datasets: [
      {
        data: chartData,
        backgroundColor: chartBackgroundColors,
        borderColor: chartBorderColors,
        borderWidth: 1,
        hoverOffset: 4,
      },
    ],
  }

  const options = {
    cutout: "70%",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          padding: 15,
          usePointStyle: true,
          pointStyle: "circle",
          boxWidth: 10,
          font: { size: 11 },
        },
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const label = context.label || ""
            const value = context.raw || 0
            const total = context.dataset.data.reduce((a, b) => a + b, 0)
            const percentage = total > 0 ? Math.round((value / total) * 100) : 0
            return `${label}: ${value} (${percentage}%)`
          },
        },
      },
      datalabels: {
        display: false,
      },
    },
  }

  const totalTasksDisplay = statistics?.totalTasks ?? 0

  return (
    <div className="relative h-[280px] w-full flex items-center justify-center">
      {" "}
      <Doughnut data={data} options={options} />
      <div className="absolute flex flex-col items-center justify-center inset-0 pointer-events-none">
        <span className="text-3xl font-bold text-gray-800">
          {totalTasksDisplay}
        </span>
        <span className="text-xs text-gray-500">Total Tasks</span>
      </div>
    </div>
  )
}

const TaskTrendsChart = ({ weeklyTrends }) => {
  const data = {
    labels: weeklyTrends?.labels ?? [],
    datasets:
      weeklyTrends?.datasets?.map((dataset) => ({
        ...dataset,
        borderWidth: 2,
        borderRadius: 4,
        barThickness: 12,
      })) ?? [],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        align: "end",
        labels: {
          boxWidth: 12,
          font: { size: 12 },
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        mode: "index",
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          stepSize: 1,
        },
        grid: {
          color: "#e5e7eb",
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
    interaction: {
      mode: "index",
      intersect: false,
    },
  }

  const hasData =
    weeklyTrends?.labels?.length > 0 && weeklyTrends?.datasets?.length > 0

  return (
    <div className="h-[280px] w-full">
      {" "}
      {hasData ? (
        <Bar data={data} options={options} />
      ) : (
        <div className="flex items-center justify-center h-full text-gray-400 text-sm">
          No weekly activity data available.
        </div>
      )}
    </div>
  )
}

const TaskCompletionRate = ({ statistics }) => {
  const completed = statistics?.completedTasks ?? 0
  const total = statistics?.totalTasks ?? 0
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0
  const circumference = 2 * Math.PI * 45
  const offset = circumference * (1 - rate / 100)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Task Completion Rate
        </CardTitle>
        <CardDescription className="text-xs">
          Percentage of completed tasks
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          <div className="relative h-40 w-40">
            <svg viewBox="0 0 100 100" className="h-full w-full">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#f3f4f6"
                strokeWidth="10"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#4ade80"
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
                style={{ transition: "stroke-dashoffset 0.5s ease-out" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-gray-800">{rate}%</span>
              <span className="text-xs text-gray-500 mt-1">Completed</span>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 w-full gap-4 border-t pt-4">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="text-2xl font-semibold text-gray-800">
                {completed}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">Total</p>
              <p className="text-2xl font-semibold text-gray-800">{total}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const ResourceAllocation = ({ allocationData }) => {
  const getInitials = (name) => {
    if (!name || typeof name !== "string") return "??"
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
  }

  const totalAssignedTasks =
    allocationData?.reduce((sum, member) => sum + (member.taskCount || 0), 0) ??
    0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Resource Allocation
        </CardTitle>
        <CardDescription className="text-xs">
          Active tasks assigned per member
        </CardDescription>
      </CardHeader>
      <CardContent>
        {allocationData && allocationData.length > 0 ? (
          <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2">
            {" "}
            {allocationData.map((member) => {
              const percentage =
                totalAssignedTasks > 0
                  ? Math.round(
                      ((member.taskCount || 0) / totalAssignedTasks) * 100
                    )
                  : 0
              return (
                <div
                  key={member.userId}
                  className="flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-9 w-9 flex-shrink-0 border">
                      <AvatarImage
                        src={
                          member.profile_picture
                            ? `${API_BASE_URL}/storage/${member.profile_picture}`
                            : undefined
                        }
                        alt={member.name}
                      />
                      <AvatarFallback className="bg-gray-200 text-gray-600 text-xs font-semibold">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span
                        className="text-sm font-medium text-gray-800 truncate"
                        title={member.name}
                      >
                        {member.name}
                      </span>
                      <span className="text-xs text-gray-500 capitalize">
                        {member.role}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center flex-shrink-0">
                    <span className="text-sm font-semibold text-gray-700 mr-3 w-12 text-right">
                      {member.taskCount || 0}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-sm p-3 text-center">
            No allocation data available.
          </p>
        )}
      </CardContent>
      {allocationData?.length > 5 && (
        <CardFooter className="text-xs text-gray-400 pt-2 pb-3 justify-center border-t">
          Scroll for more members
        </CardFooter>
      )}
    </Card>
  )
}

const DashboardProject = ({ projectDetails }) => {
  const statistics = projectDetails?.statistics
  const tasksByStatus = projectDetails?.tasks ?? {
    ACTIVE: [],
    COMPLETED: [],
    UNASSIGNED: [],
  }
  const todaysTasks = projectDetails?.todaysTasks ?? []
  const overdueTasks = projectDetails?.overdueTasks ?? []
  const weeklyTrends = projectDetails?.weeklyTrends
  const resourceAllocation = projectDetails?.resourceAllocation

  const totalTasks = statistics?.totalTasks ?? 0
  const completedTasks = statistics?.completedTasks ?? 0
  const activeTasksCount = statistics?.activeTasks ?? 0
  const todaysTasksCount = statistics?.tasksDueToday ?? 0
  const overdueTasksCount = statistics?.overdueTasks ?? 0

  if (!projectDetails || !statistics) {
    return (
      <div className="p-4 text-center text-gray-500">
        Loading dashboard data...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <TaskProgressCard
          title="Overall Progress"
          value={completedTasks}
          total={totalTasks}
          icon={ListTodo}
          colorClass="bg-blue-500"
        />
        <TaskProgressCard
          title="Tasks Due Today"
          value={todaysTasksCount}
          icon={Calendar}
          colorClass="bg-amber-500"
        />
        <TaskProgressCard
          title="Active Tasks"
          value={activeTasksCount}
          icon={Activity}
          colorClass="bg-violet-500"
        />
        <TaskProgressCard
          title="Overdue Tasks"
          value={overdueTasksCount}
          icon={FolderClock}
          colorClass="bg-red-500"
        />
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:w-[400px] mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Task Status
                </CardTitle>
                <CardDescription className="text-xs">
                  Current distribution of tasks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TaskStatusChart statistics={statistics} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Weekly Activity
                </CardTitle>
                <CardDescription className="text-xs">
                  Task trends over the past 7 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TaskTrendsChart weeklyTrends={weeklyTrends} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-base font-semibold">
                  <Badge
                    variant="default"
                    className="bg-amber-500 hover:bg-amber-600 text-white mr-2 text-xs px-2"
                  >
                    Today
                  </Badge>
                  Tasks Starting Today ({todaysTasksCount})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {" "}
                {todaysTasks.length > 0 ? (
                  todaysTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task.name}
                      date={task.endDate}
                      owner={task.owners?.[0]}
                      status="ACTIVE"
                    />
                  ))
                ) : (
                  <p className="text-gray-500 text-sm p-3 text-center">
                    No tasks starting today.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-base font-semibold">
                  <Badge variant="destructive" className="mr-2 text-xs px-2">
                    Overdue
                  </Badge>
                  Overdue Tasks ({overdueTasksCount})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {" "}
                {overdueTasks.length > 0 ? (
                  overdueTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task.name}
                      date={task.endDate}
                      owner={task.owners?.[0]}
                      status="OVERDUE"
                    />
                  ))
                ) : (
                  <p className="text-gray-500 text-sm p-3 text-center">
                    No overdue tasks. Well done!
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-base font-semibold">
                  <Clock className="h-4 w-4 mr-2 text-blue-600" />
                  Active Tasks ({activeTasksCount})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {(tasksByStatus.ACTIVE ?? []).slice(0, 5).map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task.name}
                    owner={task.owners?.[0]}
                    status="ACTIVE"
                    date={task.endDate}
                  />
                ))}
                {(tasksByStatus.ACTIVE?.length ?? 0) === 0 && (
                  <p className="text-gray-500 text-sm p-3 text-center">
                    No active tasks.
                  </p>
                )}
              </CardContent>
              {(tasksByStatus.ACTIVE?.length ?? 0) > 5 && (
                <CardFooter className="pt-2 pb-3 border-t justify-center">
                  <Badge variant="outline" className="w-fit text-xs">
                    +{tasksByStatus.ACTIVE.length - 5} more active tasks
                  </Badge>
                </CardFooter>
              )}
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-base font-semibold">
                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                  Recently Completed ({completedTasks})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {(tasksByStatus.COMPLETED ?? []).slice(0, 5).map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task.name}
                    date={task.endDate}
                    owner={task.owners?.[0]}
                    status="COMPLETED"
                  />
                ))}
                {(tasksByStatus.COMPLETED?.length ?? 0) === 0 && (
                  <p className="text-gray-500 text-sm p-3 text-center">
                    No completed tasks yet.
                  </p>
                )}
              </CardContent>
              {(tasksByStatus.COMPLETED?.length ?? 0) > 5 && (
                <CardFooter className="pt-2 pb-3 border-t justify-center">
                  <Badge variant="outline" className="w-fit text-xs">
                    +{tasksByStatus.COMPLETED.length - 5} more completed tasks
                  </Badge>
                </CardFooter>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TaskCompletionRate statistics={statistics} />

            <ResourceAllocation allocationData={resourceAllocation} />

            <Card className="md:col-span-2">
              {" "}
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Project Timeline
                </CardTitle>
                <CardDescription className="text-xs">
                  Gantt chart or timeline view (Placeholder)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex items-center justify-center bg-gray-50 rounded-lg border border-dashed">
                  <p className="text-gray-400 text-sm">
                    Timeline visualization coming soon...
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default DashboardProject
