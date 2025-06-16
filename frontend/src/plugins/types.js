export const SectionPluginInterface = {
  getInfo: () => ({
    code: String(), // Kode section, bisa menggunakan wildcard seperti '1-*'
    name: String(), // Nama plugin
    description: String(), // Deskripsi plugin
  }),

  configureSection: (config) => config,

  processExcelData: (workbook, tableCode, config, prodiName) => ({
    allRows: [],
    prodiRows: [],
    polbanRows: [],
  }),

  initializeData: (config, prodiName) => ({}),

  calculateScore: (data, config, NDTPS, userData) => ({
    score: null,
    scoreDetail: null,
  }),

  normalizeData: (data) => data,

  prepareDataForSaving: (data, userData) => data,

  validateData: (data) => ({ valid: true, errors: [] }),
}
