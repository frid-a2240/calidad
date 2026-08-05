import { useState, useEffect } from 'react'
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Divider,
  Tabs,
  Tab,
} from '@mui/material'
import { Logout as LogoutIcon } from '@mui/icons-material'
import { obtenerToken, borrarToken, obtenerPerfil } from './api'
import PantallaLogin from './PantallaLogin'
import PantallaCambiarPassword from './PantallaCambiarPassword'
import PantallaReportes from './PantallaReportes'
import PantallaFpyRwk from './PantallaFpyRwk'

const APP_VERSION = '0.1.0'

function App() {
  const [usuario, setUsuarioSesion] = useState(null)
  const [verificandoSesion, setVerificandoSesion] = useState(true)
  const [menuAnchor, setMenuAnchor] = useState(null)
  const [modulo, setModulo] = useState('reportes')

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
      <PantallaCambiarPassword
        usuario={usuario}
        onPasswordCambiada={setUsuarioSesion}
      />
    )
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* HEADER */}
      <Box
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          px: 3,
          py: 2,
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
              Reportes de todos los proyectos
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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

      {/* TABS DE MODULOS */}
      <Box sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Container maxWidth="lg">
          <Tabs value={modulo} onChange={(e, valor) => setModulo(valor)}>
            <Tab label="Reportes" value="reportes" />
            <Tab label="Calidad FPY / RWK" value="fpy-rwk" />
          </Tabs>
        </Container>
      </Box>

      {/* CONTENIDO */}
      <Container maxWidth="lg" sx={{ py: 3 }}>
        {modulo === 'reportes' ? (
          <PantallaReportes usuario={usuario} />
        ) : (
          <PantallaFpyRwk />
        )}

        <Divider sx={{ mt: 4 }} />
        <Box sx={{ textAlign: 'center', pt: 1.5, pb: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Control de Calidad · v{APP_VERSION}
          </Typography>
        </Box>
      </Container>
    </Box>
  )
}

export default App
