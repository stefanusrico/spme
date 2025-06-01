import React, { useState, useEffect } from "react"
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
import { CheckCircle, XCircle, AlertCircle, Award, Info } from "lucide-react"
import { useUser } from "../context/userContext"
import TabelMatriksAkreditasi from "./TabelMatriksAkreditasi"
import { LoadingScreen } from "./LoadingSpinner"
import axiosInstance from "../utils/axiosConfig"

// Konfigurasi skor yang diperlukan berdasarkan requirement baru
const SKOR_YANG_DIPERLUKAN = [
  // Syarat Perlu Akreditasi (semua harus >= 2.0)
  {
    butir: 16,
    tableCode: "3a1",
    tipe: "syaratPerluAkreditasi",
    kunci: "jabatanAkademikDTPS",
    deskripsi: "Jabatan Akademik DTPS",
    juga_untuk_unggul: true,
    syaratUnggul: 3.5,
    syaratBaikSekali: 3.0,
  },
  {
    butir: 38,
    tableCode: "kurikulum", // placeholder, sesuaikan dengan data aktual
    tipe: "syaratPerluAkreditasi",
    kunci: "kurikulum",
    deskripsi: "Kurikulum",
  },
  {
    butir: "penjaminanMutu", // placeholder untuk penjaminan mutu
    tableCode: "sistem",
    tipe: "syaratPerluAkreditasi",
    kunci: "penjaminanMutu",
    deskripsi:
      "Penjaminan Mutu (keterlaksanaan Sistem Penjaminan Mutu Internal)",
  },
  {
    butir: "basicScience", // placeholder untuk basic science
    tableCode: "basic",
    tipe: "syaratPerluAkreditasi",
    kunci: "basicScience",
    deskripsi: "Basic Science dan Matematika",
  },

  // Syarat Perlu Unggul Diploma 4
  {
    butir: 16,
    tableCode: "3a1",
    tipe: "syaratPeringkatUnggul",
    kunci: "jabatanAkademikDTPS",
    deskripsi: "Jabatan Akademik DTPS",
    syaratUnggul: 3.5,
    syaratBaikSekali: 3.0,
  },
  {
    butir: 19,
    tableCode: "3a1",
    tipe: "syaratPeringkatUnggul",
    kunci: "kualifikasiAkademikDTPS",
    deskripsi: "Kualifikasi Akademik DTPS",
    syaratUnggul: 3.5,
    syaratBaikSekali: 3.0,
  },
  {
    butir: 65,
    tableCode: "8d1",
    tipe: "syaratPeringkatUnggul",
    kunci: "waktuTunggu",
    deskripsi: "Waktu Tunggu",
    syaratUnggul: 3.5,
    syaratBaikSekali: 3.0,
  },
  {
    butir: 66,
    tableCode: "8d2",
    tipe: "syaratPeringkatUnggul",
    kunci: "kesesuaianBidang",
    deskripsi: "Kesesuaian Bidang Kerja",
    syaratUnggul: 3.5,
    syaratBaikSekali: 3.0,
  },
  {
    butir: 47,
    tableCode: "5a3",
    tipe: "syaratPeringkatUnggul",
    kunci: "basicScience",
    deskripsi: "Basic Science dan Matematika",
    syaratUnggul: 3.5,
    syaratBaikSekali: 3.0,
  },
]

