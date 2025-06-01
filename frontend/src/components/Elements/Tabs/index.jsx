import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Tabs from "@mui/material/Tabs"
import Box from "@mui/material/Box"
import Modal from "@mui/material/Modal"
import Grid from "@mui/material/Grid"
import Typography from "@mui/material/Typography"
import PropTypes from "prop-types"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faPlus } from "@fortawesome/free-solid-svg-icons"
import { ColorLens } from "@mui/icons-material"

<<<<<<< HEAD
export default function ScrollableTabs({ no, sub, tabsData, allDataNoSub, updateUserTask, onClick, dataColor, allDataVersion }) {
  const [json, setJson] = useState([])
  const [value, setValue] = useState(0);
  const [color, setColor] = useState([])
  const [open, setOpen] = useState(false); 
  const [colorBg, setColorBg] = useState([])
  const [dataVersion, setDataVersion] = useState([])
  
  useEffect(() => {
    if (allDataNoSub && allDataNoSub.length > 0) {
        setDataVersion(allDataNoSub);
    }
  }, [allDataNoSub]);

  useEffect(() => {
    if(dataColor && dataColor.length > 0){
      console.log("masukkkkk", dataColor[0].value)
      setColor(dataColor)
    }
    if(allDataVersion && allDataVersion.length > 0){
      console.log("masukkk", allDataVersion)
      setJson(allDataVersion)
    }
    setBgColor()
  }, [dataColor, allDataVersion])

  useEffect(() => {
    if (!open && tabsData.length > 0) {
      const defaultIndex = tabsData.findIndex((tab) => tab?.no?.toString() === no && tab?.sub === sub);
      if (defaultIndex >= 0) {
        setValue(defaultIndex);
      } else {
        setValue(0);
      }
  
      setBgColor();
    }
  }, [tabsData, no, sub, open]);
=======
export default function ScrollableTabs({
  no,
  sub,
  tabsData,
  allDataTasks,
  updateUserTask,
  onClick,
  dataColor,
  allLedData,
}) {
  const navigate = useNavigate()
  const [json, setJson] = useState([])
  const [value, setValue] = useState(0)
  const [color, setColor] = useState([])
  const [open, setOpen] = useState(false)
  const [colorBg, setColorBg] = useState([])
  const [dataAllTasks, setDataAllTasks] = useState([])

  useEffect(() => {
    if (allDataTasks && allDataTasks.length > 0) {
      setDataAllTasks(allDataTasks)
    }
  }, [allDataTasks])

  useEffect(() => {
    if (dataColor && dataColor.length > 0) {
      setColor(dataColor)
    }
    if (allLedData && allLedData.length > 0) {
      console.log("masukkk", allLedData)
      setJson(allLedData)
    }
    setBgColor()
  }, [dataColor, allLedData])

  useEffect(() => {
    if (!Array.isArray(tabsData) || tabsData.length === 0) {
      console.error("tabsData is not available or empty.")
      return
    }

    const defaultIndex = tabsData.findIndex(
      (tab) => tab?.no?.toString() === no && tab.sub === sub
    )

    if (defaultIndex >= 0) {
      setValue(defaultIndex)
    }

    setBgColor()
  }, [tabsData, no, sub])

>>>>>>> dbv2

  useEffect(() => {
    setBgColor()
  }, [])

  const handleChange = (event, newValue) => {
    setValue(newValue)
  }

<<<<<<< HEAD
  const handleClick = async (no, sub, index, status) => {
    if(status === 'plus'){
      await updateUserTask(no, sub)
      setOpen(false); // Tutup modal
      if (onClick) {
        await onClick(no, sub);
      }
      return;
    }
    
    setValue(index); // Update active tab manually
=======
  const handleClick = async (no, sub, projectId, index, status) => {
    if(status === "plus"){
      await updateUserTask(no, sub, projectId)
      setOpen(false); // Tutup modal
      if (onClick) {
        await onClick(no, sub, projectId,navigate);
      }
      return;
    }
    setValue(index) // Update active tab manually
>>>>>>> dbv2
    if (onClick) {
      if (no && sub) {
        console.log(no, sub, index, projectId)
        await onClick(no, sub, projectId, navigate)
      }
    }
  }

  const handleClickPlus = () => {
    console.log("tabsData :", tabsData)
    console.log("allLedData :", allDataTasks)
    setOpen(true) // Buka modal
  }

  const handleClose = () => {
    setOpen(false) // Tutup modal
  }

  const setBgColor = () => {
<<<<<<< HEAD
    let bgColorArray = new Array(tabsData.length).fill(color[0]?.value || "#f38383");
    // const json = allDataVersion
    console.log("json : ", allDataVersion)
    console.log("tabsData : ", tabsData)
    for (let i = 0; i < json.length; i++) {
      for (let index = 0; index < tabsData.length; index++) {
        if (json[i]?.task?.no === tabsData[index]?.no && json[i]?.task?.sub === tabsData[index]?.sub) {
=======
    let bgColorArray = new Array(tabsData.length).fill(
      color[0]?.value || "#f38383"
    )
    // const json = allLedData
    console.log("json : ", allLedData)
    console.log("tabsData : ", tabsData)
    for (let i = 0; i < json.length; i++) {
      for (let index = 0; index < tabsData.length; index++) {
        if (
          json[i]?.task?.led_item?.no === String(tabsData[index]?.no) &&
          json[i]?.task?.led_item?.sub === tabsData[index]?.sub
        ) {
>>>>>>> dbv2
          // Hitung total skor
          let totalScore = 0
          let count = 0
          console.log('total skor ', totalScore)

          
          totalScore = parseInt(json[i].nilai) || 0
               

<<<<<<< HEAD
          for (let indexDetail = 0; indexDetail < json[i].details.length; indexDetail++) {
            if (json[i].details[indexDetail].type === "K") {
              const intScore = parseInt(json[i].details[indexDetail].nilai) || 0; 
              totalScore += intScore;
              count++;
            }
          }
  
=======
>>>>>>> dbv2
          // Menghitung nilai rata-rata
          const finalScore = totalScore ? totalScore.toFixed(2) : 0

          // Menentukan warna berdasarkan finalScore
          for (let indexColor = 0; indexColor < color.length; indexColor++) {
            if (
              finalScore >= color[indexColor].rangeStart &&
              finalScore <= color[indexColor].rangeEnd
            ) {
              bgColorArray[index] = color[indexColor].value // Simpan warna di indeks yang sama dengan tabsData
              break
            }
          }
        }
      }
    }

    setColorBg(bgColorArray) // Memperbarui state dengan array warna
  }

  return (
    <>
      <Box
        sx={{ bgcolor: "background.paper", display: "flex", overflowX: "auto" }}
      >
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
              onClick={() => handleClick(tab.no, tab.sub, tab.project.id, index)}
              sx={{
                padding: "8px 16px",
                cursor: "pointer",
                bgcolor: colorBg[index],
                color: value === index ? "white" : "black",
                borderRadius: "4px",
                margin: "0 2px 4px",
                whiteSpace: "nowrap",
                textAlign: "center",
                fontSize: "12px",
                "&:hover": {
                  bgcolor: value === index ? "primary.dark" : "grey.300",
                  color: value === index ? "white" : "dark",
                },
              }}
            >
              {`${tab.no} ${tab.sub}`}
            </Box>
          ))}
          <Box
            onClick={() => handleClickPlus()}
            sx={{
              padding: "8px 16px",
              cursor: "pointer",
              bgcolor: "grey.200",
              color: "black",
              borderRadius: "4px",
              margin: "0 2px 4px",
              whiteSpace: "nowrap",
              textAlign: "center",
              fontSize: "12px",
              "&:hover": {
                bgcolor: "grey.300",
                color: "black",
              },
            }}
          >
            <FontAwesomeIcon icon={faPlus} />
          </Box>
        </Tabs>
      </Box>

      <Modal open={open} onClose={handleClose}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 350, // Lebar modal
            height: 100, // Tinggi modal
            bgcolor: "white",
            boxShadow: 24,
            borderRadius: "8px",
            p: 2,
            display: "flex",
            flexWrap: "wrap",
            overflowY: "auto",
          }}
        >
          <Grid container spacing={1}>
            {dataAllTasks.map((tab, index) => (
              <Grid item xs={12 / 7} key={index}>
                {" "}
                {/* 1 baris 7 kotak */}
                <Box
                  sx={{
                    bgcolor: "grey.300",
                    padding: "4px",
                    textAlign: "center",
                    borderRadius: "4px",
                    fontSize: "10px",
                    cursor: "pointer",
                    "&:hover": {
                      bgcolor: "grey.400",
                    },
                  }}
<<<<<<< HEAD
                  onClick={() => handleClick(tab.no, tab.sub, index, 'plus')}
=======
                  onClick={() => handleClick(tab.no, tab.sub, tab.project.id, index, "plus")}
>>>>>>> dbv2
                >
                  <Typography variant="caption">{`${tab.no} ${tab.sub}`}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Modal>
    </>
  )
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
}
