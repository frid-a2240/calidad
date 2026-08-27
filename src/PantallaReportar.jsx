import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  Stack,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import {
  Send as SendIcon,
  Close as CloseIcon,
  AddAPhoto as AddAPhotoIcon,
  AddPhotoAlternateOutlined as AddPhotoAlternateOutlinedIcon,
  CloudQueueOutlined as CloudQueueOutlinedIcon,
  FolderOutlined as FolderOutlinedIcon,
  AddCircleOutlineOutlined as AddCircleOutlineOutlinedIcon,
  ArrowBackOutlined as ArrowBackOutlinedIcon,
} from '@mui/icons-material'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  listarProcesos,
  listarProyectos,
  ocultarProyecto,
  listarIdsTrabajo,
  ocultarIdTrabajo,
  listarLocaciones,
  ocultarLocacion,
} from './api'
import {
  enviarOEncolar,
  listarPendientes,
  guardarCatalogosCache,
  obtenerCatalogosCache,
} from './colaOffline'

export default function PantallaReportar({ conectado, onReporteEnviado, pendientesVersion }) {
  const [procesos, setProcesos] = useState([])
  const [proyectos, setProyectos] = useState([])
  const [idsTrabajo, setIdsTrabajo] = useState([])
  const [locaciones, setLocaciones] = useState([])
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true)
  const [errorCatalogos, setErrorCatalogos] = useState(null)
  const [pendientes, setPendientes] = useState([])

  const [vista, setVista] = useState('carpetas') // 'carpetas' | 'formulario'
  const [locacionActiva, setLocacionActiva] = useState('')
  const [dialogNuevaLocacionAbierto, setDialogNuevaLocacionAbierto] = useState(false)
  const [nuevaLocacion, setNuevaLocacion] = useState('')
  const [errorNuevaLocacion, setErrorNuevaLocacion] = useState(null)

  const [proyecto, setProyecto] = useState('')
  const [idTrabajo, setIdTrabajo] = useState('')
  const [procesoId, setProcesoId] = useState('')
  const [fotos, setFotos] = useState([])
  const [comentario, setComentario] = useState('')

  const [mensaje, setMensaje] = useState(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    const cargar = async () => {
      setCargandoCatalogos(true)
      setErrorCatalogos(null)
      try {
        const [datosProcesos, datosProyectos, datosIdsTrabajo, datosLocaciones] = await Promise.all([
          listarProcesos(),
          listarProyectos(),
          listarIdsTrabajo(),
          listarLocaciones(),
        ])
        setProcesos(datosProcesos)
        setProyectos(datosProyectos)
        setIdsTrabajo(datosIdsTrabajo)
        setLocaciones(datosLocaciones)
        guardarCatalogosCache({
          procesos: datosProcesos,
          proyectos: datosProyectos,
          idsTrabajo: datosIdsTrabajo,
          locaciones: datosLocaciones,
        })
      } catch (err) {
        // Sin señal y sin nada guardado antes: no hay forma de mostrar el
        // formulario (no sabemos qué procesos existen). Con algo en caché
        // de una carga anterior, se usa eso para poder seguir capturando.
        const cache = await obtenerCatalogosCache()
        if (cache) {
          setProcesos(cache.procesos)
          setProyectos(cache.proyectos)
          setIdsTrabajo(cache.idsTrabajo)
          setLocaciones(cache.locaciones)
        } else {
          setErrorCatalogos(
            err.response?.data?.detail || 'No se pudo cargar el catálogo de procesos'
          )
        }
      } finally {
        setCargandoCatalogos(false)
      }
    }
    cargar()
  }, [])

  const cargarPendientes = useCallback(async () => {
    setPendientes(await listarPendientes())
  }, [])

  const primerRender = useRef(true)

  useEffect(() => {
    const iniciar = async () => {
      await cargarPendientes()
    }
    iniciar()
    // pendientesVersion solo cambia cuando App.jsx logra vaciar la cola en
    // segundo plano (nunca al montar ni por una acción del usuario) — es la
    // señal de que ya se puede quitar el aviso de "sin señal" que quedó de
    // cuando se guardó el reporte.
    if (!primerRender.current) {
      setMensaje(null)
    }
    primerRender.current = false
  }, [cargarPendientes, pendientesVersion])

  const agregarFoto = async (source) => {
    try {
      const image = await Camera.getPhoto({
        quality: 80,
        width: 1600,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source,
      })
      setFotos((prev) => [...prev, image.dataUrl])
    } catch (error) {
      if (!String(error).includes('cancelled')) {
        setMensaje({
          tipo: 'error',
          texto:
            source === CameraSource.Camera
              ? 'No se pudo abrir la cámara'
              : 'No se pudo abrir la galería',
        })
      }
    }
  }

  const quitarFoto = (index) => {
    setFotos((prev) => prev.filter((_, i) => i !== index))
  }

  const borrarSugerenciaProyecto = async (nombre, e) => {
    e.stopPropagation()
    setProyectos((prev) => prev.filter((p) => p !== nombre))
    try {
      await ocultarProyecto(nombre)
    } catch {
      setProyectos((prev) => (prev.includes(nombre) ? prev : [...prev, nombre]))
    }
  }

  const borrarSugerenciaIdTrabajo = async (id, e) => {
    e.stopPropagation()
    setIdsTrabajo((prev) => prev.filter((i) => i !== id))
    try {
      await ocultarIdTrabajo(id)
    } catch {
      setIdsTrabajo((prev) => (prev.includes(id) ? prev : [...prev, id]))
    }
  }

  const borrarCarpeta = async (nombre, e) => {
    e.stopPropagation()
    setLocaciones((prev) => prev.filter((l) => l !== nombre))
    try {
      await ocultarLocacion(nombre)
    } catch {
      setLocaciones((prev) => (prev.includes(nombre) ? prev : [...prev, nombre]))
    }
  }

  const abrirCarpeta = (nombreLocacion) => {
    setLocacionActiva(nombreLocacion)
    setMensaje(null)
    setVista('formulario')
  }

  const volverACarpetas = () => {
    setVista('carpetas')
  }

  const abrirDialogNuevaLocacion = () => {
    setNuevaLocacion('')
    setErrorNuevaLocacion(null)
    setDialogNuevaLocacionAbierto(true)
  }

  const confirmarNuevaLocacion = () => {
    const nombre = nuevaLocacion.trim()
    if (!nombre) {
      setErrorNuevaLocacion('Escribe un nombre para la carpeta')
      return
    }
    setLocaciones((prev) => (prev.includes(nombre) ? prev : [nombre, ...prev]))
    setDialogNuevaLocacionAbierto(false)
    abrirCarpeta(nombre)
  }

  const puedeEnviar =
    proyecto.trim().length > 0 &&
    idTrabajo.trim().length > 0 &&
    procesoId &&
    fotos.length > 0

  const enviar = async () => {
    if (!puedeEnviar) return
    setEnviando(true)
    setMensaje(null)
    try {
      const { enviado, resultado } = await enviarOEncolar(
        {
          proyecto: proyecto.trim(),
          idTrabajo: idTrabajo.trim(),
          locacion: locacionActiva,
          procesoId,
          comentario,
          fotosDataUrl: fotos,
        },
        conectado
      )
      if (enviado) {
        setMensaje({ tipo: 'success', texto: 'Reporte enviado correctamente' })
        setProyectos((prev) =>
          prev.includes(resultado.proyecto) ? prev : [resultado.proyecto, ...prev]
        )
        if (onReporteEnviado) onReporteEnviado()
      } else {
        setMensaje({
          tipo: 'info',
          texto: 'Sin señal: este reporte se enviará solo en cuanto haya conexión. Lo puedes ver abajo, en "Pendientes por enviar".',
        })
      }
      // No se limpia la locación activa ni se vuelve a carpetas: es común
      // seguir capturando varios reportes (distintos procesos) de la misma
      // carpeta uno tras otro.
      setProyecto('')
      setIdTrabajo('')
      setProcesoId('')
      setFotos([])
      setComentario('')
      await cargarPendientes()
    } catch (error) {
      const detalle =
        error.response?.data?.detail || error.message || 'Error desconocido'
      setMensaje({ tipo: 'error', texto: `No se pudo enviar: ${detalle}` })
    } finally {
      setEnviando(false)
    }
  }

  if (cargandoCatalogos) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (errorCatalogos) {
    return <Alert severity="error">{errorCatalogos}</Alert>
  }

  const tarjetaPendientes = pendientes.length > 0 && (
    <Card sx={{ borderLeft: '4px solid', borderColor: 'info.main' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
          <CloudQueueOutlinedIcon sx={{ fontSize: 18, color: 'info.main' }} />
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ fontWeight: 700, letterSpacing: 0.5 }}
          >
            {pendientes.length} {pendientes.length === 1 ? 'pendiente por enviar' : 'pendientes por enviar'}
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {conectado
            ? 'Ya hay señal — se están enviando solos.'
            : 'Se guardaron en este celular y se enviarán solos en cuanto haya señal.'}
        </Typography>
        <Stack spacing={1}>
          {pendientes.map((p) => (
            <Box
              key={p.idLocal}
              sx={{
                p: 1.25,
                borderRadius: 1.5,
                bgcolor: 'action.hover',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                  {p.proyecto} · {p.locacion}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {procesos.find((proc) => proc.id === p.procesoId)?.nombre || 'Proceso'} · ID{' '}
                  {p.idTrabajo}
                </Typography>
              </Box>
              <Chip size="small" label={`${p.fotosDataUrl.length} foto${p.fotosDataUrl.length === 1 ? '' : 's'}`} />
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  )

  if (vista === 'carpetas') {
    return (
      <Stack spacing={2.5}>
        {tarjetaPendientes}

        <Card>
          <CardContent sx={{ p: 2.5 }}>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ fontWeight: 600, letterSpacing: 0.5 }}
            >
              Elige una carpeta para reportar
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Cada carpeta es una locación. Al entrar, solo falta llenar proyecto, ID de trabajo y proceso.
            </Typography>
          </CardContent>
        </Card>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
            gap: 1.5,
          }}
        >
          {locaciones.map((nombreLocacion) => (
            <Card
              key={nombreLocacion}
              onClick={() => abrirCarpeta(nombreLocacion)}
              sx={{ cursor: 'pointer' }}
            >
              <CardContent
                sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    bgcolor: 'secondary.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <FolderOutlinedIcon />
                </Box>
                <Typography sx={{ fontWeight: 700, flex: 1, minWidth: 0 }} noWrap>
                  {nombreLocacion}
                </Typography>
                <IconButton
                  size="small"
                  onClick={(e) => borrarCarpeta(nombreLocacion, e)}
                >
                  <CloseIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </CardContent>
            </Card>
          ))}

          <Card
            onClick={abrirDialogNuevaLocacion}
            sx={{
              cursor: 'pointer',
              border: '2px dashed',
              borderColor: 'divider',
              boxShadow: 'none',
              bgcolor: 'transparent',
            }}
          >
            <CardContent sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  bgcolor: 'action.hover',
                  color: 'text.secondary',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <AddCircleOutlineOutlinedIcon />
              </Box>
              <Typography sx={{ fontWeight: 700 }} color="text.secondary">
                Agregar carpeta
              </Typography>
            </CardContent>
          </Card>
        </Box>

        {/* NUEVA LOCACIÓN */}
        <Dialog
          open={dialogNuevaLocacionAbierto}
          onClose={() => setDialogNuevaLocacionAbierto(false)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Agregar carpeta</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Escribe el nombre de la locación (ej. Tanque 4). Se creará al guardar el primer reporte ahí.
            </Typography>
            <TextField
              label="Locación"
              placeholder="Ej. Tanque 4"
              fullWidth
              size="small"
              autoFocus
              value={nuevaLocacion}
              onChange={(e) => setNuevaLocacion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmarNuevaLocacion()
              }}
            />
            {errorNuevaLocacion && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {errorNuevaLocacion}
              </Alert>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDialogNuevaLocacionAbierto(false)}>Cancelar</Button>
            <Button variant="contained" onClick={confirmarNuevaLocacion}>
              Crear y reportar
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    )
  }

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <IconButton size="small" onClick={volverACarpetas} disabled={enviando}>
          <ArrowBackOutlinedIcon fontSize="small" />
        </IconButton>
        <FolderOutlinedIcon sx={{ fontSize: 18, color: 'secondary.main' }} />
        <Typography sx={{ fontWeight: 700, flex: 1, minWidth: 0 }} noWrap>
          {locacionActiva}
        </Typography>
        <Button size="small" onClick={volverACarpetas} disabled={enviando}>
          Cambiar carpeta
        </Button>
      </Stack>

      {tarjetaPendientes}

      <Card>
        <CardContent sx={{ p: 2.5 }}>
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ fontWeight: 600, letterSpacing: 0.5 }}
          >
            Datos del reporte
          </Typography>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Autocomplete
              freeSolo
              options={proyectos}
              value={proyecto}
              onInputChange={(e, valorNuevo) => setProyecto(valorNuevo)}
              disabled={enviando}
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
                <TextField
                  {...params}
                  label="Proyecto"
                  placeholder="Ej. 26ISP123"
                  fullWidth
                  size="small"
                />
              )}
            />
            <Autocomplete
              freeSolo
              options={idsTrabajo}
              value={idTrabajo}
              onInputChange={(e, valorNuevo) => setIdTrabajo(valorNuevo)}
              disabled={enviando}
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
                <TextField {...params} label="ID de trabajo" fullWidth size="small" />
              )}
            />
            <FormControl fullWidth size="small">
              <InputLabel id="proceso-label">Proceso</InputLabel>
              <Select
                labelId="proceso-label"
                label="Proceso"
                value={procesoId}
                onChange={(e) => setProcesoId(e.target.value)}
                disabled={enviando}
              >
                {procesos.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 2.5 }}>
          <Stack
            direction="row"
            sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}
          >
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ fontWeight: 600, letterSpacing: 0.5 }}
            >
              Evidencia fotográfica
            </Typography>
            {fotos.length > 0 && (
              <Chip size="small" label={fotos.length} color="primary" variant="outlined" />
            )}
          </Stack>

          <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
            {fotos.map((foto, index) => (
              <Box key={index} sx={{ position: 'relative', width: 88, height: 88, mb: 1.5 }}>
                <Box
                  sx={{
                    width: '100%',
                    height: '100%',
                    borderRadius: 1.5,
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <img
                    src={foto}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </Box>
                <IconButton
                  size="small"
                  onClick={() => quitarFoto(index)}
                  disabled={enviando}
                  sx={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    bgcolor: 'rgba(0,0,0,0.6)',
                    color: 'white',
                    p: 0.25,
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
                  }}
                >
                  <CloseIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Box>
            ))}

            <Box
              onClick={enviando ? undefined : () => agregarFoto(CameraSource.Camera)}
              sx={{
                width: 88,
                height: 88,
                mb: 1.5,
                border: '2px dashed',
                borderColor: 'divider',
                borderRadius: 1.5,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: enviando ? 'not-allowed' : 'pointer',
                gap: 0.5,
                '&:hover': {
                  borderColor: enviando ? undefined : 'primary.main',
                },
              }}
            >
              <AddAPhotoIcon sx={{ fontSize: 22, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                Tomar foto
              </Typography>
            </Box>

            <Box
              onClick={enviando ? undefined : () => agregarFoto(CameraSource.Photos)}
              sx={{
                width: 88,
                height: 88,
                mb: 1.5,
                border: '2px dashed',
                borderColor: 'divider',
                borderRadius: 1.5,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: enviando ? 'not-allowed' : 'pointer',
                gap: 0.5,
                '&:hover': {
                  borderColor: enviando ? undefined : 'primary.main',
                },
              }}
            >
              <AddPhotoAlternateOutlinedIcon sx={{ fontSize: 22, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                Subir foto
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 2.5 }}>
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ fontWeight: 600, letterSpacing: 0.5 }}
          >
            Hallazgos
          </Typography>
          <TextField
            placeholder="Describe los hallazgos..."
            multiline
            rows={4}
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            fullWidth
            disabled={enviando}
            sx={{ mt: 1 }}
          />
        </CardContent>
      </Card>

      {mensaje && (
        <Alert severity={mensaje.tipo} variant="filled">
          {mensaje.texto}
        </Alert>
      )}

      <Button
        variant="contained"
        size="large"
        fullWidth
        startIcon={
          enviando ? <CircularProgress size={20} color="inherit" /> : <SendIcon />
        }
        onClick={enviar}
        disabled={enviando || !puedeEnviar}
        sx={{ py: 1.75, fontSize: '1rem' }}
      >
        {enviando ? 'Enviando reporte...' : 'Enviar reporte'}
      </Button>
    </Stack>
  )
}
