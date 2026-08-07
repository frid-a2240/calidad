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
  InputAdornment,
  IconButton,
} from '@mui/material'
import {
  Person as PersonIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Login as LoginIcon,
} from '@mui/icons-material'
import { login, guardarToken, extraerMensajeError } from './api'

export default function PantallaLogin({ onLoginExitoso }) {
  const [numeroControl, setNumeroControl] = useState('')
  const [password, setPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)

  const manejarSubmit = async (e) => {
    e.preventDefault()
    if (!numeroControl.trim() || !password) {
      setError('Ingresa tu usuario y tu contraseña')
      return
    }

    setEnviando(true)
    setError(null)
    try {
      const resultado = await login({
        numeroControl: numeroControl.trim(),
        password,
      })
      guardarToken(resultado.access_token)
      onLoginExitoso(resultado.usuario)
    } catch (err) {
      const detalle = extraerMensajeError(
        err,
        err.code === 'ERR_NETWORK' ? 'No se pudo conectar con el servidor' : 'Error al iniciar sesión'
      )
      setError(detalle)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 3,
        py: 6,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 380 }}>
        <Box sx={{ textAlign: 'center', mb: 3.5 }}>
          <Box
            sx={{
              width: 76,
              height: 76,
              borderRadius: 2,
              bgcolor: '#ffffff',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 2px 10px rgba(13, 59, 102, 0.10)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              p: 1.25,
              mx: 'auto',
              mb: 2,
            }}
          >
            <Box
              component="img"
              src={`${import.meta.env.BASE_URL}logo.png`}
              alt="ISP"
              sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
              onError={(e) => {
                e.target.style.display = 'none'
              }}
            />
          </Box>
          <Typography variant="h5" fontWeight={700} color="primary.dark">
            Sistema de Control de Calidad
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Inicia sesión para continuar
          </Typography>
        </Box>

        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: { xs: 3, sm: 3.5 } }}>
            <Box component="form" onSubmit={manejarSubmit} noValidate>
              <TextField
                label="Usuario"
                placeholder="Número de control"
                value={numeroControl}
                onChange={(e) => setNumeroControl(e.target.value)}
                fullWidth
                autoFocus
                disabled={enviando}
                sx={{ mb: 2.5 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <TextField
                label="Contraseña"
                type={mostrarPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                disabled={enviando}
                sx={{ mb: error ? 2 : 3 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setMostrarPassword((v) => !v)}
                          edge="end"
                          size="small"
                          tabIndex={-1}
                        >
                          {mostrarPassword ? (
                            <VisibilityOffIcon fontSize="small" />
                          ) : (
                            <VisibilityIcon fontSize="small" />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />

              {error && (
                <Alert severity="error" sx={{ mb: 2.5 }}>
                  {error}
                </Alert>
              )}

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={enviando}
                startIcon={
                  enviando ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <LoginIcon />
                  )
                }
                sx={{ py: 1.5, fontSize: '1rem' }}
              >
                {enviando ? 'Ingresando...' : 'Iniciar sesión'}
              </Button>
            </Box>
          </CardContent>
        </Card>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', textAlign: 'center', mt: 3 }}
        >
          Acceso restringido al personal autorizado
        </Typography>
      </Box>
    </Box>
  )
}
