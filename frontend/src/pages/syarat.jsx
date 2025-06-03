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

const SKOR_YANG_DIPERLUKAN = [
  {
    butir: 74,
    tipe: "syaratPerluAkreditasi",
    kunci: "penjaminanMutu",
    deskripsi: "Penjaminan Mutu",
  },
  {
    butir: 16,
    tipe: "syaratPerluAkreditasi",
    kunci: "kecukupanJumlahDTPS",
    deskripsi: "Kecukupan Jumlah DTPS",
    juga_untuk_unggul: true,
    syaratUnggul: 3.5,
    syaratBaikSekali: 3.0,
  },
  {
    butir: 47,
    tipe: "syaratPerluAkreditasi",
    kunci: "basicScience",
    deskripsi: "Basic Science dan Matematika",
  },
  {
    butir: 40,
    tipe: "syaratPerluAkreditasi",
    kunci: "kurikulum",
    deskripsi: "Kurikulum",
  },

  {
    butir: 17,
    tipe: "syaratPeringkatUnggul",
    kunci: "kualifikasiAkademikDTPS",
    deskripsi: "Kualifikasi Akademik DTPS",
    syaratUnggul: 3.5,
    syaratBaikSekali: 3.0,
  },
  {
    butir: 19,
    tipe: "syaratPeringkatUnggul",
    kunci: "jabatanAkademikDTPS",
    deskripsi: "Jabatan Akademik DTPS",
    syaratUnggul: 3.5,
    syaratBaikSekali: 3.0,
  },
  {
    butir: 65,
    tipe: "syaratPeringkatUnggul",
    kunci: "waktuTunggu",
    deskripsi: "Waktu Tunggu",
    syaratUnggul: 3.5,
    syaratBaikSekali: 3.0,
  },
  {
    butir: 66,
    tipe: "syaratPeringkatUnggul",
    kunci: "kesesuaianBidang",
    deskripsi: "Kesesuaian Bidang Kerja",
    syaratUnggul: 3.5,
    syaratBaikSekali: 3.0,
  },
  {
    butir: 47,
    tipe: "syaratPeringkatUnggul",
    kunci: "basicScience",
    deskripsi: "Basic Science dan Matematika",
    syaratUnggul: 3.5,
    syaratBaikSekali: 3.0,
  },
]

