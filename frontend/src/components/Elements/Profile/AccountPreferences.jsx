import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import Button from "../Button/index"
import InputForm from "../Input/index"

const AccountPreferences = ({ title = "Account Preferences", headingIcon }) => {
  return (
    <div className="w-96 h-screen pt-20 transition-transform bg-graybackground border-gray">
      <div className="fixed mt-8 h-[800px] w-[1250px] px-7 pb-4 overflow-y-auto bg-white shadow-lg rounded-lg ml-[-620px]">
        <div className="mt-5 flex items-center space-x-3">
          {headingIcon && <FontAwesomeIcon icon={headingIcon} />}
          <h2 className="text-3xl font-semibold">{title}</h2>
        </div>
        <div className="mt-8 ml-8 flex items-center space-x-8">
          <img
            src="https://docs.material-tailwind.com/img/face-2.jpg"
            alt="User Avatar"
            className="inline-block h-[110px] w-[110px] rounded-full object-cover object-center"
          />
          <div className="flex flex-col space-y-3">
            <Button className="bg-primary w-36 text-white" aria-label="Change">
              Change
            </Button>
            <Button className="bg-primary w-36 text-white" aria-label="Remove">
              Remove
            </Button>
          </div>
        </div>
        <div className="flex space-x-16">
          <div className="mt-10 ml-8 flex flex-col">
            <InputForm
              label="Name"
              type="text"
              placeholder="Monica"
              name="name"
              classname="w-80 "
            />
            <InputForm
              label="Email"
              type="email"
              placeholder="example@email.com"
              name="email"
              classname="w-80 "
            />
            <InputForm
              label="Role"
              type="text"
              placeholder="Admin"
              name="role"
              classname="w-80"
              disabled={true}
            />
          </div>
          <div className="mt-10 ml-10 flex flex-col">
            <InputForm
              label="Username"
              type="text"
              placeholder="Mon"
              name="username"
              classname="w-80 "
            />
            <InputForm
              label="Phone number"
              type="phone"
              placeholder="0821313532"
              name="phoneNumber"
              classname="w-80 "
            />
          </div>
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

export default AccountPreferences
