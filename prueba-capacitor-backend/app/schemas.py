from pydantic import BaseModel, Field, computed_field
from datetime import date, datetime
from typing import Optional


class LoginRequest(BaseModel):
    numero_control: str = Field(..., min_length=1, max_length=20)
    password: str = Field(..., min_length=1, max_length=72)


class UsuarioOut(BaseModel):
    id: int
    numero_control: str
    nombre: str
    debe_cambiar_password: bool

    class Config:
        from_attributes = True


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: UsuarioOut


class CambiarPasswordRequest(BaseModel):
    password_actual: str = Field(..., min_length=1)
    password_nueva: str = Field(..., min_length=8, max_length=72)


class InspectorOut(BaseModel):
    id: int
    nombre: str

    class Config:
        from_attributes = True


class ProcesoOut(BaseModel):
    id: int
    nombre: str

    class Config:
        from_attributes = True


class FotoOut(BaseModel):
    id: int
    foto_nombre: str

    class Config:
        from_attributes = True


class AsignarIdTrabajoRequest(BaseModel):
    id_trabajo: str = Field(..., min_length=1, max_length=100)


class EditarIdTrabajoRequest(BaseModel):
    id_trabajo_actual: str = Field(..., min_length=1, max_length=100)
    id_trabajo_nuevo: str = Field(..., min_length=1, max_length=100)


class AsignarLocacionRequest(BaseModel):
    locacion: str = Field(..., min_length=1, max_length=100)


class ReporteOut(BaseModel):
    id: int
    proyecto: str
    id_trabajo: Optional[str] = None
    locacion: Optional[str] = None
    proceso: ProcesoOut
    inspector: UsuarioOut
    comentario: Optional[str] = None
    fecha_creacion: datetime
    fotos: list[FotoOut] = []

    class Config:
        from_attributes = True


def _pct(defecto: Optional[float], area: float) -> Optional[float]:
    """% eficiencia = 1 - defecto/área. None si el defecto no se capturó."""
    if defecto is None:
        return None
    return 1 - (defecto / area)


def _rwk_etapa(valores: list[Optional[float]]) -> Optional[float]:
    """Suma de defectos de una etapa. None si la etapa no se evaluó
    (todos sus campos vinieron vacíos) — para no confundir "no evaluado"
    con "evaluado y sin defectos" (0)."""
    if all(v is None for v in valores):
        return None
    return sum(v or 0 for v in valores)


class RegistroFpyRwkInput(BaseModel):
    nombre_trabajador: str = Field(..., min_length=1, max_length=150)
    fecha: date
    puesto: str = Field(..., min_length=1, max_length=100)
    proyecto: str = Field(..., min_length=1, max_length=200)
    id_trabajo: str = Field(..., min_length=1, max_length=100)
    tipo_trabajo: str = Field(..., min_length=1, max_length=150)
    posicion: str = Field(..., min_length=1, max_length=10)
    area_metros: float = Field(..., gt=0)
    supervisor: Optional[str] = Field(default=None, max_length=150)

    # Armado
    armado_apertura: Optional[float] = Field(default=None, ge=0)
    armado_bisel: Optional[float] = Field(default=None, ge=0)
    armado_rugosidad_corte: Optional[float] = Field(default=None, ge=0)
    armado_amarres: Optional[float] = Field(default=None, ge=0)

    # Soldadura inicial
    sol_inicial_poros: Optional[float] = Field(default=None, ge=0)
    sol_inicial_grietas: Optional[float] = Field(default=None, ge=0)
    sol_inicial_socavaciones: Optional[float] = Field(default=None, ge=0)

    # Raíz
    raiz_grietas: Optional[float] = Field(default=None, ge=0)
    raiz_poros: Optional[float] = Field(default=None, ge=0)
    raiz_penetracion_incompleta: Optional[float] = Field(default=None, ge=0)
    raiz_escoria: Optional[float] = Field(default=None, ge=0)

    # Soldadura final
    sol_final_poros: Optional[float] = Field(default=None, ge=0)
    sol_final_grietas: Optional[float] = Field(default=None, ge=0)
    sol_final_socavaciones: Optional[float] = Field(default=None, ge=0)
    sol_final_rematas: Optional[float] = Field(default=None, ge=0)
    sol_final_amarres: Optional[float] = Field(default=None, ge=0)
    sol_final_lof: Optional[float] = Field(default=None, ge=0)


