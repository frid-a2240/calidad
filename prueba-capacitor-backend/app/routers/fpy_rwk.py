from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import get_current_user
from app.models import RegistroFpyRwk, Usuario
from app.schemas import RegistroFpyRwkCalculado, RegistroFpyRwkInput, RegistroFpyRwkOut

router = APIRouter(prefix="/fpy-rwk", tags=["fpy-rwk"])


def _cargar(db: Session, registro_id: int) -> RegistroFpyRwk:
    return (
        db.query(RegistroFpyRwk)
        .options(joinedload(RegistroFpyRwk.capturado_por))
        .filter(RegistroFpyRwk.id == registro_id)
        .first()
    )


@router.post("/", response_model=RegistroFpyRwkOut, status_code=status.HTTP_201_CREATED)
def crear_registro(
    datos: RegistroFpyRwkInput,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_current_user),
):
    calculado = RegistroFpyRwkCalculado(**datos.model_dump())
    nuevo = RegistroFpyRwk(
        **calculado.model_dump(),
        capturado_por_id=usuario_actual.id,
    )
    db.add(nuevo)
    db.commit()
    return _cargar(db, nuevo.id)


@router.get("/", response_model=list[RegistroFpyRwkOut])
def listar_registros(
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_current_user),
):
    return (
        db.query(RegistroFpyRwk)
        .options(joinedload(RegistroFpyRwk.capturado_por))
        .order_by(RegistroFpyRwk.fecha_creacion.desc())
        .all()
    )


@router.put("/{registro_id}", response_model=RegistroFpyRwkOut)
def actualizar_registro(
    registro_id: int,
    datos: RegistroFpyRwkInput,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_current_user),
):
    registro = db.query(RegistroFpyRwk).filter(RegistroFpyRwk.id == registro_id).first()
    if not registro:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    if registro.capturado_por_id != usuario_actual.id:
        raise HTTPException(
            status_code=403, detail="Solo puedes editar tus propios registros"
        )

    calculado = RegistroFpyRwkCalculado(**datos.model_dump())
    for campo, valor in calculado.model_dump().items():
        setattr(registro, campo, valor)

    db.add(registro)
    db.commit()
    return _cargar(db, registro.id)


@router.delete("/{registro_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_registro(
    registro_id: int,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_current_user),
):
    registro = db.query(RegistroFpyRwk).filter(RegistroFpyRwk.id == registro_id).first()
    if not registro:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    if registro.capturado_por_id != usuario_actual.id:
        raise HTTPException(
            status_code=403, detail="Solo puedes eliminar tus propios registros"
        )

    db.delete(registro)
    db.commit()
