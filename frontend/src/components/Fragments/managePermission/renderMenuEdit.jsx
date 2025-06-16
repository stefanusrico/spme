import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom"

export const renderMenuEdit = ({menuItem, role, handleCheckboxChange, isLoading}) => {
    // const { menuItem } = useParams()
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
                onChange={() => handleCheckboxChange(menuItem.id)}
                disabled={isLoading}
                className="cursor-pointer"
              />
            ) : (
              "—"
            )}
          </td>
        </tr>
        {hasChildren &&
          menuItem.children.map((child) => (
            <tr key={child.id}>
              <td className="border border-gray gray-100 px-4 py-2 pl-8">
                └ {child.name}
              </td>
              <td className="border border-gray gray-100 px-4 py-2 text-center">
                <input
                  type="checkbox"
                  checked={role.access.includes(child.id)}
                  onChange={() => handleCheckboxChange(child.id)}
                  disabled={isLoading}
                  className="cursor-pointer"
                />
              </td>
            </tr>
          ))}
      </React.Fragment>
    );
}