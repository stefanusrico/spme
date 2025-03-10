import { useParams } from "react-router-dom"
import { useState, useEffect } from "react"
import DashboardProject from "../components/Elements/Projects/Dashboard"
import Members from "../components/Elements/Projects/Members"
import Tasks from "../components/Elements/Projects/Tasks"
import axiosInstance from "../utils/axiosConfig"
import ErrorBoundary from "../components/ErrorBoundary"
import { useUser } from "../context/userContext"

const Projects = () => {
  const { projectId } = useParams()
  const [projectDetails, setProjectDetails] = useState(null)
  const [projectMembers, setProjectMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("dashboard")
  const [userRole, setUserRole] = useState(null)
  const { userData } = useUser()

  useEffect(() => {
    const fetchProjectData = async () => {
      try {
        setLoading(true)

        const [detailsResponse, membersResponse] = await Promise.all([
          axiosInstance.get(`/projects/${projectId}`),
          axiosInstance.get(`/projects/${projectId}/members`),
        ])

        if (detailsResponse.data.status === "success") {
          setProjectDetails(detailsResponse.data.data)
        }

        if (membersResponse.data.status === "success") {
          setProjectMembers(membersResponse.data.data.members)

          const currentUserId = userData?.id
          console.log("DEBUG: userData =", userData)
          console.log("DEBUG: currentUserId =", currentUserId)
          console.log("DEBUG: members =", membersResponse.data.data.members)

          const userMember = membersResponse.data.data.members.find(
            (member) => member.userId === currentUserId
          )

          if (userMember) {
            setUserRole(userMember.role)
          }
        }
      } catch (error) {
        console.error("Error fetching project data:", error)
      } finally {
        setLoading(false)
      }
    }

    if (projectId && userData) {
      fetchProjectData()
    }
  }, [projectId, userData])

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

  const updateMembers = async () => {
    try {
      const response = await axiosInstance.get(`/projects/${projectId}/members`)
      if (response.data.status === "success") {
        setProjectMembers(response.data.data.members)
      }
    } catch (error) {
      console.error("Error refreshing members:", error)
    }
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
              userRole={userRole}
              key={`tasks-${projectId}`}
              projectId={projectId}
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
              members={projectMembers}
              onMembersUpdate={updateMembers}
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue"></div>
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
