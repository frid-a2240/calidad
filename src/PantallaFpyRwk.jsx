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
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
} from '@mui/material'
import {
  Save as SaveIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  DeleteOutlined as DeleteOutlineIcon,
  EngineeringOutlined as EngineeringOutlinedIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  crearRegistroFpyRwk,
  actualizarRegistroFpyRwk,
  listarRegistrosFpyRwk,
  eliminarRegistroFpyRwk,
  listarProyectos,
  ocultarProyecto,
  extraerMensajeError,
} from './api'
import {
  ETAPAS,
  CAMPOS_DEFECTO,
  calcularFpyRwk,
  agruparPromediosPorFecha,
  agruparPromediosPorMes,
  promedioEtapasRegistro,
  META_FPY,
  META_RWK,
} from './calculosFpyRwk'

function fmtMetros(valor) {
  return valor === null || valor === undefined ? '—' : Number(valor).toFixed(2)
}

function fmtPct(valor) {
  return valor === null || valor === undefined ? '—' : `${Math.round(valor * 100)}%`
}

const PUESTOS_SUGERIDOS = ['Soldador', 'Pailero']
const POSICIONES = ['1G', '2G', '3G', '4G']

function formularioVacio() {
  return {
    nombre_trabajador: '',
    fecha: new Date().toISOString().slice(0, 10),
    puesto: '',
    proyecto: '',
    id_trabajo: '',
    tipo_trabajo: '',
    posicion: '',
    area_metros: '',
    supervisor: '',
    ...Object.fromEntries(CAMPOS_DEFECTO.map((c) => [c, ''])),
  }
}

const ALTURA_GRAFICO = 130

