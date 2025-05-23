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

export const updateUserTask = async (newNo, newSub, prodiId, userId) => {
  try {
    console.log(newNo, newSub, userId)
    const responseTask = await axiosInstance.patch(`tasks/updateOwner/${newNo}/${newSub}/${prodiId}`,
      {
        owners: [userId]
      }
    )
    console.log(responseTask.data.data)
    const updatedTasks = await fetchUserTask();
       
    return updatedTasks
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

export const fetchLedDataByProdi = async (prodiId) => {
  try {
    const responseLedData = await axiosInstance.get(`/ledData/byProdi/${prodiId}`)
    if (!responseLedData.data || !responseLedData.data.data || responseLedData.data.data.length === 0) {
      console.warn("LED data kosong atau tidak ditemukan");
      return []; // Atau null tergantung bagaimana kamu ingin menanganinya
    }
    console.log("all data verison di js :", responseLedData.data.data)
    return responseLedData.data.data
  } catch (error) {
    console.error("Gagal mengambil data versi berdasarkan prodi", error)
    return []
  }
}

export const addPreviewToFiles = async (details) => {
  return Promise.all(
    details.map(async (detail) => {
      const updatedFiles = await Promise.all(
        detail.dataPendukung.map(async (file) => {
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
      return { ...detail, dataPendukung: updatedFiles }
    })
  )
}

export const fetchLedDataProdiReference = async () => {
  try {
    const responLedDataReference = await axiosInstance.get(`/LedData`)
  } catch (error) {}
}

const extractText = (value) => {
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            // Cek apakah formatnya draft-js raw content
            if (parsed?.blocks && Array.isArray(parsed.blocks)) {
                return parsed.blocks.map(block => block.text).join('\n');
            }
        } catch (e) {
            // Bukan JSON → biarkan sebagai teks biasa
        }
    }

    return value;
}

const parseDraftContent = (isianAsesiJson, dataPendukung = []) => {
  const draft = JSON.parse(isianAsesiJson);
  const blocks = draft.blocks || [];
  const entityMap = draft.entityMap || {};

  // Ambil teks biasa
  const textParts = blocks
    .filter(b => b.type === 'unstyled' && b.text.trim() !== "")
    .map(b => b.text.trim());

  // Ambil gambar dari entityMap dan cocokkan dengan file_name di dataPendukung
  const imageUrls = Object.values(entityMap)
    .filter(e => e.type === "IMAGE")
    .map(e => {
      const localUrl = e.data?.src;
      const fileName = decodeURIComponent(localUrl).split("/").pop();

      const matched = dataPendukung.find(dp => dp.file_name === fileName);

      return matched ? `Gambar : ${matched.file_url}` : ""; // Kosongkan jika tidak ada
    })
    .filter(Boolean); // Hapus yang kosong

  return textParts.concat(imageUrls).join("\n\n");
};


export const fetchMasukanAndScoreFromAI = async (
  dataKriteriaIndikator,
  dataIsian
) => {
  try {
    console.log("data matriks sebelum ke GPT : ", dataKriteriaIndikator)
    console.log("data isian sebelum ke GPT : ", dataIsian)

    const combinedIsianAsesi = dataIsian.map((item, index) => {
      return `Isian Asesi ${index + 1} - ${item.reference || "Tanpa Referensi"}\n\n${parseDraftContent(item.isianAsesi)}`
    }).join("\n\n");

    const dataIsianToScoring = {
          dataPendukung : dataIsian.dataPendukung,
          isianAsesi : combinedIsianAsesi,
          masukan : dataIsian.masukan,
          nilai : dataIsian.nilai,
          reference : dataIsian.reference,
          seq : dataIsian.seq,
          type : dataIsian.type
    }

    // dataIsianToScoring["Isian Asesi"] = extractText(dataIsianToScoring["isianAsesi"])

    const responseGPT = await axiosInstance.post("/scoring-led", {
      dataLedItem: dataKriteriaIndikator,
      dataIsian: dataIsianToScoring,
    })

    // console.log("Respon dari GPT:", responseGPT.data)

    // let content = responseGPT.data.data.choices[0].message.content

    try {
      console.log("hasil response gpt", responseGPT)
      return responseGPT.data.mapping
    } catch (jsonError) {
      console.error("❌ Gagal parsing JSON dari GPT:", jsonError)
      throw new Error("Gagal parsing JSON dari OpenAI.")
    }
  } catch (error) {
    console.error("❌ Gagal mengambil data masukan dan score:", error)
    throw new Error(`Gagal mengambil data masukan dan score: ${error.message}`)
  }
}

export const fetchLedItemByProdi = async (prodiId) => {
  try {
    const responseLedItemByProdi = await axiosInstance.get(
      `/getLedItemByProdi/${prodiId}`
    )
    return responseLedItemByProdi.data.data
  } catch (error) {
    throw new Error("Gagal mengambil data Led Item berdasarkan prodi")
  }
}

export const storeLedData = async (commit, dataIsian, noSub) => {
  console.log("Data isian sebelum store:", dataIsian)

  // Upload file ke Google Drive dan dapatkan hasilnya
  const uploadedFiles = await storeFileToDrive({ dataIsian, noSub })

  // Sesuaikan `dataIsian.details`, ganti `dataPendukung` berdasarkan `seq`
  const updatedDetails = (dataIsian.details || []).map((detail, detailIndex) => {
        try {
            if (!Array.isArray(detail.dataPendukung)) {
                console.warn(`Detail index ${detailIndex} tidak memiliki dataPendukung sebagai array.`);
                return { ...detail, dataPendukung: [] };
            }
    
            const updatedPendukung = detail.dataPendukung.map((file, fileIndex) => {
                const uploadedFile = uploadedFiles.find(f => f.seq === detail.seq && f.name === file.name);
                if (!uploadedFile) {
                    console.warn(`File tidak ditemukan pada uploadedFiles untuk detail.seq = ${detail.seq}, file.name = ${file.name}`);
                    return file;
                }
    
                return {
                    ...uploadedFile,
                    originFileObj: file.originFileObj || null
                };
            });
    
            return {
                ...detail,
                dataPendukung: updatedPendukung
            };
        } catch (err) {
            console.error(`Gagal memproses detail index ${detailIndex}:`, err);
            return detail; // fallback: return detail as is
        }
    });

  // Data yang akan dikirim ke backend (tanpa originFileObj)
  const dataToStore = {
    userId: dataIsian.user_id,
    taskId: dataIsian.taskId,
    commit: commit,
    details: updatedDetails.map((detail) => ({
      ...detail,
      dataPendukung: Array.isArray(detail.dataPendukung)
        ? detail.dataPendukung.map((file) => ({
            id: file.id || "",
            name: file.name || "",
            url: file.url || "",
          }))
        : [], // Handle case where dataPendukung might be null
    })),
  }
  console.log("data to store :", dataToStore)

  const response = await axiosInstance.post(`/ledData`, dataToStore)
  console.log("response post LedData :", response)
}

export const storeFileToDrive = async ({ dataIsian, noSub }) => {
  if (!dataIsian || !dataIsian.details || !Array.isArray(dataIsian.details)) {
    console.warn("Data isian tidak valid atau details bukan array")
    return []
  }

  console.log("File yang diunggah:", dataIsian.details)

  const filteredFiles = dataIsian.details
    .flatMap((item) =>
      Array.isArray(item.dataPendukung)
        ? item.dataPendukung.map((file) => ({ ...file, seq: item.seq }))
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
      name: file.originFileObj.name || file.originFileObj.fileName || "unnamed", // Simpan nama file asli dengan fallback
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

    const files = response.data.files || []
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
