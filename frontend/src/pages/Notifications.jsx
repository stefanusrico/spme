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
        "p-4 hover:bg-gray-100 transition-colors cursor-pointer border-b border-gray-200",
        isSelected && "bg-gray-100", // Selected state background
        isUnread && "bg-blue-50" // Unread state background
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
          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
            {" "}
            {/* Changed avatar background and text */}
            <Bell className="h-4 w-4" />
          </div>
        )}

        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <p
              className={cn(
                "font-medium",
                isUnread ? "text-gray-900 font-semibold" : "text-gray-600" // Adjusted text colors for read/unread
              )}
            >
              {data.type === "project_invitation"
                ? data.added_by.name
                : data.type === "task_assignment"
                ? data.assigned_by.name
                : "System"}
            </p>
            <span className="text-xs text-gray-500">
              {" "}
              {/* Adjusted timestamp color */}
              {moment(notification.created_at).fromNow()}
            </span>
          </div>
          <p
            className={cn(
              "text-sm",
              isUnread ? "text-gray-700" : "text-gray-500" // Adjusted message text colors
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
      <div className="flex items-center justify-center h-full text-gray-500">
        {" "}
        {/* Adjusted placeholder text color */}
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
          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
            {" "}
            {/* Changed avatar background and text */}
            <Bell className="h-6 w-6" />
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {" "}
                {/* Adjusted heading color */}
                {data.type === "project_invitation"
                  ? data.added_by.name
                  : data.type === "task_assignment"
                  ? data.assigned_by.name
                  : "System"}
              </h2>
              <p className="text-sm text-gray-500">
                {" "}
                {/* Adjusted type text color */}
                {data.type
                  .split("_")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ")}
              </p>
            </div>
            <span className="text-sm text-gray-500">
              {" "}
              {/* Adjusted timestamp color */}
              {moment(notification.created_at).format("MMM D, YYYY h:mm A")}
            </span>
          </div>
        </div>
      </div>

      {/* Removed prose-invert for light mode compatibility */}
      <div className="prose max-w-none">
        <p className="text-gray-700 leading-relaxed">{data.message}</p>{" "}
        {/* Adjusted message text color */}
      </div>

      {(data.type === "project_invitation" ||
        data.type === "task_assignment") && (
        <div className="flex gap-4">
          {/* Button styling is likely fine for light mode */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onAcceptProject(data.project._id)
            }}
            className="text-xs font-medium text-blue-600 hover:text-blue-800" // Slightly adjusted blue for better contrast if needed
          >
            {data.type === "project_invitation" ? "View Project" : "View Task"}
          </button>
        </div>
      )}
    </div>
  )
}

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
    }, 30000) // Poll every 30 seconds

    return () => {
      isMounted = false
      clearInterval(pollInterval)
    }
  }, [fetchNotifications])

  const handleMarkAsRead = async (notificationId) => {
    try {
      await axiosInstance.post(`notifications/${notificationId}/read`)
      // Optimistic update (optional but good UX)
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? { ...n, read_at: new Date().toISOString() }
            : n
        )
      )
      // Re-fetch to ensure consistency
      fetchNotifications(true)
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await axiosInstance.post("notifications/mark-all-read")
      // Optimistic update (optional but good UX)
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          read_at: n.read_at || new Date().toISOString(),
        }))
      )
      // Re-fetch to ensure consistency
      fetchNotifications(true)
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
    }
  }

  const handleAcceptProjectInvitation = (projectId) => {
    navigate(`/projects/${projectId}`)
  }

  const filteredNotifications = notifications.filter((notification) => {
    const message = notification.data?.message || "" // Add safe access
    const matchesSearch = message
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
    const matchesUnread = filterUnread ? !notification.read_at : true
    return matchesSearch && matchesUnread
  })

  if (loading && notifications.length === 0) {
    return <LoadingScreen />
  }

  return (
    // Changed main background and text color
    <div className="flex flex-col h-full bg-white text-gray-900">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={40} minSize={30}>
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              {" "}
              {/* Changed border color */}
              <h2 className="text-xl font-semibold">Notifications</h2>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-gray-900" // Changed button text/hover color
                onClick={handleMarkAllAsRead}
              >
                <Check className="mr-2 h-4 w-4" />
                Mark all as read
              </Button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-gray-200">
              {" "}
              {/* Changed border color */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />{" "}
                {/* Changed icon color */}
                <Input
                  placeholder="Search notifications..."
                  // Changed input background, border, text, placeholder color
                  className="w-full pl-9 bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500 focus:border-blue-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 p-4 border-b border-gray-200">
              {" "}
              {/* Changed border color */}
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "rounded-full px-3 py-1 text-sm", // Base styles
                  !filterUnread
                    ? "bg-gray-100 text-gray-800"
                    : "text-gray-600 hover:bg-gray-100" // Active/Inactive styles
                )}
                onClick={() => setFilterUnread(false)}
              >
                All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "rounded-full px-3 py-1 text-sm", // Base styles
                  filterUnread
                    ? "bg-gray-100 text-gray-800"
                    : "text-gray-600 hover:bg-gray-100" // Active/Inactive styles
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
                <div className="p-4 text-center text-gray-500">
                  {" "}
                  {/* Changed empty state text color */}
                  No notifications found
                </div>
              )}
            </ScrollArea>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle className="bg-gray-200" />{" "}
        {/* Changed handle background */}
        <ResizablePanel defaultSize={60}>
          {/* Pass selectedNotification and handler */}
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
