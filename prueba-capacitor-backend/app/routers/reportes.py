from datetime import datetime, date, timedelta, timezone
from pathlib import Path
import os
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import get_current_user
from app.models import (
    IdTrabajoOculto,
    LocacionOculta,
    Proceso,
    ProyectoOculto,
    ReporteCabecera,
    ReporteFoto,
    Usuario,
)
from app.schemas import (
    AsignarIdTrabajoRequest,
    AsignarLocacionRequest,
    EditarIdTrabajoRequest,
    EditarLocacionRequest,
    EditarProyectoRequest,
    EditarReporteRequest,
    ReporteOut,
)

router = APIRouter(prefix="/reportes", tags=["reportes"])

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

EXTENSIONES_PERMITIDAS = {".jpg", ".jpeg", ".png", ".webp"}
TAMANO_MAX_MB = 10

# México eliminó el horario de verano en 2022, así que un offset fijo
# (zona centro, UTC-6) es correcto todo el año para interpretar los
# filtros de fecha "de hoy" tal como los escribe el inspector.
ZONA_LOCAL = timezone(timedelta(hours=-6))


def _inicio_dia_utc(dia: date) -> datetime:
    return datetime(dia.year, dia.month, dia.day, tzinfo=ZONA_LOCAL)


def _cargar_completo(db: Session, reporte_id: int) -> ReporteCabecera:
    return (
        db.query(ReporteCabecera)
        .options(
            joinedload(ReporteCabecera.proceso),
            joinedload(ReporteCabecera.inspector),
            joinedload(ReporteCabecera.fotos),
        )
        .filter(ReporteCabecera.id == reporte_id)
        .first()
    )


async def _guardar_foto(upload) -> tuple[str, str]:
    extension = Path(upload.filename or "").suffix.lower()
    if extension not in EXTENSIONES_PERMITIDAS:
        raise HTTPException(
            status_code=400,
            detail=f"Formato no permitido. Usa: {', '.join(EXTENSIONES_PERMITIDAS)}",
        )

    contenido = await upload.read()
    if len(contenido) > TAMANO_MAX_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"La foto excede {TAMANO_MAX_MB} MB",
        )

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    nombre_unico = f"{timestamp}_{uuid.uuid4().hex[:8]}{extension}"
    ruta_completa = UPLOAD_DIR / nombre_unico
    with open(ruta_completa, "wb") as f:
        f.write(contenido)

    return str(ruta_completa), nombre_unico


@router.post("/", response_model=ReporteOut, status_code=status.HTTP_201_CREATED)
async def crear_reporte(
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_current_user),
):
    form = await request.form()

    proyecto = str(form.get("proyecto", "")).strip()
    if not proyecto:
        raise HTTPException(status_code=400, detail="El proyecto es obligatorio")

    id_trabajo = str(form.get("id_trabajo", "")).strip()
    if not id_trabajo:
        raise HTTPException(status_code=400, detail="El ID de trabajo es obligatorio")

    locacion = str(form.get("locacion", "")).strip()
    if not locacion:
        raise HTTPException(status_code=400, detail="La locación es obligatoria")

    try:
        proceso_id = int(form["proceso_id"])
    except (KeyError, ValueError):
        raise HTTPException(status_code=400, detail="proceso_id es obligatorio")

    proceso = db.query(Proceso).filter(Proceso.id == proceso_id).first()
    if not proceso:
        raise HTTPException(status_code=404, detail="Proceso no encontrado")

    comentario = str(form.get("comentario", "")).strip() or None

    archivos = [
        valor
        for clave, valor in form.multi_items()
        if clave == "fotos" and getattr(valor, "filename", None)
    ]
    if not archivos:
        raise HTTPException(status_code=400, detail="Agrega al menos una foto")

    nuevo = ReporteCabecera(
        proyecto=proyecto,
        id_trabajo=id_trabajo,
        locacion=locacion,
        proceso_id=proceso.id,
        inspector_id=usuario_actual.id,
        comentario=comentario,
    )
    db.add(nuevo)
    db.flush()

    db.query(ProyectoOculto).filter(ProyectoOculto.nombre == proyecto).delete()
    db.query(IdTrabajoOculto).filter(IdTrabajoOculto.id_trabajo == id_trabajo).delete()
    db.query(LocacionOculta).filter(LocacionOculta.locacion == locacion).delete()

    for archivo in archivos:
        foto_ruta, foto_nombre = await _guardar_foto(archivo)
        db.add(
            ReporteFoto(
                reporte_id=nuevo.id,
                foto_ruta=foto_ruta,
                foto_nombre=foto_nombre,
            )
        )

    db.commit()

    return _cargar_completo(db, nuevo.id)


