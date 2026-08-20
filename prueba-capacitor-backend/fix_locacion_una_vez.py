"""
Script de un solo uso para separar 3 reportes que quedaron mezclados en
"Tanque #2 babor" por error de captura, y que en realidad son de
"Tanque #2 Estribor" (IDs de trabajo 14.02 y 14.16).

No toca los reportes 6.13 / 6.14 / 6.15, que sí son correctamente de
"Tanque #2 babor".

Uso:
    python fix_locacion_una_vez.py

Primero muestra qué va a cambiar y pide confirmación antes de aplicar
nada. Después de correrlo (y confirmar en la app que quedó bien), borra
este archivo — es de un solo uso, no es parte de la app.
"""
from app.database import SessionLocal
from app.models import ReporteCabecera, Proceso

PROYECTO = "Santa Marcela II"
LOCACION_ACTUAL = "Tanque #2 babor"
LOCACION_NUEVA = "Tanque #2 Estribor"
IDS_TRABAJO_A_MOVER = ["14.02", "14.16"]


def main():
    db = SessionLocal()
    try:
        candidatos = (
            db.query(ReporteCabecera)
            .filter(
                ReporteCabecera.proyecto == PROYECTO,
                ReporteCabecera.locacion == LOCACION_ACTUAL,
                ReporteCabecera.id_trabajo.in_(IDS_TRABAJO_A_MOVER),
            )
            .all()
        )

        if not candidatos:
            print("No se encontró ningún reporte que coincida. Nada que hacer.")
            print(f"  proyecto={PROYECTO!r} locacion={LOCACION_ACTUAL!r} id_trabajo in {IDS_TRABAJO_A_MOVER}")
            return

        print(f"Se van a mover {len(candidatos)} reporte(s) de {LOCACION_ACTUAL!r} a {LOCACION_NUEVA!r}:\n")
        for r in candidatos:
            proceso = db.query(Proceso).filter(Proceso.id == r.proceso_id).first()
            nombre_proceso = proceso.nombre if proceso else "?"
            print(f"  id={r.id}  id_trabajo={r.id_trabajo}  proceso={nombre_proceso}  fecha={r.fecha_creacion}")

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
