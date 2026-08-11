import {
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
  CircularProgress,
  Avatar,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Button,
  Divider,
} from '@mui/material'
import {
  Schedule as ScheduleIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  PhotoLibrary as PhotoLibraryIcon,
  DeleteOutlined as DeleteOutlineIcon,
} from '@mui/icons-material'
import { useEffect, useState, useCallback } from 'react'
import { eliminarReporte, listarReportes, urlFoto } from './api'

function formatearFecha(iso) {
  const fecha = new Date(iso)
  const ahora = new Date()
  const diffMs = ahora - fecha
  const diffMin = Math.floor(diffMs / 60000)
  const diffHrs = Math.floor(diffMs / 3600000)
  const diffDias = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'Ahora mismo'
  if (diffMin < 60) return `Hace ${diffMin} min`
  if (diffHrs < 24) return `Hace ${diffHrs} h`
  if (diffDias < 7) return `Hace ${diffDias} d`

  return fecha.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
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

export default function PantallaHistorial({ refreshTrigger, usuario }) {
  const [reportes, setReportes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [reporteAbierto, setReporteAbierto] = useState(null)
  const [fotoAmpliada, setFotoAmpliada] = useState(null)
  const [reporteAEliminar, setReporteAEliminar] = useState(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const data = await listarReportes()
      setReportes(data)
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los reportes')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    const iniciar = async () => {
      await cargar()
    }
    iniciar()
  }, [cargar, refreshTrigger])

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
      setErrorEliminar(err.response?.data?.detail || 'No se pudo eliminar el reporte')
    } finally {
      setEliminando(false)
    }
  }

  if (cargando && reportes.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Cargando reportes...
        </Typography>
      </Box>
    )
  }

  if (error && reportes.length === 0) {
    return (
      <Stack spacing={2}>
        <Alert severity="error">{error}</Alert>
        <Button variant="outlined" onClick={cargar} startIcon={<RefreshIcon />}>
          Reintentar
        </Button>
      </Stack>
    )
  }

  if (reportes.length === 0) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="body1" color="text.secondary">
            Aún no hay reportes
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Crea el primero desde la pestaña Reportar
          </Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Stack spacing={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {reportes.length} {reportes.length === 1 ? 'reporte' : 'reportes'}
          </Typography>
          <IconButton size="small" onClick={cargar} disabled={cargando}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
            gap: 2,
          }}
        >
        {reportes.map((reporte) => {
          const colores = coloresAvatar(reporte.inspector.nombre)
          const esPropio = reporte.inspector.id === usuario?.id

          return (
            <Card
              key={reporte.id}
              onClick={() => setReporteAbierto(reporte)}
              sx={{ cursor: 'pointer' }}
            >
              <CardContent sx={{ p: 2 }}>
                <Stack
                  direction="row"
                  sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700 }}>{reporte.proyecto}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {reporte.proceso.nombre}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                    <Chip
                      size="small"
                      icon={<PhotoLibraryIcon sx={{ fontSize: 14 }} />}
                      label={reporte.fotos.length}
                      variant="outlined"
                    />
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
                  </Stack>
                </Stack>

                {reporte.comentario && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mt: 1,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {reporte.comentario}
                  </Typography>
                )}

                <Divider sx={{ my: 1.25 }} />

                <Stack
                  direction="row"
                  sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                    <Avatar
                      sx={{
                        width: 20,
                        height: 20,
                        bgcolor: colores.bg,
                        color: colores.fg,
                        fontSize: '0.65rem',
                        fontWeight: 600,
                      }}
                    >
                      {reporte.inspector.nombre.charAt(0).toUpperCase()}
                    </Avatar>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {reporte.inspector.nombre}
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                    <ScheduleIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                      {formatearFecha(reporte.fecha_creacion)}
                    </Typography>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          )
        })}
        </Box>
      </Stack>

      <Dialog
        open={Boolean(reporteAbierto)}
        onClose={() => setReporteAbierto(null)}
        maxWidth="sm"
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
                      width: 88,
                      height: 88,
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

      <Dialog
        open={Boolean(fotoAmpliada)}
        onClose={() => setFotoAmpliada(null)}
        maxWidth="md"
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
    </>
  )
}
