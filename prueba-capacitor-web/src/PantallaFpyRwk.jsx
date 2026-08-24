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
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from '@mui/material'
import {
  Save as SaveIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  DeleteOutlined as DeleteOutlineIcon,
  AddCircleOutlineOutlined as AddCircleOutlineIcon,
  EngineeringOutlined as EngineeringOutlinedIcon,
  QueryStatsOutlined as QueryStatsOutlinedIcon,
  FilterAltOutlined as FilterAltOutlinedIcon,
} from '@mui/icons-material'
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import {
  crearRegistroFpyRwk,
  actualizarRegistroFpyRwk,
  listarRegistrosFpyRwk,
  eliminarRegistroFpyRwk,
  listarProyectos,
  ocultarProyecto,
  listarIdsTrabajo,
  ocultarIdTrabajo,
  extraerMensajeError,
} from './api'
import {
  ETAPAS,
  CAMPOS_DEFECTO,
  calcularFpyRwk,
  agruparPromediosPorFecha,
  agruparPromediosPorProyecto,
  META_FPY,
  META_RWK,
} from './calculosFpyRwk'

function fmtMetros(valor) {
  return valor === null || valor === undefined ? '—' : Number(valor).toFixed(2)
}

function fmtPctTabla(valor) {
  return valor === null || valor === undefined ? '—' : `${Math.round(valor * 100)}%`
}

const PUESTOS_SUGERIDOS = ['Soldador', 'Pailero']
const TIPOS_TRABAJO_SUGERIDOS = ['Armado y Pailería', 'Soldadura', 'Raíz', 'Soldadura Final']
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

function fmtPct(valor) {
  return valor === null || valor === undefined ? '—' : `${Math.round(valor * 100)}%`
}

const ALTURA_GRAFICO = 180

function GraficoMetaMensual({ titulo, datos, valorKey, meta, mejorSiMayor }) {
  // Espejo de la celda O4/O24 del Excel: promedio general de todos los
  // meses, mostrado como una barra extra al final, separada del resto.
  const valoresMeses = datos.map((d) => d[valorKey]).filter((v) => v !== null && v !== undefined)
  const promedioGeneral = valoresMeses.length
    ? valoresMeses.reduce((a, b) => a + b, 0) / valoresMeses.length
    : null
  const barras = [
    ...datos.map((d) => ({ clave: d.clave, label: d.label, valor: d[valorKey], esResumen: false })),
    { clave: '__promedio__', label: 'Promedio', valor: promedioGeneral, esResumen: true },
  ]

  return <BarrasMeta titulo={titulo} barras={barras} meta={meta} mejorSiMayor={mejorSiMayor} />
}

// Un bloque de barras (una por proceso: Armado, Soldadura inicial, Raíz,
// Soldadura final) para un solo proyecto, para ver de un vistazo en qué
// etapa se está quedando corto ese proyecto en particular.
function GraficoPorProceso({ titulo, proyectoData, sufijo, meta, mejorSiMayor }) {
  const barras = ETAPAS.map((etapa) => ({
    clave: etapa.id,
    label: etapa.titulo,
    valor: proyectoData[`${etapa.id}_${sufijo}`],
  }))

  return <BarrasMeta titulo={titulo} barras={barras} meta={meta} mejorSiMayor={mejorSiMayor} />
}

