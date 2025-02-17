import React, { useState, useEffect } from 'react'; 
import Tabs from '@mui/material/Tabs';
import Box from '@mui/material/Box';
import Modal from '@mui/material/Modal';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faPlus } from "@fortawesome/free-solid-svg-icons"
import { ColorLens } from '@mui/icons-material';

export default function ScrollableTabs({ no, sub, tabsData, allDataNoSub, updateUserTask, onClick, selectedProdi, dataColor, allDataMatriks }) {
  const [dataVersion, setDataVersion] = useState([])
  const [color, setColor] = useState([])
  const [json, setJson] = useState([])
  const [colorBg, setColorBg] = useState([])
  const [value, setValue] = useState(0);
  const [open, setOpen] = useState(false); 
  
  useEffect(() => {
    if (allDataNoSub && allDataNoSub.length > 0) {
        setDataVersion(allDataNoSub);
    }
  }, [allDataNoSub]);

  useEffect(() => {
    if(dataColor && dataColor.length > 0){
      console.log("masukkkkk")
      setColor(dataColor)
    }
    if(allDataMatriks && allDataMatriks.length > 0){
      console.log("masukkk", allDataMatriks)
      setJson(allDataMatriks)
    }
    setBgColor()
  }, [dataColor, allDataMatriks])

  useEffect(() => {
    const defaultIndex = tabsData.findIndex((tab) => tab.no.toString() === no && tab.sub === sub);
    if (defaultIndex >= 0) {
      setValue(defaultIndex);
    }
    setBgColor()
  }, [tabsData, no, sub]);

  useEffect(() => {
    setBgColor()
  }, [])

  console.log("tabsData : ", tabsData);
  console.log("json : ", json);
  console.log("selectedProdi", selectedProdi);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const handleClick = async (no, sub, index) => {
    updateUserTask(no, sub)
    setValue(index); // Update active tab manually
    if (onClick) {
      if (no && sub) {
        console.log(no, sub, index);
        await onClick(no, sub);
      }
    }
  };

  const handleClickPlus = () => {
    console.log("tabsData :", tabsData)
    console.log("allDataVersion :", allDataNoSub)
    setOpen(true); // Buka modal
  };

  const handleClose = () => {
    setOpen(false); // Tutup modal
  };

  const setBgColor = () => {
    let bgColorArray = new Array(tabsData.length).fill("defaultColor"); // Isi awal dengan warna default

    for (let i = 0; i < json.length; i++) {
      for (let index = 0; index < tabsData.length; index++) {
        if (json[i]["No."] === tabsData[index].no.toString() && json[i].Sub === tabsData[index].sub) {
          // Hitung total skor
          let totalScore = 0;
          let count = 0;

          for (let indexDetail = 0; indexDetail < json[i].Details.length; indexDetail++) {
            if (json[i].Details[indexDetail].Type === "K") {
              const intScore = parseInt(json[i].Details[indexDetail].Nilai) || 0; 
              totalScore += intScore;
              count++;
            }
          }
  
          // Menghitung nilai rata-rata
          const finalScore = count > 0 ? (totalScore / count).toFixed(2) : 0;
  
          // Menentukan warna berdasarkan finalScore
          for (let indexColor = 0; indexColor < color.length; indexColor++) {
            if (finalScore >= color[indexColor].rangeStart && finalScore <= color[indexColor].rangeEnd) {
              bgColorArray[index] = color[indexColor].value; // Simpan warna di indeks yang sama dengan tabsData
              break;
            }
          }
        }
      }
    }
  
    setColorBg(bgColorArray); // Memperbarui state dengan array warna
  };
  

  return (
    <>
      <Box sx={{ bgcolor: 'background.paper', display: 'flex', overflowX: 'auto' }}>
        <Tabs
          value={value}
          onChange={handleChange}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="scrollable auto tabs example"
        >
          {tabsData.map((tab, index) => (
            <Box
              key={index}
              onClick={() => handleClick(tab.no, tab.sub, index)}
              sx={{
                padding: '8px 16px',
                cursor: 'pointer',
                bgcolor: colorBg[index],
                color: value === index ? 'white' : 'black',
                borderRadius: '4px',
                margin: '0 2px 4px',
                whiteSpace: 'nowrap',
                textAlign: 'center',
                fontSize: '12px',
                '&:hover': {
                  bgcolor: value === index ? 'primary.dark' : 'grey.300',
                  color: value === index ? 'white' : 'dark', 
                },
              }}
            >
              {`${tab.no} ${tab.sub}`}
            </Box>
          ))}
          <Box
            onClick={() => handleClickPlus()}
            sx={{
              padding: '8px 16px',
              cursor: 'pointer',
              bgcolor: 'grey.200',
              color: 'black',
              borderRadius: '4px',
              margin: '0 2px 4px',
              whiteSpace: 'nowrap',
              textAlign: 'center',
              fontSize: '12px',
              '&:hover': {
                bgcolor: 'grey.300',
                color: 'black', 
              },
            }}
          >
            <FontAwesomeIcon
              icon={faPlus}
            />
          </Box>
        </Tabs>
      </Box>

      <Modal open={open} onClose={handleClose}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 350, // Lebar modal
            height: 100, // Tinggi modal
            bgcolor: 'white',
            boxShadow: 24,
            borderRadius: '8px',
            p: 2,
            display: 'flex',
            flexWrap: 'wrap',
            overflowY: 'auto'
          }}
        >
          <Grid container spacing={1}>
            {dataVersion.map((tab, index) => (
              <Grid item xs={12 / 7} key={index}> {/* 1 baris 7 kotak */}
                <Box
                  sx={{
                    bgcolor: 'grey.300',
                    padding: '4px',
                    textAlign: 'center',
                    borderRadius: '4px',
                    fontSize: '10px',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: 'grey.400',
                    }
                  }}
                  onClick={() => handleClick(tab["No."], tab.Sub, index)}
                >
                  <Typography variant="caption">{`${tab["No."]} ${tab.Sub}`}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Modal>
    </>
  );
}

ScrollableTabs.propTypes = {
  tabsData: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      no: PropTypes.string,
      sub: PropTypes.string,
    })
  ).isRequired,
  no: PropTypes.string,
  sub: PropTypes.string,
  onClick: PropTypes.func,
};
