/* eslint-disable react/prop-types */

const AuthLayout = (props) => {
  const { title, children} = props
  return (
    <div className="w-full max-w-sm">
      <h1 className="text-3xl font-bold mb-2 text-primar">{title}</h1>
      {children}
    </div>
  )
}

export default AuthLayout
