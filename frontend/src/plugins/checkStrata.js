export function cekStrata() {
    const userRaw = localStorage.getItem('user')
    const user = userRaw ? JSON.parse(userRaw) : null

    const prodi = user?.prodi?.name || ''

    if (prodi.includes('D-III') || prodi.includes('D-3')) {
        return "D-3"
    } else if(prodi.includes('D-IV') || prodi.includes('D-4')){
        return "D-4"
    }
}
