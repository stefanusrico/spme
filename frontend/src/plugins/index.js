/**
 * Plugin Manager - Mendaftarkan semua plugin LKPS
 */
import { registerPlugin } from "./registry"

import DefaultSectionPlugin from "./defaultSectionPlugin"
import TridharmaPlugin from "./tridharmaPlugin"
import seleksiMahasiswaD3Plugin from "./seleksiMahasiswaD3Plugin"
import mahasiswaAsingPlugin from "./mahasiswaAsingPlugin"
import dosenTetapPerguruanTinggiPlugin from "./dosenTetapPerguruanTinggiPlugin"

import DosenPembimbingTugasAkhir from "./tabel-3a2-dosenPembimbingTugasAkhir"
import EkuivalenWaktuMengajarPenuhDosen from "./tabel-3a3-ekuivalenWaktuMengajarPenuh(EWMP)Dosen"
import DosenTidakTetap from "./tabel-3a4-dosenTidakTetap"
import DosenIndustriPraktisi from "./tabel-3a5-dosenIndustriPraktisi"

import PenelitianDtpsYangMelibatkanMahasiswa from "./plugin-tabel-6a-PenelitianDtpsYangMelibatkanMahasiswa"
import PkmDtpsYangMelibatkanMahasiswa from "./plugin-tabel-7-PkMDtpsYangMelibatkanMahasiswa"

import LuaranPenelitianPkmYangDihasilkanMahasiswaHKIPatenPatenSederhana from "./plugin-tabel-8f5-1-LuaranPenelitianPkMYangDihasilkanMahasiswa"
import LuaranPenelitianPkmYangDihasilkanMahasiswaHKIHakCiptaDesainProdukIndustriDll from "./plugin-tabel-8f5-2-LuaranPenelitianPkmYangDihasilkanMahasiswa"
import LuaranPenelitianPkmYangDihasilkanMahasiswaTeknologiTepatGunaProdukKaryaSeniRekayasaSosial from "./plugin-tabel-8f5-3-LuaranPenelitianPkMYangDihasilkanMahasiswa"
import LuaranPenelitianPkmYangDihasilkanMahasiswaBukuBerIsbnBookChapter from "./plugin-tabel-8f5-4-LuaranPenelitianPkMYangDihasilkanMahasiswa"

import PengakuanRekognisiDtps from "./tabel-3b1-pengakuanRekognisiDosen"
import PengakuanRekognisiDtpsPlugins from "./plugin-tabel-3b1-PengakuanRekognisiDosen"
import pengabdianKepadaMasyarakatDtpsPlugin from "./plugin-tabel-3b3-pengabdianKepadaMasyakatDtps"
import PenelitianDtps from "./tabel-3b2-penelitianDtps"
import PagelaranPameranPresentasiPublikasiIlmiahDTPSPlugin from "./plugin-tabel-3b5-pagelaranPameranPresentasiPublikasiIlmiahDtps"
import KaryaIlmiahDtpsYangDisitasi from "./plugin-tabel-3b6-karyaIlmiahDtpsYangDisitasi"
import ProdukJasaDtpsYangDiadopsiOlehIndustriMasyarakat from "./plugin-tabel-3b7-produkJasaDtpsYangDiadopsiOlehIndustriMasyarakat"
import LuaranPenelitianPkmLainnyaHKIPatenPatenSederhana from "./plugin-tabel-3b8-1-LuaranPenelitianPkmLainnyaHKIPatenPatenSederhana"
import LuaranPenelitianPkmLainnyaHKIHakCiptaDesainProdukIndustriDll from "./plugin-tabel-3b8-2-LuaranPenelitianPkmLainnyaHKIHakCiptaDesainProdukIndustriDll"
import LuaranPenelitianPkmLainnyaTeknologiTepatGunaProduk from "./plugin-tabel-3b8-3-LuaranPenelitianPkmLainnyaTeknologiCepatGunaProdukKaryaSeniRekayasaSosial"
import LuaranPenelitianPkmLainnyaBukuBerIsbnBookChapter from "./plugin-tabel-3b8-4-LuaranPenelitianPkmLainnyaBukuBerIsbnBookChapter"

