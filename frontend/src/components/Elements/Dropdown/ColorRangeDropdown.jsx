import React, { useState, useEffect } from 'react';
import { Select, InputNumber, Button, Space, ColorPicker } from 'antd';
import axiosInstance from '../../../utils/axiosConfig';

const SelectColor = ({ isLoading, dataColors, width, height }) => {
  const [colors, setColors] = useState([]);
  const [originalColors, setOriginalColors] = useState([]);
  const [editable, setEditable] = useState(false);
  const [isLoadingSave, setIsLoadingSave] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => { fetchColor(); }, []);

  useEffect(() => {
    localStorage.setItem('colorRangeData', JSON.stringify(colors));
    dataColors(colors);
  }, [colors]);

  const fetchColor = async () => {
    try {
      const res = await axiosInstance.get(`/colors`);
      setOriginalColors(res.data.data);
      setColors(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const onColorChange = (idx, colorValue) => {
    const next = [...colors]; next[idx].value = colorValue; setColors(next);
  };

  const onRangeChange = (idx, field, val) => {
    const next = [...colors]; next[idx][field] = Number(val); setColors(next);
  };

  const handleSave = async () => {
    setIsLoadingSave(true);
    for (let c of colors) { await axiosInstance.put(`/colors/${c.id}`, c); }
    setOriginalColors(colors);
    setEditable(false);
    setDropdownOpen(false);
    setIsLoadingSave(false);
  };

  return (
    <Select
      placeholder="Pilih Warna & Rentang"
      style={{ width, height, zIndex: 1000 }}                // tambahan zIndex pada select container
      open={dropdownOpen}
      onDropdownVisibleChange={setDropdownOpen}
      dropdownMatchSelectWidth={false}
      dropdownStyle={{ overflow: 'visible', zIndex: 1100 }} // zIndex untuk dropdown content
      dropdownRender={() => (
        <div style={{ padding: 12, overflow: 'visible' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center' }}>Loading...</div>
          ) : (
            <Space direction="vertical" style={{ width: '100%' }}>
              {colors.map((c, idx) => (
                <Space key={c.id} align="center" style={{ position: 'relative', overflow: 'visible' }}>
                  <ColorPicker
                    trigger="click"
                    value={c.value}
                    onChange={(color) => onColorChange(idx, color.toHexString())}
                    disabled={!editable}
                    getPopupContainer={() => document.body}
                    popupStyle={{ position: 'absolute', zIndex: 2000 }}     // zIndex untuk popup color picker
                  />
                  <InputNumber
                    min={0} max={4} value={c.rangeStart}
                    disabled={!editable}
                    onChange={(v) => onRangeChange(idx, 'rangeStart', v)}
                    style={{ width: 70 }}
                  />
                  <span>–</span>
                  <InputNumber
                    min={0} max={4} value={c.rangeEnd}
                    disabled={!editable}
                    onChange={(v) => onRangeChange(idx, 'rangeEnd', v)}
                    style={{ width: 70 }}
                  />
                </Space>
              ))}

              <Space style={{ marginTop: 12, width: '100%', justifyContent: 'space-between' }}>
                <Button onClick={() => {
                  if (editable) setColors(originalColors);
                  setEditable(!editable);
                }}>
                  {editable ? 'Cancel' : 'Edit'}
                </Button>
                {editable && (
                  <Button type="primary" loading={isLoadingSave} onClick={handleSave}>
                    Simpan
                  </Button>
                )}
              </Space>
            </Space>
          )}
        </div>
      )}
      options={[]}
      showArrow={false}
    />
  );
};

export default SelectColor;
