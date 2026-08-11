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
} from '@mui/material'
import {
  Send as SendIcon,
  Close as CloseIcon,
  AddAPhoto as AddAPhotoIcon,
} from '@mui/icons-material'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { useEffect, useState } from 'react'
import {
  crearReporte,
  listarProcesos,
  listarProyectos,
  ocultarProyecto,
} from './api'

export default function PantallaReportar({ conectado, onReporteEnviado }) {
  const [procesos, setProcesos] = useState([])
  const [proyectos, setProyectos] = useState([])
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true)
  const [errorCatalogos, setErrorCatalogos] = useState(null)

  const [proyecto, setProyecto] = useState('')
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
        const [datosProcesos, datosProyectos] = await Promise.all([
          listarProcesos(),
          listarProyectos(),
        ])
        setProcesos(datosProcesos)
        setProyectos(datosProyectos)
      } catch (err) {
        setErrorCatalogos(
          err.response?.data?.detail || 'No se pudo cargar el catálogo de procesos'
        )
      } finally {
        setCargandoCatalogos(false)
      }
    }
    cargar()
  }, [])

  const agregarFoto = async () => {
    try {
      const image = await Camera.getPhoto({
        quality: 80,
        width: 1600,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      })
      setFotos((prev) => [...prev, image.dataUrl])
    } catch (error) {
      if (!String(error).includes('cancelled')) {
        setMensaje({ tipo: 'error', texto: 'No se pudo abrir la cámara' })
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

  const puedeEnviar =
    proyecto.trim().length > 0 && procesoId && fotos.length > 0 && conectado

  const enviar = async () => {
    if (!puedeEnviar) return
    setEnviando(true)
    setMensaje(null)
    try {
      const resultado = await crearReporte({
        proyecto: proyecto.trim(),
        procesoId,
        comentario,
        fotosDataUrl: fotos,
      })
      setMensaje({ tipo: 'success', texto: 'Reporte enviado correctamente' })
      setProyectos((prev) =>
        prev.includes(resultado.proyecto) ? prev : [resultado.proyecto, ...prev]
      )
      setProyecto('')
      setProcesoId('')
      setFotos([])
      setComentario('')
      if (onReporteEnviado) onReporteEnviado()
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

  return (
    <Stack spacing={2.5}>
      <Card>
        <CardContent sx={{ p: 2.5 }}>
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ fontWeight: 600, letterSpacing: 0.5 }}
          >
            Datos del reporte
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1 }}>
            <Autocomplete
              freeSolo
              options={proyectos}
              value={proyecto}
              onInputChange={(e, valorNuevo) => setProyecto(valorNuevo)}
              disabled={enviando}
              sx={{ flex: 1 }}
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
            <FormControl fullWidth size="small" sx={{ flex: 1 }}>
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
              onClick={enviando ? undefined : agregarFoto}
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
                Agregar
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
