"""
Script de un solo uso para crear la cuenta de consulta/visita del gerente
(numero_control 202326), para que pueda entrar a ver el avance sin que
sea una cuenta que ya exista.

Usa el mismo mecanismo que el login real: el modelo Usuario y
hashear_password() de app.security (bcrypt), igual que hace el endpoint
/auth/cambiar-password. La contraseña nunca se guarda en texto plano.

Importante: esta app NO tiene un sistema de roles/permisos (no existe
ningún campo "rol" o "admin" en Usuario, ver app/models.py). Cualquier
usuario autenticado puede usar todos los endpoints igual que cualquier
otro usuario normal — puede crear reportes y registros FPY-RWK, y
puede borrar los que él mismo haya creado (el borrado está restringido
a "solo tus propios reportes", ver app/routers/reportes.py y
app/routers/fpy_rwk.py). Como esta cuenta nueva no va a capturar nada,
en la práctica no tendrá nada propio que borrar, pero técnicamente
podría crear/editar registros si alguien intenta usarla para eso: no
es una cuenta de "solo lectura" forzada por el sistema, es de solo
lectura porque así se le indica a quien la use.

Se marca debe_cambiar_password=True para que, si se quiere, la persona
pueda cambiar la contraseña desde la app la primera vez que entra
(pantalla "Cambiar contraseña"); esto es opcional y no afecta el acceso.

La contraseña NUNCA se escribe en este archivo ni en el repositorio:
se pide de forma interactiva (oculta) al correr el script, o se toma
de la variable de entorno NUEVA_PASSWORD si se prefiere automatizar.

Uso (en el servidor, donde vive la base de datos real):
    python crear_usuario_202326.py
"""
import getpass
import os

from app.database import Base, SessionLocal, engine
from app.models import Usuario
from app.security import hashear_password

NUMERO_CONTROL = "202326"
NOMBRE = "Consulta / Visita"


def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existente = (
            db.query(Usuario)
            .filter(Usuario.numero_control == NUMERO_CONTROL)
            .first()
        )
        if existente:
            print(f"El usuario {NUMERO_CONTROL} ya existe (id={existente.id}). Nada que hacer.")
            return

        password = os.environ.get("NUEVA_PASSWORD") or getpass.getpass(
            f"Contraseña para el nuevo usuario {NUMERO_CONTROL}: "
        )
        if not password:
            print("No se dio contraseña. Cancelado.")
            return

        usuario = Usuario(
            numero_control=NUMERO_CONTROL,
            nombre=NOMBRE,
            password_hash=hashear_password(password),
            debe_cambiar_password=True,
            activo=True,
        )
        db.add(usuario)
        db.commit()
        print(f"Usuario creado: numero_control={NUMERO_CONTROL} nombre={NOMBRE!r}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
