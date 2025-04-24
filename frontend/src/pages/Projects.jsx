import { useParams } from "react-router-dom"
import { useState, useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import DashboardProject from "../components/Elements/Projects/Dashboard"
import Members from "../components/Elements/Projects/Members"
import Tasks from "../components/Elements/Projects/Tasks"
import ErrorBoundary from "../components/ErrorBoundary"
import { useUser } from "../context/userContext"
import { useProjectDetails } from "../hooks/useProjectDetails"
import { LoadingScreen } from "./LoadingSpinner"

const Projects = () => {
  const { projectId } = useParams()
  const [activeTab, setActiveTab] = useState("dashboard")
  const [userRole, setUserRole] = useState(null)
  const { userData } = useUser()
  const queryClient = useQueryClient()

  const {
    projectDetails,
    projectMembers,
    taskLists,
    isLoading,
    errors,
    refetchAll,
  } = useProjectDetails(projectId)

  useEffect(() => {
    if (projectMembers && userData) {
      const currentUserId = userData?.id
      const userMember = projectMembers.find(
        (member) => member.userId === currentUserId
      )
      setUserRole(userMember ? userMember.role : null)
    } else {
      setUserRole(null)
    }
  }, [projectMembers, userData])

  const handleMembersUpdate = () => {
    refetchAll()
  }

  const ProjectTabs = ({ activeTab, onTabChange }) => {
    const tabs = [
      { name: "Dashboard", value: "dashboard" },
      { name: "Tasks", value: "tasks" },
      { name: "Members", value: "members" },
    ]

    return (
      <div>
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.name}
              onClick={() => onTabChange(tab.value)}
              className={`${
                activeTab === tab.value
                  ? "text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              } whitespace-nowrap py-4 px-1 font-medium text-sm transition-colors focus:outline-none`}
              aria-current={activeTab === tab.value ? "page" : undefined}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>
    )
  }

  const renderTabContent = () => {
    const combinedError = errors?.details || errors?.members || errors?.tasks
    if (!isLoading && combinedError) {
      return (
        <div className="text-red-600 p-4 bg-red-50">
          Error loading project data: {combinedError.message || "Unknown error"}
        </div>
      )
    }
    if (!isLoading && !projectDetails && activeTab === "dashboard") {
      return (
        <div className="text-gray-500 p-4">Project details not available.</div>
      )
    }
    if (!isLoading && !projectMembers && activeTab === "members") {
      return <div className="text-gray-500 p-4">Member data not available.</div>
    }
    if (!isLoading && !taskLists && activeTab === "tasks") {
      return (
        <div className="text-gray-500 p-4">Task list data not available.</div>
      )
    }

    switch (activeTab) {
      case "dashboard":
        return (
          <ErrorBoundary>
            <DashboardProject
              key={`dashboard-${projectId}`}
              projectDetails={projectDetails}
            />
          </ErrorBoundary>
        )
      case "tasks":
        return (
          <ErrorBoundary>
            <Tasks
              key={`tasks-${projectId}`}
              projectId={projectId}
              userRole={userRole}
            />
          </ErrorBoundary>
        )
      case "members":
        return (
          <ErrorBoundary>
            <Members
              key={`members-${projectId}`}
              projectId={projectId}
              userRole={userRole}
              onMembersUpdate={handleMembersUpdate}
            />
          </ErrorBoundary>
        )
      default:
        return (
          <ErrorBoundary>
            <DashboardProject
              key={`dashboard-default-${projectId}`}
              projectDetails={projectDetails}
            />
          </ErrorBoundary>
        )
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingScreen />
      </div>
    )
  }

  if (!isLoading && !projectDetails && !errors?.details) {
    return (
      <div className="p-4 text-center text-gray-500">
        Project data not found or failed to load.
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6">
      <div className="w-full mx-auto">
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4">
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">
              {projectDetails?.projectName ?? "Loading Project..."}
            </h1>
            {projectDetails?.projectId && (
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                ID: {projectDetails.projectId}
              </span>
            )}
            {projectDetails?.prodiName && (
              <span className="text-sm font-medium text-gray-600">
                | {projectDetails.prodiName}
              </span>
            )}
            {userRole && (
              <div className="ml-auto">
                <span className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-3 py-1 rounded-full capitalize">
                  {userRole}
                </span>
              </div>
            )}
          </div>
          <ProjectTabs activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
        <div className="mt-6">{renderTabContent()}</div>
      </div>
    </div>
  )
}

export default Projects
