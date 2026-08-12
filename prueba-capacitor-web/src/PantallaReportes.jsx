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
} from '@mui/icons-material'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  listarReportes,
  listarProcesos,
  listarProyectos,
  listarIdsTrabajo,
  listarInspectores,
  eliminarReporte,
  ocultarProyecto,
  ocultarIdTrabajo,
  urlFoto,
  extraerMensajeError,
} from './api'

const FILTROS_VACIOS = {
  proyecto: '',
  idTrabajo: '',
  sinIdTrabajo: false,
  procesoId: '',
  inspectorId: '',
  fechaDesde: '',
  fechaHasta: '',
  q: '',
}

const CLAVE_SIN_ID = '__sin_id__'

function agruparPorIdTrabajo(reportes) {
  const grupos = new Map()
  const sinId = []

  for (const r of reportes) {
    if (!r.id_trabajo) {
      sinId.push(r)
      continue
    }
    if (!grupos.has(r.id_trabajo)) grupos.set(r.id_trabajo, [])
    grupos.get(r.id_trabajo).push(r)
  }

  const masReciente = (items) =>
    items.reduce((a, b) => (a.fecha_creacion > b.fecha_creacion ? a : b))

  const carpetas = Array.from(grupos.entries()).map(([idTrabajo, items]) => {
    const ultimo = masReciente(items)
    return {
      clave: idTrabajo,
      idTrabajo,
      proyecto: ultimo.proyecto,
      total: items.length,
      fechaUltima: ultimo.fecha_creacion,
      sinId: false,
    }
  })
  carpetas.sort((a, b) => (a.fechaUltima < b.fechaUltima ? 1 : -1))

  if (sinId.length > 0) {
    const ultimo = masReciente(sinId)
    carpetas.push({
      clave: CLAVE_SIN_ID,
      idTrabajo: null,
      proyecto: null,
      total: sinId.length,
      fechaUltima: ultimo.fecha_creacion,
      sinId: true,
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

  useEffect(() => {
    const cargarCatalogos = async () => {
      try {
        const [datosProcesos, datosProyectos, datosIdsTrabajo, datosInspectores] =
          await Promise.all([
            listarProcesos(),
            listarProyectos(),
            listarIdsTrabajo(),
            listarInspectores(),
          ])
        setProcesos(datosProcesos)
        setProyectosSugeridos(datosProyectos)
        setIdsTrabajoSugeridos(datosIdsTrabajo)
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

  const carpetas = useMemo(() => agruparPorIdTrabajo(reportes), [reportes])

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
      idTrabajo: carpeta.sinId ? '' : carpeta.idTrabajo,
      sinIdTrabajo: carpeta.sinId,
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
          <Typography variant="body2" color="text.secondary">
            {vista === 'carpetas'
              ? `${carpetas.length} ${carpetas.length === 1 ? 'carpeta' : 'carpetas'} por ID de trabajo`
              : `${reportes.length} ${reportes.length === 1 ? 'reporte encontrado' : 'reportes encontrados'}`}
            {vista === 'tabla' && hayFiltrosActivos && ' · filtros activos'}
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
                      bgcolor: carpeta.sinId ? 'action.disabledBackground' : 'secondary.main',
                      color: carpeta.sinId ? 'text.secondary' : 'white',
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
                      {carpeta.sinId ? 'Sin ID' : carpeta.idTrabajo}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {carpeta.proyecto ? `${carpeta.proyecto} · ` : ''}
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
                    <TableCell sx={{ fontWeight: 600 }}>{reporte.proyecto}</TableCell>
                    <TableCell>{reporte.id_trabajo || '—'}</TableCell>
                    <TableCell>{reporte.proceso.nombre}</TableCell>
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
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {reporte.comentario || '—'}
                      </Typography>
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
                <Typography variant="body2">
                  <strong>ID de trabajo:</strong> {reporteAbierto.id_trabajo || '—'}
                </Typography>
                <Typography variant="body2">
                  <strong>Inspector:</strong> {reporteAbierto.inspector.nombre}
                </Typography>
                <Typography variant="body2">
                  <strong>Fecha:</strong>{' '}
                  {new Date(reporteAbierto.fecha_creacion).toLocaleString('es-MX')}
                </Typography>
              </Stack>

              {reporteAbierto.comentario && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Hallazgos
                  </Typography>
                  <Typography variant="body2">{reporteAbierto.comentario}</Typography>
                </Box>
              )}

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
