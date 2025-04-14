import { Details } from "@mui/icons-material"
import axiosInstance from "../utils/axiosConfig"
import { useNavigate } from "react-router-dom"

export const fetchUserTask = async () => {
  try {
    const responseTask = await axiosInstance.get(`/tasks`)
    console.log("user task :", responseTask.data.data)

    const dataRespon = responseTask.data.data

    // console.log("respon :", dataRespon.length);
    // console.log("no sub :", no, sub)

    return dataRespon

    // if ((no && sub) || dataRespon.length > 0) {
    //     console.log("checking...", responseTask.data.data);
    //     checkAndRedirect(responseTask.data.data)
    // } else {
    //     console.log("tidak ada no dan sub")
    //     setNumDesc(false)
    // }
  } catch (error) {
    throw new Error("Gagal mengambil data program studi")
  }
}

export const fetchAllTaskByProdi = async (prodiId) => {
  try {
    const responseTasks = await axiosInstance.get(`/projectsByProdi/${prodiId}`)
    const data = responseTasks.data.data.tasks
    console.log("reposen all tasks : ", data)
    return data
  } catch (error) {
    throw new Error("Gagal fetch task by prodi")
  }
}

export const updateUserTask = async (newNo, newSub) => {
  try {
    console.log(newNo, newSub)
    const responseTask = await axiosInstance.patch(
      `tasks/updateOwner/${newNo}/${newSub}`
    )
    console.log(responseTask.data.data)
  } catch (error) {
    throw new Error("Gagal update user task")
  }
}

export const changeNoSub = (newNo, newSub) => {
  console.log(newNo, newSub)
  const navigate = useNavigate()
  navigate(`/pengisian-matriks-led/${newNo}/${newSub}`)
}

export const fetchAllProdi = async () => {
  try {
    const prodiResponse = await axiosInstance.get(`/prodi`)
    return prodiResponse.data
  } catch (error) {
    throw new Error("Gagal mengambil data program studi")
  }
}

export const fetchVersionByProdi = async (prodiId) => {
  try {
    const responseVersion = await axiosInstance.get(`/versions/${prodiId}`)
    console.log("all data verison di js :", responseVersion.data.data)
    return responseVersion.data.data
  } catch (error) {
    throw new Error("Gagal mengambil data versi berdasarkan prodi")
  }
}

export const addPreviewToFiles = async (details) => {
  return Promise.all(
    details.map(async (detail) => {
      const updatedFiles = await Promise.all(
        detail.data_pendukung.map(async (file) => {
          try {
            const response = await fetch(file.file_url)
            const blob = await response.blob()
            return {
              ...file,
              originFileObj: new File([blob], file.file_name, {
                type: blob.type,
              }),
            }
          } catch (error) {
            console.error("Gagal memuat file:", file.file_name, error)
            return file // Jika gagal, tetap kembalikan data asli
          }
        })
      )
      return { ...detail, data_pendukung: updatedFiles }
    })
  )
}

export const fetchVersionProdiReference = async () => {
  try {
    const responVersionReference = await axiosInstance.get(`/version`)
  } catch (error) {}
}

export const fetchMasukanAndScoreFromGPT = async (
  dataKriteriaIndikator,
  dataIsian
) => {
  try {
    console.log("data matriks sebelum ke GPT : ", dataKriteriaIndikator)
    console.log("data isian sebelum ke GPT : ", dataIsian)

    const responseGPT = await axiosInstance.post("/analyze-gpt", {
      dataMatriks: dataKriteriaIndikator,
      dataIsian: dataIsian,
    })

    console.log("Respon dari GPT:", responseGPT.data)

    let content = responseGPT.data.data.choices[0].message.content

    try {
      // Pastikan hanya memproses JSON valid
      if (typeof content === "string") {
        content = JSON.parse(content)
      }

      if (!content.nilai || !content.masukan) {
        throw new Error("Format JSON tidak sesuai!")
      }

      console.log("Data yang diparsing:", content)
      return content
    } catch (jsonError) {
      console.error("❌ Gagal parsing JSON dari GPT:", jsonError)
      throw new Error("Gagal parsing JSON dari OpenAI.")
    }
  } catch (error) {
    console.error("❌ Gagal mengambil data masukan dan score:", error)
    throw new Error(`Gagal mengambil data masukan dan score: ${error.message}`)
  }
}

export const fetchMatriksByProdi = async (prodiId) => {
  try {
    const responseMatriksByProdi = await axiosInstance.get(
      `/getMatriksByProdi/${prodiId}`
    )
    return responseMatriksByProdi.data.data
  } catch (error) {
    throw new Error("Gagal mengambil data matriks berdasarkan prodi")
  }
}

// export const storeVersion = async (commit, dataIsian, noSub) => {
//     console.log("Data isian sebelum store : ", dataIsian)

//     await storeFileToDrive({ dataIsian: dataIsian, noSub: noSub });

//     const dataToStore = {
//         user_id: dataIsian.user_id,
//         taskId: dataIsian.taskId,
//         commit: commit,
//         prodiId: dataIsian.prodiId,
//         c: dataIsian.c,
//         Details: dataIsian.details
//     }
//     console.log("data to store :", dataToStore);

