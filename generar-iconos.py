"""
Genera todos los tamaños de íconos de Android desde public/logo.png
Ejecutar: python generar-iconos.py
"""
from PIL import Image
from pathlib import Path

# Configuración
LOGO_SRC = Path("public/logo.png")
ANDROID_RES = Path("android/app/src/main/res")

# Tamaños oficiales de Android
TAMANOS = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

# Padding relativo (15% de margen para que el logo respire)
PADDING_RATIO = 0.15

# Color de fondo del ícono (blanco)
FONDO = (255, 255, 255, 255)


def generar_icono(tamano: int, salida: Path):
    """Genera un ícono cuadrado con fondo blanco y logo centrado."""
    # Abre el logo original
    logo = Image.open(LOGO_SRC).convert("RGBA")

    # Calcula el tamaño interior con padding
    padding = int(tamano * PADDING_RATIO)
    tamano_interno = tamano - (padding * 2)

    # Redimensiona el logo manteniendo proporción
    logo.thumbnail((tamano_interno, tamano_interno), Image.Resampling.LANCZOS)

    # Crea el canvas cuadrado con fondo
    canvas = Image.new("RGBA", (tamano, tamano), FONDO)

    # Centra el logo
    x = (tamano - logo.width) // 2
    y = (tamano - logo.height) // 2
    canvas.paste(logo, (x, y), logo)

    # Guarda
    salida.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(salida, "PNG")
    print(f"✓ Generado: {salida} ({tamano}x{tamano})")


def main():
    if not LOGO_SRC.exists():
        print(f"✗ No se encontró {LOGO_SRC}")
        return

    if not ANDROID_RES.exists():
        print(f"✗ No se encontró {ANDROID_RES}")
        print("  ¿Corriste 'npx cap add android' antes?")
        return

    print("Generando íconos de Android...\n")

    for carpeta, tamano in TAMANOS.items():
        destino = ANDROID_RES / carpeta

        # Ícono cuadrado tradicional
        generar_icono(tamano, destino / "ic_launcher.png")

        # Ícono redondo (Android usa este en algunos launchers)
        generar_icono(tamano, destino / "ic_launcher_round.png")

        # Foreground para adaptive icon (mismo diseño)
        generar_icono(tamano, destino / "ic_launcher_foreground.png")

    print("\n✔ Íconos generados correctamente")


if __name__ == "__main__":
    main()