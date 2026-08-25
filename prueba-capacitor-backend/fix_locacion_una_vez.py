"""
Script de un solo uso para mover el reporte con id_trabajo "11.01" de la
locación "Tanque #7 babor" a "Tanque #7 Estribor".

No usa el endpoint de editar locación porque ese actualiza TODOS los
reportes que comparten el mismo texto de locación, no solo el que se
quiere mover (ver fix del 2026-08-20 para el caso de Tanque #2).

Uso:
    python fix_locacion_una_vez.py

Primero muestra qué va a cambiar y pide confirmación antes de aplicar
nada. Después de correrlo (y confirmar en la app que quedó bien), borra
este archivo — es de un solo uso, no es parte de la app.
"""
from sqlalchemy import func

from app.database import SessionLocal
from app.models import ReporteCabecera, Proceso

LOCACION_ACTUAL = "Tanque #7 babor"
LOCACION_NUEVA = "Tanque #7 Estribor"
ID_TRABAJO_A_MOVER = "11.01"


def main():
    db = SessionLocal()
    try:
        candidatos = (
            db.query(ReporteCabecera)
            .filter(
                ReporteCabecera.id_trabajo == ID_TRABAJO_A_MOVER,
                func.lower(ReporteCabecera.locacion) == LOCACION_ACTUAL.lower(),
            )
            .all()
        )

        if not candidatos:
            print("No se encontró ningún reporte que coincida. Nada que hacer.")
            print(f"  id_trabajo={ID_TRABAJO_A_MOVER!r} locacion={LOCACION_ACTUAL!r}")
            return

        print(f"Se van a mover {len(candidatos)} reporte(s) de {LOCACION_ACTUAL!r} a {LOCACION_NUEVA!r}:\n")
        for r in candidatos:
            proceso = db.query(Proceso).filter(Proceso.id == r.proceso_id).first()
            nombre_proceso = proceso.nombre if proceso else "?"
            print(
                f"  id={r.id}  proyecto={r.proyecto}  id_trabajo={r.id_trabajo}  "
                f"proceso={nombre_proceso}  locacion_actual={r.locacion!r}  fecha={r.fecha_creacion}"
            )

        respuesta = input("\n¿Aplicar el cambio? Escribe SI para confirmar: ").strip()
        if respuesta != "SI":
            print("Cancelado, no se cambió nada.")
            return

        for r in candidatos:
            r.locacion = LOCACION_NUEVA
        db.commit()
        print(f"\nListo. {len(candidatos)} reporte(s) actualizados a {LOCACION_NUEVA!r}.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
