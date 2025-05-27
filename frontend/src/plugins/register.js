import { pluginRegistry } from "./core/PluginRegistry.js"
import { DefaultSectionPlugin } from "./defaultSectionPlugin.js"

import { TridharmaPlugin } from "./kriteria/kerjasama/plugin-tabel-kerjasama"

import { SeleksiMahasiswaPlugin } from "./kriteria/mahasiswa/plugin-tabel-2a1-seleksiMahasiswa.js"
import { MahasiswaAsingPlugin } from "./kriteria/mahasiswa/plugin-tabel-2b-mahasiswaAsingPlugin.js"

import { DosenTetapPlugin } from "./kriteria/sumberdayamanusia/plugin-tabel-3a1-dosenTetapPerguruanTinggiPlugin.js"
import { DosenPembimbingTugasAkhirPlugin } from "./kriteria/sumberdayamanusia/plugin-tabel-3a2-dosenPembimbingTugasAkhir.js"
import { EkuivalenWaktuMengajarPenuhDosenPlugin } from "./kriteria/sumberdayamanusia/plugin-tabel-3a3-ekuivalenWaktuMengajarPenuh(EWMP)Dosen.js"
import { DosenTidakTetapPlugin } from "./kriteria/sumberdayamanusia/plugin-tabel-3a4-dosenTidakTetap.js"
import { DosenIndustriPraktisiPlugin } from "./kriteria/sumberdayamanusia/plugin-tabel-3a5-dosenIndustriPraktisi.js"
import { PengakuanRekognisiDtpsPlugin } from "./kriteria/sumberdayamanusia/plugin-tabel-3b1-PengakuanRekognisiDosen.js"
import { PenelitianDtpsPlugin } from "./kriteria/sumberdayamanusia/plugin-tabel-3b2-penelitianDtps.js"
import { PengabdianKepadaMasyarakatDtpsPlugin } from "./kriteria/sumberdayamanusia/plugin-tabel-3b3-pengabdianKepadaMasyakatDtps.js"
import { PagelaranPameranPresentasiPublikasiIlmiahDTPSPlugin } from "./kriteria/sumberdayamanusia/plugin-tabel-3b5-pagelaranPameranPresentasiPublikasiIlmiahDtps.js"
import { KaryaIlmiahDtpsYangDisitasiPlugin } from "./kriteria/sumberdayamanusia/plugin-tabel-3b6-karyaIlmiahDtpsYangDisitasi.js"
import { ProdukJasaDtpsYangDiadopsiOlehIndustriMasyarakatPlugin } from "./kriteria/sumberdayamanusia/plugin-tabel-3b7-produkJasaDtpsYangDiadopsiOlehIndustriMasyarakat.js"
import { LuaranPenelitianPkmLainnyaHKIPatenPatenSederhanPlugin } from "./kriteria/sumberdayamanusia/plugin-tabel-3b8-1-LuaranPenelitianPkmLainnyaHKIPatenPatenSederhana.js"
import { LuaranPenelitianPkmLainnyaHKIHakCiptaPlugin } from "./kriteria/sumberdayamanusia/plugin-tabel-3b8-2-LuaranPenelitianPkmLainnyaHKIHakCiptaDesainProdukIndustriDll"
import { LuaranPenelitianPkmLainnyaTeknologiTepatGunaPlugin } from "./kriteria/sumberdayamanusia/plugin-tabel-3b8-3-LuaranPenelitianPkmLainnyaTeknologiCepatGunaProdukKaryaSeniRekayasaSosial"
import { LuaranPenelitianPkmLainnyaBukuBerIsbnPlugin } from "./kriteria/sumberdayamanusia/plugin-tabel-3b8-4-LuaranPenelitianPkmLainnyaBukuBerIsbnBookChapter"

import { PenggunaanDanaPlugin } from "./kriteria/keuangansaranaprasarana/plugin-tabel-4a-penggunaanDana.js"
import { PrasaranaDanPeralatanUtamaPlugin } from "./kriteria/keuangansaranaprasarana/plugin-tabel-4b-prasaranaDanPeralatanUtamaPlugin.js"
import { DataPrasaranaUPPSPlugin } from "./kriteria/keuangansaranaprasarana/plugin-tabel-4c-dataPrasaranaUPPSPluggin.js"