function BarrasMeta({ titulo, barras, meta, mejorSiMayor }) {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
        {titulo}
      </Typography>
      <Box
        sx={{
          position: 'relative',
          height: ALTURA_GRAFICO,
          display: 'flex',
          alignItems: 'flex-end',
          gap: 1.5,
          px: 1,
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
            sx={{ position: 'absolute', right: 0, top: -18, color: 'warning.main', fontWeight: 600 }}
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
                flex: 1,
                minWidth: 32,
                ...(b.esResumen && { ml: 1, pl: 1.5, borderLeft: '1px dashed', borderColor: 'divider' }),
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {fmtPctTabla(b.valor)}
              </Typography>
              <Box
                sx={{
                  width: '100%',
                  maxWidth: 28,
                  height: `${alturaPx}px`,
                  bgcolor: b.valor === null
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
      <Stack direction="row" spacing={1.5} sx={{ px: 1, mt: 0.5 }}>
        {barras.map((b) => (
          <Typography
            key={b.clave}
            variant="caption"
            color={b.esResumen ? 'text.primary' : 'text.secondary'}
            sx={{
              flex: 1,
              minWidth: 32,
              textAlign: 'center',
              fontWeight: b.esResumen ? 700 : 400,
              ...(b.esResumen && { ml: 1, pl: 1.5, borderLeft: '1px dashed', borderColor: 'divider' }),
            }}
          >
            {b.label}
          </Typography>
        ))}
      </Stack>
    </Box>
  )
}

function TablaPromedioPorEtapa({
  titulo,
  etiquetaColumna,
  etiquetaFila = 'Fecha',
  campoFila = 'fecha',
  datos,
  sufijo,
  meta,
  mejorSiMayor,
}) {
  return (
    <Card>
      <CardContent sx={{ p: 2.5 }}>
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ fontWeight: 600, letterSpacing: 0.5 }}
        >
          {titulo}
        </Typography>
        <TableContainer sx={{ mt: 1.5, maxWidth: '100%', overflowX: 'auto' }}>
          <Table size="small" sx={{ whiteSpace: 'nowrap' }}>
            <TableHead>
              <TableRow>
                <TableCell>{etiquetaFila}</TableCell>
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
                <TableRow key={fila[campoFila]} hover>
                  <TableCell>{fila[campoFila]}</TableCell>
                  {ETAPAS.map((etapa) => {
                    const valor = fila[`${etapa.id}_${sufijo}`]
                    const enMeta = valor !== null && (mejorSiMayor ? valor >= meta : valor <= meta)
                    return (
                      <TableCell key={etapa.id} align="right" sx={{ bgcolor: etapa.color.bg }}>
                        <Chip
                          size="small"
                          label={fmtPctTabla(valor)}
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

export default function PantallaFpyRwk() {
  const [proyectos, setProyectos] = useState([])
  const [idsTrabajo, setIdsTrabajo] = useState([])
  const [form, setForm] = useState(formularioVacio)
  const [editandoId, setEditandoId] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  const [registros, setRegistros] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [registroAEliminar, setRegistroAEliminar] = useState(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState(null)
  const [filtroProyecto, setFiltroProyecto] = useState('')

  useEffect(() => {
    listarProyectos()
      .then(setProyectos)
      .catch(() => {})
    listarIdsTrabajo()
      .then(setIdsTrabajo)
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
    const iniciar = async () => {
      await cargarRegistros()
    }
    iniciar()
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

  const borrarSugerenciaIdTrabajo = async (id, e) => {
    e.stopPropagation()
    setIdsTrabajo((prev) => prev.filter((i) => i !== id))
    try {
      await ocultarIdTrabajo(id)
    } catch {
      setIdsTrabajo((prev) => (prev.includes(id) ? prev : [...prev, id]))
    }
  }

  const calculado = useMemo(() => calcularFpyRwk(form), [form])
  const registrosFiltrados = useMemo(() => {
    const q = filtroProyecto.trim().toLowerCase()
    if (!q) return registros
    return registros.filter((r) => r.proyecto.toLowerCase().includes(q))
  }, [registros, filtroProyecto])
  const promediosPorProyecto = useMemo(
    () => agruparPromediosPorProyecto(registrosFiltrados),
    [registrosFiltrados]
  )
  const promediosPorFecha = useMemo(
    () => agruparPromediosPorFecha(registrosFiltrados),
    [registrosFiltrados]
  )

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
        texto: editandoId
          ? 'Registro actualizado — puedes seguir con la siguiente etapa'
          : 'Registro guardado — puedes seguir con la siguiente etapa, o toca "Nuevo registro" para capturar otro',
      })
      setProyectos((prev) =>
        prev.includes(resultado.proyecto) ? prev : [resultado.proyecto, ...prev]
      )
      // No se reinicia el formulario: se queda editando este mismo registro
      // para poder ir llenando las demas etapas (Soldadura inicial, Raiz...)
      // en pasos separados, sin tener que buscarlo de nuevo en la lista.
      setEditandoId(resultado.id)
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
      setRegistroAEliminar(null)
    } catch (err) {
      setErrorEliminar(extraerMensajeError(err, 'No se pudo eliminar el registro'))
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
            bgcolor: 'secondary.main',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <QueryStatsOutlinedIcon />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ lineHeight: 1.15 }}>
            Calidad FPY / RWK
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {filtroProyecto.trim()
              ? `${registrosFiltrados.length} ${
                  registrosFiltrados.length === 1 ? 'registro' : 'registros'
                } · filtro activo`
              : `${registros.length} ${registros.length === 1 ? 'registro capturado' : 'registros capturados'}`}
          </Typography>
        </Box>
      </Stack>

      <Card
        sx={{
          borderTop: '3px solid',
          borderColor: editandoId ? 'warning.main' : 'secondary.main',
        }}
      >
        <CardContent sx={{ p: 2.5 }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <AddCircleOutlineIcon sx={{ fontSize: 18, color: editandoId ? 'warning.main' : 'secondary.main' }} />
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ fontWeight: 700, letterSpacing: 0.5 }}
              >
                {editandoId ? `Editando registro #${editandoId}` : 'Nuevo registro'}
              </Typography>
            </Stack>
            {editandoId && (
              <Button size="small" onClick={reiniciarFormulario}>
                Nuevo registro
              </Button>
            )}
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 1.5, flexWrap: 'wrap' }}>
            <TextField
              label="Nombre del trabajador"
              size="small"
              sx={{ minWidth: 220, flex: 1 }}
              value={form.nombre_trabajador}
              onChange={(e) => actualizarCampo('nombre_trabajador', e.target.value)}
              disabled={guardando}
            />
            <TextField
              label="Fecha"
              type="date"
              size="small"
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
              sx={{ minWidth: 160 }}
              disabled={guardando}
              renderInput={(params) => <TextField {...params} label="Puesto" size="small" />}
            />
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 2, flexWrap: 'wrap' }}>
            <Autocomplete
              freeSolo
              options={proyectos}
              value={form.proyecto}
              onInputChange={(e, valor) => actualizarCampo('proyecto', valor || '')}
              sx={{ minWidth: 200, flex: 1 }}
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
              renderInput={(params) => <TextField {...params} label="Proyecto" size="small" />}
            />
            <Autocomplete
              freeSolo
              options={idsTrabajo}
              value={form.id_trabajo}
              onInputChange={(e, valor) => actualizarCampo('id_trabajo', valor || '')}
              sx={{ minWidth: 160 }}
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
            <Autocomplete
              freeSolo
              options={TIPOS_TRABAJO_SUGERIDOS}
              value={form.tipo_trabajo}
              onInputChange={(e, valor) => actualizarCampo('tipo_trabajo', valor || '')}
              sx={{ minWidth: 180 }}
              disabled={guardando}
              renderInput={(params) => <TextField {...params} label="Tipo de trabajo" size="small" />}
            />
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 2, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 140 }}>
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
              size="small"
              sx={{ minWidth: 200 }}
              value={form.area_metros}
              onChange={(e) => actualizarCampo('area_metros', e.target.value)}
              disabled={guardando}
              slotProps={{ htmlInput: { step: '0.01', min: 0 } }}
            />
            <TextField
              label="Supervisor a cargo"
              size="small"
              sx={{ minWidth: 200, flex: 1 }}
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
          <Card
            key={etapa.id}
            sx={{ borderLeft: '4px solid', borderColor: etapa.color.bgHeader }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <EngineeringOutlinedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ fontWeight: 700, letterSpacing: 0.5 }}
                >
                  {etapa.titulo}
                </Typography>
              </Stack>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                  gap: 1.5,
                  mt: 1.5,
                }}
              >
                {etapa.defectos.map(({ campo, label }) => {
                  const pctCampo = calculado[`${campo}_pct`]
                  return (
                    <Stack
                      key={campo}
                      direction="row"
                      spacing={1.5}
                      sx={{ alignItems: 'center' }}
                    >
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
              </Box>

              <Divider sx={{ my: 2 }} />

              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
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

      {error && <Alert severity="error">{error}</Alert>}

      <Card>
        <CardContent sx={{ p: 2.5 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
            <FilterAltOutlinedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ fontWeight: 700, letterSpacing: 0.5 }}
            >
              Filtro
            </Typography>
          </Stack>
          <Autocomplete
            freeSolo
            options={proyectos}
            value={filtroProyecto}
            onInputChange={(e, valorNuevo) => setFiltroProyecto(valorNuevo || '')}
            sx={{ maxWidth: 320 }}
            renderInput={(params) => (
              <TextField {...params} label="Proyecto" placeholder="Todos los proyectos" size="small" />
            )}
          />
        </CardContent>
      </Card>

      {cargando && registros.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : registros.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 7 }}>
            <QueryStatsOutlinedIcon sx={{ fontSize: 44, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body1" color="text.secondary">
              Aún no hay registros de calidad FPY/RWK
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <>
          {registrosFiltrados.length === 0 ? (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 7 }}>
                <QueryStatsOutlinedIcon sx={{ fontSize: 44, color: 'text.disabled', mb: 1 }} />
                <Typography variant="body1" color="text.secondary">
                  No hay registros con ese proyecto
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ maxWidth: '100%', overflowX: 'auto' }}>
              <Table size="small" sx={{ whiteSpace: 'nowrap' }}>
                <TableHead>
                  <TableRow>
                    <TableCell rowSpan={2}>Fecha</TableCell>
                    <TableCell rowSpan={2}>Trabajador</TableCell>
                    <TableCell rowSpan={2}>Puesto</TableCell>
                    <TableCell rowSpan={2}>Proyecto</TableCell>
                    <TableCell rowSpan={2}>ID de trabajo</TableCell>
                    <TableCell rowSpan={2}>Tipo de trabajo</TableCell>
                    <TableCell rowSpan={2}>Posición</TableCell>
                    <TableCell rowSpan={2} align="right">
                      Área (m)
                    </TableCell>
                    <TableCell rowSpan={2}>Supervisor a cargo</TableCell>
                    {ETAPAS.map((etapa) => (
                      <TableCell
                        key={etapa.id}
                        colSpan={4}
                        align="center"
                        sx={{ bgcolor: etapa.color.bgHeader, color: etapa.color.text, fontWeight: 700 }}
                      >
                        {etapa.titulo}
                      </TableCell>
                    ))}
                    <TableCell rowSpan={2} align="right" />
                  </TableRow>
                  <TableRow>
                    {ETAPAS.map((etapa) => (
                      <Fragment key={etapa.id}>
                        <TableCell
                          align="right"
                          sx={{ bgcolor: etapa.color.bgHeader, color: etapa.color.text }}
                        >
                          RWK (m)
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ bgcolor: etapa.color.bgHeader, color: etapa.color.text }}
                        >
                          Aceptación (m)
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ bgcolor: etapa.color.bgHeader, color: etapa.color.text }}
                        >
                          % RWK
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ bgcolor: etapa.color.bgHeader, color: etapa.color.text }}
                        >
                          % FPY
                        </TableCell>
                      </Fragment>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {registrosFiltrados.map((registro) => (
                    <TableRow key={registro.id} hover>
                      <TableCell>{registro.fecha}</TableCell>
                      <TableCell>{registro.nombre_trabajador}</TableCell>
                      <TableCell>{registro.puesto}</TableCell>
                      <TableCell>{registro.proyecto}</TableCell>
                      <TableCell>{registro.id_trabajo || '—'}</TableCell>
                      <TableCell>{registro.tipo_trabajo}</TableCell>
                      <TableCell>{registro.posicion || '—'}</TableCell>
                      <TableCell align="right">{registro.area_metros}</TableCell>
                      <TableCell>{registro.supervisor || 'SN'}</TableCell>
                      {ETAPAS.map((etapa) => (
                        <Fragment key={etapa.id}>
                          <TableCell align="right" sx={{ bgcolor: etapa.color.bg }}>
                            {fmtMetros(registro[`${etapa.id}_rwk`])}
                          </TableCell>
                          <TableCell align="right" sx={{ bgcolor: etapa.color.bg }}>
                            {fmtMetros(registro[`${etapa.id}_aceptacion`])}
                          </TableCell>
                          <TableCell align="right" sx={{ bgcolor: etapa.color.bg }}>
                            {fmtPctTabla(registro[`${etapa.id}_pct_rwk`])}
                          </TableCell>
                          <TableCell align="right" sx={{ bgcolor: etapa.color.bg }}>
                            {fmtPctTabla(registro[`${etapa.id}_pct_fpy`])}
                          </TableCell>
                        </Fragment>
                      ))}
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => editar(registro)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setErrorEliminar(null)
                            setRegistroAEliminar(registro)
                          }}
                        >
                          <DeleteOutlineIcon fontSize="small" color="error" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {promediosPorFecha.length > 0 && (
            <>
              <TablaPromedioPorEtapa
                titulo="Promedio de % RWK por fecha"
                etiquetaColumna="% RWK"
                datos={promediosPorFecha}
                sufijo="rwk"
                meta={META_RWK}
                mejorSiMayor={false}
              />
              <TablaPromedioPorEtapa
                titulo="Promedio de % FPY por fecha"
                etiquetaColumna="% FPY"
                datos={promediosPorFecha}
                sufijo="fpy"
                meta={META_FPY}
                mejorSiMayor
              />
            </>
          )}

          {promediosPorProyecto.length > 0 && (
            <>
              <Card>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography
                    variant="overline"
                    color="text.secondary"
                    sx={{ fontWeight: 600, letterSpacing: 0.5 }}
                  >
                    Resumen por proyecto vs meta (80%)
                  </Typography>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} sx={{ mt: 2 }}>
                    <Box sx={{ flex: 1, minWidth: 0, overflowX: 'auto' }}>
                      <Box sx={{ minWidth: Math.max(320, promediosPorProyecto.length * 56) }}>
                        <GraficoMetaMensual
                          titulo="% FPY (mayor a la meta es mejor)"
                          datos={promediosPorProyecto}
                          valorKey="fpy"
                          meta={META_FPY}
                          mejorSiMayor
                        />
                      </Box>
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0, overflowX: 'auto' }}>
                      <Box sx={{ minWidth: Math.max(320, promediosPorProyecto.length * 56) }}>
                        <GraficoMetaMensual
                          titulo="% RWK (menor a la meta es mejor)"
                          datos={promediosPorProyecto}
                          valorKey="rwk"
                          meta={META_RWK}
                          mejorSiMayor={false}
                        />
                      </Box>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
              {promediosPorProyecto.map((p) => (
                <Card key={p.clave}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Typography
                      variant="overline"
                      color="text.secondary"
                      sx={{ fontWeight: 600, letterSpacing: 0.5 }}
                    >
                      {p.proyecto} · % por proceso (Armado, Soldadura inicial, Raíz, Soldadura final)
                    </Typography>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} sx={{ mt: 2 }}>
                      <Box sx={{ flex: 1, minWidth: 0, overflowX: 'auto' }}>
                        <Box sx={{ minWidth: 320 }}>
                          <GraficoPorProceso
                            titulo="% FPY (mayor a la meta es mejor)"
                            proyectoData={p}
                            sufijo="fpy"
                            meta={META_FPY}
                            mejorSiMayor
                          />
                        </Box>
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0, overflowX: 'auto' }}>
                        <Box sx={{ minWidth: 320 }}>
                          <GraficoPorProceso
                            titulo="% RWK (menor a la meta es mejor)"
                            proyectoData={p}
                            sufijo="rwk"
                            meta={META_RWK}
                            mejorSiMayor={false}
                          />
                        </Box>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </>
      )}

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
