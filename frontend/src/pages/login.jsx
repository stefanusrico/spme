import AuthLayout from "../components/layout/AuthLayout"
import FormLogin from "../components/Fragments/FormLogin"

const LoginPage = () => {
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="w-3/4 h-screen">
        <img
          src="https://umaiyomu.wordpress.com/wp-content/uploads/2024/04/sousou-no-frieren-5.jpg"
          alt="Frieren Gaming"
          className="w-full h-full object-cover"
        />
      </div>
      <div className="w-1/4 p-4 flex items-center justify-center">
        <AuthLayout title="" type="login">
          <FormLogin />
        </AuthLayout>
      </div>
    </div>
  )
}

export default LoginPage
