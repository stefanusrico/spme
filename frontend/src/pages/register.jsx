import AuthLayout from "../components/layout/AuthLayout"
import FormRegister from "../components/Fragments/FormRegister"
// import { Link } from "react-router-dom"

const RegisterPage = () => {
  return (
    <div className="flex justify-center min-h-screen items-center ">
      <AuthLayout title="Register" type="register">
        <FormRegister />
      </AuthLayout>
    </div>
  )
}

export default RegisterPage
