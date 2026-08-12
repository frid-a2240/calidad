"""
Carga el catálogo fijo de Procesos.
Uso: python seed_catalogos.py
"""
from app.database import Base, SessionLocal, engine
from app.models import Proceso

Base.metadata.create_all(bind=engine)

PROCESOS = [
    "Armado y Pailería",
    "Soldadura",
    "Raíz",
    "Soldadura Final",
]


def main():
    db = SessionLocal()
    try:
        for orden, nombre in enumerate(PROCESOS, start=1):
            existente = db.query(Proceso).filter(Proceso.nombre == nombre).first()
            if existente:
                print(f"Proceso ya existe: {nombre}")
                continue
            db.add(Proceso(nombre=nombre, orden=orden))
            print(f"Proceso creado: {nombre}")
        db.commit()
        print("Listo.")
    finally:
        db.close()


if __name__ == "__main__":
    main()

