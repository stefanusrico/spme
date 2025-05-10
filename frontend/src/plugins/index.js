/**
 * Plugin Manager - Mendaftarkan semua plugin LKPS
 */
import { registerPlugin } from "./registry"

import DefaultSectionPlugin from "./defaultSectionPlugin"
import TridharmaPlugin from "./tridharmaPlugin"
import seleksiMahasiswaD3Plugin from "./seleksiMahasiswaD3Plugin"
import mahasiswaAsingPlugin from "./mahasiswaAsingPlugin"
import dosenTetapPerguruanTinggiPlugin from "./dosenTetapPerguruanTinggiPlugin"
import ipkLulusanPlugin from "./ipkLulusanPlugin"
import PrestasiAkademikMahasiswaPlugin from "./prestasiAkademikMahasiswaPlugin"
import kesesuaianBidangKerjaPlugin from "./kesesuaianBidangKerjaLulusanPlugin"
import PrestasiNonAkademikMahasiswaPlugin from "./prestasiNonAkademikMahasiswaPlugin"
import ProdukJasaYangDihasilkanMahasiswa from "./tabel-8f4-produkJasaYangDihasilkanMahasiswaPlugin"
import waktuTungguLulusanPlugin from "./waktuTungguLulusanPlugin"
import dataPrasaranaUPPSPlugin from "./dataPrasaranaUPPSPluggin"
import prasaranaDanPeralatanUtamaPlugin from "./prasaranaDanPeralatanUtamaPlugin"
import penggunaanDanaPlugin from "./penggunaanDanaPlugin"
import kurikulumCapaianRencanaPlugin from "./kurikulumCapaianRencanaPlugin"
import kepuasanMahasiswaPlugin from "./kepuasanMahasiswaPlugin"
import integrasiKegiatanPenelitianPlugin from "./integrasiKegiatanPenelitianPlugin"
import dataPelaksanaanKegiatanMBKMPlugin from "./dataPelaksanaanKegiatanMBKMPlugin"
import { re } from "mathjs"
import bebanTotalPaketPlugin from "./bebanTotalPaket40SKSPlugin"
import bebanTotalPaketPlugin40SKS from "./bebanTotalPaket40SKSPlugin"
import bebanTotalPaket20SKS from "./bebanTotalPaket20SKSPlugin"
import bebanTotalPaket20SKSPlugin from "./bebanTotalPaket20SKSPlugin"
import bebanTotalPaket40SKSPlugin from "./bebanTotalPaket40SKSPlugin"
import capstoneDesignProsesPembelajaranPlugin from "./capstoneDesignProsesPembelajaranPlugin"
import mataKuliahBasicSciencePlugin from "./mataKuliahBasicSciencePlugin"

const registerPlugins = () => {
  console.log("Registering LKPS plugins...")

  registerPlugin("default", DefaultSectionPlugin)

  registerPlugin("1-*", TridharmaPlugin)

  registerPlugin("2a2", seleksiMahasiswaD3Plugin)
  registerPlugin("2b", mahasiswaAsingPlugin)

  registerPlugin("3a1", dosenTetapPerguruanTinggiPlugin)

  registerPlugin("4a", penggunaanDanaPlugin)
  registerPlugin("4b", prasaranaDanPeralatanUtamaPlugin)
  registerPlugin("4c", dataPrasaranaUPPSPlugin)

  registerPlugin("5a1", kurikulumCapaianRencanaPlugin)
  
  registerPlugin("5a3", mataKuliahBasicSciencePlugin)
  registerPlugin("5a4", capstoneDesignProsesPembelajaranPlugin)
  registerPlugin("5b1", bebanTotalPaket20SKSPlugin)
  registerPlugin("5b2", bebanTotalPaket40SKSPlugin)
  registerPlugin("5b3", dataPelaksanaanKegiatanMBKMPlugin)
  registerPlugin("54a", capstoneDesignProsesPembelajaranPlugin)
  registerPlugin("5c", integrasiKegiatanPenelitianPlugin)
  registerPlugin("5d", kepuasanMahasiswaPlugin)

  registerPlugin("8a", ipkLulusanPlugin)
  registerPlugin("8b1", PrestasiAkademikMahasiswaPlugin)
  registerPlugin("8b2", PrestasiNonAkademikMahasiswaPlugin)
  registerPlugin("8d1", waktuTungguLulusanPlugin) 
  registerPlugin("8d2", kesesuaianBidangKerjaPlugin)
  registerPlugin("8f4", ProdukJasaYangDihasilkanMahasiswa)

  console.log("All LKPS plugins registered successfully")
}

export default registerPlugins
