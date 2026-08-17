import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const TOKEN_KEY = 'capacitor_web_token'

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

export async function listarIdsTrabajo() {
  const response = await api.get('/catalogos/ids-trabajo')
  return response.data
}

export async function ocultarIdTrabajo(idTrabajo) {
  await api.delete('/catalogos/ids-trabajo', { params: { id_trabajo: idTrabajo } })
}

export async function listarLocaciones() {
  const response = await api.get('/catalogos/locaciones')
  return response.data
}

export async function ocultarLocacion(locacion) {
  await api.delete('/catalogos/locaciones', { params: { locacion } })
}

export async function listarInspectores() {
  const response = await api.get('/catalogos/inspectores')
  return response.data
}

/**
 * filtros: { proyecto, idTrabajo, sinIdTrabajo, locacion, sinLocacion, procesoId, inspectorId, fechaDesde, fechaHasta, q }
 */
export async function listarReportes(filtros = {}) {
  const params = {}
  if (filtros.proyecto) params.proyecto = filtros.proyecto
  if (filtros.sinIdTrabajo) {
    params.sin_id_trabajo = true
  } else if (filtros.idTrabajo) {
    params.id_trabajo = filtros.idTrabajo
  }
  if (filtros.sinLocacion) {
    params.sin_locacion = true
  } else if (filtros.locacion) {
    params.locacion = filtros.locacion
  }
  if (filtros.procesoId) params.proceso_id = filtros.procesoId
  if (filtros.inspectorId) params.inspector_id = filtros.inspectorId
  if (filtros.fechaDesde) params.fecha_desde = filtros.fechaDesde
  if (filtros.fechaHasta) params.fecha_hasta = filtros.fechaHasta
  if (filtros.q) params.q = filtros.q

  const response = await api.get('/reportes/', { params })
  return response.data
}

export async function eliminarReporte(reporteId) {
  await api.delete(`/reportes/${reporteId}`)
}

export async function asignarIdTrabajo(reporteId, idTrabajo) {
  const response = await api.patch(`/reportes/${reporteId}/id-trabajo`, {
    id_trabajo: idTrabajo,
  })
  return response.data
}

export async function asignarLocacion(reporteId, locacion) {
  const response = await api.patch(`/reportes/${reporteId}/locacion`, { locacion })
  return response.data
}

export async function editarIdTrabajo(idActual, idNuevo) {
  const response = await api.patch('/reportes/id-trabajo', {
    id_trabajo_actual: idActual,
    id_trabajo_nuevo: idNuevo,
  })
  return response.data
}

export async function editarLocacion(locacionActual, locacionNueva) {
  const response = await api.patch('/reportes/locacion', {
    locacion_actual: locacionActual,
    locacion_nueva: locacionNueva,
  })
  return response.data
}

export async function editarProyecto(proyectoActual, proyectoNuevo) {
  const response = await api.patch('/reportes/proyecto', {
    proyecto_actual: proyectoActual,
    proyecto_nuevo: proyectoNuevo,
  })
  return response.data
}

export async function editarReporte(reporteId, { procesoId, comentario } = {}) {
  const payload = {}
  if (procesoId !== undefined) payload.proceso_id = procesoId
  if (comentario !== undefined) payload.comentario = comentario
  const response = await api.patch(`/reportes/${reporteId}`, payload)
  return response.data
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

/**
 * FastAPI manda `detail` como string en errores de negocio (403, 404, etc.)
 * pero como un arreglo de objetos {type, loc, msg, ...} en errores 422 de
 * validación. Esta función normaliza ambos casos a un string mostrable.
 */
export function extraerMensajeError(err, fallback) {
  const detail = err?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        const campo = Array.isArray(item?.loc) ? item.loc.at(-1) : null
        return campo ? `${campo}: ${item.msg}` : item?.msg
      })
      .filter(Boolean)
      .join('; ') || fallback
  }
  return fallback
}

export function urlFoto(fotoNombre) {
  return `${API_URL}/uploads/${fotoNombre}`
}

export async function crearRegistroFpyRwk(datos) {
  const response = await api.post('/fpy-rwk/', datos)
  return response.data
}

export async function actualizarRegistroFpyRwk(id, datos) {
  const response = await api.put(`/fpy-rwk/${id}`, datos)
  return response.data
}

export async function listarRegistrosFpyRwk() {
  const response = await api.get('/fpy-rwk/')
  return response.data
}

export async function eliminarRegistroFpyRwk(id) {
  await api.delete(`/fpy-rwk/${id}`)
}
