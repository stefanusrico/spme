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

  // Update data saat props berubah
  useEffect(() => {
    if (dataColor && dataColor.length > 0) {
      setColor(dataColor)
    }
    if (allLedData && allLedData.length > 0) {
      console.log("masukkk", allLedData)
      setJson(allLedData)
    }
  }, [dataColor, allLedData])

  // Set background color hanya setelah semua data siap
  useEffect(() => {
    // Pastikan semua data yang diperlukan sudah tersedia
    if (
      tabsData.length > 0 && 
      color.length > 0 && 
      json.length > 0
    ) {
      setBgColor()
    }
  }, [tabsData, color, json]) // Dependencies yang tepat

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
  }, [tabsData, no, sub])

  const handleChange = (event, newValue) => {
    setValue(newValue)
  }

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
    // Pastikan data yang diperlukan tersedia
    if (!tabsData.length || !color.length || !json.length) {
      console.log("Data belum siap untuk setBgColor")
      return
    }

    let bgColorArray = new Array(tabsData.length).fill(
      color[0]?.value || "#f38383"
    )

    console.log("json : ", json)
    console.log("tabsdata : ", tabsData);
    console.log("color ", color);

    for (let i = 0; i < json.length; i++) {
      for (let index = 0; index < tabsData.length; index++) {
        const ledItem = json[i]?.task?.led_item // Menggunakan json bukan allLedData
        
        if (
          ledItem?.no === String(tabsData[index]?.no) &&
          ledItem?.sub === tabsData[index]?.sub
        ) {
          const nilaiStr = json[i]?.nilai
          const totalScore = parseFloat(nilaiStr)

          if (!isNaN(totalScore)) {
            const finalScore = totalScore.toFixed(2)

            for (let indexColor = 0; indexColor < color.length; indexColor++) {
              const { rangeStart, rangeEnd, value } = color[indexColor]
              if (totalScore >= rangeStart && totalScore <= rangeEnd) {
                bgColorArray[index] = value
                break
              }
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
                bgcolor: colorBg[index] || (color[0]?.value || "#f38383"), // Fallback color
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
            width: 350,
            height: 100,
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
                  onClick={() => handleClick(tab.no, tab.sub, tab.project.id, index, "plus")}
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