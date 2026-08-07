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
          background: 'linear-gradient(135deg, #0d3b66 0%, #0a2f52 100%)',
          color: 'white',
          px: { xs: 2, sm: 3 },
          py: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 4px 20px -4px rgba(6, 32, 64, 0.45)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75 }}>
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: 2,
              bgcolor: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              p: 0.6,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
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
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.15 }}>
              Control de Calidad
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.75 }}>
              Reportes de todos los proyectos
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
            <Typography variant="body2" sx={{ fontWeight: 650, lineHeight: 1.2 }}>
              {usuario.nombre}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.7 }}>
              No. control {usuario.numero_control}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={(e) => setMenuAnchor(e.currentTarget)}
            sx={{
              p: 0.3,
              border: '2px solid rgba(255,255,255,0.25)',
              '&:hover': { border: '2px solid rgba(255,255,255,0.5)' },
            }}
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
            slotProps={{ paper: { sx: { borderRadius: 2.5, minWidth: 220 } } }}
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
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          position: 'sticky',
          top: 0,
          zIndex: 2,
        }}
      >
        <Container maxWidth="lg">
          <Tabs value={modulo} onChange={(e, valor) => setModulo(valor)}>
            <Tab label="Reportes" value="reportes" />
            <Tab label="Calidad FPY / RWK" value="fpy-rwk" />
          </Tabs>
        </Container>
      </Box>

      {/* CONTENIDO */}
      <Container maxWidth="lg" sx={{ py: { xs: 2.5, sm: 3.5 } }}>
        {modulo === 'reportes' ? (
          <PantallaReportes usuario={usuario} />
        ) : (
          <PantallaFpyRwk />
        )}

        <Box sx={{ textAlign: 'center', pt: 4, pb: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Control de Calidad · v{APP_VERSION}
          </Typography>
        </Box>
      </Container>
    </Box>
  )
}

export default App
