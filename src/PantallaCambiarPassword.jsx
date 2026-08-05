import { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material'
import { LockReset as LockResetIcon } from '@mui/icons-material'
import { cambiarPassword, borrarToken } from './api'

const MIN_LARGO = 8

export default function PantallaCambiarPassword({ usuario, onPasswordCambiada }) {
  const [passwordActual, setPasswordActual] = useState('')
  const [passwordNueva, setPasswordNueva] = useState('')
  const [passwordConfirmar, setPasswordConfirmar] = useState('')
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)

  const manejarSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!passwordActual || !passwordNueva || !passwordConfirmar) {
      setError('Completa todos los campos')
      return
    }
    if (passwordNueva.length < MIN_LARGO) {
      setError(`La nueva contraseña debe tener al menos ${MIN_LARGO} caracteres`)
      return
    }
    if (passwordNueva === passwordActual) {
      setError('La nueva contraseña debe ser distinta a la actual')
      return
    }
    if (passwordNueva !== passwordConfirmar) {
      setError('La confirmación no coincide con la nueva contraseña')
      return
    }

    setEnviando(true)
    try {
      const usuarioActualizado = await cambiarPassword({
        passwordActual,
        passwordNueva,
      })
      onPasswordCambiada(usuarioActualizado)
    } catch (err) {
      const detalle = err.response?.data?.detail || 'No se pudo cambiar la contraseña'
      setError(detalle)
    } finally {
      setEnviando(false)
    }
  }

  const cerrarSesion = () => {
    borrarToken()
    window.location.reload()
  }

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100vh',
        overflow: 'hidden',
        bgcolor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 3,
        py: 6,
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: -140,
          right: -120,
          width: 380,
          height: 380,
          borderRadius: '50%',
          background:
            'radial-gradient(circle at 30% 30%, rgba(0,169,157,0.28), rgba(0,169,157,0) 70%)',
          filter: 'blur(2px)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: -160,
          left: -140,
          width: 420,
          height: 420,
          borderRadius: '50%',
          background:
            'radial-gradient(circle at 70% 70%, rgba(13,59,102,0.18), rgba(13,59,102,0) 70%)',
          filter: 'blur(2px)',
        }}
      />

      <Box sx={{ position: 'relative', width: '100%', maxWidth: 400 }}>
        <Box sx={{ textAlign: 'center', mb: 3.5 }}>
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: '28%',
              bgcolor: 'secondary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2.5,
              boxShadow: '0 8px 24px rgba(0, 169, 157, 0.35)',
            }}
          >
            <LockResetIcon sx={{ fontSize: 36, color: 'white' }} />
          </Box>
          <Typography variant="h5" fontWeight={800} color="primary.dark">
            Cambia tu contraseña
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Hola {usuario?.nombre}, es tu primer inicio de sesión. Define una
            contraseña nueva para continuar.
          </Typography>
        </Box>

        <Card
          sx={{
            borderRadius: 4,
            boxShadow: '0 16px 48px rgba(13, 59, 102, 0.14)',
            border: '1px solid #e2e6ed',
          }}
        >
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Box component="form" onSubmit={manejarSubmit} noValidate>
              <TextField
                label="Contraseña actual"
                type="password"
                value={passwordActual}
                onChange={(e) => setPasswordActual(e.target.value)}
                fullWidth
                autoFocus
                disabled={enviando}
                sx={{ mb: 2.5 }}
              />
              <TextField
                label="Contraseña nueva"
                type="password"
                helperText={`Mínimo ${MIN_LARGO} caracteres`}
                value={passwordNueva}
                onChange={(e) => setPasswordNueva(e.target.value)}
                fullWidth
                disabled={enviando}
                sx={{ mb: 2.5 }}
              />
              <TextField
                label="Confirmar contraseña nueva"
                type="password"
                value={passwordConfirmar}
                onChange={(e) => setPasswordConfirmar(e.target.value)}
                fullWidth
                disabled={enviando}
                sx={{ mb: error ? 2 : 3.5 }}
              />

              {error && (
                <Alert severity="error" variant="filled" sx={{ mb: 2.5, borderRadius: 2 }}>
                  {error}
                </Alert>
              )}

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={enviando}
                startIcon={enviando ? <CircularProgress size={20} color="inherit" /> : null}
                sx={{
                  py: 1.6,
                  fontSize: '1rem',
                  borderRadius: 2.5,
                  background: 'linear-gradient(135deg, #0d3b66 0%, #00a99d 100%)',
                  boxShadow: '0 8px 20px rgba(0, 169, 157, 0.35)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #0a2e51 0%, #00897f 100%)',
                    boxShadow: '0 10px 24px rgba(0, 169, 157, 0.45)',
                  },
                }}
              >
                {enviando ? 'Guardando...' : 'Guardar contraseña'}
              </Button>

              <Button
                variant="text"
                size="small"
                fullWidth
                disabled={enviando}
                onClick={cerrarSesion}
                sx={{ mt: 1.5, color: 'text.secondary' }}
              >
                Cerrar sesión
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  )
}
