import { useNavigate } from "react-router-dom"

export const useNavigation = () => {
  const navigate = useNavigate()

  const onNavigate = (path) => {
    navigate(path)
  }

  return { onNavigate }
}
