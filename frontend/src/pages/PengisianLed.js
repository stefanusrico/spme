<<<<<<< HEAD
import { Details } from "@mui/icons-material";
import axiosInstance from "../utils/axiosConfig";
import { useNavigate } from "react-router-dom";

export const fetchUserTask = async() => {
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
        throw new Error("Gagal mengambil data program studi"); 
    }
}

export const fetchAllTaskByProdi = async(prodiId) => {
    try{
        const responseTasks = await axiosInstance.get(`/projectsByProdi/${prodiId}`)
        const data = responseTasks.data.data.tasks
        console.log("reposen all tasks : ", data)
        return data
    } catch (error) {
        throw new Error("Gagal fetch task by prodi"); 
    }
}

export const updateUserTask = async(newNo, newSub, prodiId) => {
    try {
        console.log(newNo, newSub)
        const responseTask = await axiosInstance.patch(`tasks/updateOwner/${newNo}/${newSub}/${prodiId}`)
        console.log(responseTask.data.data);
        const updatedTasks = await fetchUserTask();
       
        return updatedTasks
    } catch (error) {
        throw new Error("Gagal update user task"); 
    }
}

export const changeNoSub = (newNo, newSub) => {
    console.log(newNo, newSub)
    const navigate = useNavigate()
    navigate(`/pengisian-matriks-led/${newNo}/${newSub}`)
}

export const fetchAllProdi = async () => {
    try {
        const prodiResponse = await axiosInstance.get(`/prodi`);
        return prodiResponse.data;
    } catch (error) {
        throw new Error("Gagal mengambil data program studi"); 
    }
};

export const fetchVersionByProdi = async(prodiId) => {
    try {
        const responseVersion = await axiosInstance.get(`/versions/${prodiId}`)
        console.log("all data verison di js :", responseVersion.data.data)
        return responseVersion.data.data
    } catch (error) {
        throw new Error("Gagal mengambil data versi berdasarkan prodi"); 
    }
}

export const addPreviewToFiles = async(details) => {
    return Promise.all(
        details.map(async (detail) => {
            const updatedFiles = await Promise.all(
                detail.data_pendukung.map(async (file) => {
                    try {
                        const response = await fetch(file.file_url);
                        const blob = await response.blob();
                        return {
                            ...file,
                            originFileObj: new File([blob], file.file_name, { type: blob.type })
                        };
                    } catch (error) {
                        console.error("Gagal memuat file:", file.file_name, error);
                        return file; // Jika gagal, tetap kembalikan data asli
                    }
                })
            );
            return { ...detail, data_pendukung: updatedFiles };
        })
    );
}

