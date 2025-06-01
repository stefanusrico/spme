import { useState, useEffect } from "react"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import axiosInstance from "../utils/axiosConfig"
import {
  fetchTableStructure,
  getAllTablesSync,
} from "../constants/tableStructure"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Download } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

const ExportData = ({ projectId }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [exportType, setExportType] = useState("lkps")
  const [selectedTables, setSelectedTables] = useState([])
  const [tableStructure, setTableStructure] = useState([])
  const [ledCriteria, setLedCriteria] = useState([
    { code: "C1", name: "Kriteria A: Visi, Misi, Tujuan, dan Strategi" },
    {
      code: "C2", name: "Kriteria B: Tata Pamong, Tata Kelola, dan Kerjasama",
    },
    { code: "C3", name: "Kriteria C: Mahasiswa" },
    { code: "C4", name: "Kriteria D: Sumber Daya Manusia" },
    { code: "C5", name: "Kriteria E: Keuangan, Sarana, dan Prasarana" },
    { code: "C6", name: "Kriteria F: Pendidikan" },
    { code: "C7", name: "Kriteria G: Penelitian" },
    { code: "C8", name: "Kriteria H: Pengabdian kepada Masyarakat" },
    { code: "C9", name: "Kriteria I: Luaran dan Capaian Tridharma" },
  ])

  useEffect(() => {
    const loadTableStructure = async () => {
      try {
        const structure = await fetchTableStructure()
        setTableStructure(structure)
      } catch (error) {
        console.error("Error loading table structure:", error)
        toast.error("Gagal memuat struktur tabel")
      }
    }

    loadTableStructure()
  }, [])

  const handleTabChange = (value) => {
    setExportType(value)
    setSelectedTables([])
  }

  const handleTableSelection = (tableCode) => {
    setSelectedTables((prevSelected) => {
      if (prevSelected.includes(tableCode)) {
        return prevSelected.filter((code) => code !== tableCode)
      } else {
        return [...prevSelected, tableCode]
      }
    })
  }

  const handleSelectAll = () => {
    if (exportType === "lkps") {
      const allTables = getAllTablesSync(tableStructure).map(
        (table) => table.code
      )
      if (selectedTables.length === allTables.length) {
        setSelectedTables([])
      } else {
        setSelectedTables(allTables)
      }
    } else {
      const allCriteria = ledCriteria.map((criteria) => criteria.code)
      if (selectedTables.length === allCriteria.length) {
        setSelectedTables([])
      } else {
        setSelectedTables(allCriteria)
      }
    }
  }

  const exportData = async () => {
    if (selectedTables.length === 0) {
      toast.error("Silakan pilih minimal satu item untuk diekspor")
      return
    }

    setIsLoading(true)
    try {
      let endpoint = ""
      let requestData = {}

      if (exportType === "lkps") {
        endpoint = "/lkps/export-data"
        requestData = {
          projectId,
          table_code: selectedTables,
        }
      } else {
        // LED
        endpoint = "/led/export-data"
        requestData = {
          projectId,
          kriteria: selectedTables,
        }
      }

      const response = await axiosInstance({
        url: endpoint,
        method: "POST",
        data: requestData,
        responseType: "blob",
      })

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement("a")
      link.href = url

      // Format current date for filename
      const date = new Date()
      const formattedDate = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`

      const extension = exportType === "lkps" ? "xlsx" : "docx"
      link.setAttribute(
        "download",
        `${exportType.toUpperCase()}_Export_${formattedDate}.${extension}`
      )
      
      document.body.appendChild(link)
      link.click()
      link.remove()

      toast.success(`Berhasil mengekspor data ${exportType.toUpperCase()}`)
    } catch (error) {
      console.error("Export error:", error)
      toast.error(
        `Gagal mengekspor data: ${error.message || "Silakan coba lagi"}`
      )
    } finally {
      setIsLoading(false)
    }
  }

  const renderLkpsTables = () => {
    const tables = getAllTablesSync(tableStructure)

    // Group tables by parent
    const groupedTables = tables.reduce((acc, table) => {
      if (!acc[table.parent]) {
        acc[table.parent] = []
      }
      acc[table.parent].push(table)
      return acc
    }, {})

    return Object.entries(groupedTables).map(([parent, tables]) => (
      <div key={parent} className="mb-4">
        <h3 className="text-sm font-medium text-slate-700 mb-2">
          {parent || "Lainnya"}
        </h3>
        <div className="pl-2 space-y-2">
          {tables.map((table) => (
            <div key={table.code} className="flex items-center space-x-2">
              <Checkbox
                id={`table-${table.code}`}
                checked={selectedTables.includes(table.code)}
                onCheckedChange={() => handleTableSelection(table.code)}
              />
              <label
                htmlFor={`table-${table.code}`}
                className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {table.title}
              </label>
            </div>
          ))}
        </div>
      </div>
    ))
  }

  const renderLedCriteria = () => {
    return (
      <div className="space-y-2">
        {ledCriteria.map((criteria) => (
          <div key={criteria.code} className="flex items-center space-x-2">
            <Checkbox
              id={`criteria-${criteria.code}`}
              checked={selectedTables.includes(criteria.code)}
              onCheckedChange={() => handleTableSelection(criteria.code)}
            />
            <label
              htmlFor={`criteria-${criteria.code}`}
              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              {criteria.name}
            </label>
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Ekspor Data</CardTitle>
          <CardDescription>
            Ekspor data LED dan LKPS dalam format Excel untuk digunakan di luar
            aplikasi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="lkps" onValueChange={handleTabChange}>
            <TabsList className="mb-4">
              <TabsTrigger value="lkps">Data LKPS</TabsTrigger>
              <TabsTrigger value="led">Data LED</TabsTrigger>
            </TabsList>

            <TabsContent value="lkps" className="mt-2">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium">Pilih Tabel LKPS</h3>
                  <Badge variant="outline">
                    {selectedTables.length} dipilih
                  </Badge>
                </div>
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  {selectedTables.length ===
                  getAllTablesSync(tableStructure).length
                    ? "Batalkan Semua"
                    : "Pilih Semua"}
                </Button>
              </div>

              <ScrollArea className="h-72 border rounded-md p-3">
                {renderLkpsTables()}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="led" className="mt-2">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium">Pilih Kriteria LED</h3>
                  <Badge variant="outline">
                    {selectedTables.length} dipilih
                  </Badge>
                </div>
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  {selectedTables.length === ledCriteria.length
                    ? "Batalkan Semua"
                    : "Pilih Semua"}
                </Button>
              </div>

              <ScrollArea className="h-72 border rounded-md p-3">
                {renderLedCriteria()}
              </ScrollArea>
            </TabsContent>
          </Tabs>

          <div className="mt-6 flex justify-end">
            <Button
              onClick={exportData}
              disabled={isLoading || selectedTables.length === 0}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Mengekspor...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>Ekspor {exportType.toUpperCase()}</span>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ToastContainer untuk react-toastify */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </>
  )
}

export default ExportData
