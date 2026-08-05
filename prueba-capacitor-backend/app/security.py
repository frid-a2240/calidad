from datetime import datetime, timedelta, timezone
import os

import bcrypt
import jwt

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "720"))

if not SECRET_KEY:
    raise RuntimeError("Falta SECRET_KEY en .env")


def verificar_password(password_plano: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password_plano.encode("utf-8"), password_hash.encode("utf-8"))


def hashear_password(password_plano: str) -> str:
    hash_bytes = bcrypt.hashpw(password_plano.encode("utf-8"), bcrypt.gensalt())
    return hash_bytes.decode("utf-8")


def crear_access_token(datos: dict) -> str:
    payload = datos.copy()
    expira = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload.update({"exp": expira})
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decodificar_access_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
