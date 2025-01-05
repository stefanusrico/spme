import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import InputForm from "../../Elements/Input/index";
import Label from "../../Elements/Input/Label";
import Button from "../../Elements/Button/index";
import Navbar from "../../../components/Elements/Menu/Navbar";
import Sidebar from "../../../components/Elements/Menu/SidebarExpanded";
import {
  faUser,
  faCircleUser,
  faLock,
  faHome,
  faCogs,
  faKey,
} from "@fortawesome/free-solid-svg-icons";

const sidebarItems = [
  { label: "Dashboard", href: "/dashboard", icon: faHome },
  { label: "Syarat", href: "/syarat", icon: faCogs },
  {
    label: "User Management",
    icon: faCogs,
    children: [
      { label: "Users", href: "/settings/general", icon: faKey },
      { label: "Permissions", href: "/settings/security", icon: faLock },
    ],
  },
];

const AddPermission = ({ title = "Add Role" }) => {
  const navigate = useNavigate();
  const [role, setRole] = useState({ name: ""});
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const token = localStorage.getItem("token");

  const handleChange = async () => {
      try {
        setIsLoading(true)
        
        if (!role.name ) {
          alert("Nama harus diisi")
          return
        }
        
        const data = {
            name : role.name
        }
        try {
            console.log("gagal1");
            const response = await axios.post(`http://localhost:8000/api/roles/`, {name : role.name}, 
                {
                    headers: {
                      Authorization: `Bearer ${token}`, 
                    },
                }
            );
            console.log("gagal2");
            console.log("berhasil", response)
            navigate('/user-management/2')
        } catch (error) {
            console.log("gagal");  
        }
      } catch (error) {
        console.error("Handle update error:", error)
      } finally {
        setIsLoading(false)
      }
    }

  return (
    <div className="flex min-h-screen bg-graybackground">
      <Sidebar items={sidebarItems} />
      <Navbar />
      <div className="fixed justify w-[75%] ml-72 pt-20">
        <h2 className="text-3xl font-semibold mt-5 ml-2">{title}</h2>
        <div className="h-[80vh] my-10 pb-4 overflow-y-auto bg-white shadow-lg radius rounded-lg">
            <div className=" items-center flex-grow">
                <div className="flex space-x-16">
                    <div className="mt-10 ml-8 flex flex-col">
                        <InputForm
                            label="Name"
                            type="text"
                            placeholder="Admin"
                            name="name"
                            classname="w-80"
                            value={role.name}
                            onChange={(e) => setRole({ ...role, name: e.target.value })}
                            disabled={isLoading}
                            required
                        />
                    </div>
                </div>
                <div className="mt-10 ml-8 flex space-x-96">
                    <Button
                        className="bg-red w-40 hover:bg-white hover:text-red"
                        aria-label="Cancel"
                        onClick={() => navigate("/user-management/2")}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        className="bg-primary w-40 hover:bg-white hover:text-primary"
                        aria-label="Update"
                        onClick={handleChange}
                        disabled={isLoading}
                    >
                        {isLoading ? "Add..." : "Add"}
                    </Button>
                </div>
            </div>
            
        </div>
      </div>
    </div>
  );
};

export default AddPermission;
