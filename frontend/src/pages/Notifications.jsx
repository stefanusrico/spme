/* eslint-disable react/prop-types */
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { Bell, Check, Search } from "lucide-react"
import moment from "moment"
import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import axiosInstance from "../utils/axiosConfig"
import { LoadingScreen } from "./LoadingSpinner"

const NotificationItem = ({
  notification,
  isSelected,
  onClick,
  onMarkAsRead,
}) => {
  const { data } = notification
  const isUnread = !notification.read_at

  const handleClick = () => {
    onClick(notification)
    if (isUnread) {
      onMarkAsRead(notification.id)
    }
  }

  return (
    <div
      className={cn(
        "p-4 hover:bg-zinc-800/50 transition-colors cursor-pointer border-b border-zinc-800",
        isSelected && "bg-zinc-800/50",
        isUnread && "bg-blue-900/20"
      )}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        {data.type === "project_invitation" ||
        data.type === "task_assignment" ? (
          <img
            className="h-8 w-8 rounded-full object-cover"
            src={
              (data.type === "project_invitation"
                ? `http://localhost:8000/storage/${data.added_by.profile_picture}`
                : `http://localhost:8000/storage/${data.assigned_by.profile_picture}`) ||
              "/default-avatar.png"
            }
            alt="Profile"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-200">
            <Bell className="h-4 w-4" />
          </div>
        )}

        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <p
              className={cn(
                "font-medium",
                isUnread ? "text-zinc-100" : "text-zinc-400"
              )}
            >
              {data.type === "project_invitation"
                ? data.added_by.name
                : data.type === "task_assignment"
                ? data.assigned_by.name
                : "System"}
            </p>
            <span className="text-xs text-zinc-500">
              {moment(notification.created_at).fromNow()}
            </span>
          </div>
          <p
            className={cn(
              "text-sm",
              isUnread ? "text-zinc-300" : "text-zinc-500"
            )}
          >
            {data.message}
          </p>
        </div>
      </div>
    </div>
  )
}

const NotificationDetail = ({ notification, onAcceptProject }) => {
  if (!notification) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        Select a notification to view details
      </div>
    )
  }

  const { data } = notification

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start gap-4">
        {data.type === "project_invitation" ||
        data.type === "task_assignment" ? (
          <img
            className="h-10 w-10 rounded-full object-cover"
            src={
              (data.type === "project_invitation"
                ? `http://localhost:8000/storage/${data.added_by.profile_picture}`
                : `http://localhost:8000/storage/${data.assigned_by.profile_picture}`) ||
              "/default-avatar.png"
            }
            alt="Profile"
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-200">
            <Bell className="h-6 w-6" />
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-zinc-100">
                {data.type === "project_invitation"
                  ? data.added_by.name
                  : data.type === "task_assignment"
                  ? data.assigned_by.name
                  : "System"}
              </h2>
              <p className="text-sm text-zinc-400">
                {data.type
                  .split("_")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ")}
              </p>
            </div>
            <span className="text-sm text-zinc-500">
              {moment(notification.created_at).format("MMM D, YYYY h:mm A")}
            </span>
          </div>
        </div>
      </div>

      <div className="prose prose-invert max-w-none">
        <p className="text-zinc-300 leading-relaxed">{data.message}</p>
      </div>

      {(data.type === "project_invitation" ||
        data.type === "task_assignment") && (
        <div className="flex gap-4">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onAcceptProject(data.project._id)
            }}
            className="text-xs font-medium text-blue-500 hover:text-blue-700"
          >
            {data.type === "project_invitation" ? "View Project" : "View Task"}
          </button>
        </div>
      )}
    </div>
  )
}

// Changed from function declaration to arrow function
const NotificationsPanel = () => {
  const [notifications, setNotifications] = useState([])
  const [selectedNotification, setSelectedNotification] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterUnread, setFilterUnread] = useState(false)
  const navigate = useNavigate()

  const fetchNotifications = useCallback(async (isMounted = true) => {
    try {
      const response = await axiosInstance.get("/notifications")
      if (isMounted) {
        const sortedNotifications = response.data.data.notifications.sort(
          (a, b) =>
            moment(b.created_at).valueOf() - moment(a.created_at).valueOf()
        )
        setNotifications(sortedNotifications)
      }
    } catch (error) {
      console.error("Error fetching notifications:", error)
    } finally {
      if (isMounted) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    setLoading(true)

    fetchNotifications(isMounted)

    const pollInterval = setInterval(() => {
      if (!document.hidden) {
        fetchNotifications(isMounted)
      }
    }, 30000)

    return () => {
      isMounted = false
      clearInterval(pollInterval)
    }
  }, [fetchNotifications])

  const handleMarkAsRead = async (notificationId) => {
    try {
      await axiosInstance.post(`notifications/${notificationId}/read`)
      fetchNotifications(true)
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await axiosInstance.post("notifications/mark-all-read")
      fetchNotifications(true)
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
    }
  }

  const handleAcceptProjectInvitation = (projectId) => {
    navigate(`/projects/${projectId}`)
  }

  const filteredNotifications = notifications.filter((notification) => {
    const matchesSearch = notification.data.message
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
    const matchesUnread = filterUnread ? !notification.read_at : true
    return matchesSearch && matchesUnread
  })

  if (loading && notifications.length === 0) {
    return <LoadingScreen />
  }

  return (
    <div className="flex flex-col h-full bg-zinc-900 text-zinc-100">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={40} minSize={30}>
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h2 className="text-xl font-semibold">Notifications</h2>
              <Button
                variant="ghost"
                size="sm"
                className="text-zinc-400 hover:text-zinc-100"
                onClick={handleMarkAllAsRead}
              >
                <Check className="mr-2 h-4 w-4" />
                Mark all as read
              </Button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-zinc-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  placeholder="Search notifications..."
                  className="w-full pl-9 bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 p-4 border-b border-zinc-800">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "rounded-full",
                  !filterUnread && "bg-zinc-800 text-zinc-100"
                )}
                onClick={() => setFilterUnread(false)}
              >
                All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "rounded-full",
                  filterUnread && "bg-zinc-800 text-zinc-100"
                )}
                onClick={() => setFilterUnread(true)}
              >
                Unread
              </Button>
            </div>

            {/* Notifications List */}
            <ScrollArea className="flex-1">
              {filteredNotifications.length > 0 ? (
                filteredNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    isSelected={selectedNotification?.id === notification.id}
                    onClick={setSelectedNotification}
                    onMarkAsRead={handleMarkAsRead}
                  />
                ))
              ) : (
                <div className="p-4 text-center text-zinc-500">
                  No notifications found
                </div>
              )}
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={60}>
          <NotificationDetail
            notification={selectedNotification}
            onAcceptProject={handleAcceptProjectInvitation}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}

export default NotificationsPanel
