import { Loader2 } from "lucide-react"

const Loader = () => {
  return (
    <div className="w-screen h-screen flex justify-center items-center bg-gray-900">
      <Loader2 className="h-12 w-12 animate-spin text-emerald-400" />
    </div>
  )
}

export default Loader
