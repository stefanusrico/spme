/**
 * Plugin Manager - Mendaftarkan semua plugin LKPS
 */
import { registerPlugin } from "./registry"

import DefaultSectionPlugin from "./defaultSectionPlugin"
import TridharmaPlugin from "./plugin-tabel-1-tridharmaPlugin"
import seleksiMahasiswaD3Plugin from "./plugin-tabel-2a2-seleksiMahasiswaD3Plugin"
import mahasiswaAsingPlugin from "./plugin-tabel-2b-mahasiswaAsingPlugin"
import dosenTetapPerguruanTinggiPlugin from "./plugin-tabel-3a1-dosenTetapPerguruanTinggiPlugin"
import ipkLulusanPlugin from "./plugin-tabel-8a-ipkLulusanPlugin"
import PrestasiAkademikMahasiswaPlugin from "./plugin-tabel-8b1-prestasiAkademikMahasiswaPlugin"
import kesesuaianBidangKerjaPlugin from "./plugin-tabel-8d2-kesesuaianBidangKerjaLulusanPlugin"
import PrestasiNonAkademikMahasiswaPlugin from "./plugin-tabel-8b2-prestasiNonAkademikMahasiswaPlugin"
import ProdukJasaYangDihasilkanMahasiswa from "./plugin-tabel-8f4-produkJasaYangDihasilkanMahasiswaPlugin"
import waktuTungguLulusanPlugin from "./plugin-tabel-8d1-waktuTungguLulusanPlugin"
import dataPrasaranaUPPSPlugin from "./plugin-tabel-4c-dataPrasaranaUPPSPluggin"
import prasaranaDanPeralatanUtamaPlugin from "./plugin-tabel-4b-prasaranaDanPeralatanUtamaPlugin"
import penggunaanDanaPlugin from "./plugin-tabel-4a-penggunaanDana"
import kurikulumCapaianRencanaPlugin from "./plugin-tabel-5a1-kurikulumCapaianRencanaPlugin"
import kepuasanMahasiswaPlugin from "./plugin-tabel-5d-kepuasanMahasiswaPlugin"
import integrasiKegiatanPenelitianPlugin from "./plugin-tabel-5c-integrasiKegiatanPenelitianPlugin"
import dataPelaksanaanKegiatanMBKMPlugin from "./plugin-tabel-5b3-dataPelaksanaanKegiatanMBKMPlugin"
import { re } from "mathjs"

