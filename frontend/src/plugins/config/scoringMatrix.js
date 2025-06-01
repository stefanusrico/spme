export const dosenTetapScoring = {
  kecukupan: (metrics) => {
    const { NDTPS, PDTT } = metrics
    const roundToTwo = (num) => Math.round((num + Number.EPSILON) * 100) / 100

    // Rule 1: Jika NDTPS < 5, Maka Skor = 0
    if (NDTPS < 5) return 0

    // Rule 2: Jika DTPS ≥ 5 dan PDTT > 40%, Maka skor = 1
    if (NDTPS >= 5 && PDTT > 40) return 1

    // Rule 3: Jika NDTPS ≥ 12 dan PDTT ≤ 10%, Maka skor = 4
    if (NDTPS >= 12 && PDTT <= 10) return 4

    // Rule 4: Jika 5 ≤ NDTPS < 12 dan PDTT ≤ 40%, maka Skor = 2 + 2(A x B)
    if (NDTPS >= 5 && NDTPS < 12 && PDTT <= 40) {
      const A = (NDTPS - 5) / 7
      let B
      if (PDTT <= 10) {
        B = (40 - PDTT) / 40
      } else {
        // 10% < PDTT ≤ 40%
        B = (40 - PDTT) / 30
      }
      return roundToTwo(2 + 2 * A * B)
    }

    // Rule 5: Jika NDTPS ≥ 12 dan 10% < PDTT ≤ 40%, Maka Skor = 2 + (2 x B)
    if (NDTPS >= 12 && PDTT > 10 && PDTT <= 40) {
      const B = (40 - PDTT) / 30
      return roundToTwo(2 + 2 * B)
    }

    return 0
  },

  kualifikasi: (metrics) => {
    const { PDS3 } = metrics
    const roundToTwo = (num) => Math.round((num + Number.EPSILON) * 100) / 100

    // Jika PDS3 ≥ 15%, maka Skor = 4
    if (PDS3 >= 15) return 4

    // Jika PDS3 < 15%, maka Skor = 2 + ((2 x PDS3) / 15%)
    // Tidak ada Skor kurang dari 2
    const score = 2 + (2 * PDS3) / 15
    return roundToTwo(Math.max(2, score))
  },

  sertifikasi: (metrics) => {
    const { PDSK } = metrics
    const roundToTwo = (num) => Math.round((num + Number.EPSILON) * 100) / 100

    // Jika PDSK ≥ 50%, maka Skor = 4
    if (PDSK >= 50) return 4

    // Jika PDSK < 50%, maka Skor = 1 + (6 x PDSK)
    // Note: PDSK should be in decimal form (0-1), but if it's percentage (0-100), divide by 100
    const pdskDecimal = PDSK > 1 ? PDSK / 100 : PDSK
    const score = 1 + 6 * pdskDecimal

    // Tidak ada Skor kurang dari 1
    return roundToTwo(Math.max(1, score))
  },

  jabatan: (metrics) => {
    const { PGBLKL } = metrics
    const roundToTwo = (num) => Math.round((num + Number.EPSILON) * 100) / 100

    // Jika PGBLKL ≥ 50%, maka Skor = 4
    if (PGBLKL >= 50) return 4

    // Jika PGBLKL < 50%, maka Skor = 2 + ((20 x PGBLKL) / 5)
    // Tidak ada Skor kurang dari 2
    const score = 2 + (20 * PGBLKL) / 5
    return roundToTwo(Math.max(2, score))
  },

  rasio: (metrics) => {
    const { RMD } = metrics
    const roundToTwo = (num) => Math.round((num + Number.EPSILON) * 100) / 100

    // Jika 15 ≤ RMD ≤ 25, maka Skor = 4
    if (RMD >= 15 && RMD <= 25) return 4

    // Jika RMD < 15, maka Skor = (4 x RMD) / 15
    if (RMD < 15) {
      return roundToTwo((4 * RMD) / 15)
    }

    // Jika 25 < RMD ≤ 35, maka Skor = (70 - (2 x RMD)) / 5
    if (RMD > 25 && RMD <= 35) {
      return roundToTwo((70 - 2 * RMD) / 5)
    }

    // Jika RMD > 35, maka Skor = 0
    return 0
  },
}
