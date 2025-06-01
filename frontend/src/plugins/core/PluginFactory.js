export class PluginFactory {
  constructor() {
    this.creators = new Map()
    this.registerDefaultCreators()
  }

  registerDefaultCreators() {
    // Register creator functions untuk setiap type
    this.registerCreator("dosenTetap", async () => {
      const { DosenTetapPlugin } = await import(
        "../kriteria/sumberdayamanusia/plugin-tabel-3a1-dosenTetapPerguruanTinggiPlugin.js"
      )
      return new DosenTetapPlugin()
    })
    // Add more creators as needed
  }

  registerCreator(type, creatorFn) {
    this.creators.set(type, creatorFn)
  }

  async create(type, config = {}) {
    const creator = this.creators.get(type)

    if (!creator) {
      throw new Error(`Unknown plugin type: ${type}`)
    }

    const plugin = await creator(config)
    return plugin
  }
}
