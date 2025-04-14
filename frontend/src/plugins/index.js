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
import PrestasiNonAkademikMahasiswaPlugin from "./prestasiNonAkademikMahasiswaPlugin"

const registerPlugins = () => {
  console.log("Registering LKPS plugins...")

  registerPlugin("default", DefaultSectionPlugin)

  registerPlugin("1-*", TridharmaPlugin)

  registerPlugin("2a2", seleksiMahasiswaD3Plugin)
  registerPlugin("2b", mahasiswaAsingPlugin)

  registerPlugin("3a1", dosenTetapPerguruanTinggiPlugin)

  registerPlugin("8a", ipkLulusanPlugin)
  registerPlugin("8b1", PrestasiAkademikMahasiswaPlugin)
  registerPlugin("8b2", PrestasiNonAkademikMahasiswaPlugin)

  console.log("All LKPS plugins registered successfully")
}

export default registerPlugins
