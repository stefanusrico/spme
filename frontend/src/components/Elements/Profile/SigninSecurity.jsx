import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import Button from "../Button/index"
import InputForm from "../Input/index"

const SigninSecurity = ({ title = "Sign in & Security", headingIcon }) => {
  return (
    <div className="w-96 h-screen pt-20 transition-transform bg-graybackground border-gray">
      <div className="fixed mt-8 h-[800px] w-[1250px] px-7 pb-4 overflow-y-auto bg-white shadow-lg rounded-lg ml-[-620px]">
        <div className="mt-5 flex items-center space-x-3">
          {headingIcon && <FontAwesomeIcon icon={headingIcon} />}
          <h2 className="text-3xl font-semibold">{title}</h2>
        </div>
        <div className="mt-10 ml-8 flex w-80 flex-col">
          <InputForm
            label="Current password"
            type="password"
            placeholder="Current password"
            name="currentPassword"
            classname="w-80 "
          />
          <InputForm
            label="New password"
            type="password"
            placeholder="New password"
            name="newPassword"
            classname="w-80 "
          />
          <InputForm
            label="Re-type new password"
            type="password"
            placeholder="Re-type new password"
            name="retypeNewPassword"
            classname="w-80"
          />
        </div>
        <div className="mt-10 ml-8 flex justify-start space-x-4">
          <Button className="bg-primary" aria-label="Cancel">
            Cancel
          </Button>
          <Button className="bg-primary" aria-label="Update">
            Update
          </Button>
        </div>
      </div>
    </div>
  )
}

export default SigninSecurity
