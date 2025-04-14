/**
 * Plugin Registry untuk mengelola plugin LKPS
 */
import DefaultSectionPlugin from "./defaultSectionPlugin"

// Registry untuk menyimpan semua plugin
const pluginRegistry = new Map()

// Daftarkan plugin default yang akan digunakan jika tidak ada plugin khusus
pluginRegistry.set("default", DefaultSectionPlugin)

/**
 * Mendaftarkan plugin untuk kode section tertentu
 * @param {string} sectionCode - Kode section atau pattern (misal: '1-*')
 * @param {object} plugin - Plugin object
 */
export const registerPlugin = (sectionCode, plugin) => {
  if (!plugin || typeof plugin !== "object") {
    throw new Error(`Invalid plugin for section ${sectionCode}`)
  }

  // Validasi bahwa plugin mengimplementasikan interface yang diperlukan
  const requiredMethods = [
    "getInfo",
    "processExcelData",
    "initializeData",
    "calculateScore",
    "normalizeData",
    "prepareDataForSaving",
    "validateData",
  ]

  for (const method of requiredMethods) {
    if (typeof plugin[method] !== "function") {
      throw new Error(
        `Plugin for section ${sectionCode} missing required method: ${method}`
      )
    }
  }

  pluginRegistry.set(sectionCode, plugin)
  console.log(`Plugin for section ${sectionCode} registered successfully`)
}

/**
 * Mendapatkan plugin untuk kode section tertentu
 * Jika tidak ditemukan plugin spesifik, gunakan plugin default
 * @param {string} sectionCode - Kode section
 * @returns {object} Plugin object
 */
export const getPlugin = (sectionCode) => {
  // Cek plugin langsung untuk kode section spesifik
  if (pluginRegistry.has(sectionCode)) {
    return pluginRegistry.get(sectionCode)
  }

  // Cek wildcard pattern (misal: '1-*' untuk semua subsection dari 1)
  const sectionBase = sectionCode.split("-")[0]
  const wildcardKey = `${sectionBase}-*`

  if (pluginRegistry.has(wildcardKey)) {
    return pluginRegistry.get(wildcardKey)
  }

  // Cek pattern berdasarkan awalan (misalnya '2a' untuk semua subsection 2a)
  for (const [key, plugin] of pluginRegistry.entries()) {
    if (key.endsWith("*") && sectionCode.startsWith(key.replace("*", ""))) {
      return plugin
    }
  }

  // Fallback ke plugin default
  console.log(
    `No specific plugin found for ${sectionCode}, using default plugin`
  )
  return pluginRegistry.get("default")
}

/**
 * Mendapatkan semua plugin yang terdaftar
 * @returns {Map} Plugin registry map
 */
export const getAllPlugins = () => {
  return pluginRegistry
}

/**
 * Membersihkan semua plugin dari registry (berguna untuk testing)
 */
export const clearPluginRegistry = () => {
  pluginRegistry.clear()
  // Selalu daftarkan kembali plugin default
  pluginRegistry.set("default", DefaultSectionPlugin)
}

export default {
  registerPlugin,
  getPlugin,
  getAllPlugins,
  clearPluginRegistry,
}
