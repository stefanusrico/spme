import { useParams } from "react-router-dom"
import { useState, useEffect } from "react"
import DashboardProject from "../components/Elements/Projects/Dashboard"
import Members from "../components/Elements/Projects/Members"
import Tasks from "../components/Elements/Projects/Tasks"
import axiosInstance from "../utils/axiosConfig"
import ErrorBoundary from "../components/ErrorBoundary"

const Projects = () => {
  const { projectId } = useParams()
  const [projectDetails, setProjectDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("dashboard")

  useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        const response = await axiosInstance.get(`/projects/${projectId}`)
        if (response.data.status === "success") {
          setProjectDetails(response.data.data)
        }
      } catch (error) {
        console.error("Error fetching project details:", error)
      } finally {
        setLoading(false)
      }
    }

    if (projectId) {
      fetchProjectDetails()
    }
  }, [projectId])

  const ProjectTabs = ({ activeTab, onTabChange }) => {
    const tabs = [
      { name: "Dashboard", value: "dashboard" },
      { name: "Tasks", value: "tasks" },
      { name: "Users", value: "users" },
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
            <Tasks key={`tasks-${projectId}`} projectId={projectId} />
          </ErrorBoundary>
        )
      case "users":
        return (
          <ErrorBoundary>
            <Members key="users" projectId={projectId} />
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
        Loading...
      </div>
    )
  }

  return (
    <div className="bg-gray-50 p-6 mt-12">
      <div className="mx-auto">
        <div className="mb-6">
          <div className="flex gap-5 mb-2">
            <h2 className="text-xl font-semibold text-graytxt">
              {projectDetails?.projectId}
            </h2>
            <h2 className="text-xl font-semibold text-black">
              {projectDetails?.projectName}
            </h2>
          </div>
          <ProjectTabs activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
        {renderTabContent()}
      </div>
    </div>
  )
}

export default Projects
