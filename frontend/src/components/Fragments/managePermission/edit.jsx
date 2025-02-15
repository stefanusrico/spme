import React, { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import InputForm from "../../Elements/Input/index"
import Button from "../../Elements/Button/index"
import Label from "../../Elements/Input/Label"
import axiosInstance from "../../../utils/axiosConfig"

const EditRole = ({ title = "Edit Role" }) => {
  const navigate = useNavigate()
  const [role, setRole] = useState({ name: "", access: []})
  const [menu, setMenu] = useState([]);
  const [errors, setErrors] = useState({})
  const { id } = useParams()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const responseRole = await axiosInstance.get(`/roles/${id}`)
        setRole({
          name : responseRole.data.data.name || "",
          access : responseRole.data.data.access || []
        })
        console.log("data role fetch : ", role.access )
      } catch {
        console.error("Error fetching role data:", errors)
      }

      try {
        const responseMenu = await axiosInstance.get(`/menus`)
        setMenu(responseMenu.data.data)
        console.log("data menu fetch : ", responseMenu)
      } catch {
        console.error("Error fetching menu data:", errors)
      }
    }
    fetchData()
  }, [id])

  const renderMenuWithChildren  = (menuItem) => {
      const hasChildren = menuItem.children && menuItem.children.length > 0;
  
      return (
        <React.Fragment key={menuItem.id}>
          <tr>
            <td className="border border-gray gray-100 px-4 py-2">
              {menuItem.name}
            </td>
            <td className="border border-gray gray-100 px-4 py-2 text-center">
              {menuItem.url ? (
                <input
                  type="checkbox"
                  checked={role.access.includes(menuItem.id)}
                  onChange={() => handleCheckboxChange(menuItem.id, null, menuItem.children || [])}
                  disabled={isLoading}
                  className="cursor-pointer"
                />
              ) : (
                <td/>
              )}
            </td>
          </tr>
          {hasChildren &&
            menuItem.children.map((child) => (
              <tr key={child.id}>
                <td className="border border-gray gray-100 px-4 py-2 pl-8">
                    {child.name}
                </td>
                <td className="border border-gray gray-100 px-4 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={role.access.includes(child.id)}
                    onChange={() => handleCheckboxChange(child.id, menuItem.id, menuItem.children || [])}
                    disabled={isLoading}
                    className="cursor-pointer"
                  />
                </td>
              </tr>
            ))}
        </React.Fragment>
      );
  }

  const handleChange = async () => {
    try {
      setIsLoading(true)

      if (!role.name) {
        alert("Nama harus diisi")
        return
      }
      console.log("nama role  :", role.name)

      try {
        console.log("gagal1")
        const response = await axiosInstance.put(`/roles/${id}`, {
          name: role.name,
          access: role.access
        })
        console.log("berhasil", response)
        navigate("/user-management/2")
      } catch (error) {
        console.log("gagal")
      }
    } catch (error) {
      console.error("Handle update error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCheckboxChange = (menuId, parentId = null, children = []) => {
    let updatedAccesses;
  
    if (role.access.includes(menuId)) {
      updatedAccesses = role.access.filter((id) => id !== menuId);
  
      if (parentId && children.every((child) => !updatedAccesses.includes(child.id))) {
        updatedAccesses = updatedAccesses.filter((id) => id !== parentId); 
      }
    } else {
      updatedAccesses = [...role.access, menuId];
  
      if (parentId && !updatedAccesses.includes(parentId)) {
        updatedAccesses = [...updatedAccesses, parentId];
      }
    }
  
    setRole({ ...role, access: updatedAccesses });
  };
  

  return (
    <div className="flex w-full">
      <div className="w-full">
        <h2 className="text-3xl font-semibold mt-5">{title}</h2>
        <div className="h-[80vh] mt-5 overflow-y-auto bg-white shadow-lg radius rounded-lg">
          <div className=" items-center flex-grow">
              <div className="mt-10 ml-8 flex flex-col">
                <InputForm
                  label="Nama Role"
                  type="text"
                  placeholder="Monica"
                  name="name"
                  classname="w-80"
                  value={role.name}
                  onChange={(e) => setRole({ ...role, name: e.target.value })}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="mt-10 ml-8">
                <Label htmlFor="access">Hak Menu</Label>
                {menu.length > 0 ? (
                  <div className="overflow-x-auto mr-[20px]">
                    <table className="table-auto border-collapse w-full">
                      <thead>
                        <tr>
                          <th className="border border-gray gray-100 px-4 py-2 text-left">Nama Menu</th>
                          <th className="border border-gray gray-100 py-2 text-center w-[40%]">Hak Akses</th>
                        </tr>
                      </thead>
                      <tbody>
                        {menu.map((menuItem) => renderMenuWithChildren(menuItem))}
                        {/* {menu.map((menuItem) => (
                          <tr key={menuItem.id}>
                            <td className="border border-gray gray-100 px-4 py-2">{menuItem.name}</td>   
                            <td className="border border-gray gray-100 px-4 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={role.access.includes(menuItem.id)}
                                onChange={() => handleCheckboxChange(menuItem.id)}
                                disabled={isLoading}
                                className="cursor-pointer "
                              />
                            </td>
                            
                            
                          </tr>
                        ))} */}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p>Loading menu...</p>
                )}
              </div>

            {/* </div> */}
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
                {isLoading ? "Update..." : "Update"}
              </Button>
            </div>
          </div>
        </div>
      {/* </div> */}
    </div>
    </div>
  )
}

export default EditRole