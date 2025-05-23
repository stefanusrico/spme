import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Info } from "lucide-react"

// Data untuk tabel matriks akreditasi
const matriksAkreditasi = [
  {
    no: 1,
    nilaiAkreditasi: "NA ≥ 361",
    syaratPerluTerakreditasi: "V",
    syaratPeringkatUnggul: "V",
    syaratPeringkatBaikSekali: "-",
    peringkat: "Unggul",
  },
  {
    no: 2,
    nilaiAkreditasi: "NA ≥ 361",
    syaratPerluTerakreditasi: "V",
    syaratPeringkatUnggul: "X",
    syaratPeringkatBaikSekali: "-",
    peringkat: "Baik Sekali",
  },
  {
    no: 3,
    nilaiAkreditasi: "301 ≤ NA < 361",
    syaratPerluTerakreditasi: "V",
    syaratPeringkatUnggul: "-",
    syaratPeringkatBaikSekali: "V",
    peringkat: "Baik Sekali",
  },
  {
    no: 4,
    nilaiAkreditasi: "301 ≤ NA < 361",
    syaratPerluTerakreditasi: "V",
    syaratPeringkatUnggul: "-",
    syaratPeringkatBaikSekali: "X",
    peringkat: "Baik",
  },
  {
    no: 5,
    nilaiAkreditasi: "200 ≤ NA < 301",
    syaratPerluTerakreditasi: "V",
    syaratPeringkatUnggul: "-",
    syaratPeringkatBaikSekali: "-",
    peringkat: "Baik",
  },
  {
    no: 6,
    nilaiAkreditasi: "NA ≥ 200",
    syaratPerluTerakreditasi: "X",
    syaratPeringkatUnggul: "V / X",
    syaratPeringkatBaikSekali: "V / X",
    peringkat: "TMSP",
  },
  {
    no: 7,
    nilaiAkreditasi: "NA < 200",
    syaratPerluTerakreditasi: "V / X",
    syaratPeringkatUnggul: "-",
    syaratPeringkatBaikSekali: "-",
    peringkat: "TMSP",
  },
]

// Fungsi untuk mendapatkan badge warna berdasarkan peringkat
const getBadgeVariant = (peringkat) => {
  switch (peringkat) {
    case "Unggul":
      return "bg-blue-100 text-blue-800 border-blue-200"
    case "Baik Sekali":
      return "bg-green-100 text-green-800 border-green-200"
    case "Baik":
      return "bg-yellow-100 text-yellow-800 border-yellow-200"
    case "TMSP":
      return "bg-red-100 text-red-800 border-red-200"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

// Fungsi untuk mendapatkan styling sel berdasarkan nilai
const getCellStyle = (value) => {
  if (value === "V") {
    return "text-green-600 font-semibold"
  } else if (value === "X") {
    return "text-red-600 font-semibold"
  } else if (value === "-") {
    return "text-gray-400"
  }
  return ""
}

const TabelMatriksAkreditasi = () => {
  return (
    <div className="w-full mb-8">
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">
              Matriks Penentu Peringkat Akreditasi
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center w-12 border-r border-gray-200">
                    No.
                  </TableHead>
                  <TableHead className="text-center w-32 border-r border-gray-200">
                    Nilai Akreditasi
                  </TableHead>
                  <TableHead className="text-center w-24 border-r border-gray-200">
                    Syarat Perlu
                    <br />
                    Terakreditasi
                    <br />
                    <span className="text-xs text-muted-foreground">*)</span>
                  </TableHead>
                  <TableHead className="text-center border-r border-gray-200">
                    <div className="flex flex-col">
                      <span className="border-b border-gray-200 pb-1 mb-1">
                        Syarat Perlu Peringkat
                      </span>
                      <div className="flex">
                        <div className="flex-1 text-center border-r border-gray-200 pr-2">
                          Unggul
                          <br />
                          <span className="text-xs text-muted-foreground">
                            **)
                          </span>
                        </div>
                        <div className="flex-1 text-center pl-2">
                          Baik
                          <br />
                          Sekali
                          <br />
                          <span className="text-xs text-muted-foreground">
                            ***)
                          </span>
                        </div>
                      </div>
                    </div>
                  </TableHead>
                  <TableHead className="text-center w-24">Peringkat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matriksAkreditasi.map((row) => (
                  <TableRow key={row.no} className="hover:bg-gray-50">
                    <TableCell className="text-center border-r border-gray-200 font-medium">
                      {row.no}
                    </TableCell>
                    <TableCell className="text-center border-r border-gray-200 font-medium">
                      {row.nilaiAkreditasi}
                    </TableCell>
                    <TableCell
                      className={`text-center border-r border-gray-200 text-lg ${getCellStyle(
                        row.syaratPerluTerakreditasi
                      )}`}
                    >
                      {row.syaratPerluTerakreditasi}
                    </TableCell>
                    <TableCell className="border-r border-gray-200">
                      <div className="flex">
                        <div
                          className={`flex-1 text-center border-r border-gray-200 pr-2 text-lg ${getCellStyle(
                            row.syaratPeringkatUnggul
                          )}`}
                        >
                          {row.syaratPeringkatUnggul}
                        </div>
                        <div
                          className={`flex-1 text-center pl-2 text-lg ${getCellStyle(
                            row.syaratPeringkatBaikSekali
                          )}`}
                        >
                          {row.syaratPeringkatBaikSekali}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={`${getBadgeVariant(
                          row.peringkat
                        )} font-medium`}
                      >
                        {row.peringkat}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Keterangan */}
          <div className="mt-6 space-y-2 text-sm text-black">
            <div className="font-bold text-black mb-3">Keterangan:</div>
            <div>
              <span className="font-medium">*)</span> V = memenuhi Syarat Perlu
              Terakreditasi, X = tidak memenuhi Syarat Perlu Terakreditasi.
            </div>
            <div>
              <span className="font-medium">**)</span> V = memenuhi Syarat Perlu
              Peringkat Unggul, X = tidak memenuhi Syarat Perlu Peringkat
              Unggul.
            </div>
            <div>
              <span className="font-medium">***)</span> V = memenuhi Syarat
              Perlu Peringkat Baik Sekali, X = tidak memenuhi Syarat Perlu
              Peringkat Baik Sekali.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default TabelMatriksAkreditasi