@router.get("/", response_model=list[ReporteOut])
def listar_reportes(
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_current_user),
    proyecto: Optional[str] = Query(None),
    id_trabajo: Optional[str] = Query(None),
    sin_id_trabajo: Optional[bool] = Query(None),
    locacion: Optional[str] = Query(None),
    sin_locacion: Optional[bool] = Query(None),
    proceso_id: Optional[int] = Query(None),
    inspector_id: Optional[int] = Query(None),
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    q: Optional[str] = Query(None),
):
    consulta = db.query(ReporteCabecera).options(
        joinedload(ReporteCabecera.proceso),
        joinedload(ReporteCabecera.inspector),
        joinedload(ReporteCabecera.fotos),
    )

    if proyecto:
        consulta = consulta.filter(ReporteCabecera.proyecto.ilike(f"%{proyecto}%"))
    if sin_id_trabajo:
        consulta = consulta.filter(ReporteCabecera.id_trabajo.is_(None))
    elif id_trabajo:
        consulta = consulta.filter(ReporteCabecera.id_trabajo.ilike(f"%{id_trabajo}%"))
    if sin_locacion:
        consulta = consulta.filter(ReporteCabecera.locacion.is_(None))
    elif locacion:
        consulta = consulta.filter(ReporteCabecera.locacion.ilike(f"%{locacion}%"))
    if proceso_id:
        consulta = consulta.filter(ReporteCabecera.proceso_id == proceso_id)
    if inspector_id:
        consulta = consulta.filter(ReporteCabecera.inspector_id == inspector_id)
    if fecha_desde:
        consulta = consulta.filter(
            ReporteCabecera.fecha_creacion >= _inicio_dia_utc(fecha_desde)
        )
    if fecha_hasta:
        consulta = consulta.filter(
            ReporteCabecera.fecha_creacion
            < _inicio_dia_utc(fecha_hasta + timedelta(days=1))
        )
    if q:
        patron = f"%{q}%"
        consulta = consulta.filter(
            or_(
                ReporteCabecera.proyecto.ilike(patron),
                ReporteCabecera.comentario.ilike(patron),
            )
        )

    return consulta.order_by(ReporteCabecera.fecha_creacion.desc()).all()


@router.patch("/id-trabajo", response_model=dict)
def editar_id_trabajo(
    payload: EditarIdTrabajoRequest,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_current_user),
):
    """Renombra un ID de trabajo en todos los reportes que lo tienen (ej.
    para corregir un error de captura). Actúa sobre el valor, no sobre un
    reporte puntual, para que un mismo trabajo (armado, soldadura, raíz...)
    no quede repartido entre el ID viejo y el nuevo."""
    actual = payload.id_trabajo_actual.strip()
    nuevo = payload.id_trabajo_nuevo.strip()
    if actual == nuevo:
        raise HTTPException(
            status_code=400, detail="El nuevo ID debe ser distinto al actual"
        )

    afectados = (
        db.query(ReporteCabecera)
        .filter(ReporteCabecera.id_trabajo == actual)
        .update({ReporteCabecera.id_trabajo: nuevo}, synchronize_session=False)
    )
    if not afectados:
        raise HTTPException(
            status_code=404, detail="No hay reportes con ese ID de trabajo"
        )

    db.query(IdTrabajoOculto).filter(IdTrabajoOculto.id_trabajo == nuevo).delete()
    db.commit()

    return {"actualizados": afectados}


@router.patch("/locacion", response_model=dict)
def editar_locacion(
    payload: EditarLocacionRequest,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_current_user),
):
    """Renombra una locación en todos los reportes que la tienen. Igual que
    editar_id_trabajo: actúa sobre el valor, no sobre un reporte puntual."""
    actual = payload.locacion_actual.strip()
    nueva = payload.locacion_nueva.strip()
    if actual == nueva:
        raise HTTPException(
            status_code=400, detail="La nueva locación debe ser distinta a la actual"
        )

    afectados = (
        db.query(ReporteCabecera)
        .filter(ReporteCabecera.locacion == actual)
        .update({ReporteCabecera.locacion: nueva}, synchronize_session=False)
    )
    if not afectados:
        raise HTTPException(status_code=404, detail="No hay reportes con esa locación")

    db.query(LocacionOculta).filter(LocacionOculta.locacion == nueva).delete()
    db.commit()

    return {"actualizados": afectados}


@router.patch("/proyecto", response_model=dict)
def editar_proyecto(
    payload: EditarProyectoRequest,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_current_user),
):
    """Renombra un proyecto en todos los reportes que lo tienen. Igual que
    editar_id_trabajo: actúa sobre el valor, no sobre un reporte puntual."""
    actual = payload.proyecto_actual.strip()
    nuevo = payload.proyecto_nuevo.strip()
    if actual == nuevo:
        raise HTTPException(
            status_code=400, detail="El nuevo proyecto debe ser distinto al actual"
        )

    afectados = (
        db.query(ReporteCabecera)
        .filter(ReporteCabecera.proyecto == actual)
        .update({ReporteCabecera.proyecto: nuevo}, synchronize_session=False)
    )
    if not afectados:
        raise HTTPException(status_code=404, detail="No hay reportes con ese proyecto")

    db.query(ProyectoOculto).filter(ProyectoOculto.nombre == nuevo).delete()
    db.commit()

    return {"actualizados": afectados}