export const fetchVersionProdiReference = async() => {
    try{
        const responVersionReference = await axiosInstance.get(`/version`)
    }catch (error){

    }
=======
import { Details } from "@mui/icons-material"
import axiosInstance from "../utils/axiosConfig"
import { useNavigate } from "react-router-dom"


export const fetchLedDataByTaskId = async (taskId) => {
  try {
    const responseVersion = await axiosInstance.get(`/led-data/get-all-by-task`,{ params: { 
        taskId: taskId 
      }
    })

    return responseVersion.data.data
  } catch (error) {
    throw new Error("Gagal mengambil data program studi")
  }
}

export const fetchUserTask = async () => {
  try {
    const responseTask = await axiosInstance.get(`/tasks`)
    console.log("user task :", responseTask.data.data)

    const dataRespon = responseTask.data.data
    return dataRespon
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

export const changeNoSub = (newNo, newSub, projectId, navigate) => {
  navigate(`/projects/${projectId}/pengisian-matriks-led/${newNo}/${newSub}`)
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
>>>>>>> dbv2
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

<<<<<<< HEAD
export const fetchMasukanAndScoreFromGPT = async(dataKriteriaIndikator, dataIsian) => {
    try {
        console.log("data matriks sebelum ke GPT : ", dataKriteriaIndikator)
        console.log("data isian sebelum ke GPT : ", dataIsian)

        const dataIsianToGPT = {
            "Data Pendukung" : dataIsian.data_pendukung,
            "Isian Asesi" : dataIsian.isian_asesi,
            Masukan : dataIsian.masukan,
            Nilai : dataIsian.nilai,
            Reference : dataIsian.reference,
            Seq : dataIsian.seq,
            Type : dataIsian.type
        }

        dataIsianToGPT["Isian Asesi"] = extractText(dataIsianToGPT["Isian Asesi"]);

        const responseGPT = await axiosInstance.post('/analyze-gpt',{
            dataMatriks: dataKriteriaIndikator,
            dataIsian: dataIsianToGPT
        })
        
        console.log("Respon dari GPT:", responseGPT.data);

        let content = responseGPT.data.data.choices[0].message.content;

        try {
            // Pastikan hanya memproses JSON valid
            if (typeof content === "string") {
                content = content.trim().replace(/^```json/, '').replace(/```$/, '').trim();
                content = JSON.parse(content);
            }

            if (!content.nilai || !content.masukan) {
                throw new Error("Format JSON tidak sesuai!");
            }

            console.log("Data yang diparsing:", content);
            return content;
        } catch (jsonError) {
            console.error("❌ Gagal parsing JSON dari GPT:", jsonError);
            throw new Error("Gagal parsing JSON dari OpenAI.");
        }
    } catch (error) {
        console.error("❌ Gagal mengambil data masukan dan score:", error);
        throw new Error(`Gagal mengambil data masukan dan score: ${error.message}`);
    }
}

export const fetchMatriksByProdi = async(prodiId) => {
    try {
        const responseMatriksByProdi = await axiosInstance.get(`/getMatriksByProdi/${prodiId}`)
        return responseMatriksByProdi.data.data
    } catch (error) {
        throw new Error("Gagal mengambil data matriks berdasarkan prodi"); 
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
    console.log("Data isian sebelum store:", dataIsian);
    
    // Upload file ke Google Drive dan dapatkan hasilnya
    const uploadedFiles = await storeFileToDrive({ dataIsian, noSub });

    // Sesuaikan `dataIsian.details`, ganti `data_pendukung` berdasarkan `seq`
    const updatedDetails = (dataIsian.details || []).map((detail, detailIndex) => {
        try {
            if (!Array.isArray(detail.data_pendukung)) {
                console.warn(`Detail index ${detailIndex} tidak memiliki data_pendukung sebagai array.`);
                return { ...detail, data_pendukung: [] };
            }
    
            const updatedPendukung = detail.data_pendukung.map((file, fileIndex) => {
=======
const parseDraftContent = (isianAsesiJson, dataPendukung = []) => {
  if (!isianAsesiJson) return "";

  let draft;
  try {
    draft = JSON.parse(isianAsesiJson);
  } catch (e) {
    console.warn("⚠️ Gagal parse JSON isianAsesi:", isianAsesiJson);
    return "";
  }

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
    console.log("data matriks sebelum ke Gemini : ", dataKriteriaIndikator)
    console.log("data isian sebelum ke Gemini : ", dataIsian)

    const combinedIsianAsesi = dataIsian.map((item, index) => {
      return `${parseDraftContent(item.isianAsesi)}`
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

    const responseGemini = await axiosInstance.post("/scoring-led", {
      dataLedItem: dataKriteriaIndikator,
      dataIsian: dataIsianToScoring,
    })

    try {
      console.log("hasil response Gemini", responseGemini)
      return responseGemini.data.mapping
    } catch (jsonError) {
      throw new Error("Gagal parsing JSON dari OpenAI.")
    }
  } catch (error) {
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

  // let totalNilai = 0;
  // let  ilaiValid = 0;

  // Sesuaikan `dataIsian.details`, ganti `dataPendukung` berdasarkan `seq`
  const updatedDetails = (dataIsian.details || []).map((detail, detailIndex) => {
        try {
            // const nilai = typeof detail.nilai === 'number' ? detail.nilai : parseFloat(detail.nilai);
            // if (!isNaN(nilai)) {
            //   totalNilai += nilai;
            //   jumlahNilaiValid++;
            // }

            if (!Array.isArray(detail.dataPendukung)) {
                console.warn(`Detail index ${detailIndex} tidak memiliki dataPendukung sebagai array.`);
                return { ...detail, dataPendukung: [] };
            }
    
            const updatedPendukung = detail.dataPendukung.map((file, fileIndex) => {
>>>>>>> dbv2
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
    
<<<<<<< HEAD
            return {
                ...detail,
                data_pendukung: updatedPendukung
=======
            // //jika ada nilai didalam detail
            // if (Object.prototype.hasOwnProperty.call(detail, 'nilai')) {
            //   const { nilai, ...detailWithoutNilai } = detail;
            //   return {
            //     ...detailWithoutNilai,
            //     dataPendukung: updatedPendukung,
            //   };
            // }

            //jika tidak ada nilai didalam detail
            return {
                ...detail,
                dataPendukung: updatedPendukung
>>>>>>> dbv2
            };
        } catch (err) {
            console.error(`Gagal memproses detail index ${detailIndex}:`, err);
            return detail; // fallback: return detail as is
        }
    });
<<<<<<< HEAD
    

    // Data yang akan dikirim ke backend (tanpa originFileObj)
    const dataToStore = {
        user_id: dataIsian.user_id,
        taskId: dataIsian.taskId,
        commit: commit,
        prodiId: dataIsian.prodiId,
        c: dataIsian.c,
        Details: updatedDetails.map(detail => ({
            ...detail,
            data_pendukung: detail.data_pendukung.map(file => ({
                id: file.id,
                name: file.name,
                url: file.url
            }))
        }))
    };
    console.log("data to store :", dataToStore);
    
    const response = await axiosInstance.post(`/versions`, dataToStore);
    console.log("response post version :", response);
};

export const storeFileToDrive = async ({ dataIsian, noSub }) => {
    console.log("File yang diunggah:", dataIsian.details);
    
    const filteredFiles = dataIsian.details
        .flatMap(item => 
            Array.isArray(item.data_pendukung) 
                ? item.data_pendukung.map(file => ({ ...file, seq: item.seq })) 
                : []
        )
        .filter(file => file?.originFileObj && file.originFileObj.size && file.originFileObj.type) // Pastikan file valid
        .map(file => ({
            file: file.originFileObj,
            noKriteria: file.seq,
            seq: file.seq,
            name: file.originFileObj.name // Simpan nama file asli
        }));

    if (filteredFiles.length === 0) {
        console.warn("Tidak ada file dengan originFileObj yang tersedia.");
        return [];
    }

    const userLocalhost = localStorage.getItem('user');
    const jsonUserLocalhost = JSON.parse(userLocalhost);
    const currentProdiName = jsonUserLocalhost.prodi.name;

    console.log(filteredFiles);
    console.log(noSub);
    console.log(currentProdiName);

    const formData = new FormData();
    
    filteredFiles.forEach(({ file, noKriteria }) => {
        formData.append("file[]", file);
        formData.append("noKriteria[]", noKriteria);
    });

    formData.append("subFolder", currentProdiName);
    formData.append("noSub", noSub);

    try {
        const response = await axiosInstance.post("/upload-to-drive", 
            formData,
            {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            }
        );
        console.log("Upload sukses:", response.data);

        const files = response.data.files;
        return files.map(file => ({
            name: file.file_name,
            url: file.file_url,
            id: file.file_id,
            seq: filteredFiles.find(f => f.name === file.file_name)?.seq || null // Cocokkan dengan seq
        }));
        
    } catch (error) {
        console.error("Upload gagal:", error);
        return [];
    }
};
=======

  // Data yang akan dikirim ke backend (tanpa originFileObj)
  const dataToStore = {
    userId: dataIsian.user_id,
    taskId: dataIsian.taskId,
    commit: commit,
    nilai: dataIsian.nilai,
    masukan: dataIsian.masukan,
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
>>>>>>> dbv2
