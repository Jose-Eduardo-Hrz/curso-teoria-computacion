"""Pruebas unitarias del validador de identificadores.

Ejecutar con:  python -m unittest -v test_identificador
"""
import itertools
import re
import unittest

from identificador import es_digito, es_identificador, es_letra

# Respuesta de referencia SOLO para las pruebas (el validador no usa «re»).
# Se usa fullmatch: con re.match y «$», Python aceptaría "abc\n".
REFERENCIA = re.compile(r"[A-Za-z][A-Za-z0-9_]*")


class TestValidos(unittest.TestCase):
    def test_una_sola_letra(self):
        for cadena in ["x", "Z", "a"]:
            with self.subTest(cadena=cadena):
                self.assertTrue(es_identificador(cadena))

    def test_letras_digitos_y_guiones_bajos(self):
        for cadena in ["Hola", "edad_2", "A1_b2", "x__", "total2024", "camelCase", "SNAKE_CASE"]:
            with self.subTest(cadena=cadena):
                self.assertTrue(es_identificador(cadena))


class TestInvalidos(unittest.TestCase):
    def test_regla_1_debe_empezar_con_letra(self):
        for cadena in ["2x", "_x", "9", "_", "-a", " a"]:
            with self.subTest(cadena=cadena):
                self.assertFalse(es_identificador(cadena))

    def test_regla_3_simbolos_prohibidos(self):
        for cadena in ["mi-var", "mi var", "a.b", "a$", "x!", "precio%", "a+b"]:
            with self.subTest(cadena=cadena):
                self.assertFalse(es_identificador(cadena))

    def test_regla_4_toda_la_cadena(self):
        for cadena in ["abc def", "ok?", "valido-", "x1 "]:
            with self.subTest(cadena=cadena):
                self.assertFalse(es_identificador(cadena))


class TestCasosLimite(unittest.TestCase):
    def test_regla_5_cadena_vacia(self):
        self.assertFalse(es_identificador(""))

    def test_salto_de_linea_al_final(self):
        self.assertFalse(es_identificador("abc\n"))
        self.assertIsNotNone(re.match(r"^[A-Za-z][A-Za-z0-9_]*$", "abc\n"))  # la trampa del «$»

    def test_letras_que_no_son_inglesas(self):
        for cadena in ["año", "ñandu", "café", "Ωmega", "x١"]:
            with self.subTest(cadena=cadena):
                self.assertFalse(es_identificador(cadena))

    def test_digitos_que_no_son_0_a_9(self):
        for cadena in ["x²", "a٣", "b①"]:
            with self.subTest(cadena=cadena):
                self.assertFalse(es_identificador(cadena))

    def test_entrada_que_no_es_cadena(self):
        for valor in [None, 123, ["a", "b"]]:
            with self.subTest(valor=valor):
                self.assertFalse(es_identificador(valor))

    def test_siempre_regresa_un_booleano(self):
        for valor in ["x", "", "2x", None]:
            with self.subTest(valor=valor):
                self.assertIsInstance(es_identificador(valor), bool)

    def test_identificador_muy_largo(self):
        self.assertTrue(es_identificador("a" + "b1_" * 50000))
        self.assertFalse(es_identificador("a" * 100000 + "-"))


class TestFuncionesAuxiliares(unittest.TestCase):
    def test_es_letra_y_es_digito(self):
        for c in "AZaz":
            self.assertTrue(es_letra(c))
        for c in "09":
            self.assertTrue(es_digito(c))
        for c in ["@", "[", "`", "{", "/", ":", "ñ", "²", "_"]:
            with self.subTest(c=c):
                self.assertFalse(es_letra(c) or es_digito(c))


class TestComparacionConLaExpresion(unittest.TestCase):
    def test_todas_las_cadenas_cortas(self):
        caracteres = "aZm09_- .ñ²\n$"
        revisadas = 0
        for n in range(5):
            for tupla in itertools.product(caracteres, repeat=n):
                cadena = "".join(tupla)
                esperado = REFERENCIA.fullmatch(cadena) is not None
                self.assertEqual(es_identificador(cadena), esperado, repr(cadena))
                revisadas += 1
        self.assertEqual(revisadas, sum(len(caracteres) ** n for n in range(5)))


if __name__ == "__main__":
    unittest.main(verbosity=2)