import { KurikulumCapaianRencanaPlugin } from "./kriteria/pendidikan/plugin-tabel-5a1-kurikulumCapaianRencanaPlugin.js"
import { PembimbinganTugasAkhirPlugin } from "./kriteria/pendidikan/plugin-tabel-5a2-pembimbinganTugasAkhirPlugin.js"
import { MataKuliahBasicSciencePlugin } from "./kriteria/pendidikan/plugin-tabel-5a3-mataKuliahBasicSciencePlugin.js"
import { CapstoneDesignProsesPembelajaranPlugin } from "./kriteria/pendidikan/plugin-tabel-5a4-capstoneDesignProsesPembelajaranPlugin.js"
import { BebanTotalPaket20SKSPlugin } from "./kriteria/pendidikan/plugin-tabel-5b1-bebanTotalPaket20SKSPlugin.js"
import { BebanTotalPaket40SKSPlugin } from "./kriteria/pendidikan/plugin-tabel-5b2-bebanTotalPaket40SKSPlugin.js"
import { DataPelaksanaanKegiatanMBKMPlugin } from "./kriteria/pendidikan/plugin-tabel-5b3-dataPelaksanaanKegiatanMBKMPlugin.js"
import { IntegrasiKegiatanPenelitianPlugin } from "./kriteria/pendidikan/plugin-tabel-5c-integrasiKegiatanPenelitianPlugin"
import { KepuasanMahasiswaPlugin } from "./kriteria/pendidikan/plugin-tabel-5d-kepuasanMahasiswaPlugin"

import { PenelitianDtpsYangMelibatkanMahasiswaPlugin } from "./kriteria/penelitian/plugin-tabel-6a-PenelitianDtpsYangMelibatkanMahasiswa.js"

import { PkmDtpsYangMelibatkanMahasiswaPlugin } from "./kriteria/pkm/plugin-tabel-7-PkMDtpsYangMelibatkanMahasiswa.js"

import { IpkLulusanPlugin } from "./kriteria/luarandancapaian/plugin-tabel-8a-ipkLulusanPlugin.js"
import { PrestasiAkademikMahasiswaPlugin } from "./kriteria/luarandancapaian/plugin-tabel-8b1-prestasiAkademikMahasiswaPlugin.js"
import { PrestasiNonAkademikMahasiswaPlugin } from "./kriteria/luarandancapaian/plugin-tabel-8b2-prestasiNonAkademikMahasiswaPlugin.js"
import { MasaStudiLulusanPlugin } from "./kriteria/luarandancapaian/plugin-tabel-8c-masaStudiLulusanPlugin.js"
import { WaktuTungguLulusanPlugin } from "./kriteria/luarandancapaian/plugin-tabel-8d1-waktuTungguLulusanPlugin.js"
import { KesesuaianBidangKerjaPlugin } from "./kriteria/luarandancapaian/plugin-tabel-8d2-kesesuaianBidangKerjaLulusanPlugin.js"
import { LulusanTerlacakPlugin } from "./kriteria/luarandancapaian/plugin-tabel-8e1-tempatKerjaLulusan.js"
import { KepuasanPenggunaLulusanPlugin } from "./kriteria/luarandancapaian/plugin-tabel-8e2-kepuasanPenggunaLulusan.js"
import { PagelaranPameranPlugin } from "./kriteria/luarandancapaian/plugin-tabel-8f2-pagelaranPameranPlugin.js"
import { ProdukJasaYangDihasilkanMahasiswaPlugin } from "./kriteria/luarandancapaian/plugin-tabel-8f4-produkJasaYangDihasilkanMahasiswaPlugin.js"
import { LuaranPenelitianPkmYangDihasilkanMahasiswaHKIPatenPlugin } from "./kriteria/luarandancapaian/plugin-tabel-8f5-1-LuaranPenelitianPkMYangDihasilkanMahasiswa.js"
import { LuaranPenelitianPkmYangDihasilkanMahasiswaHKIHakCiptaPlugin } from "./kriteria/luarandancapaian/plugin-tabel-8f5-2-LuaranPenelitianPkmYangDihasilkanMahasiswa.js"
import { LuaranPenelitianPkmYangDihasilkanMahasiswaTeknologiPlugin } from "./kriteria/luarandancapaian/plugin-tabel-8f5-3-LuaranPenelitianPkMYangDihasilkanMahasiswa.js"
import { LuaranPenelitianPkmYangDihasilkanMahasiswaBukuPlugin } from "./kriteria/luarandancapaian/plugin-tabel-8f5-4-LuaranPenelitianPkMYangDihasilkanMahasiswa.js"

