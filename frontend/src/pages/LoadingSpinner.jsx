import { cn } from "@/lib/utils"

export const LoadingSpinner = ({
  size = "default",
  text = null,
  className = "",
  textClassName = "",
}) => {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    default: "h-8 w-8 border-3",
    lg: "h-12 w-12 border-4",
    xl: "h-16 w-16 border-4",
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={cn(
          "animate-spin rounded-full border-t-transparent border-blue-500",
          sizeClasses[size] || sizeClasses.default,
          className
        )}
      />
      {text && (
        <p className={cn("text-zinc-400 text-sm font-medium", textClassName)}>
          {text}
        </p>
      )}
    </div>
  )
}

export const LoadingOverlay = ({
  text = "Loading...",
  dark = true,
  spinnerSize = "default",
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center w-full h-full",
        dark ? "bg-zinc-900 text-zinc-100" : "bg-white text-zinc-900"
      )}
    >
      <LoadingSpinner text={text} size={spinnerSize} />
    </div>
  )
}

export const LoadingScreen = ({ fullScreen = false }) => {
  return (
    <div
      className={cn(
        "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
        fullScreen ? "fixed z-50" : "z-10"
      )}
    >
      <div className="p-4 rounded-lg flex flex-col items-center justify-center">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-blue rounded-full animate-pulse" />

          <div className="absolute top-0 left-0 w-12 h-12">
            <div className="w-12 h-12 rounded-full border-t-4 border-blue animate-spin" />
          </div>
        </div>
      </div>
    </div>
  )
}

export const PageLoader = ({ text = "Loading..." }) => {
  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-70 z-40" />

      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
        <div className="p-4 rounded-lg flex flex-col items-center justify-center">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-blue rounded-full animate-pulse" />
            <div className="absolute top-0 left-0 w-12 h-12">
              <div className="w-12 h-12 rounded-full border-t-4 border-blue animate-spin" />
            </div>
          </div>

          {text && (
            <p className="mt-4 text-white font-medium text-sm tracking-wider text-center">
              {text}
            </p>
          )}
        </div>
      </div>
    </>
  )
}

export default LoadingSpinner
