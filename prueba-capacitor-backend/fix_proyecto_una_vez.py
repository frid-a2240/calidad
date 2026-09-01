"""
Script de un solo uso para fusionar "Santa Marcela" dentro de
"Santa Marcela II" (son el mismo proyecto, quedaron separados por
capturarse con nombres distintos).

A diferencia del endpoint de editar proyecto de la web (PATCH
/reportes/proyecto), este script tambien actualiza los registros de
Calidad FPY/RWK (registros_fpy_rwk.proyecto), que esa ruta no toca.

Uso:
    python fix_proyecto_una_vez.py

Primero muestra cuantos reportes y registros va a mover, y pide
confirmacion antes de aplicar nada. Despues de correrlo (y confirmar en
la app que quedo bien), borra este archivo — es de un solo uso, no es
parte de la app.
"""
from app.database import SessionLocal
from app.models import ProyectoOculto, ReporteCabecera, RegistroFpyRwk

PROYECTO_ACTUAL = "Santa Marcela"
PROYECTO_NUEVO = "Santa Marcela II"


def main():
    db = SessionLocal()
    try:
        reportes = (
            db.query(ReporteCabecera)
            .filter(ReporteCabecera.proyecto == PROYECTO_ACTUAL)
            .all()
        )
        registros = (
            db.query(RegistroFpyRwk)
            .filter(RegistroFpyRwk.proyecto == PROYECTO_ACTUAL)
            .all()
        )

        if not reportes and not registros:
            print("No se encontró nada con ese nombre de proyecto. Nada que hacer.")
            print(f"  proyecto={PROYECTO_ACTUAL!r}")
            return

        print(
            f"Se van a mover {len(reportes)} reporte(s) y {len(registros)} "
            f"registro(s) de Calidad FPY/RWK de {PROYECTO_ACTUAL!r} a {PROYECTO_NUEVO!r}."
        )

        respuesta = input("\n¿Aplicar el cambio? Escribe SI para confirmar: ").strip()
        if respuesta != "SI":
            print("Cancelado, no se cambió nada.")
            return

        for r in reportes:
            r.proyecto = PROYECTO_NUEVO
        for r in registros:
            r.proyecto = PROYECTO_NUEVO

        db.query(ProyectoOculto).filter(ProyectoOculto.nombre == PROYECTO_NUEVO).delete()
        db.commit()
        print(
            f"\nListo. {len(reportes)} reporte(s) y {len(registros)} registro(s) "
            f"actualizados a {PROYECTO_NUEVO!r}."
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