@router.patch("/{reporte_id}/id-trabajo", response_model=ReporteOut)
def asignar_id_trabajo(
    reporte_id: int,
    payload: AsignarIdTrabajoRequest,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_current_user),
):
    """Asigna un ID de trabajo a un reporte que no tenía (capturado antes de
    que el campo existiera). Solo aplica una vez: si ya tiene ID, no se
    puede pisar desde aquí."""
    reporte = db.query(ReporteCabecera).filter(ReporteCabecera.id == reporte_id).first()
    if not reporte:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    if reporte.id_trabajo:
        raise HTTPException(
            status_code=400, detail="Este reporte ya tiene un ID de trabajo"
        )

    id_trabajo = payload.id_trabajo.strip()
    reporte.id_trabajo = id_trabajo
    db.query(IdTrabajoOculto).filter(IdTrabajoOculto.id_trabajo == id_trabajo).delete()
    db.commit()

    return _cargar_completo(db, reporte.id)


@router.patch("/{reporte_id}/locacion", response_model=ReporteOut)
def asignar_locacion(
    reporte_id: int,
    payload: AsignarLocacionRequest,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_current_user),
):
    """Asigna una locación a un reporte que no tenía (capturado antes de que
    el campo existiera). Solo aplica una vez: si ya tiene locación, no se
    puede pisar desde aquí."""
    reporte = db.query(ReporteCabecera).filter(ReporteCabecera.id == reporte_id).first()
    if not reporte:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    if reporte.locacion:
        raise HTTPException(
            status_code=400, detail="Este reporte ya tiene una locación"
        )

    locacion = payload.locacion.strip()
    reporte.locacion = locacion
    db.query(LocacionOculta).filter(LocacionOculta.locacion == locacion).delete()
    db.commit()

    return _cargar_completo(db, reporte.id)


@router.patch("/{reporte_id}", response_model=ReporteOut)
def editar_reporte(
    reporte_id: int,
    payload: EditarReporteRequest,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_current_user),
):
    """Edita el proceso y/o los hallazgos de un reporte puntual (a
    diferencia de proyecto/ID/locación, estos campos son propios de cada
    reporte, no se comparten entre los reportes de un mismo trabajo)."""
    reporte = db.query(ReporteCabecera).filter(ReporteCabecera.id == reporte_id).first()
    if not reporte:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")

    if payload.proceso_id is not None:
        proceso = db.query(Proceso).filter(Proceso.id == payload.proceso_id).first()
        if not proceso:
            raise HTTPException(status_code=404, detail="Proceso no encontrado")
        reporte.proceso_id = payload.proceso_id

    if payload.comentario is not None:
        reporte.comentario = payload.comentario.strip() or None

    db.commit()

    return _cargar_completo(db, reporte.id)


@router.post("/{reporte_id}/fotos", response_model=ReporteOut)
async def agregar_fotos(
    reporte_id: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_current_user),
):
    """Agrega fotos a un reporte ya creado (ej. el inspector se dio cuenta
    que le faltó una toma después de haberlo cerrado). Solo el inspector que
    lo capturó puede agregarle fotos."""
    reporte = db.query(ReporteCabecera).filter(ReporteCabecera.id == reporte_id).first()
    if not reporte:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    if reporte.inspector_id != usuario_actual.id:
        raise HTTPException(
            status_code=403, detail="Solo puedes agregar fotos a tus propios reportes"
        )

    form = await request.form()
    archivos = [
        valor
        for clave, valor in form.multi_items()
        if clave == "fotos" and getattr(valor, "filename", None)
    ]
    if not archivos:
        raise HTTPException(status_code=400, detail="Agrega al menos una foto")

    for archivo in archivos:
        foto_ruta, foto_nombre = await _guardar_foto(archivo)
        db.add(
            ReporteFoto(
                reporte_id=reporte.id,
                foto_ruta=foto_ruta,
                foto_nombre=foto_nombre,
            )
        )

    db.commit()

    return _cargar_completo(db, reporte.id)


@router.delete("/{reporte_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_reporte(
    reporte_id: int,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_current_user),
):
    reporte = (
        db.query(ReporteCabecera)
        .options(joinedload(ReporteCabecera.fotos))
        .filter(ReporteCabecera.id == reporte_id)
        .first()
    )
    if not reporte:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    if reporte.inspector_id != usuario_actual.id:
        raise HTTPException(
            status_code=403, detail="Solo puedes eliminar tus propios reportes"
        )

    for foto in reporte.fotos:
        if foto.foto_ruta and os.path.exists(foto.foto_ruta):
            os.remove(foto.foto_ruta)
        db.delete(foto)
    db.delete(reporte)
    db.commit()
