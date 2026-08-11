// Espejo en JS de las 33 fórmulas de app/schemas.py (RegistroFpyRwkCalculado)
// del backend. Solo para previsualizar en vivo mientras se captura el
// formulario — el backend sigue siendo la fuente de verdad al guardar.

// Mismos colores que el bloque de subtotales del Excel (una columna por etapa).
export const ETAPAS = [
  {
    id: 'armado',
    titulo: 'Armado',
    color: { bg: '#e8f5e9', bgHeader: '#a5d6a7', text: '#1b5e20' },
    defectos: [
      { campo: 'armado_apertura', label: 'Apertura -3mm + 6mm' },
      { campo: 'armado_bisel', label: 'Bisel -30° + 35°' },
      { campo: 'armado_rugosidad_corte', label: 'Rugosidad de corte -1.5mm' },
      { campo: 'armado_amarres', label: 'Amarres' },
    ],
  },
  {
    id: 'sol_inicial',
    titulo: 'Soldadura inicial',
    color: { bg: '#fffde7', bgHeader: '#fff59d', text: '#7f6000' },
    defectos: [
      { campo: 'sol_inicial_poros', label: 'Poros' },
      { campo: 'sol_inicial_grietas', label: 'Grietas' },
      { campo: 'sol_inicial_socavaciones', label: 'Socavaciones -1mm' },
    ],
  },
  {
    id: 'raiz',
    titulo: 'Raíz',
    color: { bg: '#e3f2fd', bgHeader: '#90caf9', text: '#0d47a1' },
    defectos: [
      { campo: 'raiz_grietas', label: 'Grietas' },
      { campo: 'raiz_poros', label: 'Poros' },
      { campo: 'raiz_penetracion_incompleta', label: 'Penetración incompleta' },
      { campo: 'raiz_escoria', label: 'Escoria' },
    ],
  },
  {
    id: 'sol_final',
    titulo: 'Soldadura final',
    color: { bg: '#fbe9e7', bgHeader: '#ffab91', text: '#bf360c' },
    defectos: [
      { campo: 'sol_final_poros', label: 'Poros' },
      { campo: 'sol_final_grietas', label: 'Grietas' },
      { campo: 'sol_final_socavaciones', label: 'Socavaciones -1mm' },
      { campo: 'sol_final_rematas', label: 'Remates' },
      { campo: 'sol_final_amarres', label: 'Amarres' },
      { campo: 'sol_final_lof', label: 'Falta de fusión (LOF) entre cordones' },
    ],
  },
]

export const CAMPOS_DEFECTO = ETAPAS.flatMap((e) => e.defectos.map((d) => d.campo))

function pct(defecto, area) {
  if (defecto === null || defecto === undefined || defecto === '') return null
  return 1 - Number(defecto) / area
}

/**
 * datos: objeto con area_metros + los 17 campos de defecto (number|''|null)
 * Devuelve un objeto con los 33 valores calculados (mismas keys que el backend).
 */
export function calcularFpyRwk(datos) {
  const area = Number(datos.area_metros) || 0
  const resultado = {}

  for (const etapa of ETAPAS) {
    let rwk = 0
    let tieneDatos = false
    for (const { campo } of etapa.defectos) {
      const valor = datos[campo]
      resultado[`${campo}_pct`] = area > 0 ? pct(valor, area) : null
      if (valor !== '' && valor !== null && valor !== undefined) {
        tieneDatos = true
        rwk += Number(valor)
      }
    }
    // Etapa no evaluada (todos sus campos vacíos): no la contamos como
    // "0% RWK / 100% FPY" porque no significa que salió perfecta, sino
    // que ni siquiera se inspeccionó.
    if (!tieneDatos) {
      resultado[`${etapa.id}_rwk`] = null
      resultado[`${etapa.id}_aceptacion`] = null
      resultado[`${etapa.id}_pct_rwk`] = null
      resultado[`${etapa.id}_pct_fpy`] = null
      continue
    }
    const aceptacion = area - rwk
    resultado[`${etapa.id}_rwk`] = rwk
    resultado[`${etapa.id}_aceptacion`] = aceptacion
    resultado[`${etapa.id}_pct_rwk`] = area > 0 ? rwk / area : null
    resultado[`${etapa.id}_pct_fpy`] = area > 0 ? aceptacion / area : null
  }

  return resultado
}

export const META_FPY = 0.8 // FPY debe ser mayor a 80%
export const META_RWK = 0.8 // RWK debe ser menor a 80%

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function promedio(valores) {
  return valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null
}

// Espejo de las columnas BJ7:BN7 (% RWK por fecha) y BJ36:BN36 (% FPY por
// fecha) del Excel: promedio de % RWK y % FPY por etapa, agrupado por fecha
// (cada fecha puede tener varios registros/soldadores). A diferencia del
// Excel, aquí % RWK y % FPY siempre salen de los mismos registros agrupados,
// así que son complementarios (suman 100%) en vez de arrastrar rangos de
// fórmula distintos y desalineados entre las dos tablas.
export function agruparPromediosPorFecha(registros) {
  const grupos = new Map()
  for (const r of registros) {
    if (!grupos.has(r.fecha)) grupos.set(r.fecha, [])
    grupos.get(r.fecha).push(r)
  }
  return Array.from(grupos.entries())
    .sort(([fechaA], [fechaB]) => (fechaA < fechaB ? 1 : -1))
    .map(([fecha, items]) => {
      const fila = { fecha }
      for (const etapa of ETAPAS) {
        const valoresRwk = items
          .map((r) => r[`${etapa.id}_pct_rwk`])
          .filter((v) => v !== null && v !== undefined)
        const valoresFpy = items
          .map((r) => r[`${etapa.id}_pct_fpy`])
          .filter((v) => v !== null && v !== undefined)
        fila[`${etapa.id}_rwk`] = promedio(valoresRwk)
        fila[`${etapa.id}_fpy`] = promedio(valoresFpy)
      }
      return fila
    })
}

// Promedio de las etapas que sí tuvieron datos capturados en un registro
// (ignora las que no se evaluaron, en vez de contarlas como 0/100%).
export function promedioEtapasRegistro(registro, sufijo) {
  const valores = ETAPAS.map((e) => registro[`${e.id}${sufijo}`]).filter(
    (v) => v !== null && v !== undefined
  )
  return valores.length ? promedio(valores) : null
}

// Espejo de la hoja "Grafico FPY-RWK": % FPY y % RWK promedio (todas las
// etapas combinadas) agrupado por mes, para comparar contra la meta de 80%.
export function agruparPromediosPorMes(registros) {
  const grupos = new Map()
  for (const r of registros) {
    if (!r.fecha) continue
    const clave = r.fecha.slice(0, 7) // 'YYYY-MM'
    if (!grupos.has(clave)) grupos.set(clave, [])
    grupos.get(clave).push(r)
  }
  return Array.from(grupos.entries())
    .sort(([claveA], [claveB]) => (claveA < claveB ? -1 : 1))
    .map(([clave, items]) => {
      const [anio, mes] = clave.split('-')
      const fpyPorRegistro = items
        .map((r) => promedioEtapasRegistro(r, '_pct_fpy'))
        .filter((v) => v !== null)
      const rwkPorRegistro = items
        .map((r) => promedioEtapasRegistro(r, '_pct_rwk'))
        .filter((v) => v !== null)
      return {
        clave,
        label: `${MESES[Number(mes) - 1]} ${anio}`,
        fpy: promedio(fpyPorRegistro),
        rwk: promedio(rwkPorRegistro),
      }
    })
}
