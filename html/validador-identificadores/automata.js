/* =====================================================================
   VALIDADOR DE IDENTIFICADORES · Autómata equivalente a ^[A-Za-z][A-Za-z0-9_]*$
   El autómata lee CLASES de caracteres (no caracteres sueltos):
     L = letra inglesa A-Z a-z · D = dígito 0-9 · _ = guion bajo · O = cualquier otro
   Se registra en afn.js (window.AFN.AUTOMATAS), que dibuja, simula y comprueba.
   clase(c) debe clasificar igual que es_letra / es_digito de identificador.py:
   verificar.mjs lo comprueba ejecutando Python.
   ===================================================================== */
(function (root, factory) {
	if (typeof module === 'object' && module.exports) module.exports = factory(require('./afn.js'));
	else root.Ident = factory(root.AFN);
})(this, function (AFN) {
	'use strict';
	var NOMBRES = { L: 'letra', D: 'dígito', _: '_', O: 'otro' };
	function clase(c) {
		if ((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z')) return 'L';
		if (c >= '0' && c <= '9') return 'D';
		if (c === '_') return '_';
		return 'O';
	}
	// Cadena de caracteres → cadena de clases (por puntos de código, como Python)
	function clases(cadena) { return Array.from(cadena).map(clase).join(''); }
	var ident = {
		nombre: 'AFD para ^[A-Za-z][A-Za-z0-9_]*$', w: 600, h: 360, sigma: ['L', 'D', '_', 'O'], start: 'q0', finals: ['q1'],
		states: [{ id: 'q0', x: 120, y: 125, cap: 'inicio' }, { id: 'q1', x: 450, y: 125, loop: 'top', cap: 'válido' }, { id: 'qe', x: 285, y: 290, loop: 'right', cap: 'error' }],
		trans: [['q0', 'L', 'q1'], ['q0', 'D', 'qe'], ['q0', '_', 'qe'], ['q0', 'O', 'qe'],
			['q1', 'L', 'q1'], ['q1', 'D', 'q1'], ['q1', '_', 'q1'], ['q1', 'O', 'qe'],
			['qe', 'L', 'qe'], ['qe', 'D', 'qe'], ['qe', '_', 'qe'], ['qe', 'O', 'qe']]
	};
	AFN.AUTOMATAS.ident = ident;
	// Las etiquetas del dibujo muestran nombres en lugar de L, D, O
	function etiquetas(svg) {
		svg.querySelectorAll('text.el').forEach(function (t) {
			var s = t.textContent.split(', ');
			// Las cuatro clases juntas se resumen como «cualquiera» (así la etiqueta no tapa el estado)
			t.textContent = s.length === 4 ? 'cualquiera' : s.map(function (x) { return NOMBRES[x] || x; }).join(', ');
		});
		svg.querySelectorAll('.cap-st').forEach(function (t) { t.setAttribute('y', +t.getAttribute('y') + 2); });
	}
	return { clase: clase, clases: clases, NOMBRES: NOMBRES, def: ident, etiquetas: etiquetas,
		acepta: function (cadena) { return typeof cadena === 'string' && AFN.acepta(ident, clases(cadena)); } };
});
