"""Detector de la secuencia 101 mediante un autómata finito determinista (AFD).

El autómata lee la cadena símbolo por símbolo y solo recuerda cuánto
de la secuencia ha visto hasta ahora. No usa búsquedas de subcadenas.
"""

ESTADO_INICIAL = "q0"
ESTADO_ACEPTACION = "q3"

# Función de transición δ: (estado actual, símbolo leído) -> estado siguiente
TRANSICIONES = {
    ("q0", "0"): "q0",  # nada útil todavía
    ("q0", "1"): "q1",  # vimos «1»
    ("q1", "0"): "q2",  # vimos «10»
    ("q1", "1"): "q1",  # «11»: el último 1 puede empezar la secuencia
    ("q2", "0"): "q0",  # «100»: hay que empezar de nuevo
    ("q2", "1"): "q3",  # «101»: ¡encontrada!
    ("q3", "0"): "q3",  # ya la encontramos:
    ("q3", "1"): "q3",  # nada cambia el resultado
}


def acepta(cadena):
    """Regresa True si la cadena binaria contiene 101 y False en otro caso.

    Las cadenas con símbolos fuera del alfabeto {0, 1} se rechazan.
    """
    if not isinstance(cadena, str):
        return False
    estado = ESTADO_INICIAL
    for simbolo in cadena:
        siguiente = TRANSICIONES.get((estado, simbolo))
        if siguiente is None:  # símbolo fuera del alfabeto
            return False
        estado = siguiente
    return estado == ESTADO_ACEPTACION


def recorrido(cadena):
    """Lista de estados visitados, o None si aparece un símbolo inválido."""
    estados = [ESTADO_INICIAL]
    for simbolo in cadena:
        siguiente = TRANSICIONES.get((estados[-1], simbolo))
        if siguiente is None:
            return None
        estados.append(siguiente)
    return estados


if __name__ == "__main__":
    for cadena in ["101", "01010", "1101", "1111", "1001", "", "1021"]:
        camino = recorrido(cadena)
        pasos = " -> ".join(camino) if camino else "símbolo inválido"
        resultado = "Aceptada" if acepta(cadena) else "Rechazada"
        print(f"{cadena or '(vacía)':>8}  {resultado:<9}  {pasos}")
