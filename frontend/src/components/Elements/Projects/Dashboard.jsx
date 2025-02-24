import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const TaskItem = ({ task, date, owner }) => {
  return (
    <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage
            src={
              owner?.profile_picture
                ? `http://localhost:8000/storage/${owner.profile_picture}`
                : "/default-avatar.png"
            }
            alt={owner?.name}
          />
          <AvatarFallback>
            {owner?.name
              ? owner.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
              : "UN"}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium text-gray-700">{task}</span>
      </div>
      {date && (
        <span className="text-sm text-gray-500">
          {new Date(date).toLocaleDateString()}
        </span>
      )}
    </div>
  )
}

const TaskStatusChart = ({ statistics }) => {
  const data = [
    { name: "Active", value: statistics.activeTasks, color: "#00D8FF" },
    { name: "Completed", value: statistics.completedTasks, color: "#4ADE80" },
    {
      name: "Unassigned",
      value:
        statistics.totalTasks -
        (statistics.activeTasks + statistics.completedTasks),
      color: "#EF4444",
    },
  ]

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={120}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            formatter={(value, entry) => (
              <span className="text-sm text-gray-600">
                {`${value} (${entry.payload.value})`}
              </span>
            )}
          />
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

const DashboardProject = ({ projectDetails }) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const getOverdueTasks = () => {
    if (!projectDetails?.tasks?.UNASSIGNED) return []

    return projectDetails.tasks.UNASSIGNED.filter((task) => {
      if (!task.endDate) return false
      const endDate = new Date(task.endDate)
      return endDate < today
    }).slice(0, 5)
  }

  const getTodaysTasks = () => {
    if (!projectDetails?.tasks?.ACTIVE) return []

    return projectDetails.tasks.ACTIVE.filter((task) => {
      if (!task.startDate) return false
      const startDate = new Date(task.startDate)
      startDate.setHours(0, 0, 0, 0)
      return startDate.toDateString() === today.toDateString()
    }).slice(0, 5)
  }

  const getUpcomingTasks = () => {
    if (!projectDetails?.tasks?.UNASSIGNED) return []

    return projectDetails.tasks.UNASSIGNED.filter((task) => {
      if (!task.startDate) return false
      const startDate = new Date(task.startDate)
      startDate.setHours(0, 0, 0, 0)
      return startDate > today
    }).slice(0, 5)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium mb-4">Task Status</h3>
        {projectDetails && (
          <TaskStatusChart statistics={projectDetails.statistics} />
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium mb-4">Unassigned Tasks</h3>
        <div className="space-y-2">
          {projectDetails?.tasks?.UNASSIGNED?.slice(0, 5).map((task) => (
            <TaskItem
              key={task.id}
              task={task.name}
              date={task.endDate}
              owner={task.owners?.[0]}
            />
          ))}
          {(!projectDetails?.tasks?.UNASSIGNED ||
            projectDetails.tasks.UNASSIGNED.length === 0) && (
            <p className="text-gray-500 text-sm">No unassigned tasks</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium mb-4">Active Tasks</h3>
        <div className="space-y-2">
          {projectDetails?.tasks?.ACTIVE?.slice(0, 5).map((task) => (
            <TaskItem key={task.id} task={task.name} owner={task.owners?.[0]} />
          ))}
          {(!projectDetails?.tasks?.ACTIVE ||
            projectDetails.tasks.ACTIVE.length === 0) && (
            <p className="text-gray-500 text-sm">No active tasks</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium mb-4">Completed Tasks</h3>
        <div className="space-y-2">
          {projectDetails?.tasks?.COMPLETED?.slice(0, 5).map((task) => (
            <TaskItem
              key={task.id}
              task={task.name}
              date={task.endDate}
              owner={task.owners?.[0]}
            />
          ))}
          {(!projectDetails?.tasks?.COMPLETED ||
            projectDetails.tasks.COMPLETED.length === 0) && (
            <p className="text-gray-500 text-sm">No completed tasks</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default DashboardProject
