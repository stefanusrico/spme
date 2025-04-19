import { useParams } from "react-router-dom"
import { useState, useEffect } from "react"
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

  const { projectDetails, projectMembers, isLoading, refetchAll } =
    useProjectDetails(projectId)

  useEffect(() => {
    if (projectMembers && userData) {
      const currentUserId = userData?.id
      const userMember = projectMembers.find(
        (member) => member.userId === currentUserId
      )

      if (userMember) {
        setUserRole(userMember.role)
      }
    }
  }, [projectMembers, userData])

  const ProjectTabs = ({ activeTab, onTabChange }) => {
    const tabs = [
      { name: "Dashboard", value: "dashboard" },
      { name: "Tasks", value: "tasks" },
      { name: "Members", value: "members" },
    ]

    return (
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.name}
              onClick={() => onTabChange(tab.value)}
              className={`${
                activeTab === tab.value
                  ? "border-blue text-black"
                  : "border-transparent text-graytxt hover:text-gray hover:border-graytxt"
              }
            whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm relative`}
            >
              {tab.name}
              {activeTab === tab.value && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500"></span>
              )}
            </button>
          ))}
        </nav>
      </div>
    )
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <ErrorBoundary>
            <DashboardProject key="dashboard" projectDetails={projectDetails} />
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
              key="members"
              projectId={projectId}
              userRole={userRole}
              onMembersUpdate={refetchAll}
            />
          </ErrorBoundary>
        )
      default:
        return (
          <ErrorBoundary>
            <DashboardProject key="dashboard" projectDetails={projectDetails} />
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

  return (
    <div className="bg-gray-50 p-2">
      <div className="mx-auto">
        <div className="mb-6">
          <div className="flex gap-5 mb-2">
            <h2 className="text-xl font-semibold text-graytxt">
              {projectDetails?.projectId}
            </h2>
            <h2 className="text-xl font-semibold text-black">
              {projectDetails?.projectName}
            </h2>
            {userRole && (
              <div className="ml-auto">
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                  Your role: {userRole}
                </span>
              </div>
            )}
          </div>
          <ProjectTabs activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
        {renderTabContent()}
      </div>
    </div>
  )
}

export default Projects