//     const response = await axiosInstance.post(`/versions`, dataToStore)
//     console.log("response post version :", response);
// };

// export const storeFileToDrive = async ({ dataIsian, noSub }) => {
//         console.log("File yang diunggahh:", dataIsian.details);

//         const filteredFiles = dataIsian.details
//             .flatMap(item => Array.isArray(item.data_pendukung) ? item.data_pendukung.map(file => ({ ...file, seq: item.seq })) : [])
//             .filter(file => file?.originFileObj && file.originFileObj.size && file.originFileObj.type) // Pastikan file valid
//             .map(file => ({
//                 file: file.originFileObj,
//                 noKriteria: file.seq // Ambil noKriteria dari details.seq
//             }));

//         if (filteredFiles.length === 0) {
//             console.warn("Tidak ada file dengan originFileObj yang tersedia.");
//         }

//         const userLocalhost = localStorage.getItem('user')
//         const jsonUserLocalhost = JSON.parse(userLocalhost)
//         const currentProdiName = jsonUserLocalhost.prodi.name

//         console.log(filteredFiles)
//         console.log(noSub)
//         console.log(currentProdiName)

//         const formData = new FormData();

//         filteredFiles.forEach(({ file, noKriteria }) => {
//             formData.append("file[]", file);
//             formData.append("noKriteria[]", noKriteria);
//         });

//         formData.append("subFolder", currentProdiName);
//         formData.append("noSub", noSub);

//         try {
//             const response = await axiosInstance.post("/upload-to-drive",
//                 formData,
//                 {
//                     headers: {
//                         "Content-Type": "multipart/form-data",
//                     },
//                 }
//             );
//             console.log("Upload sukses:", response.data);
//             const files = response.data.files

//             const uploadedFiles = files.map(file => ({
//                 name: file.file_name,
//                 url: file.file_url,
//                 id:file.file_id
//             }));
//             console.log("nama file : ", uploadedFiles)

//         } catch (error) {
//             console.error("Upload gagal:", error);
//         }
//     };

export const storeVersion = async (commit, dataIsian, noSub) => {
  console.log("Data isian sebelum store:", dataIsian)

  // Upload file ke Google Drive dan dapatkan hasilnya
  const uploadedFiles = await storeFileToDrive({ dataIsian, noSub })

  // Sesuaikan `dataIsian.details`, ganti `data_pendukung` berdasarkan `seq`
  const updatedDetails = dataIsian.details.map((detail) => ({
    ...detail,
    data_pendukung: detail.data_pendukung.map((file) => {
      const uploadedFile = uploadedFiles.find(
        (f) => f.seq === detail.seq && f.name === file.name
      )
      return uploadedFile
        ? {
            ...uploadedFile,
            originFileObj: file.originFileObj, // Tetap simpan originFileObj di frontend
          }
        : file
    }),
  }))

  // Data yang akan dikirim ke backend (tanpa originFileObj)
  const dataToStore = {
    user_id: dataIsian.user_id,
    taskId: dataIsian.taskId,
    commit: commit,
    prodiId: dataIsian.prodiId,
    c: dataIsian.c,
    Details: updatedDetails.map((detail) => ({
      ...detail,
      data_pendukung: detail.data_pendukung.map((file) => ({
        id: file.id,
        name: file.name,
        url: file.url,
      })),
    })),
  }
  console.log("data to store :", dataToStore)

  const response = await axiosInstance.post(`/versions`, dataToStore)
  console.log("response post version :", response)
}

export const storeFileToDrive = async ({ dataIsian, noSub }) => {
  console.log("File yang diunggah:", dataIsian.details)

  const filteredFiles = dataIsian.details
    .flatMap((item) =>
      Array.isArray(item.data_pendukung)
        ? item.data_pendukung.map((file) => ({ ...file, seq: item.seq }))
        : []
    )
    .filter(
      (file) =>
        file?.originFileObj &&
        file.originFileObj.size &&
        file.originFileObj.type
    ) // Pastikan file valid
    .map((file) => ({
      file: file.originFileObj,
      noKriteria: file.seq,
      seq: file.seq,
      name: file.originFileObj.name, // Simpan nama file asli
    }))

  if (filteredFiles.length === 0) {
    console.warn("Tidak ada file dengan originFileObj yang tersedia.")
    return []
  }

  const userLocalhost = localStorage.getItem("user")
  const jsonUserLocalhost = JSON.parse(userLocalhost)
  const currentProdiName = jsonUserLocalhost.prodi.name

  console.log(filteredFiles)
  console.log(noSub)
  console.log(currentProdiName)

  const formData = new FormData()

  filteredFiles.forEach(({ file, noKriteria }) => {
    formData.append("file[]", file)
    formData.append("noKriteria[]", noKriteria)
  })

  formData.append("subFolder", currentProdiName)
  formData.append("noSub", noSub)

  try {
    const response = await axiosInstance.post("/upload-to-drive", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
    console.log("Upload sukses:", response.data)

    const files = response.data.files
    return files.map((file) => ({
      name: file.file_name,
      url: file.file_url,
      id: file.file_id,
      seq: filteredFiles.find((f) => f.name === file.file_name)?.seq || null, // Cocokkan dengan seq
    }))
  } catch (error) {
    console.error("Upload gagal:", error)
    return []
  }
}