function GraficoMetaMensual({ titulo, datos, valorKey, meta, mejorSiMayor }) {
  const valoresMeses = datos.map((d) => d[valorKey]).filter((v) => v !== null && v !== undefined)
  const promedioGeneral = valoresMeses.length
    ? valoresMeses.reduce((a, b) => a + b, 0) / valoresMeses.length
    : null
  const barras = [
    ...datos.map((d) => ({ clave: d.clave, label: d.label, valor: d[valorKey], esResumen: false })),
    { clave: '__promedio__', label: 'Prom.', valor: promedioGeneral, esResumen: true },
  ]

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
        {titulo}
      </Typography>
      <Box sx={{ overflowX: 'auto', pb: 0.5 }}>
        <Box
          sx={{
            position: 'relative',
            height: ALTURA_GRAFICO,
            display: 'flex',
            alignItems: 'flex-end',
            gap: 1,
            px: 1,
            minWidth: barras.length * 38,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: `${meta * ALTURA_GRAFICO}px`,
              borderTop: '2px dashed',
              borderColor: 'warning.main',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                position: 'absolute',
                right: 0,
                top: -15,
                color: 'warning.main',
                fontWeight: 700,
                fontSize: '0.62rem',
              }}
            >
              Meta {Math.round(meta * 100)}%
            </Typography>
          </Box>
          {barras.map((b) => {
            const enMeta = b.valor !== null && (mejorSiMayor ? b.valor >= meta : b.valor <= meta)
            const alturaPx = b.valor === null ? 0 : Math.max(2, Math.min(1, b.valor) * ALTURA_GRAFICO)
            return (
              <Stack
                key={b.clave}
                spacing={0.5}
                sx={{
                  alignItems: 'center',
                  flex: '0 0 30px',
                  ...(b.esResumen && { ml: 1, pl: 1, borderLeft: '1px dashed', borderColor: 'divider' }),
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.62rem' }}>
                  {fmtPct(b.valor)}
                </Typography>
                <Box
                  sx={{
                    width: '100%',
                    maxWidth: 20,
                    height: `${alturaPx}px`,
                    bgcolor:
                      b.valor === null
                        ? 'action.disabledBackground'
                        : b.esResumen
                          ? 'info.main'
                          : enMeta
                            ? 'success.main'
                            : 'error.main',
                    borderRadius: '4px 4px 0 0',
                  }}
                />
              </Stack>
            )
          })}
        </Box>
        <Stack direction="row" spacing={1} sx={{ px: 1, mt: 0.5, minWidth: barras.length * 38 }}>
          {barras.map((b) => (
            <Typography
              key={b.clave}
              variant="caption"
              color={b.esResumen ? 'text.primary' : 'text.secondary'}
              sx={{
                flex: '0 0 30px',
                textAlign: 'center',
                fontWeight: b.esResumen ? 700 : 400,
                fontSize: '0.6rem',
                ...(b.esResumen && { ml: 1, pl: 1, borderLeft: '1px dashed', borderColor: 'divider' }),
              }}
            >
              {b.label}
            </Typography>
          ))}
        </Stack>
      </Box>
    </Box>
  )
}

function TablaPromedioPorFecha({ titulo, etiquetaColumna, datos, sufijo, meta, mejorSiMayor }) {
  return (
    <Card>
      <CardContent sx={{ p: 2 }}>
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ fontWeight: 600, letterSpacing: 0.5 }}
        >
          {titulo}
        </Typography>
        <TableContainer sx={{ mt: 1, maxWidth: '100%', overflowX: 'auto' }}>
          <Table size="small" sx={{ whiteSpace: 'nowrap' }}>
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                {ETAPAS.map((etapa) => (
                  <TableCell
                    key={etapa.id}
                    align="right"
                    sx={{ bgcolor: etapa.color.bgHeader, color: etapa.color.text, fontWeight: 700 }}
                  >
                    {etiquetaColumna} {etapa.titulo}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {datos.map((fila) => (
                <TableRow key={fila.fecha} hover>
                  <TableCell>{fila.fecha}</TableCell>
                  {ETAPAS.map((etapa) => {
                    const valor = fila[`${etapa.id}_${sufijo}`]
                    const enMeta = valor !== null && (mejorSiMayor ? valor >= meta : valor <= meta)
                    return (
                      <TableCell key={etapa.id} align="right" sx={{ bgcolor: etapa.color.bg }}>
                        <Chip
                          size="small"
                          label={fmtPct(valor)}
                          color={valor === null ? 'default' : enMeta ? 'success' : 'error'}
                        />
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  )
}

function TarjetaRegistro({ registro, esPropio, onAbrir, onEditar, onEliminar }) {
  const promedioFpy = promedioEtapasRegistro(registro, '_pct_fpy')
  const promedioRwk = promedioEtapasRegistro(registro, '_pct_rwk')

  return (
    <Card onClick={() => onAbrir(registro)} sx={{ cursor: 'pointer' }}>
      <CardContent sx={{ p: 2 }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700 }}>{registro.proyecto}</Typography>
            <Typography variant="body2" color="text.secondary">
              {registro.nombre_trabajador} · {registro.puesto}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, pl: 1 }}>
            {registro.fecha}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mt: 1.25, flexWrap: 'wrap', gap: 1 }}>
          <Chip
            size="small"
            label={`FPY ${fmtPct(promedioFpy)}`}
            color={promedioFpy === null ? 'default' : promedioFpy >= META_FPY ? 'success' : 'error'}
          />
          <Chip
            size="small"
            label={`RWK ${fmtPct(promedioRwk)}`}
            color={promedioRwk === null ? 'default' : promedioRwk <= META_RWK ? 'success' : 'error'}
          />
          <Chip size="small" variant="outlined" label={`${registro.area_metros} m`} />
        </Stack>

        {esPropio && (
          <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end', mt: 0.5 }}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation()
                onEditar(registro)
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation()
                onEliminar(registro)
              }}
            >
              <DeleteOutlineIcon fontSize="small" color="error" />
            </IconButton>
          </Stack>
        )}
      </CardContent>
    </Card>
  )
}

export default function PantallaFpyRwk({ usuario }) {
  const [proyectos, setProyectos] = useState([])
  const [form, setForm] = useState(formularioVacio)
  const [editandoId, setEditandoId] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  const [registros, setRegistros] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [registroAbierto, setRegistroAbierto] = useState(null)
  const [registroAEliminar, setRegistroAEliminar] = useState(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState(null)

  useEffect(() => {
    listarProyectos()
      .then(setProyectos)
      .catch(() => {})
  }, [])

  const cargarRegistros = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const data = await listarRegistrosFpyRwk()
      setRegistros(data)
    } catch (err) {
      setError(extraerMensajeError(err, 'No se pudieron cargar los registros'))
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargarRegistros()
  }, [cargarRegistros])

  const actualizarCampo = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }))
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

  const calculado = useMemo(() => calcularFpyRwk(form), [form])
  const promediosPorFecha = useMemo(() => agruparPromediosPorFecha(registros), [registros])
  const promediosPorMes = useMemo(() => agruparPromediosPorMes(registros), [registros])

  const puedeGuardar =
    form.nombre_trabajador.trim() &&
    form.fecha &&
    form.puesto.trim() &&
    form.proyecto.trim() &&
    form.id_trabajo.trim() &&
    form.tipo_trabajo.trim() &&
    form.posicion &&
    Number(form.area_metros) > 0

  const reiniciarFormulario = () => {
    setForm(formularioVacio())
    setEditandoId(null)
  }

  const editar = (registro) => {
    setRegistroAbierto(null)
    setEditandoId(registro.id)
    setMensaje(null)
    setForm({
      nombre_trabajador: registro.nombre_trabajador,
      fecha: registro.fecha,
      puesto: registro.puesto,
      proyecto: registro.proyecto,
      id_trabajo: registro.id_trabajo,
      tipo_trabajo: registro.tipo_trabajo,
      posicion: registro.posicion,
      area_metros: String(registro.area_metros),
      supervisor: registro.supervisor || '',
      ...Object.fromEntries(
        CAMPOS_DEFECTO.map((c) => [
          c,
          registro[c] === null || registro[c] === undefined ? '' : String(registro[c]),
        ])
      ),
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const guardar = async () => {
    if (!puedeGuardar) return
    setGuardando(true)
    setMensaje(null)
    try {
      const payload = {
        nombre_trabajador: form.nombre_trabajador.trim(),
        fecha: form.fecha,
        puesto: form.puesto.trim(),
        proyecto: form.proyecto.trim(),
        id_trabajo: form.id_trabajo.trim(),
        tipo_trabajo: form.tipo_trabajo.trim(),
        posicion: form.posicion,
        area_metros: Number(form.area_metros),
        supervisor: form.supervisor.trim() || null,
        ...Object.fromEntries(
          CAMPOS_DEFECTO.map((c) => [c, form[c] === '' ? null : Number(form[c])])
        ),
      }

      const resultado = editandoId
        ? await actualizarRegistroFpyRwk(editandoId, payload)
        : await crearRegistroFpyRwk(payload)

      setMensaje({
        tipo: 'success',
        texto: editandoId ? 'Registro actualizado' : 'Registro guardado',
      })
      setProyectos((prev) =>
        prev.includes(resultado.proyecto) ? prev : [resultado.proyecto, ...prev]
      )
      reiniciarFormulario()
      cargarRegistros()
    } catch (err) {
      setMensaje({
        tipo: 'error',
        texto: extraerMensajeError(err, 'No se pudo guardar el registro'),
      })
    } finally {
      setGuardando(false)
    }
  }

  const confirmarEliminar = async () => {
    if (!registroAEliminar) return
    setEliminando(true)
    setErrorEliminar(null)
    try {
      await eliminarRegistroFpyRwk(registroAEliminar.id)
      setRegistros((prev) => prev.filter((r) => r.id !== registroAEliminar.id))
      if (editandoId === registroAEliminar.id) reiniciarFormulario()
      if (registroAbierto?.id === registroAEliminar.id) setRegistroAbierto(null)
      setRegistroAEliminar(null)
    } catch (err) {
      setErrorEliminar(extraerMensajeError(err, 'No se pudo eliminar el registro'))
    } finally {
      setEliminando(false)
    }
  }

  return (
    <Stack spacing={2.5}>
      <Card>
        <CardContent sx={{ p: 2.5 }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ fontWeight: 600, letterSpacing: 0.5 }}
            >
              {editandoId ? `Editando registro #${editandoId}` : 'Nuevo registro'}
            </Typography>
            {editandoId && (
              <Button size="small" onClick={reiniciarFormulario}>
                Cancelar
              </Button>
            )}
          </Stack>

          <Stack spacing={2} sx={{ mt: 1.5 }}>
            <TextField
              label="Nombre del trabajador"
              fullWidth
              value={form.nombre_trabajador}
              onChange={(e) => actualizarCampo('nombre_trabajador', e.target.value)}
              disabled={guardando}
            />
            <TextField
              label="Fecha"
              type="date"
              fullWidth
              value={form.fecha}
              onChange={(e) => actualizarCampo('fecha', e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              disabled={guardando}
            />
            <Autocomplete
              freeSolo
              options={PUESTOS_SUGERIDOS}
              value={form.puesto}
              onInputChange={(e, valor) => actualizarCampo('puesto', valor || '')}
              disabled={guardando}
              renderInput={(params) => <TextField {...params} label="Puesto" fullWidth />}
            />
            <Autocomplete
              freeSolo
              options={proyectos}
              value={form.proyecto}
              onInputChange={(e, valor) => actualizarCampo('proyecto', valor || '')}
              disabled={guardando}
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
              renderInput={(params) => <TextField {...params} label="Proyecto" fullWidth />}
            />
            <TextField
              label="ID de trabajo"
              fullWidth
              value={form.id_trabajo}
              onChange={(e) => actualizarCampo('id_trabajo', e.target.value)}
              disabled={guardando}
            />
            <TextField
              label="Tipo de trabajo"
              fullWidth
              value={form.tipo_trabajo}
              onChange={(e) => actualizarCampo('tipo_trabajo', e.target.value)}
              disabled={guardando}
            />
            <FormControl fullWidth>
              <InputLabel id="posicion-label">Posición</InputLabel>
              <Select
                labelId="posicion-label"
                label="Posición"
                value={form.posicion}
                onChange={(e) => actualizarCampo('posicion', e.target.value)}
                disabled={guardando}
              >
                {POSICIONES.map((p) => (
                  <MenuItem key={p} value={p}>
                    {p}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Área / medida (metros lineales)"
              type="number"
              fullWidth
              value={form.area_metros}
              onChange={(e) => actualizarCampo('area_metros', e.target.value)}
              disabled={guardando}
              slotProps={{ htmlInput: { step: '0.01', min: 0 } }}
            />
            <TextField
              label="Supervisor a cargo"
              fullWidth
              value={form.supervisor}
              onChange={(e) => actualizarCampo('supervisor', e.target.value)}
              disabled={guardando}
            />
          </Stack>
        </CardContent>
      </Card>

      {ETAPAS.map((etapa) => {
        const pctRwk = calculado[`${etapa.id}_pct_rwk`]
        const pctFpy = calculado[`${etapa.id}_pct_fpy`]
        return (
          <Card key={etapa.id} sx={{ borderLeft: '4px solid', borderColor: etapa.color.bgHeader }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <EngineeringOutlinedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ fontWeight: 600, letterSpacing: 0.5 }}
                >
                  {etapa.titulo}
                </Typography>
              </Stack>

              <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                {etapa.defectos.map(({ campo, label }) => {
                  const pctCampo = calculado[`${campo}_pct`]
                  return (
                    <Stack key={campo} direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                      <TextField
                        label={label}
                        type="number"
                        size="small"
                        fullWidth
                        value={form[campo]}
                        onChange={(e) => actualizarCampo(campo, e.target.value)}
                        disabled={guardando}
                        slotProps={{ htmlInput: { step: '0.01', min: 0 } }}
                      />
                      <Chip
                        size="small"
                        label={fmtPct(pctCampo)}
                        color={
                          pctCampo === null ? 'default' : pctCampo >= META_FPY ? 'success' : 'error'
                        }
                        sx={{ minWidth: 64, flexShrink: 0 }}
                      />
                    </Stack>
                  )
                })}
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                <Chip
                  size="small"
                  variant="outlined"
                  label={`RWK: ${fmtMetros(calculado[`${etapa.id}_rwk`])} m`}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  label={`Aceptación: ${fmtMetros(calculado[`${etapa.id}_aceptacion`])} m`}
                />
                <Chip
                  size="small"
                  label={`% RWK: ${fmtPct(pctRwk)}`}
                  color={pctRwk === null ? 'default' : pctRwk <= META_RWK ? 'success' : 'error'}
                />
                <Chip
                  size="small"
                  label={`% FPY: ${fmtPct(pctFpy)}`}
                  color={pctFpy === null ? 'default' : pctFpy >= META_FPY ? 'success' : 'error'}
                />
              </Stack>
            </CardContent>
          </Card>
        )
      })}

      {mensaje && (
        <Alert severity={mensaje.tipo} variant="filled">
          {mensaje.texto}
        </Alert>
      )}

      <Button
        variant="contained"
        size="large"
        fullWidth
        startIcon={guardando ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
        onClick={guardar}
        disabled={guardando || !puedeGuardar}
        sx={{ py: 1.75, fontSize: '1rem' }}
      >
        {guardando ? 'Guardando...' : editandoId ? 'Actualizar registro' : 'Guardar registro'}
      </Button>

      <Divider sx={{ mt: 1 }} />

      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          {registros.length} {registros.length === 1 ? 'registro' : 'registros'}
        </Typography>
        <IconButton size="small" onClick={cargarRegistros} disabled={cargando}>
          <RefreshIcon fontSize="small" />
        </IconButton>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      {cargando && registros.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : registros.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="body1" color="text.secondary">
              Aún no hay registros de calidad FPY/RWK
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={1.5}>
          {registros.map((registro) => (
            <TarjetaRegistro
              key={registro.id}
              registro={registro}
              esPropio={registro.capturado_por.id === usuario?.id}
              onAbrir={setRegistroAbierto}
              onEditar={editar}
              onEliminar={(r) => {
                setErrorEliminar(null)
                setRegistroAEliminar(r)
              }}
            />
          ))}
        </Stack>
      )}

      {promediosPorFecha.length > 0 && (
        <>
          <TablaPromedioPorFecha
            titulo="Promedio de % RWK por fecha"
            etiquetaColumna="% RWK"
            datos={promediosPorFecha}
            sufijo="rwk"
            meta={META_RWK}
            mejorSiMayor={false}
          />
          <TablaPromedioPorFecha
            titulo="Promedio de % FPY por fecha"
            etiquetaColumna="% FPY"
            datos={promediosPorFecha}
            sufijo="fpy"
            meta={META_FPY}
            mejorSiMayor
          />
        </>
      )}

      {promediosPorMes.length > 0 && (
        <Card>
          <CardContent sx={{ p: 2.5 }}>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ fontWeight: 600, letterSpacing: 0.5 }}
            >
              Resumen mensual vs meta (80%)
            </Typography>
            <Stack spacing={3} sx={{ mt: 2 }}>
              <GraficoMetaMensual
                titulo="% FPY (mayor a la meta es mejor)"
                datos={promediosPorMes}
                valorKey="fpy"
                meta={META_FPY}
                mejorSiMayor
              />
              <GraficoMetaMensual
                titulo="% RWK (menor a la meta es mejor)"
                datos={promediosPorMes}
                valorKey="rwk"
                meta={META_RWK}
                mejorSiMayor={false}
              />
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* DETALLE */}
      <Dialog
        open={Boolean(registroAbierto)}
        onClose={() => setRegistroAbierto(null)}
        maxWidth="sm"
        fullWidth
      >
        {registroAbierto && (
          <>
            <DialogTitle sx={{ pr: 10 }}>
              {registroAbierto.proyecto}
              <Stack
                direction="row"
                spacing={0.5}
                sx={{ position: 'absolute', top: 8, right: 8, alignItems: 'center' }}
              >
                {registroAbierto.capturado_por.id === usuario?.id && (
                  <>
                    <IconButton onClick={() => editar(registroAbierto)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      onClick={() => {
                        setErrorEliminar(null)
                        setRegistroAEliminar(registroAbierto)
                      }}
                    >
                      <DeleteOutlineIcon fontSize="small" color="error" />
                    </IconButton>
                  </>
                )}
                <IconButton onClick={() => setRegistroAbierto(null)}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Stack>
            </DialogTitle>
            <DialogContent dividers>
              <Stack spacing={0.5} sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Trabajador:</strong> {registroAbierto.nombre_trabajador} ·{' '}
                  {registroAbierto.puesto}
                </Typography>
                <Typography variant="body2">
                  <strong>Fecha:</strong> {registroAbierto.fecha}
                </Typography>
                <Typography variant="body2">
                  <strong>ID de trabajo:</strong> {registroAbierto.id_trabajo}
                </Typography>
                <Typography variant="body2">
                  <strong>Tipo de trabajo:</strong> {registroAbierto.tipo_trabajo}
                </Typography>
                <Typography variant="body2">
                  <strong>Posición:</strong> {registroAbierto.posicion || '—'}
                </Typography>
                <Typography variant="body2">
                  <strong>Área:</strong> {registroAbierto.area_metros} m
                </Typography>
                <Typography variant="body2">
                  <strong>Supervisor:</strong> {registroAbierto.supervisor || 'SN'}
                </Typography>
                <Typography variant="body2">
                  <strong>Capturado por:</strong> {registroAbierto.capturado_por.nombre}
                </Typography>
              </Stack>

              {ETAPAS.map((etapa) => (
                <Box key={etapa.id} sx={{ mb: 2 }}>
                  <Typography
                    variant="overline"
                    sx={{ fontWeight: 700, color: etapa.color.text }}
                  >
                    {etapa.titulo}
                  </Typography>
                  <Stack spacing={0.5} sx={{ mb: 1 }}>
                    {etapa.defectos.map(({ campo, label }) => (
                      <Typography key={campo} variant="body2" color="text.secondary">
                        {label}: {fmtMetros(registroAbierto[campo])}
                      </Typography>
                    ))}
                  </Stack>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`RWK: ${fmtMetros(registroAbierto[`${etapa.id}_rwk`])} m`}
                    />
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`Aceptación: ${fmtMetros(registroAbierto[`${etapa.id}_aceptacion`])} m`}
                    />
                    <Chip
                      size="small"
                      label={`% RWK: ${fmtPct(registroAbierto[`${etapa.id}_pct_rwk`])}`}
                    />
                    <Chip
                      size="small"
                      label={`% FPY: ${fmtPct(registroAbierto[`${etapa.id}_pct_fpy`])}`}
                    />
                  </Stack>
                </Box>
              ))}
            </DialogContent>
          </>
        )}
      </Dialog>

      {/* CONFIRMAR ELIMINAR */}
      <Dialog
        open={Boolean(registroAEliminar)}
        onClose={() => (eliminando ? null : setRegistroAEliminar(null))}
        maxWidth="xs"
        fullWidth
      >
        {registroAEliminar && (
          <>
            <DialogTitle>¿Eliminar este registro?</DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary">
                Se eliminará el registro de <strong>{registroAEliminar.nombre_trabajador}</strong>{' '}
                ({registroAEliminar.fecha}) en {registroAEliminar.proyecto}. Esta acción no se
                puede deshacer.
              </Typography>
              {errorEliminar && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {errorEliminar}
                </Alert>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setRegistroAEliminar(null)} disabled={eliminando}>
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
