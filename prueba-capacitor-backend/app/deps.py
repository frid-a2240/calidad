from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import InvalidTokenError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Usuario
from app.security import decodificar_access_token

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credenciales: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Usuario:
    error_auth = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No autenticado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credenciales is None:
        raise error_auth
    try:
        payload = decodificar_access_token(credenciales.credentials)
        numero_control = payload.get("sub")
        if numero_control is None:
            raise error_auth
    except InvalidTokenError:
        raise error_auth

    usuario = (
        db.query(Usuario).filter(Usuario.numero_control == numero_control).first()
    )
    if usuario is None or not usuario.activo:
        raise error_auth
    return usuario
