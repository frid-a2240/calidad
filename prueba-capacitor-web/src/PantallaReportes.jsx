import {
  Box,
  Stack,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Autocomplete,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  PhotoLibrary as PhotoLibraryIcon,
  DeleteOutlined as DeleteOutlineIcon,
  FilterAltOutlined as FilterAltOutlinedIcon,
  AssignmentOutlined as AssignmentOutlinedIcon,
  FactCheckOutlined as FactCheckOutlinedIcon,
  FolderOutlined as FolderOutlinedIcon,
  ArrowBackOutlined as ArrowBackOutlinedIcon,
  EditOutlined as EditOutlinedIcon,
} from '@mui/icons-material'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  listarReportes,
  listarProcesos,
  listarProyectos,
  listarIdsTrabajo,
  listarLocaciones,
  listarInspectores,
  eliminarReporte,
  asignarIdTrabajo,
  asignarLocacion,
  editarIdTrabajo,
  editarLocacion,
  editarProyecto,
  editarReporte,
  ocultarProyecto,
  ocultarIdTrabajo,
  ocultarLocacion,
  urlFoto,
  extraerMensajeError,
} from './api'

const FILTROS_VACIOS = {
  proyecto: '',
  idTrabajo: '',
  sinIdTrabajo: false,
  locacion: '',
  sinLocacion: false,
  procesoId: '',
  inspectorId: '',
  fechaDesde: '',
  fechaHasta: '',
  q: '',
}

const CLAVE_SIN_LOCACION = '__sin_locacion__'

function agruparPorLocacion(reportes) {
  const grupos = new Map()
  const sinLocacion = []

  for (const r of reportes) {
    if (!r.locacion) {
      sinLocacion.push(r)
      continue
    }
    if (!grupos.has(r.locacion)) grupos.set(r.locacion, [])
    grupos.get(r.locacion).push(r)
  }

  const masReciente = (items) =>
    items.reduce((a, b) => (a.fecha_creacion > b.fecha_creacion ? a : b))

  const carpetas = Array.from(grupos.entries()).map(([locacion, items]) => {
    const ultimo = masReciente(items)
    return {
      clave: locacion,
      locacion,
      idTrabajo: ultimo.id_trabajo,
      proyecto: ultimo.proyecto,
      total: items.length,
      fechaUltima: ultimo.fecha_creacion,
      sinLocacion: false,
    }
  })
  carpetas.sort((a, b) => (a.fechaUltima < b.fechaUltima ? 1 : -1))

  if (sinLocacion.length > 0) {
    const ultimo = masReciente(sinLocacion)
    carpetas.push({
      clave: CLAVE_SIN_LOCACION,
      locacion: null,
      idTrabajo: null,
      proyecto: null,
      total: sinLocacion.length,
      fechaUltima: ultimo.fecha_creacion,
      sinLocacion: true,
    })
  }

  return carpetas
}

function coloresAvatar(nombre) {
  const paletas = [
    { bg: '#0d3b66', fg: '#ffffff' },
    { bg: '#0d9488', fg: '#ffffff' },
    { bg: '#c62828', fg: '#ffffff' },
    { bg: '#e6a817', fg: '#1a2332' },
    { bg: '#4a6fa5', fg: '#ffffff' },
    { bg: '#2e7d5b', fg: '#ffffff' },
  ]
  let hash = 0
  for (let i = 0; i < nombre.length; i++) {
    hash = nombre.charCodeAt(i) + ((hash << 5) - hash)
  }
  return paletas[Math.abs(hash) % paletas.length]
}

