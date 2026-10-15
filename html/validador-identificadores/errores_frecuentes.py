"""Versiones INCORRECTAS del validador, para aprender de sus errores.

Ejecutar con:  python errores_frecuentes.py
"""


def error_isalpha(cadena):
    """Usa isalpha/isalnum: acepta letras y dígitos que no son ingleses."""
    return cadena[:1].isalpha() and all(c.isalnum() or c == "_" for c in cadena)


def error_solo_primero(cadena):
    """Solo revisa el primer carácter: olvida el resto de la cadena."""
    return cadena != "" and ("A" <= cadena[0] <= "Z" or "a" <= cadena[0] <= "z")


def error_alguna_parte(cadena):
    """Acepta si ALGÚN carácter es letra: no exige la cadena completa."""
    for c in cadena:
        if "A" <= c <= "Z" or "a" <= c <= "z":
            return True
    return False


def error_sin_vacia(cadena):
    """No revisa la cadena vacía antes de leer cadena[0]."""
    if not ("A" <= cadena[0] <= "Z" or "a" <= cadena[0] <= "z"):
        return False
    return all("A" <= c <= "Z" or "a" <= c <= "z" or "0" <= c <= "9" or c == "_" for c in cadena)


if __name__ == "__main__":
    for funcion, cadena in [(error_isalpha, "año"), (error_solo_primero, "a-b"), (error_alguna_parte, "2x")]:
        print(f"{funcion.__name__}({cadena!r}) = {funcion(cadena)}")
    try:
        error_sin_vacia("")
    except IndexError as e:
        print(f"error_sin_vacia('') -> IndexError: {e}")
