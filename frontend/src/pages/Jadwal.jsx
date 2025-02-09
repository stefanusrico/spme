import { useEffect, useState } from "react"
import axiosInstance from "../utils/axiosConfig"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { ToastContainer, toast } from "react-toastify"

const Jadwal = () => {
  const [selectedLam, setSelectedLam] = useState(null)
  const [selectedYear, setSelectedYear] = useState("2024")
  const [lamData, setLamData] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchLamData()
  }, [])

  useEffect(() => {
    if (lamData.length > 0 && !selectedLam) {
      setSelectedLam(lamData[0].id)
    }
  }, [lamData])

  const fetchLamData = async () => {
    try {
      const response = await axiosInstance.get("/lam")
      setLamData(response.data)
    } catch (error) {
      console.error("Error fetching LAM data:", error)
      toast.error("Failed to fetch LAM data")
    } finally {
      setLoading(false)
    }
  }

  const getCurrentLamSchedules = () => {
    const currentLam = lamData.find((lam) => lam.id === selectedLam)
    if (!currentLam) return []

    const yearStr = selectedYear.toString()

    const schedules = currentLam.jadwals.filter(
      (jadwal) => jadwal.tahun.toString() === yearStr
    )

    return schedules
  }

  const getCurrentLamName = () => {
    const currentLam = lamData.find((lam) => lam.id === selectedLam)
    return currentLam?.name || ""
  }

  const handleUpdateSchedules = async () => {
    setUpdating(true)
    try {
      const schedules = getCurrentLamSchedules()

      const updatePromises = schedules.map((schedule) => {
        const updateData = {
          tanggalSubmit: schedule.tanggalSubmit,
          tanggalPengumuman: schedule.tanggalPengumuman,
        }
        return axiosInstance.put(`/jadwal/${schedule.id}`, updateData)
      })

      await Promise.all(updatePromises)

      toast.success("Jadwal berhasil diperbarui")
      await fetchLamData()
    } catch (error) {
      console.error("Error details:", error.response?.data || error)
      if (error.response?.data?.message) {
        toast.error(error.response.data.message)
      } else {
        toast.error("Gagal memperbarui jadwal")
      }
    } finally {
      setUpdating(false)
    }
  }

  const handleDateChange = (date, jadwalId, field) => {
    if (!date) return

    setLamData((prevData) => {
      return prevData.map((lam) => {
        if (lam.id === selectedLam) {
          return {
            ...lam,
            jadwals: lam.jadwals.map((jadwal) => {
              if (jadwal.id === jadwalId) {
                if (field === "tanggalSubmit") {
                  const currentPengumuman = new Date(jadwal.tanggalPengumuman)
                  if (currentPengumuman <= date) {
                    const newAnnouncementDate = new Date(date)
                    newAnnouncementDate.setDate(date.getDate() + 1)
                    return {
                      ...jadwal,
                      tanggalSubmit: date.toISOString(),
                      tanggalPengumuman: newAnnouncementDate.toISOString(),
                    }
                  }
                }

                if (field === "tanggalPengumuman") {
                  const currentSubmit = new Date(jadwal.tanggalSubmit)
                  if (date <= currentSubmit) {
                    toast.error(
                      "Tanggal pengumuman harus setelah tanggal submit"
                    )
                    return jadwal
                  }
                }

                return {
                  ...jadwal,
                  [field]: date.toISOString(),
                }
              }
              return jadwal
            }),
          }
        }
        return lam
      })
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    )
  }

  const currentLam = lamData.find((lam) => lam.id === selectedLam)

  return (
    <>
      <ToastContainer
        position="top-right"
        className="mt-16"
        autoClose={1000}
        hideProgressBar={false}
        closeOnClick
        pauseOnHover
      />
      <div className="pr-4 mx-auto mt-32">
        <h1 className="text-3xl font-bold mb-4 sm:mb-6">Manage Jadwal LAM</h1>

        <div className="bg-white rounded-xl shadow-lg p-12 w-full">
          <div className="flex justify-between mb-8">
            <Tabs
              defaultValue={lamData[0]?.name.toLowerCase().replace(/\s+/g, "")}
              onValueChange={(value) => {
                const selectedLamData = lamData.find(
                  (lam) => lam.name.toLowerCase().replace(/\s+/g, "") === value
                )
                if (selectedLamData) {
                  setSelectedLam(selectedLamData.id)
                }
              }}
            >
              <TabsList className="h-12 text-lg">
                {lamData.map((lam) => (
                  <TabsTrigger
                    key={lam.id}
                    className="px-8"
                    value={lam.name.toLowerCase().replace(/\s+/g, "")}
                  >
                    {lam.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <Select onValueChange={setSelectedYear} defaultValue="2024">
              <SelectTrigger className="w-[200px] h-12 text-lg">
                <SelectValue placeholder="Tahun" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {Array.from({ length: 12 }, (_, i) => i + 2024).map(
                    (year) => (
                      <SelectItem
                        key={year}
                        className="text-lg"
                        value={year.toString()}
                      >
                        {year}
                      </SelectItem>
                    )
                  )}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-12">
            {getCurrentLamSchedules().map((jadwal) => (
              <div key={jadwal.id} className="grid grid-cols-2 gap-12">
                <div>
                  <Label className="text-xl mb-4 block">Tanggal Submit</Label>
                  <div className="flex gap-6 items-center">
                    {currentLam?.hasBatch && (
                      <Label className="w-24 text-lg">
                        Batch {jadwal.batch}
                      </Label>
                    )}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full h-12 text-lg justify-start"
                        >
                          <CalendarIcon className="mr-3 h-5 w-5" />
                          <span>
                            {format(
                              new Date(jadwal.tanggalSubmit),
                              "dd MMMM yyyy"
                            )}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          className="rounded-lg"
                          mode="single"
                          selected={
                            jadwal.tanggalSubmit
                              ? new Date(jadwal.tanggalSubmit)
                              : undefined
                          }
                          defaultMonth={new Date(parseInt(selectedYear), 0)}
                          fromDate={new Date(parseInt(selectedYear), 0, 1)}
                          toDate={new Date(parseInt(selectedYear), 11, 31)}
                          onSelect={(date) =>
                            date &&
                            handleDateChange(date, jadwal.id, "tanggalSubmit")
                          }
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div>
                  <Label className="text-xl mb-4 block">
                    Tanggal Pengumuman
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full h-12 text-lg justify-start"
                      >
                        <CalendarIcon className="mr-3 h-5 w-5" />
                        <span>
                          {format(
                            new Date(jadwal.tanggalPengumuman),
                            "dd MMMM yyyy"
                          )}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        className="rounded-lg"
                        mode="single"
                        selected={
                          jadwal.tanggalPengumuman
                            ? new Date(jadwal.tanggalPengumuman)
                            : undefined
                        }
                        defaultMonth={new Date(parseInt(selectedYear), 0)}
                        fromDate={new Date(parseInt(selectedYear), 0, 1)}
                        toDate={new Date(parseInt(selectedYear), 11, 31)}
                        onSelect={(date) =>
                          date &&
                          handleDateChange(date, jadwal.id, "tanggalPengumuman")
                        }
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end mt-12">
            <Button
              className="bg-base px-8 h-12 text-lg"
              onClick={handleUpdateSchedules}
              disabled={updating}
            >
              {updating ? "Updating..." : "Update"}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

export default Jadwal
