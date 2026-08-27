import { useState, useEffect, lazy, Suspense } from 'react'
import {
  Container,
  Typography,
  Box,
  Chip,
  Divider,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Avatar,
} from '@mui/material'
import {
  WifiOff as WifiOffIcon,
  Wifi as WifiIcon,
  AddCircleOutlineOutlined as AddIcon,
  History as HistoryIcon,
  QueryStatsOutlined as QueryStatsIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material'
import { checkConexion, obtenerToken, borrarToken, obtenerPerfil } from './api'
import { drenarCola } from './colaOffline'
import PantallaLogin from './PantallaLogin'
import PantallaReportar from './PantallaReportar'

// Pantallas que no se necesitan en el primer render: se cargan solo
// cuando el usuario realmente entra a ellas, para que el arranque
// inicial de la app tenga menos JS que parsear.
const PantallaCambiarPassword = lazy(() => import('./PantallaCambiarPassword'))
const PantallaHistorial = lazy(() => import('./PantallaHistorial'))
const PantallaFpyRwk = lazy(() => import('./PantallaFpyRwk'))

function CargandoPantalla() {
  return (
    <Box sx={{ textAlign: 'center', py: 6 }}>
      <CircularProgress size={28} />
    </Box>
  )
}

const APP_VERSION = '0.4.0'

function App() {
  const [usuario, setUsuarioSesion] = useState(null)
  const [verificandoSesion, setVerificandoSesion] = useState(true)
  const [conectado, setConectado] = useState(true)
  const [vista, setVista] = useState('reportar') // 'reportar' | 'historial' | 'calidad'
  const [refreshHistorial, setRefreshHistorial] = useState(0)
  const [pendientesVersion, setPendientesVersion] = useState(0)
  const [menuAnchor, setMenuAnchor] = useState(null)

  useEffect(() => {
    // Cada vez que hay señal se intenta vaciar la cola de reportes/fotos
    // guardados sin conexión — sin importar si el chequeo anterior ya la
    // había visto en línea. drenarCola() no hace nada si la cola está
    // vacía, así que no cuesta nada intentarlo en cada chequeo (cada
    // 15s); hacerlo así, en vez de solo al detectar la transición de
    // "sin señal" a "con señal", evita que se quede algo pendiente sin
    // enviar si la desconexión fue más corta que el intervalo entre
    // chequeos.
    const check = async () => {
      const resultado = await checkConexion()
      if (resultado.ok) {
        const enviados = await drenarCola()
        if (enviados > 0) {
          setPendientesVersion((v) => v + 1)
          setRefreshHistorial((v) => v + 1)
        }
      }
      setConectado(resultado.ok)
    }
    check()
    const id = setInterval(check, 15000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const validarSesion = async () => {
      if (!obtenerToken()) {
        setVerificandoSesion(false)
        return
      }
      try {
        const perfil = await obtenerPerfil()
        setUsuarioSesion(perfil)
      } catch {
        borrarToken()
        setUsuarioSesion(null)
      } finally {
        setVerificandoSesion(false)
      }
    }
    validarSesion()
  }, [])

  const handleReporteEnviado = () => {
    // Trigger para que el historial se refresque cuando se abra
    setRefreshHistorial((v) => v + 1)
  }

  const cerrarSesion = () => {
    borrarToken()
    setUsuarioSesion(null)
    setMenuAnchor(null)
  }

  if (verificandoSesion) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  if (!usuario) {
    return <PantallaLogin onLoginExitoso={setUsuarioSesion} />
  }

  if (usuario.debe_cambiar_password) {
    return (
      <Suspense fallback={<CargandoPantalla />}>
        <PantallaCambiarPassword
          usuario={usuario}
          onPasswordCambiada={setUsuarioSesion}
        />
      </Suspense>
    )
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 10 }}>
      {/* HEADER */}
      <Box
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          px: 3,
          py: 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 12px rgba(13, 59, 102, 0.2)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1.5,
              bgcolor: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              p: 0.5,
            }}
          >
            <Box
              component="img"
              src="/logo.png"
              alt="ISP"
              sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
              onError={(e) => {
                e.target.style.display = 'none'
              }}
            />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
              Control de Calidad
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.85 }}>
              {vista === 'reportar'
                ? 'Reportes'
                : vista === 'historial'
                  ? 'Historial de reportes'
                  : 'Calidad FPY / RWK'}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            size="small"
            icon={
              conectado ? (
                <WifiIcon sx={{ fontSize: 14 }} />
              ) : (
                <WifiOffIcon sx={{ fontSize: 14 }} />
              )
            }
            label={conectado ? 'En línea' : 'Sin conexión'}
            sx={{
              bgcolor: conectado
                ? 'rgba(255,255,255,0.18)'
                : 'rgba(198, 40, 40, 0.85)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.2)',
              fontWeight: 500,
              '& .MuiChip-icon': { color: 'white' },
            }}
          />
          <IconButton
            size="small"
            onClick={(e) => setMenuAnchor(e.currentTarget)}
            sx={{ p: 0.25 }}
          >
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: 'secondary.main',
                fontSize: '0.85rem',
                fontWeight: 700,
              }}
            >
              {usuario.nombre
                .split(' ')
                .slice(0, 2)
                .map((parte) => parte[0])
                .join('')
                .toUpperCase()}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={() => setMenuAnchor(null)}
          >
            <MenuItem disabled sx={{ opacity: '1 !important' }}>
              <ListItemText
                primary={usuario.nombre}
                secondary={`No. control ${usuario.numero_control}`}
              />
            </MenuItem>
            <Divider />
            <MenuItem onClick={cerrarSesion}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Cerrar sesión</ListItemText>
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* CONTENIDO */}
      <Container maxWidth="md" sx={{ pt: 3 }}>
        {vista === 'reportar' ? (
          <PantallaReportar
            conectado={conectado}
            onReporteEnviado={handleReporteEnviado}
            pendientesVersion={pendientesVersion}
          />
        ) : vista === 'historial' ? (
          <Suspense fallback={<CargandoPantalla />}>
            <PantallaHistorial
              refreshTrigger={refreshHistorial}
              usuario={usuario}
              conectado={conectado}
              pendientesVersion={pendientesVersion}
            />
          </Suspense>
        ) : (
          <Suspense fallback={<CargandoPantalla />}>
            <PantallaFpyRwk usuario={usuario} />
          </Suspense>
        )}

        {/* Footer */}
        <Divider sx={{ mt: 3 }} />
        <Box sx={{ textAlign: 'center', pt: 1.5, pb: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Control de Calidad · v{APP_VERSION}
          </Typography>
        </Box>
      </Container>

      {/* BOTTOM NAVIGATION */}
      <Paper
        elevation={8}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          borderRadius: 0,
          borderTop: '1px solid',
          borderColor: 'divider',
          zIndex: 10,
        }}
      >
        <BottomNavigation
          value={vista}
          onChange={(e, nuevaVista) => setVista(nuevaVista)}
          sx={{
            bgcolor: 'background.paper',
            '& .MuiBottomNavigationAction-root': {
              minWidth: 0,
            },
          }}
        >
          <BottomNavigationAction
            label="Reportes"
            value="reportar"
            icon={<AddIcon />}
          />
          <BottomNavigationAction
            label="Historial"
            value="historial"
            icon={<HistoryIcon />}
          />
          <BottomNavigationAction
            label="Calidad"
            value="calidad"
            icon={<QueryStatsIcon />}
          />
        </BottomNavigation>
      </Paper>
    </Box>
  )
}

export default App