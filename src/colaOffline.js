// Cola de reportes capturados sin señal (ej. dentro de los tanques, donde
// se pierde hasta la VPN). Se guardan en el dispositivo con Preferences
// (funciona igual en web con localStorage, y en Android con SharedPreferences)
// y se intentan enviar solos en cuanto vuelve la conexión.
import { Preferences } from '@capacitor/preferences'
import { crearReporte } from './api'

const CLAVE_COLA = 'reportes_pendientes'
const CLAVE_CATALOGOS = 'catalogos_cache'

function idLocal() {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export async function listarPendientes() {
  const { value } = await Preferences.get({ key: CLAVE_COLA })
  return value ? JSON.parse(value) : []
}

async function guardarCola(cola) {
  await Preferences.set({ key: CLAVE_COLA, value: JSON.stringify(cola) })
}

export async function encolarReporte(datos) {
  const cola = await listarPendientes()
  const pendiente = { ...datos, idLocal: idLocal(), creadoEn: new Date().toISOString() }
  cola.push(pendiente)
  await guardarCola(cola)
  return pendiente
}

export async function quitarPendiente(idLocalABorrar) {
  const cola = await listarPendientes()
  const restante = cola.filter((r) => r.idLocal !== idLocalABorrar)
  await guardarCola(restante)
  return restante
}

// axios no pone `response` cuando la petición nunca llegó a contestarse
// (sin red, timeout): eso es justo lo que va a la cola. Un 400/401/etc. sí
// tiene `response` — es un error real (foto invalida, sesion vencida...)
// que hay que mostrarle al usuario, no reintentarlo solo para siempre.
function esErrorDeRed(err) {
  return !err?.response
}

/**
 * Intenta enviar un reporte. Si hay conexión y se envía bien, regresa
 * {enviado: true, resultado}. Si no hay conexión, o si había pero la
 * petición no pudo completarse (se cortó la señal a medio envío), lo
 * guarda en la cola y regresa {enviado: false, encolado: true}. Cualquier
 * otro error (validación, sesión vencida) se vuelve a lanzar para que la
 * pantalla lo muestre.
 */
export async function enviarOEncolar(datos, conectado) {
  if (conectado) {
    try {
      const resultado = await crearReporte(datos)
      return { enviado: true, resultado }
    } catch (err) {
      if (!esErrorDeRed(err)) throw err
    }
  }
  await encolarReporte(datos)
  return { enviado: false, encolado: true }
}

let drenando = false

/**
 * Recorre la cola en orden e intenta enviar cada reporte pendiente. Se
 * detiene en el primer error (servidor caído, sesión vencida...) para no
 * insistir contra algo que sigue fallando — el resto se queda en la cola
 * para el siguiente intento. Nunca corre dos veces al mismo tiempo (si el
 * chequeo de conexión dispara un intento mientras el anterior sigue
 * enviando fotos, el segundo simplemente no hace nada).
 */
export async function drenarCola() {
  if (drenando) return 0
  drenando = true
  let enviados = 0
  try {
    const cola = await listarPendientes()
    for (const pendiente of cola) {
      try {
        const datos = { ...pendiente }
        delete datos.idLocal
        delete datos.creadoEn
        await crearReporte(datos)
        await quitarPendiente(pendiente.idLocal)
        enviados += 1
      } catch {
        break
      }
    }
  } finally {
    drenando = false
  }
  return enviados
}

export async function guardarCatalogosCache(catalogos) {
  await Preferences.set({ key: CLAVE_CATALOGOS, value: JSON.stringify(catalogos) })
}

export async function obtenerCatalogosCache() {
  const { value } = await Preferences.get({ key: CLAVE_CATALOGOS })
  return value ? JSON.parse(value) : null
}
