"""Pruebas del detector de 101.

Ejecutar con:  python -m unittest -v test_detector_101
"""
import itertools
import unittest

from detector_101 import TRANSICIONES, acepta, recorrido


def contiene_101_referencia(cadena):
    """Respuesta de referencia SOLO para las pruebas: aquí sí se busca la subcadena."""
    return "101" in cadena


class TestAceptadas(unittest.TestCase):
    def test_ejemplos_del_enunciado(self):
        for cadena in ["101", "01010", "1101"]:
            with self.subTest(cadena=cadena):
                self.assertTrue(acepta(cadena))

    def test_101_en_cualquier_posicion(self):
        for cadena in ["1010", "0101", "000101", "1010000", "111101", "10101"]:
            with self.subTest(cadena=cadena):
                self.assertTrue(acepta(cadena))

    def test_despues_de_encontrarla_nada_cambia(self):
        for resto in ["", "0", "1", "00", "111", "0101", "1001001"]:
            with self.subTest(resto=resto):
                self.assertTrue(acepta("101" + resto))


class TestRechazadas(unittest.TestCase):
    def test_ejemplos_del_enunciado(self):
        for cadena in ["1111", "1001"]:
            with self.subTest(cadena=cadena):
                self.assertFalse(acepta(cadena))

    def test_casi_101(self):
        for cadena in ["0", "1", "10", "100", "0000", "1100", "110011", "10010", "1001001"]:
            with self.subTest(cadena=cadena):
                self.assertFalse(acepta(cadena))


class TestCasosLimite(unittest.TestCase):
    def test_cadena_vacia(self):
        self.assertFalse(acepta(""))

    def test_simbolos_fuera_del_alfabeto(self):
        for cadena in ["2", "102", "1012", "10a1", "abc", "1 01", "101 ", "１０１"]:
            with self.subTest(cadena=cadena):
                self.assertFalse(acepta(cadena))

    def test_entrada_que_no_es_cadena(self):
        for valor in [None, 101, ["1", "0", "1"]]:
            with self.subTest(valor=valor):
                self.assertFalse(acepta(valor))

    def test_siempre_regresa_un_booleano(self):
        for valor in ["101", "1001", "", "12", None]:
            with self.subTest(valor=valor):
                self.assertIsInstance(acepta(valor), bool)

    def test_cadenas_largas(self):
        self.assertTrue(acepta("0" * 100000 + "101"))
        self.assertFalse(acepta("100" * 50000))


class TestAutomata(unittest.TestCase):
    def test_funcion_de_transicion_completa(self):
        estados = {"q0", "q1", "q2", "q3"}
        self.assertEqual(len(TRANSICIONES), 8)
        for estado, simbolo in itertools.product(estados, "01"):
            with self.subTest(estado=estado, simbolo=simbolo):
                self.assertIn(TRANSICIONES[(estado, simbolo)], estados)

    def test_recorridos_conocidos(self):
        self.assertEqual(recorrido("01010"), ["q0", "q0", "q1", "q2", "q3", "q3"])
        self.assertEqual(recorrido("1001"), ["q0", "q1", "q2", "q0", "q1"])
        self.assertEqual(recorrido(""), ["q0"])
        self.assertIsNone(recorrido("12"))

    def test_todas_las_cadenas_hasta_longitud_12(self):
        revisadas = 0
        for n in range(13):
            for simbolos in itertools.product("01", repeat=n):
                cadena = "".join(simbolos)
                self.assertEqual(acepta(cadena), contiene_101_referencia(cadena), cadena)
                revisadas += 1
        self.assertEqual(revisadas, 2 ** 13 - 1)


if __name__ == "__main__":
    unittest.main(verbosity=2)
