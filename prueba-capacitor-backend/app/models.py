from sqlalchemy import (
    Boolean,
    Column,
    Date,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    DateTime,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    numero_control = Column(String(20), unique=True, nullable=False, index=True)
    nombre = Column(String(100), nullable=False)
    password_hash = Column(String(255), nullable=False)
    debe_cambiar_password = Column(Boolean, nullable=False, default=True)
    activo = Column(Boolean, nullable=False, default=True)
    fecha_creacion = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class ProyectoOculto(Base):
    __tablename__ = "proyectos_ocultos"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(200), unique=True, nullable=False, index=True)
    fecha_creacion = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class IdTrabajoOculto(Base):
    __tablename__ = "ids_trabajo_ocultos"

    id = Column(Integer, primary_key=True, index=True)
    id_trabajo = Column(String(100), unique=True, nullable=False, index=True)
    fecha_creacion = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class Proceso(Base):
    __tablename__ = "procesos"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(200), unique=True, nullable=False)
    orden = Column(Integer, nullable=False, default=0)
    activo = Column(Boolean, nullable=False, default=True)


class ReporteCabecera(Base):
    __tablename__ = "reportes_cabecera"

    id = Column(Integer, primary_key=True, index=True)
    proyecto = Column(String(200), nullable=False)
    id_trabajo = Column(String(100), nullable=True, index=True)
    proceso_id = Column(Integer, ForeignKey("procesos.id"), nullable=False, index=True)
    inspector_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False, index=True)
    comentario = Column(Text, nullable=True)
    fecha_creacion = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    proceso = relationship("Proceso")
    inspector = relationship("Usuario")
    fotos = relationship(
        "ReporteFoto", back_populates="reporte", order_by="ReporteFoto.id"
    )


class ReporteFoto(Base):
    __tablename__ = "reportes_fotos"

    id = Column(Integer, primary_key=True, index=True)
    reporte_id = Column(
        Integer, ForeignKey("reportes_cabecera.id"), nullable=False, index=True
    )
    foto_ruta = Column(String(500), nullable=False)
    foto_nombre = Column(String(255), nullable=False)

    reporte = relationship("ReporteCabecera", back_populates="fotos")


class RegistroFpyRwk(Base):
    """Evaluación de calidad de soldadura (First Pass Yield / Rework).

    Replica la hoja "% FPY - RWK - SOLD" del Excel de Calidad: se guardan
    tanto los valores capturados como los 33 calculados (snapshot), para no
    depender de recalcular fórmulas en cada lectura.
    """

    __tablename__ = "registros_fpy_rwk"

    id = Column(Integer, primary_key=True, index=True)

    # Metadatos
    nombre_trabajador = Column(String(150), nullable=False)
    fecha = Column(Date, nullable=False)
    puesto = Column(String(100), nullable=False)
    proyecto = Column(String(200), nullable=False)
    id_trabajo = Column(String(100), nullable=False)
    tipo_trabajo = Column(String(150), nullable=False)
    posicion = Column(String(10), nullable=False)
    area_metros = Column(Float, nullable=False)
    supervisor = Column(String(150), nullable=True)
    capturado_por_id = Column(
        Integer, ForeignKey("usuarios.id"), nullable=False, index=True
    )
    fecha_creacion = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Armado
    armado_apertura = Column(Float, nullable=True)
    armado_apertura_pct = Column(Float, nullable=True)
    armado_bisel = Column(Float, nullable=True)
    armado_bisel_pct = Column(Float, nullable=True)
    armado_rugosidad_corte = Column(Float, nullable=True)
    armado_rugosidad_corte_pct = Column(Float, nullable=True)
    armado_amarres = Column(Float, nullable=True)
    armado_amarres_pct = Column(Float, nullable=True)
    armado_rwk = Column(Float, nullable=True)
    armado_aceptacion = Column(Float, nullable=True)
    armado_pct_rwk = Column(Float, nullable=True)
    armado_pct_fpy = Column(Float, nullable=True)

    # Soldadura inicial
    sol_inicial_poros = Column(Float, nullable=True)
    sol_inicial_poros_pct = Column(Float, nullable=True)
    sol_inicial_grietas = Column(Float, nullable=True)
    sol_inicial_grietas_pct = Column(Float, nullable=True)
    sol_inicial_socavaciones = Column(Float, nullable=True)
    sol_inicial_socavaciones_pct = Column(Float, nullable=True)
    sol_inicial_rwk = Column(Float, nullable=True)
    sol_inicial_aceptacion = Column(Float, nullable=True)
    sol_inicial_pct_rwk = Column(Float, nullable=True)
    sol_inicial_pct_fpy = Column(Float, nullable=True)

    # Raíz
    raiz_grietas = Column(Float, nullable=True)
    raiz_grietas_pct = Column(Float, nullable=True)
    raiz_poros = Column(Float, nullable=True)
    raiz_poros_pct = Column(Float, nullable=True)
    raiz_penetracion_incompleta = Column(Float, nullable=True)
    raiz_penetracion_incompleta_pct = Column(Float, nullable=True)
    raiz_escoria = Column(Float, nullable=True)
    raiz_escoria_pct = Column(Float, nullable=True)
    raiz_rwk = Column(Float, nullable=True)
    raiz_aceptacion = Column(Float, nullable=True)
    raiz_pct_rwk = Column(Float, nullable=True)
    raiz_pct_fpy = Column(Float, nullable=True)

    # Soldadura final
    sol_final_poros = Column(Float, nullable=True)
    sol_final_poros_pct = Column(Float, nullable=True)
    sol_final_grietas = Column(Float, nullable=True)
    sol_final_grietas_pct = Column(Float, nullable=True)
    sol_final_socavaciones = Column(Float, nullable=True)
    sol_final_socavaciones_pct = Column(Float, nullable=True)
    sol_final_rematas = Column(Float, nullable=True)
    sol_final_rematas_pct = Column(Float, nullable=True)
    sol_final_amarres = Column(Float, nullable=True)
    sol_final_amarres_pct = Column(Float, nullable=True)
    sol_final_lof = Column(Float, nullable=True)
    sol_final_lof_pct = Column(Float, nullable=True)
    sol_final_rwk = Column(Float, nullable=True)
    sol_final_aceptacion = Column(Float, nullable=True)
    sol_final_pct_rwk = Column(Float, nullable=True)
    sol_final_pct_fpy = Column(Float, nullable=True)

    capturado_por = relationship("Usuario")
