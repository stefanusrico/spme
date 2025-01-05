import React, { useEffect, useState } from "react";
import axios from "axios";
import { Table, Button } from "antd";
import "../../../App.css";
import EditUser from "./edit";
import { Icon } from '@iconify/react';
import ConfirmAlert from "../../Elements/ConfirmationAlert";
import { useNavigate } from "react-router-dom";

const ManageUser = ({title = "User Management"}) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  const [visible, setVisible] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);

  const navigate = useNavigate();
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("http://localhost:8000/api/users",{
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (response.data && Array.isArray(response.data.data)) {
          setUsers(response.data.data);
          console.log(response.data.data);
        } else {
          setError("Unexpected format response data from API");
        }
        setLoading(false);
      } catch (error) {
        setError("Failed to fetch users");
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleEdit = (id) => {
    console.log(`Edit user ${id}`);
    navigate(`/user-management/role/${id}/edit`);
  };

  const handleDelete = (id) => {
    setSelectedUserId(id); 
    setShowAlert(true);
    setVisible(true); 
  };

  const handleClose = async (confirm) => {
    if (confirm && selectedUserId) {
      try {
        const token = localStorage.getItem("token");
        await axios.delete(`http://localhost:8000/api/users/${selectedUserId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setUsers(users.filter((user) => user.id !== selectedUserId)); // Hapus user dari state
        alert("User deleted successfully.");
      } catch (error) {
        alert("Failed to delete user.");
      }
    } 
    
    setVisible(false); // Memulai animasi fade-out
    setTimeout(() => setShowAlert(false), 300); // Hapus modal setelah animasi selesai
  };

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      align: "center",
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      align: "center",
    },
    {
        title: "Role",
        dataIndex: "role",
        key: "role",
        align: "center",
    },
    {
      title: "Created",
      dataIndex: "created_at",
      key: "created_at",
      align: "center",
      render: (date) =>
        new Date(date).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
    },
    {
      title: "Updated",
      dataIndex: "updated_at",
      key: "updated_at",
      align: "center",
      render: (date) =>
        new Date(date).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
    },
    {
      title: "Action",
      key: "action",
      align: "center",
      render: (_, record) => (
        <div className="action-buttons">
            <Button
                icon={<Icon icon="heroicons-outline:pencil" />}
                onClick={() => handleEdit(record.id)}
                shape="circle"
                style={{ marginRight: 8 }}
            />
            <Button
                icon={<Icon icon="heroicons-outline:trash" />}
                onClick={() => handleDelete(record.id)}
                shape="circle"
            />
        </div>
      ),
    },
  ];

  if (loading) return <div>loading....</div>;
  if (error) return <div>{error}</div>;

  return (  
      <div className="h-[80vh] w-full pb-4 overflow-y-auto bg-white shadow-lg radius rounded-lg">
          {showAlert && (
            <ConfirmAlert
              message="Apakah Kamu Yakin Ingin Menghapus User?"
              onConfirm={() => handleClose(true)}
              onCancel={() => handleClose(false)}
              visible={visible}
            />
          )}
          <Table
              columns={columns}
              dataSource={users}
              rowKey={(record) => record.id}
              pagination={{ pageSize: 10 }}
              scroll={{ x: "100%" }} 
              bordered={false}
          />
      </div>    
  );
};

export default ManageUser;
