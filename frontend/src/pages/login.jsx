import AuthLayout from "../components/layout/AuthLayout"
import FormLogin from "../components/Fragments/FormLogin"
import "../App.css"

const LoginPage = () => {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100 overflow-hidden">
      <div className="w-full md:w-3/4 h-screen relative">
        <img
          src="https://ppb.polban.ac.id/storage/theme-images/01JHPMYXBED430J4QRHQD4336Q.jpeg"
          alt="Pendopo POLBAN"
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
      <div className="w-full md:w-1/4 flex items-center justify-center p-6 fixed top-0 right-0 bottom-0 overflow-hidden">
        <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-md">
          <AuthLayout title="" type="login">
            <FormLogin />
          </AuthLayout>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