// Struktur awal untuk data program
const dataProgramAwal = {
  nama: "",
  jenis: "",
  syaratPerluAkreditasi: {
    penjaminanMutu: {
      skor: 3.5,
      lulus: true,
      deskripsi:
        "Penjaminan Mutu (keterlaksanaan Sistem Penjaminan Mutu Internal)",
    },
    jabatanAkademikDTPS: {
      skor: 0,
      lulus: false,
      deskripsi: "Jabatan Akademik DTPS",
    },
    kurikulum: {
      skor: 3.5,
      lulus: true,
      deskripsi: "Kurikulum",
    },
    basicScience: {
      skor: 3.5,
      lulus: true,
      deskripsi: "Basic Science dan Matematika",
    },
  },
  syaratPeringkatUnggul: {
    kualifikasiAkademikDTPS: {
      skor: 0,
      syarat: 3.5,
      lulus: false,
      deskripsi: "Kualifikasi Akademik DTPS",
      isDummy: false,
    },
    jabatanAkademikDTPS: {
      skor: 0,
      syarat: 3.5,
      lulus: false,
      deskripsi: "Jabatan Akademik DTPS",
      isDummy: false,
    },
    waktuTunggu: {
      skor: 0,
      syarat: 3.5,
      lulus: false,
      deskripsi: "Waktu Tunggu",
      isDummy: false,
    },
    kesesuaianBidang: {
      skor: 0,
      syarat: 3.5,
      lulus: false,
      deskripsi: "Kesesuaian Bidang Kerja",
      isDummy: false,
    },
    basicScience: {
      skor: 3.5,
      syarat: 3.5,
      lulus: false,
      deskripsi: "Basic Science dan Matematika",
      isDummy: true,
    },
  },
  syaratPeringkatBaikSekali: {
    kualifikasiAkademikDTPS: {
      skor: 0,
      syarat: 3.0,
      lulus: false,
      deskripsi: "Kualifikasi Akademik DTPS",
      isDummy: false,
    },
    jabatanAkademikDTPS: {
      skor: 0,
      syarat: 3.0,
      lulus: false,
      deskripsi: "Jabatan Akademik DTPS",
      isDummy: false,
    },
    waktuTunggu: {
      skor: 0,
      syarat: 3.0,
      lulus: false,
      deskripsi: "Waktu Tunggu",
      isDummy: false,
    },
    kesesuaianBidang: {
      skor: 0,
      syarat: 3.0,
      lulus: false,
      deskripsi: "Kesesuaian Bidang Kerja",
      isDummy: false,
    },
    basicScience: {
      skor: 3.5,
      syarat: 3.0,
      lulus: false,
      deskripsi: "Basic Science dan Matematika",
      isDummy: true,
    },
  },
}

// Fungsi untuk memformat tanggal dari format ISO ke format yang lebih mudah dibaca
const formatTanggal = (isoDateString) => {
  if (!isoDateString) return "-"

  try {
    const date = new Date(isoDateString)
    const options = { day: "numeric", month: "long", year: "numeric" }
    return date.toLocaleDateString("id-ID", options)
  } catch (error) {
    console.error("Error formatting date:", error)
    return isoDateString
  }
}

