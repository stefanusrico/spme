import React from 'react';
import { Select } from 'antd';

const MySelectComponent = ({ options, placeholder, width , height, onChange }) => {
    return (
        <Select
            style={{ width, height }}
            allowClear
            showSearch
            onChange={(event, newValue) => {
                onChange(newValue);
            }}
            placeholder={placeholder}
            options={options}
        />
    );
};

export default MySelectComponent;
