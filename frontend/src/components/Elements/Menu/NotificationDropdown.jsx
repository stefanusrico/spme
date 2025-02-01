import { useState, useEffect } from "react"
import axiosInstance from "../../../utils/axiosConfig"
import moment from "moment"
import { useNavigate } from "react-router-dom"

const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      const response = await axiosInstance.get("/notifications")
      const sortedNotifications = response.data.data.notifications
        .sort(
          (a, b) =>
            moment(b.created_at).valueOf() - moment(a.created_at).valueOf()
        )
        .slice(0, 5)

      setNotifications(sortedNotifications)
      setUnreadCount(response.data.data.unread_count)
    } catch (error) {
      console.error("Error fetching notifications:", error)
    }
  }

  const handleMarkAsRead = async (notificationId) => {
    try {
      await axiosInstance.post(`notifications/${notificationId}/read`)
      fetchNotifications()
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await axiosInstance.post("notifications/mark-all-read")
      fetchNotifications()
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
    }
  }

  const handleAcceptProjectInvitation = (projectId) => {
    navigate(`/projects/${projectId}`)
  }

  const renderNotificationContent = (notification) => {
    const { data } = notification
    const isUnread = !notification.read_at

    const baseClasses = `flex py-3 px-4 border-b hover:bg-graybackground cursor-pointer ${
      isUnread ? "bg-blue_badge" : "bg-white"
    }`

    switch (data.type) {
      case "project_invitation":
        return (
          <div
            className={baseClasses}
            onClick={() => {
              if (isUnread) handleMarkAsRead(notification.id)
            }}
          >
            <div className="flex-shrink-0">
              <img
                className="w-11 h-11 rounded-full"
                src={data.added_by.profile_picture || "/default-avatar.png"}
                alt={`${data.added_by.name}'s avatar`}
              />
            </div>
            <div className="pl-3 w-full">
              <div
                className={`font-normal text-sm mb-1.5 ${
                  isUnread ? "text-base" : "text-graytxt"
                }`}
              >
                {data.message}
              </div>
              <div className="flex items-center justify-between">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAcceptProjectInvitation(data.project._id)
                  }}
                  className="text-xs font-medium text-blue hover:text-base"
                >
                  View Project
                </button>
                <div className="text-xs text-graytxt">
                  {moment(notification.created_at).fromNow()}
                </div>
              </div>
            </div>
          </div>
        )

      case "task_assignment":
        return (
          <div
            className={baseClasses}
            onClick={() => {
              if (isUnread) handleMarkAsRead(notification.id)
            }}
          >
            <div className="flex-shrink-0">
              <img
                className="w-11 h-11 rounded-full"
                src={data.assigned_by.profile_picture || "/default-avatar.png"}
                alt={`${data.assigned_by.name}'s avatar`}
              />
            </div>
            <div className="pl-3 w-full">
              <div
                className={`font-normal text-sm mb-1.5 ${
                  isUnread ? "text-base" : "text-graytxt"
                }`}
              >
                {data.message}
              </div>
              <div className="flex items-center justify-between">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAcceptProjectInvitation(data.project._id)
                  }}
                  className="text-xs font-medium text-blue hover:text-base"
                >
                  View Task
                </button>
                <div className="text-xs text-graytxt">
                  {moment(notification.created_at).fromNow()}
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return (
          <div
            className={baseClasses}
            onClick={() => {
              if (isUnread) handleMarkAsRead(notification.id)
            }}
          >
            <div className="pl-3 w-full">
              <div
                className={`font-normal text-sm mb-1.5 ${
                  isUnread ? "text-base" : "text-graytxt"
                }`}
              >
                {data.message}
              </div>
              <div className="flex justify-end">
                <div className="text-xs text-graytxt">
                  {moment(notification.created_at).fromNow()}
                </div>
              </div>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 mr-1 text-gray-500 rounded-lg hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-primary focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-600"
      >
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red"></span>
        )}
        <span className="sr-only">View notifications</span>
        <svg
          className="w-5 h-5"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          fill="currentColor"
          viewBox="0 0 14 20"
        >
          <path d="M12.133 10.632v-1.8A5.406 5.406 0 0 0 7.979 3.57.946.946 0 0 0 8 3.464V1.1a1 1 0 0 0-2 0v2.364a.946.946 0 0 0 .021.106 5.406 5.406 0 0 0-4.154 5.262v1.8C1.867 13.018 0 13.614 0 14.807 0 15.4 0 16 .538 16h12.924C14 16 14 15.4 14 14.807c0-1.193-1.867-1.789-1.867-4.175ZM3.823 17a3.453 3.453 0 0 0 6.354 0H3.823Z" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 my-4 max-w-sm w-72 text-base list-none bg-white rounded divide-y divide-gray-100 shadow-lg dark:divide-gray-600 dark:bg-gray-700">
          <div className="block py-2 px-4 text-base font-medium text-center text-gray-700 bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            Notifications
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-600">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <div key={notification.id}>
                  {renderNotificationContent(notification)}
                </div>
              ))
            ) : (
              <div className="py-4 px-4 text-center text-gray-500 dark:text-gray-400">
                No notifications
              </div>
            )}
          </div>

          <div className="flex flex-col divide-y divide-gray-100">
            {notifications.length > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="block py-2 text-base font-normal text-center text-gray-900 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:text-white dark:hover:underline"
              >
                <div className="inline-flex items-center">
                  <svg
                    className="mr-2 w-5 h-5"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path
                      fillRule="evenodd"
                      d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Mark all as read
                </div>
              </button>
            )}
            <button
              onClick={() => {
                navigate("/notifications")
                setIsOpen(false)
              }}
              className="block py-2 text-base font-normal text-center text-gray-900 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:text-white dark:hover:underline"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationDropdown