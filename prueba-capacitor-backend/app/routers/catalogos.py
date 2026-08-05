from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Proceso, ProyectoOculto, ReporteCabecera, Usuario
from app.schemas import InspectorOut, ProcesoOut

router = APIRouter(prefix="/catalogos", tags=["catalogos"])


@router.get("/procesos", response_model=list[ProcesoOut])
def listar_procesos(
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_current_user),
):
    return (
        db.query(Proceso)
        .filter(Proceso.activo.is_(True))
        .order_by(Proceso.orden)
        .all()
    )


@router.get("/proyectos", response_model=list[str])
def listar_proyectos(
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_current_user),
):
    """Nombres de proyecto ya usados en reportes, más recientes primero.

    No es un catálogo fijo: se alimenta solo con lo que los inspectores van
    escribiendo, para poder reseleccionarlo sin tener que volver a teclearlo.
    """
    ocultos = {fila.nombre for fila in db.query(ProyectoOculto.nombre).all()}

    ultima_fecha = func.max(ReporteCabecera.fecha_creacion)
    filas = (
        db.query(ReporteCabecera.proyecto)
        .group_by(ReporteCabecera.proyecto)
        .order_by(ultima_fecha.desc())
        .all()
    )
    return [fila.proyecto for fila in filas if fila.proyecto not in ocultos]


@router.delete("/proyectos", status_code=status.HTTP_204_NO_CONTENT)
def ocultar_proyecto(
    nombre: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_current_user),
):
    """Quita un nombre de la lista de sugerencias (no borra los reportes que ya lo usan).

    Si ese proyecto se vuelve a escribir en un reporte nuevo, reaparece solo.
    """
    ya_oculto = db.query(ProyectoOculto).filter(ProyectoOculto.nombre == nombre).first()
    if not ya_oculto:
        db.add(ProyectoOculto(nombre=nombre))
        db.commit()


@router.get("/inspectores", response_model=list[InspectorOut])
def listar_inspectores(
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_current_user),
):
    """Inspectores que ya tienen al menos un reporte, para el filtro de la web."""
    return (
        db.query(Usuario)
        .join(ReporteCabecera, ReporteCabecera.inspector_id == Usuario.id)
        .distinct()
        .order_by(Usuario.nombre)
        .all()
    )
