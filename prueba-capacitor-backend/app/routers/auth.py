from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Usuario
from app.schemas import CambiarPasswordRequest, LoginRequest, TokenOut, UsuarioOut
from app.security import crear_access_token, hashear_password, verificar_password

router = APIRouter(prefix="/auth", tags=["auth"])

MAX_INTENTOS = 5
BLOQUEO_MINUTOS = 15

# Contador de intentos fallidos en memoria: { numero_control: (intentos, ultimo_intento) }
_intentos_fallidos: dict[str, tuple[int, datetime]] = {}


def _esta_bloqueado(numero_control: str) -> bool:
    registro = _intentos_fallidos.get(numero_control)
    if not registro:
        return False
    intentos, ultimo = registro
    if intentos < MAX_INTENTOS:
        return False
    return datetime.now(timezone.utc) - ultimo < timedelta(minutes=BLOQUEO_MINUTOS)


def _registrar_fallo(numero_control: str) -> None:
    intentos, _ = _intentos_fallidos.get(numero_control, (0, datetime.now(timezone.utc)))
    _intentos_fallidos[numero_control] = (intentos + 1, datetime.now(timezone.utc))


def _limpiar_intentos(numero_control: str) -> None:
    _intentos_fallidos.pop(numero_control, None)


@router.post("/login", response_model=TokenOut)
def login(datos: LoginRequest, db: Session = Depends(get_db)):
    numero_control = datos.numero_control.strip()

    if _esta_bloqueado(numero_control):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Demasiados intentos fallidos. Intenta de nuevo en {BLOQUEO_MINUTOS} minutos.",
        )

    usuario = (
        db.query(Usuario).filter(Usuario.numero_control == numero_control).first()
    )

    credenciales_invalidas = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Número de control o contraseña incorrectos",
    )

    if not usuario or not usuario.activo:
        _registrar_fallo(numero_control)
        raise credenciales_invalidas

    if not verificar_password(datos.password, usuario.password_hash):
        _registrar_fallo(numero_control)
        raise credenciales_invalidas

    _limpiar_intentos(numero_control)

    token = crear_access_token({"sub": usuario.numero_control})
    return TokenOut(access_token=token, usuario=usuario)


@router.get("/me", response_model=UsuarioOut)
def yo(usuario_actual: Usuario = Depends(get_current_user)):
    return usuario_actual


@router.post("/cambiar-password", response_model=UsuarioOut)
def cambiar_password(
    datos: CambiarPasswordRequest,
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verificar_password(datos.password_actual, usuario_actual.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="La contraseña actual no es correcta",
        )

    if datos.password_nueva == datos.password_actual:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La nueva contraseña debe ser distinta a la actual",
        )

    usuario_actual.password_hash = hashear_password(datos.password_nueva)
    usuario_actual.debe_cambiar_password = False
    db.add(usuario_actual)
    db.commit()
    db.refresh(usuario_actual)
    return usuario_actual
