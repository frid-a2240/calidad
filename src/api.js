import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const TOKEN_KEY = 'capacitor_token'

export const API_BASE = API_URL

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
})

export function guardarToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function obtenerToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function borrarToken() {
  localStorage.removeItem(TOKEN_KEY)
}

api.interceptors.request.use((config) => {
  const token = obtenerToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const info = {
      apiUrl: API_URL,
      mensaje: error.message,
      codigo: error.code,
      status: error.response?.status,
      data: error.response?.data,
    }
    console.error('API Error:', info)
    error.debugInfo = info
    const url = error.config?.url || ''
    const esAuthLogicaDeNegocio =
      url.includes('/auth/login') || url.includes('/auth/cambiar-password')
    if (error.response?.status === 401 && !esAuthLogicaDeNegocio) {
      borrarToken()
    }
    return Promise.reject(error)
  }
)

function dataUrlToBlob(dataUrl) {
  const arr = dataUrl.split(',')
  const mime = arr[0].match(/:(.*?);/)[1]
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new Blob([u8arr], { type: mime })
}

export async function listarProcesos() {
  const response = await api.get('/catalogos/procesos')
  return response.data
}

export async function listarProyectos() {
  const response = await api.get('/catalogos/proyectos')
  return response.data
}

export async function ocultarProyecto(nombre) {
  await api.delete('/catalogos/proyectos', { params: { nombre } })
}

/**
 * fotosDataUrl: string[] (una o más fotos en base64)
 */
export async function crearReporte({ proyecto, procesoId, comentario, fotosDataUrl }) {
  const formData = new FormData()
  formData.append('proyecto', proyecto)
  formData.append('proceso_id', procesoId)
  formData.append('comentario', comentario || '')

  fotosDataUrl.forEach((dataUrl, index) => {
    const blob = dataUrlToBlob(dataUrl)
    const extension = blob.type.split('/')[1] || 'jpg'
    formData.append('fotos', blob, `foto_${index}.${extension}`)
  })

  const response = await api.post('/reportes/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export async function listarReportes() {
  const response = await api.get('/reportes/')
  return response.data
}

export async function eliminarReporte(reporteId) {
  await api.delete(`/reportes/${reporteId}`)
}

export async function checkConexion() {
  try {
    const response = await api.get('/version', { timeout: 5000 })
    return { ok: true, data: response.data }
  } catch (error) {
    return {
      ok: false,
      error: error.debugInfo || {
        mensaje: error.message,
        codigo: error.code,
      },
    }
  }
}

export async function login({ numeroControl, password }) {
  const response = await api.post('/auth/login', {
    numero_control: numeroControl,
    password,
  })
  return response.data
}

export async function obtenerPerfil() {
  const response = await api.get('/auth/me')
  return response.data
}

export async function cambiarPassword({ passwordActual, passwordNueva }) {
  const response = await api.post('/auth/cambiar-password', {
    password_actual: passwordActual,
    password_nueva: passwordNueva,
  })
  return response.data
}

/**
 * Convierte el foto_ruta del backend a URL completa para <img>.
 * El backend guarda ruta relativa tipo "uploads\\20260707_140427_c695d090.png"
 * La convertimos a "http://IP:8000/uploads/20260707_140427_c695d090.png"
 */
export function urlFoto(fotoNombre) {
  return `${API_URL}/uploads/${fotoNombre}`
}