import ipkLulusanPlugin from "./ipkLulusanPlugin"
import PrestasiAkademikMahasiswaPlugin from "./prestasiAkademikMahasiswaPlugin"
import kesesuaianBidangKerjaPlugin from "./kesesuaianBidangKerjaLulusanPlugin"
import PrestasiNonAkademikMahasiswaPlugin from "./prestasiNonAkademikMahasiswaPlugin"
import ProdukJasaYangDihasilkanMahasiswa from "./tabel-8f4-produkJasaYangDihasilkanMahasiswaPlugin"

import dataPrasaranaUPPSPlugin from "./dataPrasaranaUPPSPluggin"
import prasaranaDanPeralatanUtamaPlugin from "./prasaranaDanPeralatanUtamaPlugin"
import penggunaanDanaPlugin from "./penggunaanDanaPlugin"

const registerPlugins = () => {
  console.log("Registering LKPS plugins...")

  registerPlugin("default", DefaultSectionPlugin)

  registerPlugin("1-*", TridharmaPlugin)

  registerPlugin("2a2", seleksiMahasiswaD3Plugin)
  registerPlugin("2b", mahasiswaAsingPlugin)

  registerPlugin("3a1", dosenTetapPerguruanTinggiPlugin)
  registerPlugin("3a2", DosenPembimbingTugasAkhir)
  registerPlugin("3a3", EkuivalenWaktuMengajarPenuhDosen)
  registerPlugin("3a4", DosenTidakTetap)
  registerPlugin("3a5", DosenIndustriPraktisi)

  registerPlugin("3b1", PengakuanRekognisiDtpsPlugins)
  registerPlugin("3b2", PenelitianDtps)
  registerPlugin("3b3", pengabdianKepadaMasyarakatDtpsPlugin)
  registerPlugin("3b5", PagelaranPameranPresentasiPublikasiIlmiahDTPSPlugin)
  registerPlugin("3b6", KaryaIlmiahDtpsYangDisitasi)
  registerPlugin("3b7", ProdukJasaDtpsYangDiadopsiOlehIndustriMasyarakat)
  registerPlugin("3b8-1", LuaranPenelitianPkmLainnyaHKIPatenPatenSederhana)
  registerPlugin(
    "3b8-2",
    LuaranPenelitianPkmLainnyaHKIHakCiptaDesainProdukIndustriDll
  )
  registerPlugin("3b8-3", LuaranPenelitianPkmLainnyaTeknologiTepatGunaProduk)
  registerPlugin("3b8-4", LuaranPenelitianPkmLainnyaBukuBerIsbnBookChapter)

  registerPlugin("4a", penggunaanDanaPlugin)
  registerPlugin("4b", prasaranaDanPeralatanUtamaPlugin)
  registerPlugin("4c", dataPrasaranaUPPSPlugin)

  registerPlugin("6a", PenelitianDtpsYangMelibatkanMahasiswa)
  registerPlugin("7", PkmDtpsYangMelibatkanMahasiswa)

  registerPlugin("8a", ipkLulusanPlugin)
  registerPlugin("8b1", PrestasiAkademikMahasiswaPlugin)
  registerPlugin("8b2", PrestasiNonAkademikMahasiswaPlugin)
  registerPlugin("8d1", waktuTungguLulusanPlugin)
  registerPlugin("8d2", kesesuaianBidangKerjaPlugin)
  registerPlugin("8f4", ProdukJasaYangDihasilkanMahasiswa)
  registerPlugin("8f5-1", LuaranPenelitianPkmYangDihasilkanMahasiswaHKIPatenPatenSederhana)
  registerPlugin("8f5-2", LuaranPenelitianPkmYangDihasilkanMahasiswaHKIHakCiptaDesainProdukIndustriDll)
  registerPlugin("8f5-3", LuaranPenelitianPkmYangDihasilkanMahasiswaTeknologiTepatGunaProdukKaryaSeniRekayasaSosial)
  registerPlugin("8f5-4", LuaranPenelitianPkmYangDihasilkanMahasiswaBukuBerIsbnBookChapter)
  
  console.log("All LKPS plugins registered successfully")
}

export default registerPlugins
