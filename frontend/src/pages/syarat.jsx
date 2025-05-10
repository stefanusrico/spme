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
import { useUser } from "../context/UserContext"
import { LoadingScreen } from "./LoadingSpinner"
import axiosInstance from "../utils/axiosConfig"

const SKOR_YANG_DIPERLUKAN = [
  {
    section_code: "3a1",
    butir: "15",
    tipe: "syaratPerluAkreditasi",
    kunci: "jabatanAkademikDTPS",
    deskripsi: "Jabatan Akademik DTPS",
    juga_untuk_unggul: true,
    syaratUnggul: 3.5,
    syaratBaikSekali: 3.0,
  },
  //butir LED
  {
    section_code: "3a1",
    butir: "38",
    tipe: "syaratPerluAkreditasi",
    kunci: "kurikulum",
    deskripsi: "Kurikulum",
  },
  {
    section_code: "8d1",
    butir: "59",
    tipe: "syaratPeringkatUnggul",
    kunci: "waktuTunggu",
    deskripsi: "Waktu Tunggu",
    syaratUnggul: 3.5,
    syaratBaikSekali: 3.0,
  },
  {
    section_code: "8d2",
    butir: "60",
    tipe: "syaratPeringkatUnggul",
    kunci: "kesesuaianBidang",
    deskripsi: "Kesesuaian Bidang Kerja",
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
  },
  syaratPeringkatUnggul: {
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
  },
  syaratPeringkatBaikSekali: {
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

  // Fungsi untuk memetakan peringkat akreditasi
  const petakanPeringkat = (peringkat) => {
    const petaPeringkat = {
      Unggul: "Unggul",
      "Baik Sekali": "Baik Sekali",
      Baik: "Baik",
    }
    return petaPeringkat[peringkat] || peringkat || "Tidak Terakreditasi"
  }

  // Fungsi untuk mengambil skor butir dari API dengan penanganan error yang lebih baik
  const ambilSkorButir = async (section_code, butir) => {
    try {
      console.log(`Fetching score for section ${section_code}, butir ${butir}`)
      const response = await axiosInstance.get("/lkps/score/butir", {
        params: { section_code, butir },
      })

      if (response.data && response.data.nilai !== undefined) {
        console.log(
          `Received score for section ${section_code}, butir ${butir}:`,
          response.data.nilai
        )
        return response.data
      } else {
        console.warn(
          `No score data found for section ${section_code}, butir ${butir}`
        )
        return null
      }
    } catch (error) {
      console.error(
        `Error fetching score for section ${section_code}, butir ${butir}:`,
        error
      )
      return null
    }
  }

  // Mengambil data skor saat komponen dimuat - kode ini diperbaiki untuk menghindari duplikasi permintaan API
  useEffect(() => {
    const ambilSemuaSkor = async () => {
      if (isLoading) return // Tunggu userData selesai dimuat

      setSedangMemuatSkor(true)
      setError(null)

      try {
        // Buat data program baru berdasarkan template
        const dataProgramBaru = JSON.parse(JSON.stringify(dataProgramAwal))

        // Ciptakan objek untuk menyimpan hasil API agar tidak memanggil API yang sama berulang kali
        const hasilAPI = {}

        // Dapatkan semua skor yang diperlukan
        for (const konfigurasiSkor of SKOR_YANG_DIPERLUKAN) {
          // Buat kunci unik untuk setiap kombinasi section_code dan butir
          const kunciAPI = `${konfigurasiSkor.section_code}-${konfigurasiSkor.butir}`

          // Cek apakah sudah ada hasil untuk kombinasi ini
          if (!hasilAPI[kunciAPI]) {
            // Jika belum, panggil API dan simpan hasilnya
            const dataSkor = await ambilSkorButir(
              konfigurasiSkor.section_code,
              konfigurasiSkor.butir
            )
            hasilAPI[kunciAPI] = dataSkor
          }

          // Ambil hasil API dari cache
          const dataSkor = hasilAPI[kunciAPI]

          if (dataSkor && dataSkor.nilai !== undefined) {
            const skor = parseFloat(dataSkor.nilai)

            // Update data program sesuai dengan tipe
            if (konfigurasiSkor.tipe === "syaratPerluAkreditasi") {
              // Syarat perlu akreditasi
              if (
                dataProgramBaru.syaratPerluAkreditasi[konfigurasiSkor.kunci]
              ) {
                dataProgramBaru.syaratPerluAkreditasi[
                  konfigurasiSkor.kunci
                ].skor = skor
                dataProgramBaru.syaratPerluAkreditasi[
                  konfigurasiSkor.kunci
                ].lulus = skor >= 2.0
                dataProgramBaru.syaratPerluAkreditasi[
                  konfigurasiSkor.kunci
                ].deskripsi = konfigurasiSkor.deskripsi
              }

              // Jika juga digunakan untuk peringkat Unggul dan Baik Sekali
              if (
                konfigurasiSkor.juga_untuk_unggul &&
                dataProgramBaru.syaratPeringkatUnggul[konfigurasiSkor.kunci]
              ) {
                // Syarat peringkat Unggul
                dataProgramBaru.syaratPeringkatUnggul[
                  konfigurasiSkor.kunci
                ].skor = skor
                dataProgramBaru.syaratPeringkatUnggul[
                  konfigurasiSkor.kunci
                ].syarat = konfigurasiSkor.syaratUnggul
                dataProgramBaru.syaratPeringkatUnggul[
                  konfigurasiSkor.kunci
                ].lulus = skor >= konfigurasiSkor.syaratUnggul
                dataProgramBaru.syaratPeringkatUnggul[
                  konfigurasiSkor.kunci
                ].deskripsi = konfigurasiSkor.deskripsi

                // Syarat peringkat Baik Sekali
                dataProgramBaru.syaratPeringkatBaikSekali[
                  konfigurasiSkor.kunci
                ].skor = skor
                dataProgramBaru.syaratPeringkatBaikSekali[
                  konfigurasiSkor.kunci
                ].syarat = konfigurasiSkor.syaratBaikSekali
                dataProgramBaru.syaratPeringkatBaikSekali[
                  konfigurasiSkor.kunci
                ].lulus = skor >= konfigurasiSkor.syaratBaikSekali
                dataProgramBaru.syaratPeringkatBaikSekali[
                  konfigurasiSkor.kunci
                ].deskripsi = konfigurasiSkor.deskripsi
              }
            } else if (konfigurasiSkor.tipe === "syaratPeringkatUnggul") {
              // Syarat peringkat Unggul
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
                dataProgramBaru.syaratPeringkatUnggul[
                  konfigurasiSkor.kunci
                ].deskripsi = konfigurasiSkor.deskripsi
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
                dataProgramBaru.syaratPeringkatBaikSekali[
                  konfigurasiSkor.kunci
                ].deskripsi = konfigurasiSkor.deskripsi
              }
            }
          }
        }

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
  }, [isLoading])

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

  // Menggunakan data dari user untuk informasi program studi
  const dataProdi = userData?.prodi || null
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
          <h2 className="text-lg font-medium">
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
                      <TableCell>{item.deskripsi}</TableCell>
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
            Butir penilaian untuk mendapatkan peringkat Unggul
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
                      <TableCell>{item.deskripsi}</TableCell>
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
                      <TableCell>{item.deskripsi}</TableCell>
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