const dataProgramAwal = {
  nama: "",
  jenis: "",
  syaratPerluAkreditasi: {
    penjaminanMutu: {
      skor: 0,
      lulus: false,
      deskripsi: "Penjaminan Mutu",
    },
    kecukupanJumlahDTPS: {
      skor: 0,
      lulus: false,
      deskripsi: "Kecukupan Jumlah DTPS",
    },
    basicScience: {
      skor: 0,
      lulus: false,
      deskripsi: "Basic Science dan Matematika",
    },
    kurikulum: {
      skor: 0,
      lulus: false,
      deskripsi: "Kurikulum",
    },
  },
  syaratPeringkatUnggul: {
    kualifikasiAkademikDTPS: {
      skor: 0,
      syarat: 3.5,
      lulus: false,
      deskripsi: "Kualifikasi Akademik DTPS",
    },
    jabatanAkademikDTPS: {
      skor: 0,
      syarat: 3.5,
      lulus: false,
      deskripsi: "Jabatan Akademik DTPS",
    },
    waktuTunggu: {
      skor: 0,
      syarat: 3.5,
      lulus: false,
      deskripsi: "Waktu Tunggu",
    },
    kesesuaianBidang: {
      skor: 0,
      syarat: 3.5,
      lulus: false,
      deskripsi: "Kesesuaian Bidang Kerja",
    },
    basicScience: {
      skor: 0,
      syarat: 3.5,
      lulus: false,
      deskripsi: "Basic Science dan Matematika",
    },
  },
  syaratPeringkatBaikSekali: {
    kualifikasiAkademikDTPS: {
      skor: 0,
      syarat: 3.0,
      lulus: false,
      deskripsi: "Kualifikasi Akademik DTPS",
    },
    jabatanAkademikDTPS: {
      skor: 0,
      syarat: 3.0,
      lulus: false,
      deskripsi: "Jabatan Akademik DTPS",
    },
    waktuTunggu: {
      skor: 0,
      syarat: 3.0,
      lulus: false,
      deskripsi: "Waktu Tunggu",
    },
    kesesuaianBidang: {
      skor: 0,
      syarat: 3.0,
      lulus: false,
      deskripsi: "Kesesuaian Bidang Kerja",
    },
    basicScience: {
      skor: 0,
      syarat: 3.0,
      lulus: false,
      deskripsi: "Basic Science dan Matematika",
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
    return isoDateString
  }
}

const AccreditationStatus = () => {
  const { userData, isLoading } = useUser()
  const [dataProgram, setDataProgram] = useState(dataProgramAwal)
  const [sedangMemuatSkor, setSedangMemuatSkor] = useState(true)
  const [error, setError] = useState(null)
  // Tambahkan state untuk nilai akreditasi
  const [nilaiAkreditasi, setNilaiAkreditasi] = useState(0)
  const [projectInfo, setProjectInfo] = useState(null)

  // State untuk admin prodi selection
  const [prodiList, setProdiList] = useState([])
  const [selectedProdiId, setSelectedProdiId] = useState(null)
  const [loadingProdiList, setLoadingProdiList] = useState(false)

  const isAdmin = userData?.role === "Admin"

  const petakanPeringkat = (peringkat) => {
    const petaPeringkat = {
      Unggul: "Unggul",
      "Baik Sekali": "Baik Sekali",
      Baik: "Baik",
    }
    return petaPeringkat[peringkat] || peringkat || "Tidak Terakreditasi"
  }

  // Fungsi untuk menentukan peringkat berdasarkan nilai akreditasi
  const tentukanPeringkatBerdasarkanNilai = (nilai) => {
    if (nilai >= 361) {
      return "Unggul"
    } else if (nilai >= 301) {
      return "Baik Sekali"
    } else if (nilai >= 200) {
      return "Baik"
    } else {
      return "Tidak Terakreditasi"
    }
  }

  const ambilSemuaSkorButir = async (prodiId) => {
    try {
      const response = await axiosInstance.get(
        `projects/get-skor-per-butir/${prodiId}`
      )

      if (response.data) {
        // Set nilai akreditasi dan project info
        setNilaiAkreditasi(response.data.nilaiAkreditasi || 0)
        setProjectInfo({
          projectId: response.data.projectId,
          projectName: response.data.projectName,
          prodiId: response.data.prodiId,
        })

        if (response.data["data-tanpa-bobot"]) {
          return response.data["data-tanpa-bobot"]
        } else {
          return []
        }
      } else {
        return []
      }
    } catch (error) {
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
        // Handle error silently or show user-friendly message
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
          setSedangMemuatSkor(false)
          return
        }

        // Buat data program baru berdasarkan template
        const dataProgramBaru = JSON.parse(JSON.stringify(dataProgramAwal))

        // Ambil semua skor dari endpoint baru
        const nilaiItems = await ambilSemuaSkorButir(prodiId)

        // Buat map untuk mempermudah pencarian skor berdasarkan butir
        const skorMap = new Map()
        nilaiItems.forEach((item) => {
          skorMap.set(item.no, item.nilai)
        })

        // Update data program berdasarkan konfigurasi
        SKOR_YANG_DIPERLUKAN.forEach((konfigurasiSkor) => {
          let skor = skorMap.get(konfigurasiSkor.butir) || 0

          // Dummy value untuk butir 74 (Penjaminan Mutu)
          if (konfigurasiSkor.butir === 74) {
            skor = 3.8
          }

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

        // Perbarui state dengan data yang telah diambil
        setDataProgram(dataProgramBaru)
      } catch (err) {
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

  // Tentukan peringkat berdasarkan nilai akreditasi
  const peringkatBerdasarkanNilai =
    tentukanPeringkatBerdasarkanNilai(nilaiAkreditasi)

  // Menentukan peringkat akhir berdasarkan kombinasi syarat dan nilai
  let peringkatSimulasi = "Tidak Terakreditasi"

  if (semuaSyaratPerluAkreditasiTerpenuhi && nilaiAkreditasi >= 200) {
    // Jika syarat perlu akreditasi terpenuhi dan nilai akreditasi minimal 200
    if (syaratPeringkatUnggulTerpenuhi && nilaiAkreditasi >= 361) {
      peringkatSimulasi = "Unggul"
    } else if (syaratPeringkatBaikSekaliTerpenuhi && nilaiAkreditasi >= 301) {
      peringkatSimulasi = "Baik Sekali"
    } else if (nilaiAkreditasi >= 200) {
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

        {/* Project Info */}
        {projectInfo && (
          <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Informasi Project:
            </h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p>Project: {projectInfo.projectName}</p>
              <p>Project ID: {projectInfo.projectId}</p>
            </div>
          </div>
        )}

        {/* Nilai Akreditasi Card */}
        <div className="mb-6 p-4 bg-white rounded-lg border border-blue-200">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium text-lg">Nilai Akreditasi:</h3>
              <p className="text-sm text-muted-foreground">
                Total nilai berdasarkan perhitungan sistem
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">
                {nilaiAkreditasi.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">
                Peringkat: {peringkatBerdasarkanNilai}
              </div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <h4 className="text-sm font-medium mb-2">Skala Penilaian:</h4>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span>Unggul:</span>
                <span>≥ 361</span>
              </div>
              <div className="flex justify-between">
                <span>Baik Sekali:</span>
                <span>301 - 360</span>
              </div>
              <div className="flex justify-between">
                <span>Baik:</span>
                <span>200 - 300</span>
              </div>
              <div className="flex justify-between">
                <span>Tidak Terakreditasi:</span>
                <span>200</span>
              </div>
            </div>
          </div>
        </div>

        {/* Simulasi Peringkat */}
        <div className="mb-6 p-4 bg-white rounded-lg border border-blue-200">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium text-lg">
                Simulasi Peringkat Akreditasi:
              </h3>
              <p className="text-sm text-muted-foreground">
                Berdasarkan nilai akreditasi dan syarat yang terpenuhi
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

          {/* Status Summary */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-gray-50 rounded-md">
              <h5 className="text-xs font-medium text-gray-600 mb-1">
                Nilai Akreditasi
              </h5>
              <div className="flex items-center gap-2">
                <span className="font-semibold">
                  {nilaiAkreditasi.toFixed(2)}
                </span>
                {nilaiAkreditasi >= 200 ? (
                  <CheckCircle className="text-green-500 h-4 w-4" />
                ) : (
                  <XCircle className="text-red-500 h-4 w-4" />
                )}
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-md">
              <h5 className="text-xs font-medium text-gray-600 mb-1">
                Syarat Akreditasi
              </h5>
              <div className="flex items-center gap-2">
                <span className="font-semibold">
                  {semuaSyaratPerluAkreditasiTerpenuhi ? "Terpenuhi" : "Belum"}
                </span>
                {semuaSyaratPerluAkreditasiTerpenuhi ? (
                  <CheckCircle className="text-green-500 h-4 w-4" />
                ) : (
                  <XCircle className="text-red-500 h-4 w-4" />
                )}
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-md">
              <h5 className="text-xs font-medium text-gray-600 mb-1">
                Syarat Peringkat
              </h5>
              <div className="flex items-center gap-2">
                <span className="font-semibold">
                  {syaratPeringkatUnggulTerpenuhi
                    ? "Unggul"
                    : syaratPeringkatBaikSekaliTerpenuhi
                    ? "Baik Sekali"
                    : "Dasar"}
                </span>
                {syaratPeringkatUnggulTerpenuhi ||
                syaratPeringkatBaikSekaliTerpenuhi ? (
                  <CheckCircle className="text-green-500 h-4 w-4" />
                ) : (
                  <XCircle className="text-red-500 h-4 w-4" />
                )}
              </div>
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          Peringkat akhir ditentukan berdasarkan kombinasi nilai akreditasi dan
          pemenuhan syarat. Hasil ini dapat berbeda dengan status akreditasi
          resmi yang berlaku saat ini.
        </p>

        {/* Required Conditions Section */}
        <div className="w-full mb-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-medium">Syarat Perlu Terakreditasi</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Semua butir penilaian harus terpenuhi (skor ≥ 2,0) dan nilai
            akreditasi ≥ 200
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
            Butir penilaian untuk mendapatkan peringkat Unggul (nilai akreditasi
            ≥ 361)
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
            Butir penilaian untuk mendapatkan peringkat Baik Sekali (nilai
            akreditasi ≥ 301)
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