import bebanTotalPaket20SKSPlugin from "./plugin-tabel-5b1-bebanTotalPaket20SKSPlugin"
import bebanTotalPaket40SKSPlugin from "./plugin-tabel-5b2-bebanTotalPaket40SKSPlugin"
import capstoneDesignProsesPembelajaranPlugin from "./plugin-tabel-5a4-capstoneDesignProsesPembelajaranPlugin"
import mataKuliahBasicSciencePlugin from "./plugin-tabel-5a3-mataKuliahBasicSciencePlugin"
import DosenPembimbingTugasAkhir from "./plugin-tabel-3a2-dosenPembimbingTugasAkhir"
import EkuivalenWaktuMengajarPenuhDosen from "./plugin-tabel-3a3-ekuivalenWaktuMengajarPenuh(EWMP)Dosen"
import DosenTidakTetap from "./plugin-tabel-3a4-dosenTidakTetap"
import DosenIndustriPraktisi from "./plugin-tabel-3a5-dosenIndustriPraktisi"
import PengakuanRekognisiDtpsPlugins from "./plugin-tabel-3b1-PengakuanRekognisiDosen"
import PenelitianDtps from "./plugin-tabel-3b2-penelitianDtps"
import PengabdianKepadaMasyarakatDtpsPlugin from "./plugin-tabel-3b3-pengabdianKepadaMasyakatDtps"
import PagelaranPameranPresentasiPublikasiIlmiahDTPSPlugin from "./plugin-tabel-3b5-pagelaranPameranPresentasiPublikasiIlmiahDtps"
import KaryaIlmiahDtpsYangDisitasi from "./plugin-tabel-3b6-karyaIlmiahDtpsYangDisitasi"
import ProdukJasaDtpsYangDiadopsiOlehIndustriMasyarakat from "./plugin-tabel-3b7-produkJasaDtpsYangDiadopsiOlehIndustriMasyarakat"
import LuaranPenelitianPkmLainnyaHKIPatenPatenSederhana from "./plugin-tabel-3b8-1-LuaranPenelitianPkmLainnyaHKIPatenPatenSederhana"
import LuaranPenelitianPkmLainnyaHKIHakCiptaDesainProdukIndustriDll from "./plugin-tabel-3b8-2-LuaranPenelitianPkmLainnyaHKIHakCiptaDesainProdukIndustriDll"
import LuaranPenelitianPkmLainnyaTeknologiTepatGunaProduk from "./plugin-tabel-3b8-3-LuaranPenelitianPkmLainnyaTeknologiCepatGunaProdukKaryaSeniRekayasaSosial"
import LuaranPenelitianPkmLainnyaBukuBerIsbnBookChapter from "./plugin-tabel-3b8-4-LuaranPenelitianPkmLainnyaBukuBerIsbnBookChapter"
import PenelitianDtpsYangMelibatkanMahasiswa from "./plugin-tabel-6a-PenelitianDtpsYangMelibatkanMahasiswa"
import PkmDtpsYangMelibatkanMahasiswa from "./plugin-tabel-7-PkMDtpsYangMelibatkanMahasiswa"
import LulusanTerlacakPlugin from "./plugin-tabel-8e1-tempatKerjaLulusan"
import KepuasanPenggunaLulusanPlugin from "./plugin-tabel-8e2-kepuasanPenggunaLulusan"
import LuaranPenelitianPkmYangDihasilkanMahasiswaHKIPatenPatenSederhana from "./plugin-tabel-8f5-1-LuaranPenelitianPkMYangDihasilkanMahasiswa"
import LuaranPenelitianPkmYangDihasilkanMahasiswaHKIHakCiptaDesainProdukIndustriDll from "./plugin-tabel-8f5-2-LuaranPenelitianPkmYangDihasilkanMahasiswa"
import LuaranPenelitianPkmYangDihasilkanMahasiswaTeknologiTepatGunaProdukKaryaSeniRekayasaSosial from "./plugin-tabel-8f5-3-LuaranPenelitianPkMYangDihasilkanMahasiswa"
import LuaranPenelitianPkmYangDihasilkanMahasiswaBukuBerIsbnBookChapter from "./plugin-tabel-8f5-4-LuaranPenelitianPkMYangDihasilkanMahasiswa"
import evaluasiDanPengendalianPlugin from "./plugin-tabel-9a-evaluasiDanPengendalianPlugin"
import ketersediaanDokumenPlugin from "./plugin-tabel-9b-ketersediaanDokumenPlugin"

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
  registerPlugin("3b3", PengabdianKepadaMasyarakatDtpsPlugin)
  registerPlugin("3b4", )
  registerPlugin("3b5", PagelaranPameranPresentasiPublikasiIlmiahDTPSPlugin)
  registerPlugin("3b6", KaryaIlmiahDtpsYangDisitasi)
  registerPlugin("3b7", ProdukJasaDtpsYangDiadopsiOlehIndustriMasyarakat)
  registerPlugin("3b8-1", LuaranPenelitianPkmLainnyaHKIPatenPatenSederhana)
  registerPlugin("3b8-2", LuaranPenelitianPkmLainnyaHKIHakCiptaDesainProdukIndustriDll )
  registerPlugin("3b8-3", LuaranPenelitianPkmLainnyaTeknologiTepatGunaProduk)
  registerPlugin("3b8-4", LuaranPenelitianPkmLainnyaBukuBerIsbnBookChapter)

  registerPlugin("4a", penggunaanDanaPlugin)
  registerPlugin("4b", prasaranaDanPeralatanUtamaPlugin)
  registerPlugin("4c", dataPrasaranaUPPSPlugin)

  registerPlugin("5a1", kurikulumCapaianRencanaPlugin)
  registerPlugin("5a3", mataKuliahBasicSciencePlugin)
  registerPlugin("5a4", capstoneDesignProsesPembelajaranPlugin)
  registerPlugin("5b1", bebanTotalPaket20SKSPlugin)
  registerPlugin("5b2", bebanTotalPaket40SKSPlugin)
  registerPlugin("5b3", dataPelaksanaanKegiatanMBKMPlugin)
  registerPlugin("5c", integrasiKegiatanPenelitianPlugin)
  registerPlugin("5d", kepuasanMahasiswaPlugin)

  registerPlugin("6a", PenelitianDtpsYangMelibatkanMahasiswa)
  registerPlugin("7", PkmDtpsYangMelibatkanMahasiswa)

  registerPlugin("8a", ipkLulusanPlugin)
  registerPlugin("8b1", PrestasiAkademikMahasiswaPlugin)
  registerPlugin("8b2", PrestasiNonAkademikMahasiswaPlugin)
  registerPlugin("8d1", waktuTungguLulusanPlugin) 
  registerPlugin("8d2", kesesuaianBidangKerjaPlugin)
  registerPlugin("8e1", LulusanTerlacakPlugin)
  registerPlugin("8e2", KepuasanPenggunaLulusanPlugin)
  registerPlugin("8f4", ProdukJasaYangDihasilkanMahasiswa)
  registerPlugin("8f5-1", LuaranPenelitianPkmYangDihasilkanMahasiswaHKIPatenPatenSederhana)
  registerPlugin("8f5-2", LuaranPenelitianPkmYangDihasilkanMahasiswaHKIHakCiptaDesainProdukIndustriDll)
  registerPlugin("8f5-3", LuaranPenelitianPkmYangDihasilkanMahasiswaTeknologiTepatGunaProdukKaryaSeniRekayasaSosial)
  registerPlugin("8f5-4", LuaranPenelitianPkmYangDihasilkanMahasiswaBukuBerIsbnBookChapter)

  registerPlugin("9a", evaluasiDanPengendalianPlugin)
  registerPlugin("9a", ketersediaanDokumenPlugin)

  console.log("All LKPS plugins registered successfully")
}

export default registerPlugins