class RegistroFpyRwkCalculado(RegistroFpyRwkInput):
    """Las 33 fórmulas del Excel, en un solo lugar.

    Reusado tanto por el endpoint de crear como el de actualizar: se
    construye a partir de los inputs capturados y de aquí se sacan los
    valores que se guardan en la base de datos (snapshot).
    """

    # --- % eficiencia por defecto (17) ---
    @computed_field
    @property
    def armado_apertura_pct(self) -> Optional[float]:
        return _pct(self.armado_apertura, self.area_metros)

    @computed_field
    @property
    def armado_bisel_pct(self) -> Optional[float]:
        return _pct(self.armado_bisel, self.area_metros)

    @computed_field
    @property
    def armado_rugosidad_corte_pct(self) -> Optional[float]:
        return _pct(self.armado_rugosidad_corte, self.area_metros)

    @computed_field
    @property
    def armado_amarres_pct(self) -> Optional[float]:
        return _pct(self.armado_amarres, self.area_metros)

    @computed_field
    @property
    def sol_inicial_poros_pct(self) -> Optional[float]:
        return _pct(self.sol_inicial_poros, self.area_metros)

    @computed_field
    @property
    def sol_inicial_grietas_pct(self) -> Optional[float]:
        return _pct(self.sol_inicial_grietas, self.area_metros)

    @computed_field
    @property
    def sol_inicial_socavaciones_pct(self) -> Optional[float]:
        return _pct(self.sol_inicial_socavaciones, self.area_metros)

    @computed_field
    @property
    def raiz_grietas_pct(self) -> Optional[float]:
        return _pct(self.raiz_grietas, self.area_metros)

    @computed_field
    @property
    def raiz_poros_pct(self) -> Optional[float]:
        return _pct(self.raiz_poros, self.area_metros)

    @computed_field
    @property
    def raiz_penetracion_incompleta_pct(self) -> Optional[float]:
        return _pct(self.raiz_penetracion_incompleta, self.area_metros)

    @computed_field
    @property
    def raiz_escoria_pct(self) -> Optional[float]:
        return _pct(self.raiz_escoria, self.area_metros)

    @computed_field
    @property
    def sol_final_poros_pct(self) -> Optional[float]:
        return _pct(self.sol_final_poros, self.area_metros)

    @computed_field
    @property
    def sol_final_grietas_pct(self) -> Optional[float]:
        return _pct(self.sol_final_grietas, self.area_metros)

    @computed_field
    @property
    def sol_final_socavaciones_pct(self) -> Optional[float]:
        return _pct(self.sol_final_socavaciones, self.area_metros)

    @computed_field
    @property
    def sol_final_rematas_pct(self) -> Optional[float]:
        return _pct(self.sol_final_rematas, self.area_metros)

    @computed_field
    @property
    def sol_final_amarres_pct(self) -> Optional[float]:
        return _pct(self.sol_final_amarres, self.area_metros)

    @computed_field
    @property
    def sol_final_lof_pct(self) -> Optional[float]:
        return _pct(self.sol_final_lof, self.area_metros)

    # --- Subtotales por etapa (4 etapas x 4 = 16) ---
    @computed_field
    @property
    def armado_rwk(self) -> Optional[float]:
        return _rwk_etapa(
            [
                self.armado_apertura,
                self.armado_bisel,
                self.armado_rugosidad_corte,
                self.armado_amarres,
            ]
        )

    @computed_field
    @property
    def armado_aceptacion(self) -> Optional[float]:
        if self.armado_rwk is None:
            return None
        return self.area_metros - self.armado_rwk

    @computed_field
    @property
    def armado_pct_rwk(self) -> Optional[float]:
        if self.armado_rwk is None:
            return None
        return self.armado_rwk / self.area_metros

    @computed_field
    @property
    def armado_pct_fpy(self) -> Optional[float]:
        if self.armado_aceptacion is None:
            return None
        return self.armado_aceptacion / self.area_metros

    @computed_field
    @property
    def sol_inicial_rwk(self) -> Optional[float]:
        return _rwk_etapa(
            [
                self.sol_inicial_poros,
                self.sol_inicial_grietas,
                self.sol_inicial_socavaciones,
            ]
        )

    @computed_field
    @property
    def sol_inicial_aceptacion(self) -> Optional[float]:
        if self.sol_inicial_rwk is None:
            return None
        return self.area_metros - self.sol_inicial_rwk

    @computed_field
    @property
    def sol_inicial_pct_rwk(self) -> Optional[float]:
        if self.sol_inicial_rwk is None:
            return None
        return self.sol_inicial_rwk / self.area_metros

    @computed_field
    @property
    def sol_inicial_pct_fpy(self) -> Optional[float]:
        if self.sol_inicial_aceptacion is None:
            return None
        return self.sol_inicial_aceptacion / self.area_metros

    @computed_field
    @property
    def raiz_rwk(self) -> Optional[float]:
        return _rwk_etapa(
            [
                self.raiz_grietas,
                self.raiz_poros,
                self.raiz_penetracion_incompleta,
                self.raiz_escoria,
            ]
        )

    @computed_field
    @property
    def raiz_aceptacion(self) -> Optional[float]:
        if self.raiz_rwk is None:
            return None
        return self.area_metros - self.raiz_rwk

    @computed_field
    @property
    def raiz_pct_rwk(self) -> Optional[float]:
        if self.raiz_rwk is None:
            return None
        return self.raiz_rwk / self.area_metros

    @computed_field
    @property
    def raiz_pct_fpy(self) -> Optional[float]:
        if self.raiz_aceptacion is None:
            return None
        return self.raiz_aceptacion / self.area_metros

    @computed_field
    @property
    def sol_final_rwk(self) -> Optional[float]:
        return _rwk_etapa(
            [
                self.sol_final_poros,
                self.sol_final_grietas,
                self.sol_final_socavaciones,
                self.sol_final_rematas,
                self.sol_final_amarres,
                self.sol_final_lof,
            ]
        )

    @computed_field
    @property
    def sol_final_aceptacion(self) -> Optional[float]:
        if self.sol_final_rwk is None:
            return None
        return self.area_metros - self.sol_final_rwk

    @computed_field
    @property
    def sol_final_pct_rwk(self) -> Optional[float]:
        if self.sol_final_rwk is None:
            return None
        return self.sol_final_rwk / self.area_metros

    @computed_field
    @property
    def sol_final_pct_fpy(self) -> Optional[float]:
        if self.sol_final_aceptacion is None:
            return None
        return self.sol_final_aceptacion / self.area_metros


class RegistroFpyRwkOut(RegistroFpyRwkCalculado):
    id: int
    capturado_por: InspectorOut
    fecha_creacion: datetime

    class Config:
        from_attributes = True
