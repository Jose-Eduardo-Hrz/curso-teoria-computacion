"""Validador de identificadores sin expresiones regulares.

Equivale a la expresión de referencia ^[A-Za-z][A-Za-z0-9_]*$ :
    [A-Za-z]        -> el primer carácter es una letra inglesa
    [A-Za-z0-9_]*   -> después, cero o más letras, dígitos o guiones bajos
    ^ ... $         -> la regla se aplica a la cadena COMPLETA
"""


def es_letra(c):
    """Letra inglesa A-Z o a-z (no acepta ñ, á ni otras letras)."""
    return "A" <= c <= "Z" or "a" <= c <= "z"


def es_digito(c):
    """Dígito 0-9 (no acepta otros dígitos de Unicode, como ² o ٣)."""
    return "0" <= c <= "9"


def es_identificador(cadena):
    """Regresa True si la cadena es un identificador válido y False si no."""
    if not isinstance(cadena, str) or cadena == "":
        return False
    if not es_letra(cadena[0]):  # [A-Za-z]
        return False
    for c in cadena[1:]:  # [A-Za-z0-9_]*
        if not (es_letra(c) or es_digito(c) or c == "_"):
            return False
    return True  # se revisó hasta el último carácter: $


if __name__ == "__main__":
    ejemplos = ["x", "Hola", "edad_2", "A1_b2", "", "2x", "_x", "mi-var", "mi var", "año"]
    for cadena in ejemplos:
        resultado = "válido" if es_identificador(cadena) else "inválido"
        print(f"{repr(cadena):>10}  {resultado}")
