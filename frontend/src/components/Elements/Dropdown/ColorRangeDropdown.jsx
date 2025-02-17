import React, { useState, useRef, useEffect } from 'react';
import { SketchPicker } from 'react-color';
import axiosInstance from '../../../utils/axiosConfig';
import Button from '../Button';

const ColorRangeDropdown = ({isLoading, dataColors}) => {
  const [colors, setColors] = useState([]);
  const [editable, setEditable] = useState(false)
  const [originalColors, setOriginalColors] = useState([]);
  const [isLoadingSave, setisLoadingSave] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [currentColorIndex, setCurrentColorIndex] = useState(null);

  const dropdownRef = useRef();


  // Simpan data ke localStorage saat colors berubah
  useEffect(() => {
    localStorage.setItem('colorRangeData', JSON.stringify(colors));
    dataColors(colors)
  }, [colors]);

  useEffect(() => {
    console.log("editable :", originalColors);
    console.log("editable2 :", colors);
    
  }, [editable])

  // Tutup dropdown jika pengguna klik di luar
  useEffect(() => {
    fetchColor()
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
        setCurrentColorIndex(null);
      }
    };
    console.log("isloading :", isLoading)

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchColor = async () => {
    try {
        const responseColor = await axiosInstance.get(`/colors`)
        console.log("colors :", responseColor.data.data)
        const fetchedColors = JSON.parse(JSON.stringify(responseColor.data.data));
        setOriginalColors(fetchedColors);
        setColors(fetchedColors)
        console.log(responseColor.data.data);
    } catch (error) {
        console.error("Gagal fetch color", error);
    }
  }

  const handleColorChange = (index, color) => {
    const updatedColors = [...colors];
    updatedColors[index].value = color.hex;
    setColors(updatedColors);
    setCurrentColorIndex(null); // Menutup picker
  };

  const handleRangeStartChange = (index, e) => {
    const value = Math.min(e.target.value, colors[index].rangeEnd); // Validasi agar tidak lebih besar dari rangeEnd
    const updatedColors = JSON.parse(JSON.stringify(colors));
    updatedColors[index].rangeStart = parseFloat(value);
    setColors(updatedColors);
  };

  const handleRangeEndChange = (index, e) => {
    const value = Math.max(e.target.value, colors[index].rangeStart); // Validasi agar tidak lebih kecil dari rangeStart
    const updatedColors = JSON.parse(JSON.stringify(colors));
    updatedColors[index].rangeEnd = parseFloat(value);
    setColors(updatedColors);
  };

  const handleButtonClick = () => {
    if(editable){
      console.log("originalColors : ", originalColors)
      setColors(originalColors)
    } 
    console.log("colors2 : ", colors)
    setEditable(!editable)
  }

  // const handleButtonClickSave = async () => {
  //   try {
  //     console.log("colors update :", colors[1])
  //     if(colors.length >= 1){
  //       for (let index = 0; index < colors.length; index++){
  //         const responseUpdate = await axiosInstance.put(`/colors/${colors[index].id}`, colors[index]) 
  //         console.log("response update : ", responseUpdate)
  //       }
  //     }
  //   } catch (error) {
  //     console.error("Error updating colors:", error);
  //   }

  //   setEditable(!editable)
  //   setisLoadingSave(!isLoadingSave)
  // }
  const handleButtonClickSave = async () => {
    try {
        for (let i = 0; i < colors.length; i++) {
            const { rangeStart, rangeEnd, id, value } = colors[i];

            const isOverlap = colors.some((item, index) => {
                const overlapCondition = index !== i && (
                    (rangeStart >= item.rangeStart && rangeStart < item.rangeEnd) ||
                    (rangeEnd > item.rangeStart && rangeEnd <= item.rangeEnd) ||
                    (rangeStart <= item.rangeStart && rangeEnd >= item.rangeEnd)
                );

                if (overlapCondition) {
                    console.log(`Bentrok ditemukan: ID ${id} (${rangeStart}-${rangeEnd}) dengan ID ${item.id} (${item.rangeStart}-${item.rangeEnd})`);
                }

                return overlapCondition;
            });

            const isDuplicateValue = colors.some((item, index) => index !== i && item.value === value);

            if (isOverlap) {
                alert(`Range ${rangeStart} - ${rangeEnd} bertabrakan dengan data lain.`);
                return;
            } else if (isDuplicateValue) {
                alert(`Nilai ${value} sudah digunakan, harap gunakan nilai yang unik.`);
                return;
            }

        }

        console.log("Tidak ada bentrok. Data yang akan diperbarui:", colors);
        setisLoadingSave(true);

        for (let index = 0; index < colors.length; index++) {
            console.log(`Mengupdate ID ${colors[index].id}...`);
            const responseUpdate = await axiosInstance.put(`/colors/${colors[index].id}`, colors[index]);
            console.log("Response update:", responseUpdate);
        }

        await dataColors(colors)
        setEditable(false);
        setisLoadingSave(false);
    } catch (error) {
        console.error("Error updating colors:", error);
        setisLoadingSave(false);
    }
  };



  return (
    <>
        <div className="flex flex-col space-y-4" ref={dropdownRef}>
          <div className="relative">
            <div
              className="w-60 h-18 p-2 rounded-md text-sm bg-gray focus:outline-none focus:ring focus:ring-gray-400 p-3"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <span>{isDropdownOpen ? 'Tutup' : 'Pilih Warna dan Rentang'}</span>
              <span>&#9662;</span>
            </div>

            {isDropdownOpen && (
              <div className="absolute mt-2 w-full bg-white border border-gray-300 rounded-md shadow-lg z-10">
                {isLoading ? (
                  <div className="text-center p-4">Loading...</div>
                ) : (
                  <div className="relative">
                    {colors.map((color, index) => (
                      <div className="flex items-center space-x-4 mt-4 px-4" key={color.value}>
                        {/* Tombol untuk membuka color picker */}
                        <div
                          className={`w-[60px] rounded-md mb-[10px] h-10 border border-black cursor-pointer ${!editable ? "pointer-events-none" : ""}`}
                          style={{ backgroundColor: color.value }}
                          onClick={() => setCurrentColorIndex(index)}
                          disable={!editable}
                        ></div>

                        {/* Jika color picker aktif, tampilkan SketchPicker */}
                        {currentColorIndex === index && (
                          <div className="absolute top-12 left-0 z-20">
                            <SketchPicker
                              color={color.value}
                              onChangeComplete={(color) => handleColorChange(index, color)}
                              disableAlpha
                            />
                          </div>
                        )}

                        {/* Input untuk nilai range awal */}
                        <input
                          type="number"
                          value={color.rangeStart}
                          onChange={(e) => handleRangeStartChange(index, e)}
                          disabled={editable === false}
                          className={`w-[60px] border border-black rounded-md text-center mb-[10px]`}
                          min="0"
                          max="4"
                        />

                        <span className="w-[1px] text-center mb-[10px]"> - </span>
                        {/* Input untuk nilai range akhir */}
                        <input
                          type="number"
                          value={color.rangeEnd}
                          onChange={(e) => handleRangeEndChange(index, e)}
                          disabled={editable === false}
                          className="w-[60px] border border-black rounded-md text-center mb-[10px]"
                          min="0"
                          max="4"
                        />
                      </div>
                    ))}
                    <div className='flex justify-between'>
                      <Button
                        className="bg-primary w-20 m-2"
                        aria-label="Button"
                        onClick={() => handleButtonClick()}
                      >
                        {editable ? "Cancel" : "Edit"}
                      </Button>
                      {editable && (
                        <Button
                          className="bg-primary w-20 m-2"
                          aria-label="Button"
                          onClick={handleButtonClickSave}
                        >
                          {isLoadingSave ? "..." : "Simpan"}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
    </>
  );
};

export default ColorRangeDropdown;