const AccreditationStatus = () => {
  const { userData, isLoading } = useUser()
  const [dataProgram, setDataProgram] = useState(dataProgramAwal)
  const [sedangMemuatSkor, setSedangMemuatSkor] = useState(true)
  const [error, setError] = useState(null)

  // State untuk admin prodi selection
  const [prodiList, setProdiList] = useState([])
  const [selectedProdiId, setSelectedProdiId] = useState(null)
  const [loadingProdiList, setLoadingProdiList] = useState(false)

  // Cek apakah user adalah admin
  const isAdmin = userData?.role === "Admin"

  // Fungsi untuk memetakan peringkat akreditasi
  const petakanPeringkat = (peringkat) => {
    const petaPeringkat = {
      Unggul: "Unggul",
      "Baik Sekali": "Baik Sekali",
      Baik: "Baik",
    }
    return petaPeringkat[peringkat] || peringkat || "Tidak Terakreditasi"
  }

  // Fungsi untuk mengambil semua skor dari endpoint baru
  const ambilSemuaSkorButir = async (prodiId) => {
    try {
      console.log(`Fetching all scores for prodi ID: ${prodiId}`)
      const response = await axiosInstance.get(`/lkps/score-syarat-perlu`, {
        params: { prodiId },
      })

      if (response.data && response.data.nilaiItems) {
        console.log("Received score data:", response.data)
        return response.data.nilaiItems
      } else {
        console.warn("No score data found in response")
        return []
      }
    } catch (error) {
      console.error("Error fetching scores:", error)
      throw error
    }
  }

  // Fetch prodi list untuk admin
  useEffect(() => {
    const fetchProdiList = async () => {
      if (!isAdmin || isLoading) return

      setLoadingProdiList(true)
      try {
        const response = await axiosInstance.get("/prodi")
        setProdiList(response.data)
      } catch (error) {
        console.error("Error fetching prodi list:", error)
      } finally {
        setLoadingProdiList(false)
      }
    }

    fetchProdiList()
  }, [isAdmin, isLoading])

  // Mengambil data skor saat komponen dimuat dengan endpoint baru
  useEffect(() => {
    const ambilSemuaSkor = async () => {
      if (isLoading) return // Tunggu userData selesai dimuat

      setSedangMemuatSkor(true)
      setError(null)

      try {
        // Tentukan prodi ID yang akan digunakan
        let prodiId = userData?.prodi?.id

        // Jika admin dan telah memilih prodi, gunakan yang dipilih
        if (isAdmin && selectedProdiId) {
          prodiId = selectedProdiId
        }

        if (!prodiId) {
          console.warn("No prodi ID available")
          setSedangMemuatSkor(false)
          return
        }

        // Buat data program baru berdasarkan template
        const dataProgramBaru = JSON.parse(JSON.stringify(dataProgramAwal))

        // Ambil semua skor dari endpoint baru
        const nilaiItems = await ambilSemuaSkorButir(prodiId)

        // Buat map untuk mempermudah pencarian skor berdasarkan butir dan tableCode
        const skorMap = new Map()
        nilaiItems.forEach((item) => {
          const key = `${item.butir}-${item.tableCode}`
          skorMap.set(key, item.nilai)
        })

        // Update data program berdasarkan konfigurasi
        SKOR_YANG_DIPERLUKAN.forEach((konfigurasiSkor) => {
          const kunciSkor = `${konfigurasiSkor.butir}-${konfigurasiSkor.tableCode}`
          const skor = skorMap.get(kunciSkor) || 0

          console.log(`Processing ${konfigurasiSkor.kunci}: ${skor}`)

          if (konfigurasiSkor.tipe === "syaratPerluAkreditasi") {
            // Syarat perlu akreditasi
            if (dataProgramBaru.syaratPerluAkreditasi[konfigurasiSkor.kunci]) {
              dataProgramBaru.syaratPerluAkreditasi[
                konfigurasiSkor.kunci
              ].skor = skor
              dataProgramBaru.syaratPerluAkreditasi[
                konfigurasiSkor.kunci
              ].lulus = skor >= 2.0
            }

            // Jika juga digunakan untuk peringkat Unggul dan Baik Sekali
            if (konfigurasiSkor.juga_untuk_unggul) {
              if (
                dataProgramBaru.syaratPeringkatUnggul[konfigurasiSkor.kunci]
              ) {
                dataProgramBaru.syaratPeringkatUnggul[
                  konfigurasiSkor.kunci
                ].skor = skor
                dataProgramBaru.syaratPeringkatUnggul[
                  konfigurasiSkor.kunci
                ].syarat = konfigurasiSkor.syaratUnggul
                dataProgramBaru.syaratPeringkatUnggul[
                  konfigurasiSkor.kunci
                ].lulus = skor >= konfigurasiSkor.syaratUnggul
              }

              if (
                dataProgramBaru.syaratPeringkatBaikSekali[konfigurasiSkor.kunci]
              ) {
                dataProgramBaru.syaratPeringkatBaikSekali[
                  konfigurasiSkor.kunci
                ].skor = skor
                dataProgramBaru.syaratPeringkatBaikSekali[
                  konfigurasiSkor.kunci
                ].syarat = konfigurasiSkor.syaratBaikSekali
                dataProgramBaru.syaratPeringkatBaikSekali[
                  konfigurasiSkor.kunci
                ].lulus = skor >= konfigurasiSkor.syaratBaikSekali
              }
            }
          } else if (konfigurasiSkor.tipe === "syaratPeringkatUnggul") {
            // Syarat peringkat Unggul
            if (dataProgramBaru.syaratPeringkatUnggul[konfigurasiSkor.kunci]) {
              dataProgramBaru.syaratPeringkatUnggul[
                konfigurasiSkor.kunci
              ].skor = skor
              dataProgramBaru.syaratPeringkatUnggul[
                konfigurasiSkor.kunci
              ].syarat = konfigurasiSkor.syaratUnggul
              dataProgramBaru.syaratPeringkatUnggul[
                konfigurasiSkor.kunci
              ].lulus = skor >= konfigurasiSkor.syaratUnggul
            }

            // Syarat peringkat Baik Sekali
            if (
              dataProgramBaru.syaratPeringkatBaikSekali[konfigurasiSkor.kunci]
            ) {
              dataProgramBaru.syaratPeringkatBaikSekali[
                konfigurasiSkor.kunci
              ].skor = skor
              dataProgramBaru.syaratPeringkatBaikSekali[
                konfigurasiSkor.kunci
              ].syarat = konfigurasiSkor.syaratBaikSekali
              dataProgramBaru.syaratPeringkatBaikSekali[
                konfigurasiSkor.kunci
              ].lulus = skor >= konfigurasiSkor.syaratBaikSekali
            }
          }
        })

        // Debug: log data program yang telah diperbarui
        console.log("Data program setelah update:", dataProgramBaru)

        // Perbarui state dengan data yang telah diambil
        setDataProgram(dataProgramBaru)
      } catch (err) {
        console.error("Error fetching scores:", err)
        setError("Gagal memuat data skor. Silakan coba lagi.")
      } finally {
        setSedangMemuatSkor(false)
      }
    }

    ambilSemuaSkor()
  }, [isLoading, selectedProdiId])

  if (isLoading || sedangMemuatSkor) {
    return <LoadingScreen />
  }

  if (error) {
    return (
      <div className="w-full px-4 pb-8 flex justify-center items-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-2">{error}</p>
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded-md"
            onClick={() => window.location.reload()}
          >
            Coba Lagi
          </button>
        </div>
      </div>
    )
  }

  // Determine which prodi to use
  let dataProdi = userData?.prodi || null

  // If admin and has selected a prodi, use the selected one
  if (isAdmin && selectedProdiId) {
    const selectedProdi = prodiList.find((p) => p.id === selectedProdiId)
    if (selectedProdi) {
      dataProdi = selectedProdi
    }
  }

  const dataAkreditasi = dataProdi?.akreditasi || null

  // Menentukan data program yang akan ditampilkan
  const dataProgramFinal = {
    ...dataProgram,
    nama: dataProdi?.name || "",
    jenis: dataProdi?.name?.includes("D-III")
      ? "Diploma 3"
      : dataProdi?.name?.includes("D-IV")
      ? "Diploma 4"
      : "",
    akreditasi: {
      status: dataAkreditasi ? "Terakreditasi" : "Belum Terakreditasi",
      peringkat: dataAkreditasi
        ? petakanPeringkat(dataAkreditasi.peringkat)
        : "Tidak Tersedia",
      nomorSK: dataAkreditasi?.nomorSK || "-",
      berlakuHingga: dataAkreditasi
        ? formatTanggal(dataAkreditasi.tanggalKedaluwarsa)
        : "-",
      lembaga: dataAkreditasi?.lembagaAkreditasi || "-",
    },
  }

  // Untuk kemudahan penggunaan pada template
  const program = dataProgramFinal

  // Menghitung apakah semua syarat perlu terakreditasi terpenuhi
  const semuaSyaratPerluAkreditasiTerpenuhi = Object.values(
    program.syaratPerluAkreditasi
  ).every((item) => item.lulus)

  // Menghitung apakah syarat peringkat Unggul terpenuhi
  const syaratPeringkatUnggulTerpenuhi = Object.values(
    program.syaratPeringkatUnggul
  ).every((item) => item.lulus)

  // Menghitung apakah syarat peringkat Baik Sekali terpenuhi
  const syaratPeringkatBaikSekaliTerpenuhi = Object.values(
    program.syaratPeringkatBaikSekali
  ).every((item) => item.lulus)

  // Menentukan peringkat berdasarkan syarat yang terpenuhi
  let peringkatSimulasi = "Tidak Terakreditasi"
  if (semuaSyaratPerluAkreditasiTerpenuhi) {
    if (syaratPeringkatUnggulTerpenuhi) {
      peringkatSimulasi = "Unggul"
    } else if (syaratPeringkatBaikSekaliTerpenuhi) {
      peringkatSimulasi = "Baik Sekali"
    } else {
      peringkatSimulasi = "Baik"
    }
  }

  return (
    <div className="w-full px-4 pb-8">
      <h1 className="text-2xl font-bold text-center mb-6">
        Status Akreditasi Program Studi
      </h1>

      {/* Admin Prodi Selection */}
      {isAdmin && (
        <Card className="mb-6 bg-gray-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Pilih Program Studi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <label htmlFor="prodi-select" className="text-sm font-medium">
                Program Studi:
              </label>
              <select
                id="prodi-select"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedProdiId || userData?.prodi?.id || ""}
                onChange={(e) => setSelectedProdiId(e.target.value)}
                disabled={loadingProdiList}
              >
                <option value="">
                  {loadingProdiList
                    ? "Loading..."
                    : "-- Pilih Program Studi --"}
                </option>
                {prodiList.map((prodi) => (
                  <option key={prodi.id} value={prodi.id}>
                    {prodi.name}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Sebagai Admin, Anda dapat melihat status akreditasi dari semua
              program studi.
            </p>
          </CardContent>
        </Card>
      )}

      {/* BAGIAN 1: INFORMASI AKREDITASI SAAT INI */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Info className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-medium">Status Akreditasi Saat Ini</h2>
        </div>

        {/* Header Card */}
        <Card className="w-full mb-2 shadow-sm border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-2xl">{program.nama}</CardTitle>
              <p className="text-muted-foreground">Program {program.jenis}</p>
            </div>
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-2 mb-2">
                <Award className="text-amber-500 h-6 w-6" />
                <Badge variant="secondary" className="text-base px-3 py-1">
                  {program.akreditasi.peringkat}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Berlaku hingga: {program.akreditasi.berlakuHingga}
              </p>
            </div>
          </CardHeader>
          {dataAkreditasi && (
            <CardContent className="pt-0">
              <div className="text-sm text-muted-foreground">
                <p>No. SK: {program.akreditasi.nomorSK}</p>
                <p>Lembaga Akreditasi: {program.akreditasi.lembaga}</p>
              </div>
            </CardContent>
          )}
        </Card>
        <p className="text-sm text-muted-foreground italic">
          Informasi di atas merupakan status akreditasi yang saat ini berlaku
          untuk program studi.
        </p>
      </div>

      <TabelMatriksAkreditasi />

      {/* DIVIDER */}
      <div className="relative my-10">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center">
          <div className="bg-white px-4 text-sm font-medium text-gray-500">
            HASIL PENILAIAN AKREDITASI DI APLIKASI
          </div>
        </div>
      </div>

      {/* BAGIAN 2: HASIL PENILAIAN DI APLIKASI */}
      <div className="bg-gray-50 p-6 rounded-lg mb-8">
        <div className="flex items-center gap-2 mb-6">
          <AlertCircle className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-medium text-black">
            Hasil Penilaian Akreditasi pada Aplikasi
          </h2>
        </div>

        {/* Simulasi Peringkat */}
        <div className="mb-6 p-4 bg-white rounded-lg border border-blue-200">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium text-lg">
                Simulasi Peringkat Akreditasi:
              </h3>
              <p className="text-sm text-muted-foreground">
                Berdasarkan data yang telah diinput pada aplikasi
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Award className="text-amber-500 h-6 w-6" />
              <Badge
                variant="secondary"
                className={`text-base px-3 py-1 ${
                  peringkatSimulasi === "Unggul"
                    ? "bg-blue-100 text-blue-800"
                    : peringkatSimulasi === "Baik Sekali"
                    ? "bg-green-100 text-green-800"
                    : peringkatSimulasi === "Baik"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {peringkatSimulasi}
              </Badge>
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          Berikut adalah hasil penilaian akreditasi berdasarkan data yang telah
          diinput pada aplikasi. Hasil ini dapat berbeda dengan status
          akreditasi resmi yang berlaku saat ini.
        </p>

        {/* Info tentang data dummy */}
        <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800">Informasi Data</p>
              <p className="text-yellow-700 mt-1">
                Beberapa data ditandai dengan label{" "}
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                  DUMMY
                </span>{" "}
                menggunakan nilai sementara untuk keperluan simulasi dan
                testing. Data ini akan diganti dengan nilai aktual setelah
                implementasi endpoint yang sesuai.
              </p>
            </div>
          </div>
        </div>

        {/* Required Conditions Section */}
        <div className="w-full mb-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-medium">Syarat Perlu Terakreditasi</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Semua butir penilaian harus terpenuhi (skor ≥ 2,0)
          </p>

          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-2/3">Butir Penilaian</TableHead>
                  <TableHead className="text-center w-1/6">Skor</TableHead>
                  <TableHead className="text-center w-1/6">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.values(program.syaratPerluAkreditasi).map(
                  (item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {item.deskripsi}
                          {item.isDummy && (
                            <Badge
                              variant="outline"
                              className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs"
                            >
                              DUMMY
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {item.skor.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.lulus ? (
                          <div className="flex justify-center">
                            <Badge
                              variant="outline"
                              className="bg-green-100 text-green-800 border-green-200"
                            >
                              Terpenuhi
                            </Badge>
                          </div>
                        ) : (
                          <div className="flex justify-center">
                            <Badge
                              variant="outline"
                              className="bg-red-100 text-red-800 border-red-200"
                            >
                              Tidak Terpenuhi
                            </Badge>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Excellent Rating Requirements Section */}
        <div className="w-full mb-6 bg-blue-50 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Award className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-medium">
              Syarat Perlu Peringkat Unggul
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Butir penilaian untuk mendapatkan peringkat Unggul (Diploma 4)
          </p>

          <div className="w-full overflow-x-auto bg-white rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-2/3">Butir Penilaian</TableHead>
                  <TableHead className="text-center w-1/6">Skor</TableHead>
                  <TableHead className="text-center w-1/6">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.values(program.syaratPeringkatUnggul).map(
                  (item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {item.deskripsi}
                          {item.isDummy && (
                            <Badge
                              variant="outline"
                              className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs"
                            >
                              DUMMY
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="font-medium">
                            {item.skor.toFixed(1)}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            (Syarat: {item.syarat.toFixed(1)})
                          </span>
                          {item.lulus ? (
                            <CheckCircle className="text-green-500 h-5 w-5" />
                          ) : (
                            <XCircle className="text-red-500 h-5 w-5" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.lulus ? (
                          <div className="flex justify-center">
                            <Badge
                              variant="outline"
                              className="bg-green-100 text-green-800 border-green-200"
                            >
                              Terpenuhi
                            </Badge>
                          </div>
                        ) : (
                          <div className="flex justify-center">
                            <Badge
                              variant="outline"
                              className="bg-red-100 text-red-800 border-red-200"
                            >
                              Tidak Terpenuhi
                            </Badge>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Very Good Rating Requirements Section */}
        <div className="w-full mb-6 bg-blue-50 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Award className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-medium">
              Syarat Perlu Peringkat Baik Sekali
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Butir penilaian untuk mendapatkan peringkat Baik Sekali
          </p>

          <div className="w-full overflow-x-auto bg-white rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-2/3">Butir Penilaian</TableHead>
                  <TableHead className="text-center w-1/6">Skor</TableHead>
                  <TableHead className="text-center w-1/6">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.values(program.syaratPeringkatBaikSekali).map(
                  (item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {item.deskripsi}
                          {item.isDummy && (
                            <Badge
                              variant="outline"
                              className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs"
                            >
                              DUMMY
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="font-medium">
                            {item.skor.toFixed(1)}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            (Syarat: {item.syarat.toFixed(1)})
                          </span>
                          {item.lulus ? (
                            <CheckCircle className="text-green-500 h-5 w-5" />
                          ) : (
                            <XCircle className="text-red-500 h-5 w-5" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.lulus ? (
                          <div className="flex justify-center">
                            <Badge
                              variant="outline"
                              className="bg-green-100 text-green-800 border-green-200"
                            >
                              Terpenuhi
                            </Badge>
                          </div>
                        ) : (
                          <div className="flex justify-center">
                            <Badge
                              variant="outline"
                              className="bg-red-100 text-red-800 border-red-200"
                            >
                              Tidak Terpenuhi
                            </Badge>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccreditationStatus
