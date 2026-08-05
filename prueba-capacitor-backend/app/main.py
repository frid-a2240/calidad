from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import os
from dotenv import load_dotenv
from fastapi.responses import FileResponse, RedirectResponse

# ruta absoluta: IIS no arranca con el mismo cwd que tu terminal
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from app.database import Base, engine
from app.routers import auth, catalogos, fpy_rwk, reportes

ALIAS = "calidad"  # debe coincidir con vite.config.js y el alias en IIS

# Crea las tablas si no existen
Base.metadata.create_all(bind=engine)

api = FastAPI(
    title="Prueba Capacitor API",
    description="Backend para app de reportes con foto + comentario",
    version="0.1.0",
)

# CORS abierto para desarrollo — lo cerramos después
api.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Servir las fotos como archivos estáticos
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
api.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

api.include_router(auth.router)
api.include_router(catalogos.router)
api.include_router(reportes.router)
api.include_router(fpy_rwk.router)


@api.get("/")
def raiz():
    return {"mensaje": "Prueba Capacitor API funcionando", "docs": "/docs"}


@api.get("/version")
def version():
    return {"version": "0.1.0"}


# --- la app que IIS realmente ejecuta ---
app = FastAPI()
app.mount(f"/{ALIAS}/api", api)  # debe registrarse antes del catch-all de abajo

DIST = Path(__file__).resolve().parent.parent / "dist"  # build del dashboard (prueba-capacitor-web)

if DIST.exists():
    app.mount(f"/{ALIAS}/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get(f"/{ALIAS}")
    async def redirect_root():
        return RedirectResponse(f"/{ALIAS}/")

    @app.get(f"/{ALIAS}/{{full_path:path}}")
    async def serve_spa(full_path: str):
        file_path = DIST / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(DIST / "index.html")