import { EvaluasiDanPengendalianPlugin } from "./kriteria/penjaminanmutu/plugin-tabel-9a-evaluasiDanPengendalianPlugin.js"
import { KetersediaanDokumenPlugin } from "./kriteria/penjaminanmutu/plugin-tabel-9b-ketersediaanDokumenPlugin"

export function registerAllPlugins() {
  console.log("Registering LKPS plugins...")

  try {
    // Default and existing plugins
    const defaultPlugin = new DefaultSectionPlugin()

    // kerjasama
    const tridharmaPlugin = new TridharmaPlugin()

    // seleksimahasiswa
    const seleksiMahasiswaPlugin = new SeleksiMahasiswaPlugin()
    const mahasiswaAsingPlugin = new MahasiswaAsingPlugin()

    // Dosen plugins (3a)
    const dosenTetapPlugin = new DosenTetapPlugin()
    const dosenPembimbingTugasAkhir = new DosenPembimbingTugasAkhirPlugin()
    const ewmpDosenPlugin = new EkuivalenWaktuMengajarPenuhDosenPlugin()
    const dosenTidakTetapPlugin = new DosenTidakTetapPlugin()
    const dosenIndustriPlugin = new DosenIndustriPraktisiPlugin()

    // Dosen plugins (3b)
    const pengakuanRekognisiDtpsPlugin = new PengakuanRekognisiDtpsPlugin()
    const penelitianDtpsPlugin = new PenelitianDtpsPlugin()
    const pengabdianKepadaMasyarakatDtpsPlugin =
      new PengabdianKepadaMasyarakatDtpsPlugin()
    const pagelaranPameranPresentasiPublikasiIlmiahDTPSPlugin =
      new PagelaranPameranPresentasiPublikasiIlmiahDTPSPlugin()
    const karyaIlmiahDtpsYangDisitasiPlugin =
      new KaryaIlmiahDtpsYangDisitasiPlugin()
    const produkJasaDtpsYangDiadopsiOlehIndustriMasyarakatPlugin =
      new ProdukJasaDtpsYangDiadopsiOlehIndustriMasyarakatPlugin()

    // HKI dan luaran plugins (3b8)
    const luaranPenelitianPkmLainnyaHKIPatenPatenSederhanPlugin =
      new LuaranPenelitianPkmLainnyaHKIPatenPatenSederhanPlugin()
    const luaranPenelitianPkmLainnyaHKIHakCiptaPlugin =
      new LuaranPenelitianPkmLainnyaHKIHakCiptaPlugin()
    const luaranPenelitianPkmLainnyaTeknologiTepatGunaPlugin =
      new LuaranPenelitianPkmLainnyaTeknologiTepatGunaPlugin()
    const luaranPenelitianPkmLainnyaBukuBerIsbnPlugin =
      new LuaranPenelitianPkmLainnyaBukuBerIsbnPlugin()

    // Keuangan dan sarana prasarana plugins (4)
    const penggunaanDanaPlugin = new PenggunaanDanaPlugin()
    const prasaranaDanPeralatanUtamaPlugin =
      new PrasaranaDanPeralatanUtamaPlugin()
    const dataPrasaranaUPPSPlugin = new DataPrasaranaUPPSPlugin()

    // Pendidikan plugins (5)
    const kurikulumCapaianRencanaPlugin = new KurikulumCapaianRencanaPlugin()
    const pembimbinganTugasAkhirPlugin = new PembimbinganTugasAkhirPlugin()
    const mataKuliahBasicSciencePlugin = new MataKuliahBasicSciencePlugin()
    const capstoneDesignProsesPembelajaranPlugin =
      new CapstoneDesignProsesPembelajaranPlugin()
    const bebanTotalPaket20SKSPlugin = new BebanTotalPaket20SKSPlugin()
    const bebanTotalPaket40SKSPlugin = new BebanTotalPaket40SKSPlugin()
    const dataPelaksanaanKegiatanMBKMPlugin =
      new DataPelaksanaanKegiatanMBKMPlugin()
    const integrasiKegiatanPenelitianPlugin =
      new IntegrasiKegiatanPenelitianPlugin()
    const kepuasanMahasiswaPlugin = new KepuasanMahasiswaPlugin()

    // Penelitian plugins (6)
    const penelitianDtpsYangMelibatkanMahasiswaPlugin =
      new PenelitianDtpsYangMelibatkanMahasiswaPlugin()

    // PKM plugins (7)
    const pkmDtpsYangMelibatkanMahasiswaPlugin =
      new PkmDtpsYangMelibatkanMahasiswaPlugin()

    // Luaran dan capaian plugins (8)
    const ipkLulusanPlugin = new IpkLulusanPlugin()
    const prestasiAkademikMahasiswaPlugin =
      new PrestasiAkademikMahasiswaPlugin()
    const prestasiNonAkademikMahasiswaPlugin =
      new PrestasiNonAkademikMahasiswaPlugin()
    const masaStudiLulusanPlugin = new MasaStudiLulusanPlugin()
    const waktuTungguLulusanPlugin = new WaktuTungguLulusanPlugin()
    const kesesuaianBidangKerjaPlugin = new KesesuaianBidangKerjaPlugin()
    const lulusanTerlacakPlugin = new LulusanTerlacakPlugin()
    const kepuasanPenggunaLulusanPlugin = new KepuasanPenggunaLulusanPlugin()
    const pagelaranPameranPlugin = new PagelaranPameranPlugin()
    const produkJasaYangDihasilkanMahasiswaPlugin =
      new ProdukJasaYangDihasilkanMahasiswaPlugin()
    const luaranPenelitianPkmYangDihasilkanMahasiswaHKIPatenPlugin =
      new LuaranPenelitianPkmYangDihasilkanMahasiswaHKIPatenPlugin()
    const luaranPenelitianPkmYangDihasilkanMahasiswaHKIHakCiptaPlugin =
      new LuaranPenelitianPkmYangDihasilkanMahasiswaHKIHakCiptaPlugin()
    const luaranPenelitianPkmYangDihasilkanMahasiswaTeknologiPlugin =
      new LuaranPenelitianPkmYangDihasilkanMahasiswaTeknologiPlugin()
    const luaranPenelitianPkmYangDihasilkanMahasiswaBukuPlugin =
      new LuaranPenelitianPkmYangDihasilkanMahasiswaBukuPlugin()

    // Penjaminan Mutu plugins (9)
    const evaluasiDanPengendalianPlugin = new EvaluasiDanPengendalianPlugin()
    const ketersediaanDokumenPlugin = new KetersediaanDokumenPlugin()

    // Default plugin
    pluginRegistry.register("default", defaultPlugin)

    // Kerjasama plugins (1)
    pluginRegistry.register("1-*", tridharmaPlugin)

    // Mahasiswa plugins (2)
    pluginRegistry.register("2a1", seleksiMahasiswaPlugin)
    pluginRegistry.register("2b", mahasiswaAsingPlugin)

    // Dosen plugins (3a)
    pluginRegistry.register("3a1", dosenTetapPlugin)
    pluginRegistry.register("3a2", dosenPembimbingTugasAkhir)
    pluginRegistry.register("3a3", ewmpDosenPlugin)
    pluginRegistry.register("3a4", dosenTidakTetapPlugin)
    pluginRegistry.register("3a5", dosenIndustriPlugin)

    // Dosen plugins (3b series)
    pluginRegistry.register("3b1", pengakuanRekognisiDtpsPlugin)
    pluginRegistry.register("3b2", penelitianDtpsPlugin)
    pluginRegistry.register("3b3", pengabdianKepadaMasyarakatDtpsPlugin)
    pluginRegistry.register(
      "3b5",
      pagelaranPameranPresentasiPublikasiIlmiahDTPSPlugin
    )
    pluginRegistry.register("3b6", karyaIlmiahDtpsYangDisitasiPlugin)
    pluginRegistry.register(
      "3b7",
      produkJasaDtpsYangDiadopsiOlehIndustriMasyarakatPlugin
    )

    // HKI dan luaran plugins (3b8)
    pluginRegistry.register(
      "3b8-1",
      luaranPenelitianPkmLainnyaHKIPatenPatenSederhanPlugin
    )
    pluginRegistry.register(
      "3b8-2",
      luaranPenelitianPkmLainnyaHKIHakCiptaPlugin
    )
    pluginRegistry.register(
      "3b8-3",
      luaranPenelitianPkmLainnyaTeknologiTepatGunaPlugin
    )
    pluginRegistry.register(
      "3b8-4",
      luaranPenelitianPkmLainnyaBukuBerIsbnPlugin
    )

    // Keuangan dan sarana prasarana plugins (4)
    pluginRegistry.register("4a", penggunaanDanaPlugin)
    pluginRegistry.register("4b", prasaranaDanPeralatanUtamaPlugin)
    pluginRegistry.register("4c", dataPrasaranaUPPSPlugin)

    // Pendidikan plugins (5)
    pluginRegistry.register("5a-1", kurikulumCapaianRencanaPlugin)
    pluginRegistry.register("5a-2", pembimbinganTugasAkhirPlugin)
    pluginRegistry.register("5a-3", mataKuliahBasicSciencePlugin)
    pluginRegistry.register("5a-4", capstoneDesignProsesPembelajaranPlugin)
    pluginRegistry.register("5b-1", bebanTotalPaket20SKSPlugin)
    pluginRegistry.register("5b-2", bebanTotalPaket40SKSPlugin)
    pluginRegistry.register("5b-3", dataPelaksanaanKegiatanMBKMPlugin)
    pluginRegistry.register("5c", integrasiKegiatanPenelitianPlugin)
    pluginRegistry.register("5d", kepuasanMahasiswaPlugin)

    // Penelitian plugins (6)
    pluginRegistry.register("6a", penelitianDtpsYangMelibatkanMahasiswaPlugin)

    // PKM plugins (7)
    pluginRegistry.register("7", pkmDtpsYangMelibatkanMahasiswaPlugin)

    // Luaran dan capaian plugins (8 )
    pluginRegistry.register("8a", ipkLulusanPlugin)
    pluginRegistry.register("8b1", prestasiAkademikMahasiswaPlugin)
    pluginRegistry.register("8b2", prestasiNonAkademikMahasiswaPlugin)
    pluginRegistry.register("8c", masaStudiLulusanPlugin)
    pluginRegistry.register("8d1", waktuTungguLulusanPlugin)
    pluginRegistry.register("8d2", kesesuaianBidangKerjaPlugin)
    pluginRegistry.register("8e1", lulusanTerlacakPlugin)
    pluginRegistry.register("8e2", kepuasanPenggunaLulusanPlugin)
    pluginRegistry.register("8f2", pagelaranPameranPlugin)
    pluginRegistry.register("8f4", produkJasaYangDihasilkanMahasiswaPlugin)
    pluginRegistry.register(
      "8f5-1",
      luaranPenelitianPkmYangDihasilkanMahasiswaHKIPatenPlugin
    )
    pluginRegistry.register(
      "8f5-2",
      luaranPenelitianPkmYangDihasilkanMahasiswaHKIHakCiptaPlugin
    )
    pluginRegistry.register(
      "8f5-3",
      luaranPenelitianPkmYangDihasilkanMahasiswaTeknologiPlugin
    )
    pluginRegistry.register(
      "8f5-4",
      luaranPenelitianPkmYangDihasilkanMahasiswaBukuPlugin
    )

    // Penjaminan Mutu plugins (9 series)
    pluginRegistry.register("9a", evaluasiDanPengendalianPlugin)
    pluginRegistry.register("9b", ketersediaanDokumenPlugin)

    console.log("All LKPS plugins registered successfully")
  } catch (error) {
    console.error("Error registering plugins:", error)
    throw error
  }
}

export default registerAllPlugins