export default function PantallaReportes({ usuario }) {
  const [procesos, setProcesos] = useState([])
  const [proyectosSugeridos, setProyectosSugeridos] = useState([])
  const [idsTrabajoSugeridos, setIdsTrabajoSugeridos] = useState([])
  const [locacionesSugeridas, setLocacionesSugeridas] = useState([])
  const [inspectores, setInspectores] = useState([])

  const [vista, setVista] = useState('carpetas') // 'carpetas' | 'tabla'
  const [filtros, setFiltros] = useState(FILTROS_VACIOS)
  const [filtrosAplicados, setFiltrosAplicados] = useState(FILTROS_VACIOS)

  const [reportes, setReportes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const [reporteAbierto, setReporteAbierto] = useState(null)
  const [fotoAmpliada, setFotoAmpliada] = useState(null)
  const [reporteAEliminar, setReporteAEliminar] = useState(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState(null)

  const [reporteParaId, setReporteParaId] = useState(null)
  const [valorIdNuevo, setValorIdNuevo] = useState('')
  const [asignandoId, setAsignandoId] = useState(false)
  const [errorAsignarId, setErrorAsignarId] = useState(null)

  const [reporteParaLocacion, setReporteParaLocacion] = useState(null)
  const [valorLocacionNuevo, setValorLocacionNuevo] = useState('')
  const [asignandoLocacion, setAsignandoLocacion] = useState(false)
  const [errorAsignarLocacion, setErrorAsignarLocacion] = useState(null)

  const [idParaEditar, setIdParaEditar] = useState(null)
  const [valorIdEditado, setValorIdEditado] = useState('')
  const [editandoId, setEditandoId] = useState(false)
  const [errorEditarId, setErrorEditarId] = useState(null)

  const [proyectoParaEditar, setProyectoParaEditar] = useState(null)
  const [valorProyectoEditado, setValorProyectoEditado] = useState('')
  const [editandoProyecto, setEditandoProyecto] = useState(false)
  const [errorEditarProyecto, setErrorEditarProyecto] = useState(null)

  const [locacionParaEditar, setLocacionParaEditar] = useState(null)
  const [valorLocacionEditada, setValorLocacionEditada] = useState('')
  const [editandoLocacion, setEditandoLocacion] = useState(false)
  const [errorEditarLocacion, setErrorEditarLocacion] = useState(null)

  const [reporteParaProceso, setReporteParaProceso] = useState(null)
  const [valorProcesoEditado, setValorProcesoEditado] = useState('')
  const [editandoProceso, setEditandoProceso] = useState(false)
  const [errorEditarProceso, setErrorEditarProceso] = useState(null)

  const [reporteParaComentario, setReporteParaComentario] = useState(null)
  const [valorComentarioEditado, setValorComentarioEditado] = useState('')
  const [editandoComentario, setEditandoComentario] = useState(false)
  const [errorEditarComentario, setErrorEditarComentario] = useState(null)

  useEffect(() => {
    const cargarCatalogos = async () => {
      try {
        const [datosProcesos, datosProyectos, datosIdsTrabajo, datosLocaciones, datosInspectores] =
          await Promise.all([
            listarProcesos(),
            listarProyectos(),
            listarIdsTrabajo(),
            listarLocaciones(),
            listarInspectores(),
          ])
        setProcesos(datosProcesos)
        setProyectosSugeridos(datosProyectos)
        setIdsTrabajoSugeridos(datosIdsTrabajo)
        setLocacionesSugeridas(datosLocaciones)
        setInspectores(datosInspectores)
      } catch {
        // los catálogos son solo para los selects de filtro; si fallan,
        // los filtros por proyecto/proceso/inspector simplemente no se muestran poblados
      }
    }
    cargarCatalogos()
  }, [])

  const cargarReportes = useCallback(async (filtrosParaBuscar) => {
    setCargando(true)
    setError(null)
    try {
      const data = await listarReportes(filtrosParaBuscar)
      setReportes(data)
    } catch (err) {
      setError(extraerMensajeError(err, 'No se pudieron cargar los reportes'))
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    const iniciar = async () => {
      await cargarReportes(FILTROS_VACIOS)
    }
    iniciar()
  }, [cargarReportes])

  const carpetas = useMemo(() => agruparPorLocacion(reportes), [reportes])

  const idTrabajoDeVista = useMemo(() => {
    if (vista !== 'tabla' || reportes.length === 0) return null
    const ids = new Set(reportes.map((r) => r.id_trabajo).filter(Boolean))
    return ids.size === 1 ? [...ids][0] : null
  }, [vista, reportes])

  const buscar = (e) => {
    e?.preventDefault()
    setFiltrosAplicados(filtros)
    setVista('tabla')
    cargarReportes(filtros)
  }

  const limpiarFiltros = () => {
    setFiltros(FILTROS_VACIOS)
    setFiltrosAplicados(FILTROS_VACIOS)
    setVista('tabla')
    cargarReportes(FILTROS_VACIOS)
  }

  const abrirCarpeta = (carpeta) => {
    const nuevosFiltros = {
      ...FILTROS_VACIOS,
      locacion: carpeta.sinLocacion ? '' : carpeta.locacion,
      sinLocacion: carpeta.sinLocacion,
    }
    setFiltros(nuevosFiltros)
    setFiltrosAplicados(nuevosFiltros)
    setVista('tabla')
    cargarReportes(nuevosFiltros)
  }

  const volverACarpetas = () => {
    setFiltros(FILTROS_VACIOS)
    setFiltrosAplicados(FILTROS_VACIOS)
    setVista('carpetas')
    cargarReportes(FILTROS_VACIOS)
  }

  const hayFiltrosActivos = Object.values(filtrosAplicados).some(Boolean)

  const borrarSugerenciaProyecto = async (nombre, e) => {
    e.stopPropagation()
    setProyectosSugeridos((prev) => prev.filter((p) => p !== nombre))
    try {
      await ocultarProyecto(nombre)
    } catch {
      setProyectosSugeridos((prev) => (prev.includes(nombre) ? prev : [...prev, nombre]))
    }
  }

  const borrarSugerenciaIdTrabajo = async (id, e) => {
    e.stopPropagation()
    setIdsTrabajoSugeridos((prev) => prev.filter((i) => i !== id))
    try {
      await ocultarIdTrabajo(id)
    } catch {
      setIdsTrabajoSugeridos((prev) => (prev.includes(id) ? prev : [...prev, id]))
    }
  }

  const borrarSugerenciaLocacion = async (nombre, e) => {
    e.stopPropagation()
    setLocacionesSugeridas((prev) => prev.filter((l) => l !== nombre))
    try {
      await ocultarLocacion(nombre)
    } catch {
      setLocacionesSugeridas((prev) => (prev.includes(nombre) ? prev : [...prev, nombre]))
    }
  }

  const abrirAsignarId = (reporte, e) => {
    e?.stopPropagation()
    setErrorAsignarId(null)
    setValorIdNuevo('')
    setReporteParaId(reporte)
  }

  const confirmarAsignarId = async () => {
    if (!reporteParaId) return
    const idLimpio = valorIdNuevo.trim()
    if (!idLimpio) {
      setErrorAsignarId('Escribe un ID de trabajo')
      return
    }
    setAsignandoId(true)
    setErrorAsignarId(null)
    try {
      const actualizado = await asignarIdTrabajo(reporteParaId.id, idLimpio)
      setReportes((prev) => prev.map((r) => (r.id === actualizado.id ? actualizado : r)))
      if (reporteAbierto?.id === actualizado.id) setReporteAbierto(actualizado)
      setIdsTrabajoSugeridos((prev) => (prev.includes(idLimpio) ? prev : [idLimpio, ...prev]))
      setReporteParaId(null)
    } catch (err) {
      setErrorAsignarId(extraerMensajeError(err, 'No se pudo asignar el ID de trabajo'))
    } finally {
      setAsignandoId(false)
    }
  }

  const abrirAsignarLocacion = (reporte, e) => {
    e?.stopPropagation()
    setErrorAsignarLocacion(null)
    setValorLocacionNuevo('')
    setReporteParaLocacion(reporte)
  }

  const confirmarAsignarLocacion = async () => {
    if (!reporteParaLocacion) return
    const locacionLimpia = valorLocacionNuevo.trim()
    if (!locacionLimpia) {
      setErrorAsignarLocacion('Escribe una locación')
      return
    }
    setAsignandoLocacion(true)
    setErrorAsignarLocacion(null)
    try {
      const actualizado = await asignarLocacion(reporteParaLocacion.id, locacionLimpia)
      setReportes((prev) => prev.map((r) => (r.id === actualizado.id ? actualizado : r)))
      if (reporteAbierto?.id === actualizado.id) setReporteAbierto(actualizado)
      setLocacionesSugeridas((prev) =>
        prev.includes(locacionLimpia) ? prev : [locacionLimpia, ...prev]
      )
      setReporteParaLocacion(null)
    } catch (err) {
      setErrorAsignarLocacion(extraerMensajeError(err, 'No se pudo asignar la locación'))
    } finally {
      setAsignandoLocacion(false)
    }
  }

  const abrirEditarId = (idActual, e) => {
    e?.stopPropagation()
    setErrorEditarId(null)
    setValorIdEditado(idActual)
    setIdParaEditar(idActual)
  }

  const confirmarEditarId = async () => {
    if (!idParaEditar) return
    const idNuevo = valorIdEditado.trim()
    if (!idNuevo) {
      setErrorEditarId('Escribe un ID de trabajo')
      return
    }
    if (idNuevo === idParaEditar) {
      setErrorEditarId('El nuevo ID debe ser distinto al actual')
      return
    }
    setEditandoId(true)
    setErrorEditarId(null)
    try {
      await editarIdTrabajo(idParaEditar, idNuevo)
      setReportes((prev) =>
        prev.map((r) => (r.id_trabajo === idParaEditar ? { ...r, id_trabajo: idNuevo } : r))
      )
      setReporteAbierto((prev) =>
        prev && prev.id_trabajo === idParaEditar ? { ...prev, id_trabajo: idNuevo } : prev
      )
      setIdsTrabajoSugeridos((prev) => {
        const sinViejo = prev.filter((i) => i !== idParaEditar)
        return sinViejo.includes(idNuevo) ? sinViejo : [idNuevo, ...sinViejo]
      })
      if (filtrosAplicados.idTrabajo === idParaEditar) {
        setFiltros((prev) => ({ ...prev, idTrabajo: idNuevo }))
        setFiltrosAplicados((prev) => ({ ...prev, idTrabajo: idNuevo }))
      }
      setIdParaEditar(null)
    } catch (err) {
      setErrorEditarId(extraerMensajeError(err, 'No se pudo editar el ID de trabajo'))
    } finally {
      setEditandoId(false)
    }
  }

  const abrirEditarProyecto = (proyectoActual, e) => {
    e?.stopPropagation()
    setErrorEditarProyecto(null)
    setValorProyectoEditado(proyectoActual)
    setProyectoParaEditar(proyectoActual)
  }

  const confirmarEditarProyecto = async () => {
    if (!proyectoParaEditar) return
    const nuevo = valorProyectoEditado.trim()
    if (!nuevo) {
      setErrorEditarProyecto('Escribe un proyecto')
      return
    }
    if (nuevo === proyectoParaEditar) {
      setErrorEditarProyecto('El nuevo proyecto debe ser distinto al actual')
      return
    }
    setEditandoProyecto(true)
    setErrorEditarProyecto(null)
    try {
      await editarProyecto(proyectoParaEditar, nuevo)
      setReportes((prev) =>
        prev.map((r) => (r.proyecto === proyectoParaEditar ? { ...r, proyecto: nuevo } : r))
      )
      setReporteAbierto((prev) =>
        prev && prev.proyecto === proyectoParaEditar ? { ...prev, proyecto: nuevo } : prev
      )
      setProyectosSugeridos((prev) => {
        const sinViejo = prev.filter((p) => p !== proyectoParaEditar)
        return sinViejo.includes(nuevo) ? sinViejo : [nuevo, ...sinViejo]
      })
      if (filtrosAplicados.proyecto === proyectoParaEditar) {
        setFiltros((prev) => ({ ...prev, proyecto: nuevo }))
        setFiltrosAplicados((prev) => ({ ...prev, proyecto: nuevo }))
      }
      setProyectoParaEditar(null)
    } catch (err) {
      setErrorEditarProyecto(extraerMensajeError(err, 'No se pudo editar el proyecto'))
    } finally {
      setEditandoProyecto(false)
    }
  }

  const abrirEditarLocacion = (locacionActual, e) => {
    e?.stopPropagation()
    setErrorEditarLocacion(null)
    setValorLocacionEditada(locacionActual)
    setLocacionParaEditar(locacionActual)
  }

  const confirmarEditarLocacion = async () => {
    if (!locacionParaEditar) return
    const nueva = valorLocacionEditada.trim()
    if (!nueva) {
      setErrorEditarLocacion('Escribe una locación')
      return
    }
    if (nueva === locacionParaEditar) {
      setErrorEditarLocacion('La nueva locación debe ser distinta a la actual')
      return
    }
    setEditandoLocacion(true)
    setErrorEditarLocacion(null)
    try {
      await editarLocacion(locacionParaEditar, nueva)
      setReportes((prev) =>
        prev.map((r) => (r.locacion === locacionParaEditar ? { ...r, locacion: nueva } : r))
      )
      setReporteAbierto((prev) =>
        prev && prev.locacion === locacionParaEditar ? { ...prev, locacion: nueva } : prev
      )
      setLocacionesSugeridas((prev) => {
        const sinVieja = prev.filter((l) => l !== locacionParaEditar)
        return sinVieja.includes(nueva) ? sinVieja : [nueva, ...sinVieja]
      })
      if (filtrosAplicados.locacion === locacionParaEditar) {
        setFiltros((prev) => ({ ...prev, locacion: nueva }))
        setFiltrosAplicados((prev) => ({ ...prev, locacion: nueva }))
      }
      setLocacionParaEditar(null)
    } catch (err) {
      setErrorEditarLocacion(extraerMensajeError(err, 'No se pudo editar la locación'))
    } finally {
      setEditandoLocacion(false)
    }
  }

  const abrirEditarProceso = (reporte, e) => {
    e?.stopPropagation()
    setErrorEditarProceso(null)
    setValorProcesoEditado(reporte.proceso.id)
    setReporteParaProceso(reporte)
  }

  const confirmarEditarProceso = async () => {
    if (!reporteParaProceso) return
    if (!valorProcesoEditado) {
      setErrorEditarProceso('Elige un proceso')
      return
    }
    setEditandoProceso(true)
    setErrorEditarProceso(null)
    try {
      const actualizado = await editarReporte(reporteParaProceso.id, {
        procesoId: valorProcesoEditado,
      })
      setReportes((prev) => prev.map((r) => (r.id === actualizado.id ? actualizado : r)))
      if (reporteAbierto?.id === actualizado.id) setReporteAbierto(actualizado)
      setReporteParaProceso(null)
    } catch (err) {
      setErrorEditarProceso(extraerMensajeError(err, 'No se pudo editar el proceso'))
    } finally {
      setEditandoProceso(false)
    }
  }

  const abrirEditarComentario = (reporte, e) => {
    e?.stopPropagation()
    setErrorEditarComentario(null)
    setValorComentarioEditado(reporte.comentario || '')
    setReporteParaComentario(reporte)
  }

  const confirmarEditarComentario = async () => {
    if (!reporteParaComentario) return
    setEditandoComentario(true)
    setErrorEditarComentario(null)
    try {
      const actualizado = await editarReporte(reporteParaComentario.id, {
        comentario: valorComentarioEditado.trim(),
      })
      setReportes((prev) => prev.map((r) => (r.id === actualizado.id ? actualizado : r)))
      if (reporteAbierto?.id === actualizado.id) setReporteAbierto(actualizado)
      setReporteParaComentario(null)
    } catch (err) {
      setErrorEditarComentario(extraerMensajeError(err, 'No se pudo editar los hallazgos'))
    } finally {
      setEditandoComentario(false)
    }
  }

  const confirmarEliminar = async () => {
    if (!reporteAEliminar) return
    setEliminando(true)
    setErrorEliminar(null)
    try {
      await eliminarReporte(reporteAEliminar.id)
      setReportes((prev) => prev.filter((r) => r.id !== reporteAEliminar.id))
      if (reporteAbierto?.id === reporteAEliminar.id) setReporteAbierto(null)
      setReporteAEliminar(null)
    } catch (err) {
      setErrorEliminar(extraerMensajeError(err, 'No se pudo eliminar el reporte'))
    } finally {
      setEliminando(false)
    }
  }

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2.5,
            bgcolor: 'primary.main',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <AssignmentOutlinedIcon />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ lineHeight: 1.15 }}>
            Reportes
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            component="div"
            sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.25 }}
          >
            <span>
              {vista === 'carpetas'
                ? `${carpetas.length} ${carpetas.length === 1 ? 'carpeta' : 'carpetas'} por locación`
                : `${reportes.length} ${reportes.length === 1 ? 'reporte encontrado' : 'reportes encontrados'}`}
            </span>
            {vista === 'tabla' && idTrabajoDeVista && (
              <>
                <span>· ID {idTrabajoDeVista}</span>
                <IconButton size="small" onClick={(e) => abrirEditarId(idTrabajoDeVista, e)}>
                  <EditOutlinedIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </>
            )}
            {vista === 'tabla' && hayFiltrosActivos && <span>· filtros activos</span>}
          </Typography>
        </Box>
      </Stack>

      <Card>
        <CardContent sx={{ p: 2.5 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
            <FilterAltOutlinedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ fontWeight: 700, letterSpacing: 0.5 }}
            >
              Filtros
            </Typography>
          </Stack>
          <Box component="form" onSubmit={buscar} sx={{ mt: 1 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ flexWrap: 'wrap' }}>
              <Autocomplete
                freeSolo
                options={proyectosSugeridos}
                value={filtros.proyecto}
                onInputChange={(e, valorNuevo) =>
                  setFiltros((prev) => ({ ...prev, proyecto: valorNuevo }))
                }
                sx={{ minWidth: 200, flex: 1 }}
                renderOption={(props, option) => {
                  const { key, ...optionProps } = props
                  return (
                    <Box
                      key={key}
                      component="li"
                      {...optionProps}
                      sx={{
                        display: 'flex !important',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {option}
                      </Box>
                      <IconButton
                        size="small"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                        }}
                        onClick={(e) => borrarSugerenciaProyecto(option, e)}
                      >
                        <CloseIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                  )
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Proyecto" size="small" />
                )}
              />

              <Autocomplete
                freeSolo
                options={locacionesSugeridas}
                value={filtros.locacion}
                onInputChange={(e, valorNuevo) =>
                  setFiltros((prev) => ({ ...prev, locacion: valorNuevo, sinLocacion: false }))
                }
                sx={{ minWidth: 160 }}
                renderOption={(props, option) => {
                  const { key, ...optionProps } = props
                  return (
                    <Box
                      key={key}
                      component="li"
                      {...optionProps}
                      sx={{
                        display: 'flex !important',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {option}
                      </Box>
                      <IconButton
                        size="small"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                        }}
                        onClick={(e) => borrarSugerenciaLocacion(option, e)}
                      >
                        <CloseIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                  )
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Locación" placeholder="Ej. Tanque 4" size="small" />
                )}
              />

              <Autocomplete
                freeSolo
                options={idsTrabajoSugeridos}
                value={filtros.idTrabajo}
                onInputChange={(e, valorNuevo) =>
                  setFiltros((prev) => ({ ...prev, idTrabajo: valorNuevo, sinIdTrabajo: false }))
                }
                sx={{ minWidth: 160 }}
                renderOption={(props, option) => {
                  const { key, ...optionProps } = props
                  return (
                    <Box
                      key={key}
                      component="li"
                      {...optionProps}
                      sx={{
                        display: 'flex !important',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {option}
                      </Box>
                      <IconButton
                        size="small"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                        }}
                        onClick={(e) => borrarSugerenciaIdTrabajo(option, e)}
                      >
                        <CloseIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                  )
                }}
                renderInput={(params) => (
                  <TextField {...params} label="ID de trabajo" size="small" />
                )}
              />

              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel id="filtro-proceso-label">Proceso</InputLabel>
                <Select
                  labelId="filtro-proceso-label"
                  label="Proceso"
                  value={filtros.procesoId}
                  onChange={(e) =>
                    setFiltros((prev) => ({ ...prev, procesoId: e.target.value }))
                  }
                >
                  <MenuItem value="">Todos</MenuItem>
                  {procesos.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.nombre}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel id="filtro-inspector-label">Inspector</InputLabel>
                <Select
                  labelId="filtro-inspector-label"
                  label="Inspector"
                  value={filtros.inspectorId}
                  onChange={(e) =>
                    setFiltros((prev) => ({ ...prev, inspectorId: e.target.value }))
                  }
                >
                  <MenuItem value="">Todos</MenuItem>
                  {inspectores.map((i) => (
                    <MenuItem key={i.id} value={i.id}>
                      {i.nombre}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              sx={{ mt: 2, flexWrap: 'wrap' }}
            >
              <TextField
                label="Desde"
                type="date"
                size="small"
                value={filtros.fechaDesde}
                onChange={(e) =>
                  setFiltros((prev) => ({ ...prev, fechaDesde: e.target.value }))
                }
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="Hasta"
                type="date"
                size="small"
                value={filtros.fechaHasta}
                onChange={(e) =>
                  setFiltros((prev) => ({ ...prev, fechaHasta: e.target.value }))
                }
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="Buscar en proyecto y hallazgos"
                size="small"
                sx={{ flex: 1, minWidth: 220 }}
                value={filtros.q}
                onChange={(e) => setFiltros((prev) => ({ ...prev, q: e.target.value }))}
              />

              <Stack direction="row" spacing={1}>
                <Button type="submit" variant="contained" startIcon={<SearchIcon />}>
                  Buscar
                </Button>
                {hayFiltrosActivos && (
                  <Button variant="text" startIcon={<ClearIcon />} onClick={limpiarFiltros}>
                    Limpiar
                  </Button>
                )}
              </Stack>
            </Stack>
          </Box>
        </CardContent>
      </Card>

      <Stack
        direction="row"
        sx={{
          justifyContent: vista === 'tabla' ? 'space-between' : 'flex-end',
          alignItems: 'center',
        }}
      >
        {vista === 'tabla' && (
          <Button
            size="small"
            startIcon={<ArrowBackOutlinedIcon fontSize="small" />}
            onClick={volverACarpetas}
          >
            Volver a carpetas
          </Button>
        )}
        <Button
          size="small"
          startIcon={<RefreshIcon fontSize="small" />}
          onClick={() => cargarReportes(vista === 'carpetas' ? FILTROS_VACIOS : filtrosAplicados)}
          disabled={cargando}
        >
          Actualizar
        </Button>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      {vista === 'carpetas' ? (
        cargando && reportes.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : carpetas.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 7 }}>
              <FactCheckOutlinedIcon sx={{ fontSize: 44, color: 'text.disabled', mb: 1 }} />
              <Typography variant="body1" color="text.secondary">
                Aún no hay reportes capturados
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
              },
              gap: 2,
            }}
          >
            {carpetas.map((carpeta) => (
              <Card
                key={carpeta.clave}
                onClick={() => abrirCarpeta(carpeta)}
                sx={{ cursor: 'pointer' }}
              >
                <CardContent
                  sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}
                >
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 2,
                      bgcolor: carpeta.sinLocacion ? 'action.disabledBackground' : 'secondary.main',
                      color: carpeta.sinLocacion ? 'text.secondary' : 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <FolderOutlinedIcon />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700 }} noWrap>
                      {carpeta.sinLocacion ? 'Sin Locación' : carpeta.locacion}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {carpeta.idTrabajo ? `ID ${carpeta.idTrabajo} · ` : ''}
                      {carpeta.total} {carpeta.total === 1 ? 'reporte' : 'reportes'}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )
      ) : cargando && reportes.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : reportes.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 7 }}>
            <FactCheckOutlinedIcon sx={{ fontSize: 44, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body1" color="text.secondary">
              No hay reportes con estos filtros
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table
            size="small"
            sx={{
              '& tbody tr:nth-of-type(odd)': { bgcolor: 'rgba(13, 59, 102, 0.015)' },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell>Proyecto</TableCell>
                <TableCell>Locación</TableCell>
                <TableCell>ID</TableCell>
                <TableCell>Proceso</TableCell>
                <TableCell>Inspector</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell align="center">Fotos</TableCell>
                <TableCell>Hallazgos</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {reportes.map((reporte) => {
                const colores = coloresAvatar(reporte.inspector.nombre)
                const esPropio = reporte.inspector.id === usuario?.id
                return (
                  <TableRow
                    key={reporte.id}
                    hover
                    onClick={() => setReporteAbierto(reporte)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell sx={{ fontWeight: 600 }}>
                      <Stack direction="row" spacing={0} sx={{ alignItems: 'center' }}>
                        <span>{reporte.proyecto}</span>
                        <IconButton
                          size="small"
                          onClick={(e) => abrirEditarProyecto(reporte.proyecto, e)}
                        >
                          <EditOutlinedIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {reporte.locacion ? (
                        <Stack direction="row" spacing={0} sx={{ alignItems: 'center' }}>
                          <span>{reporte.locacion}</span>
                          <IconButton
                            size="small"
                            onClick={(e) => abrirEditarLocacion(reporte.locacion, e)}
                          >
                            <EditOutlinedIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Stack>
                      ) : (
                        <Button size="small" onClick={(e) => abrirAsignarLocacion(reporte, e)}>
                          Asignar Locación
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      {reporte.id_trabajo ? (
                        <Stack direction="row" spacing={0} sx={{ alignItems: 'center' }}>
                          <span>{reporte.id_trabajo}</span>
                          <IconButton
                            size="small"
                            onClick={(e) => abrirEditarId(reporte.id_trabajo, e)}
                          >
                            <EditOutlinedIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Stack>
                      ) : (
                        <Button size="small" onClick={(e) => abrirAsignarId(reporte, e)}>
                          Asignar ID
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0} sx={{ alignItems: 'center' }}>
                        <span>{reporte.proceso.nombre}</span>
                        <IconButton size="small" onClick={(e) => abrirEditarProceso(reporte, e)}>
                          <EditOutlinedIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                        <Avatar
                          sx={{
                            width: 22,
                            height: 22,
                            bgcolor: colores.bg,
                            color: colores.fg,
                            fontSize: '0.65rem',
                            fontWeight: 600,
                          }}
                        >
                          {reporte.inspector.nombre.charAt(0).toUpperCase()}
                        </Avatar>
                        <Typography variant="body2">{reporte.inspector.nombre}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {new Date(reporte.fecha_creacion).toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        size="small"
                        icon={<PhotoLibraryIcon sx={{ fontSize: 14 }} />}
                        label={reporte.fotos.length}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 280 }}>
                      <Stack direction="row" spacing={0} sx={{ alignItems: 'center' }}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          {reporte.comentario || '—'}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={(e) => abrirEditarComentario(reporte, e)}
                        >
                          <EditOutlinedIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      {esPropio && (
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation()
                            setErrorEliminar(null)
                            setReporteAEliminar(reporte)
                          }}
                        >
                          <DeleteOutlineIcon fontSize="small" color="error" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* DETALLE */}
      <Dialog
        open={Boolean(reporteAbierto)}
        onClose={() => setReporteAbierto(null)}
        maxWidth="md"
        fullWidth
      >
        {reporteAbierto && (
          <>
            <DialogTitle sx={{ pr: 10 }}>
              {reporteAbierto.proyecto} · {reporteAbierto.proceso.nombre}
              <Stack
                direction="row"
                spacing={0.5}
                sx={{ position: 'absolute', top: 8, right: 8, alignItems: 'center' }}
              >
                {reporteAbierto.inspector.id === usuario?.id && (
                  <IconButton
                    onClick={() => {
                      setErrorEliminar(null)
                      setReporteAEliminar(reporteAbierto)
                    }}
                  >
                    <DeleteOutlineIcon fontSize="small" color="error" />
                  </IconButton>
                )}
                <IconButton onClick={() => setReporteAbierto(null)}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Stack>
            </DialogTitle>
            <DialogContent dividers>
              <Stack spacing={0.5} sx={{ mb: 2 }}>
                <Typography variant="body2" component="div">
                  <strong>Proyecto:</strong>{' '}
                  {reporteAbierto.proyecto}
                  <IconButton
                    size="small"
                    onClick={(e) => abrirEditarProyecto(reporteAbierto.proyecto, e)}
                  >
                    <EditOutlinedIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Typography>
                <Typography variant="body2" component="div">
                  <strong>Locación:</strong>{' '}
                  {reporteAbierto.locacion ? (
                    <>
                      {reporteAbierto.locacion}
                      <IconButton
                        size="small"
                        onClick={(e) => abrirEditarLocacion(reporteAbierto.locacion, e)}
                      >
                        <EditOutlinedIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </>
                  ) : (
                    <Button size="small" onClick={(e) => abrirAsignarLocacion(reporteAbierto, e)}>
                      Asignar Locación
                    </Button>
                  )}
                </Typography>
                <Typography variant="body2" component="div">
                  <strong>ID de trabajo:</strong>{' '}
                  {reporteAbierto.id_trabajo ? (
                    <>
                      {reporteAbierto.id_trabajo}
                      <IconButton
                        size="small"
                        onClick={(e) => abrirEditarId(reporteAbierto.id_trabajo, e)}
                      >
                        <EditOutlinedIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </>
                  ) : (
                    <Button size="small" onClick={(e) => abrirAsignarId(reporteAbierto, e)}>
                      Asignar ID
                    </Button>
                  )}
                </Typography>
                <Typography variant="body2" component="div">
                  <strong>Proceso:</strong>{' '}
                  {reporteAbierto.proceso.nombre}
                  <IconButton
                    size="small"
                    onClick={(e) => abrirEditarProceso(reporteAbierto, e)}
                  >
                    <EditOutlinedIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Typography>
                <Typography variant="body2">
                  <strong>Inspector:</strong> {reporteAbierto.inspector.nombre}
                </Typography>
                <Typography variant="body2">
                  <strong>Fecha:</strong>{' '}
                  {new Date(reporteAbierto.fecha_creacion).toLocaleString('es-MX')}
                </Typography>
              </Stack>

              <Box sx={{ mb: 2 }}>
                <Stack direction="row" spacing={0} sx={{ alignItems: 'center' }}>
                  <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Hallazgos
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={(e) => abrirEditarComentario(reporteAbierto, e)}
                  >
                    <EditOutlinedIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Stack>
                <Typography variant="body2">{reporteAbierto.comentario || '—'}</Typography>
              </Box>

              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600 }}>
                Evidencia ({reporteAbierto.fotos.length})
              </Typography>
              <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', mt: 1 }}>
                {reporteAbierto.fotos.map((foto) => (
                  <Box
                    key={foto.id}
                    onClick={() => setFotoAmpliada(urlFoto(foto.foto_nombre))}
                    sx={{
                      width: 160,
                      height: 160,
                      borderRadius: 1.5,
                      overflow: 'hidden',
                      border: '1px solid',
                      borderColor: 'divider',
                      cursor: 'pointer',
                    }}
                  >
                    <Box
                      component="img"
                      src={urlFoto(foto.foto_nombre)}
                      alt=""
                      sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </Box>
                ))}
              </Stack>
            </DialogContent>
          </>
        )}
      </Dialog>

      {/* ZOOM DE FOTO */}
      <Dialog
        open={Boolean(fotoAmpliada)}
        onClose={() => setFotoAmpliada(null)}
        maxWidth="lg"
        fullWidth
      >
        <DialogContent sx={{ p: 0, position: 'relative', bgcolor: 'black' }}>
          <IconButton
            onClick={() => setFotoAmpliada(null)}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              bgcolor: 'rgba(0,0,0,0.6)',
              color: 'white',
              zIndex: 1,
              '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
            }}
          >
            <CloseIcon />
          </IconButton>
          <Box component="img" src={fotoAmpliada} alt="" sx={{ width: '100%', display: 'block' }} />
        </DialogContent>
      </Dialog>

      {/* ASIGNAR ID DE TRABAJO */}
      <Dialog
        open={Boolean(reporteParaId)}
        onClose={() => (asignandoId ? null : setReporteParaId(null))}
        maxWidth="xs"
        fullWidth
      >
        {reporteParaId && (
          <>
            <DialogTitle>Asignar ID de trabajo</DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {reporteParaId.proyecto} · {reporteParaId.proceso.nombre} ·{' '}
                {reporteParaId.inspector.nombre}
              </Typography>
              <Autocomplete
                freeSolo
                options={idsTrabajoSugeridos}
                inputValue={valorIdNuevo}
                onInputChange={(e, valorNuevo) => setValorIdNuevo(valorNuevo)}
                renderInput={(params) => (
                  <TextField {...params} label="ID de trabajo" size="small" autoFocus />
                )}
              />
              {errorAsignarId && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {errorAsignarId}
                </Alert>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setReporteParaId(null)} disabled={asignandoId}>
                Cancelar
              </Button>
              <Button
                variant="contained"
                onClick={confirmarAsignarId}
                disabled={asignandoId}
                startIcon={asignandoId ? <CircularProgress size={16} color="inherit" /> : null}
              >
                {asignandoId ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* EDITAR ID DE TRABAJO */}
      <Dialog
        open={Boolean(idParaEditar)}
        onClose={() => (editandoId ? null : setIdParaEditar(null))}
        maxWidth="xs"
        fullWidth
      >
        {idParaEditar && (
          <>
            <DialogTitle>Editar ID de trabajo</DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Se actualizará en todos los reportes que tienen el ID{' '}
                <strong>{idParaEditar}</strong>, sin importar el proyecto o la locación.
              </Typography>
              <Autocomplete
                freeSolo
                options={idsTrabajoSugeridos}
                inputValue={valorIdEditado}
                onInputChange={(e, valorNuevo) => setValorIdEditado(valorNuevo)}
                renderInput={(params) => (
                  <TextField {...params} label="ID de trabajo" size="small" autoFocus />
                )}
              />
              {errorEditarId && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {errorEditarId}
                </Alert>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setIdParaEditar(null)} disabled={editandoId}>
                Cancelar
              </Button>
              <Button
                variant="contained"
                onClick={confirmarEditarId}
                disabled={editandoId}
                startIcon={editandoId ? <CircularProgress size={16} color="inherit" /> : null}
              >
                {editandoId ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* EDITAR PROYECTO */}
      <Dialog
        open={Boolean(proyectoParaEditar)}
        onClose={() => (editandoProyecto ? null : setProyectoParaEditar(null))}
        maxWidth="xs"
        fullWidth
      >
        {proyectoParaEditar && (
          <>
            <DialogTitle>Editar proyecto</DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Se actualizará en todos los reportes del proyecto{' '}
                <strong>{proyectoParaEditar}</strong>.
              </Typography>
              <Autocomplete
                freeSolo
                options={proyectosSugeridos}
                inputValue={valorProyectoEditado}
                onInputChange={(e, valorNuevo) => setValorProyectoEditado(valorNuevo)}
                renderInput={(params) => (
                  <TextField {...params} label="Proyecto" size="small" autoFocus />
                )}
              />
              {errorEditarProyecto && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {errorEditarProyecto}
                </Alert>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setProyectoParaEditar(null)} disabled={editandoProyecto}>
                Cancelar
              </Button>
              <Button
                variant="contained"
                onClick={confirmarEditarProyecto}
                disabled={editandoProyecto}
                startIcon={editandoProyecto ? <CircularProgress size={16} color="inherit" /> : null}
              >
                {editandoProyecto ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* EDITAR LOCACIÓN */}
      <Dialog
        open={Boolean(locacionParaEditar)}
        onClose={() => (editandoLocacion ? null : setLocacionParaEditar(null))}
        maxWidth="xs"
        fullWidth
      >
        {locacionParaEditar && (
          <>
            <DialogTitle>Editar locación</DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Se actualizará en todos los reportes que tienen la locación{' '}
                <strong>{locacionParaEditar}</strong>.
              </Typography>
              <Autocomplete
                freeSolo
                options={locacionesSugeridas}
                inputValue={valorLocacionEditada}
                onInputChange={(e, valorNuevo) => setValorLocacionEditada(valorNuevo)}
                renderInput={(params) => (
                  <TextField {...params} label="Locación" size="small" autoFocus />
                )}
              />
              {errorEditarLocacion && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {errorEditarLocacion}
                </Alert>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setLocacionParaEditar(null)} disabled={editandoLocacion}>
                Cancelar
              </Button>
              <Button
                variant="contained"
                onClick={confirmarEditarLocacion}
                disabled={editandoLocacion}
                startIcon={editandoLocacion ? <CircularProgress size={16} color="inherit" /> : null}
              >
                {editandoLocacion ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* EDITAR PROCESO */}
      <Dialog
        open={Boolean(reporteParaProceso)}
        onClose={() => (editandoProceso ? null : setReporteParaProceso(null))}
        maxWidth="xs"
        fullWidth
      >
        {reporteParaProceso && (
          <>
            <DialogTitle>Editar proceso</DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {reporteParaProceso.proyecto} · {reporteParaProceso.inspector.nombre}
              </Typography>
              <FormControl fullWidth size="small">
                <InputLabel id="editar-proceso-label">Proceso</InputLabel>
                <Select
                  labelId="editar-proceso-label"
                  label="Proceso"
                  value={valorProcesoEditado}
                  onChange={(e) => setValorProcesoEditado(e.target.value)}
                  autoFocus
                >
                  {procesos.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.nombre}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {errorEditarProceso && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {errorEditarProceso}
                </Alert>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setReporteParaProceso(null)} disabled={editandoProceso}>
                Cancelar
              </Button>
              <Button
                variant="contained"
                onClick={confirmarEditarProceso}
                disabled={editandoProceso}
                startIcon={editandoProceso ? <CircularProgress size={16} color="inherit" /> : null}
              >
                {editandoProceso ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* EDITAR HALLAZGOS */}
      <Dialog
        open={Boolean(reporteParaComentario)}
        onClose={() => (editandoComentario ? null : setReporteParaComentario(null))}
        maxWidth="sm"
        fullWidth
      >
        {reporteParaComentario && (
          <>
            <DialogTitle>Editar hallazgos</DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {reporteParaComentario.proyecto} · {reporteParaComentario.proceso.nombre}
              </Typography>
              <TextField
                multiline
                rows={4}
                fullWidth
                placeholder="Describe los hallazgos..."
                value={valorComentarioEditado}
                onChange={(e) => setValorComentarioEditado(e.target.value)}
                autoFocus
              />
              {errorEditarComentario && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {errorEditarComentario}
                </Alert>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setReporteParaComentario(null)} disabled={editandoComentario}>
                Cancelar
              </Button>
              <Button
                variant="contained"
                onClick={confirmarEditarComentario}
                disabled={editandoComentario}
                startIcon={editandoComentario ? <CircularProgress size={16} color="inherit" /> : null}
              >
                {editandoComentario ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ASIGNAR LOCACIÓN */}
      <Dialog
        open={Boolean(reporteParaLocacion)}
        onClose={() => (asignandoLocacion ? null : setReporteParaLocacion(null))}
        maxWidth="xs"
        fullWidth
      >
        {reporteParaLocacion && (
          <>
            <DialogTitle>Asignar locación</DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {reporteParaLocacion.proyecto} · {reporteParaLocacion.proceso.nombre} ·{' '}
                {reporteParaLocacion.inspector.nombre}
              </Typography>
              <Autocomplete
                freeSolo
                options={locacionesSugeridas}
                inputValue={valorLocacionNuevo}
                onInputChange={(e, valorNuevo) => setValorLocacionNuevo(valorNuevo)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Locación"
                    placeholder="Ej. Tanque 4"
                    size="small"
                    autoFocus
                  />
                )}
              />
              {errorAsignarLocacion && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {errorAsignarLocacion}
                </Alert>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setReporteParaLocacion(null)} disabled={asignandoLocacion}>
                Cancelar
              </Button>
              <Button
                variant="contained"
                onClick={confirmarAsignarLocacion}
                disabled={asignandoLocacion}
                startIcon={asignandoLocacion ? <CircularProgress size={16} color="inherit" /> : null}
              >
                {asignandoLocacion ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* CONFIRMAR ELIMINAR */}
      <Dialog
        open={Boolean(reporteAEliminar)}
        onClose={() => (eliminando ? null : setReporteAEliminar(null))}
        maxWidth="xs"
        fullWidth
      >
        {reporteAEliminar && (
          <>
            <DialogTitle>¿Eliminar este reporte?</DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary">
                Se eliminará el reporte de <strong>{reporteAEliminar.proyecto}</strong> ·{' '}
                {reporteAEliminar.proceso.nombre} y sus {reporteAEliminar.fotos.length}{' '}
                {reporteAEliminar.fotos.length === 1 ? 'foto' : 'fotos'}. Esta acción no se puede
                deshacer.
              </Typography>
              {errorEliminar && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {errorEliminar}
                </Alert>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setReporteAEliminar(null)} disabled={eliminando}>
                Cancelar
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={confirmarEliminar}
                disabled={eliminando}
                startIcon={eliminando ? <CircularProgress size={16} color="inherit" /> : null}
              >
                {eliminando ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Stack>
  )
}
