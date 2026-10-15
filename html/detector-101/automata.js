/* =====================================================================
   DETECTOR DE 101 · Definición del autómata (y de los diagramas erróneos)
   Se registran en afn.js (window.AFN.AUTOMATAS), que dibuja, simula y
   comprueba. La tabla de det101 debe ser IDÉNTICA a TRANSICIONES de
   detector_101.py: verificar.mjs lo comprueba ejecutando Python.
   ===================================================================== */
(function (root, factory) {
	if (typeof module === 'object' && module.exports) module.exports = factory(require('./afn.js'));
	else factory(root.AFN);
})(this, function (AFN) {
	'use strict';
	var fila = function (y) {
		return [{ id: 'q0', x: 100, y: y, loop: 'top' }, { id: 'q1', x: 270, y: y, loop: 'top' }, { id: 'q2', x: 440, y: y }, { id: 'q3', x: 610, y: y, loop: 'top' }];
	};
	var DEFS = {
		det101: {
			nombre: 'AFD que detecta la secuencia 101', w: 700, h: 240, sigma: ['0', '1'], start: 'q0', finals: ['q3'], states: fila(118),
			trans: [['q0', '0', 'q0'], ['q0', '1', 'q1'], ['q1', '0', 'q2'], ['q1', '1', 'q1'], ['q2', '0', 'q0'], ['q2', '1', 'q3'], ['q3', '0', 'q3'], ['q3', '1', 'q3']],
			bend: { 'q2>q0': 62 }, re: '(0+1)*101(0+1)*'
		},
		// Error 1: con «11» regresa a q0 (pierde el 1 que sí servía)
		errQ1: {
			nombre: 'Error: δ(q1, 1) = q0', w: 700, h: 240, sigma: ['0', '1'], start: 'q0', finals: ['q3'],
			states: fila(118).map(function (s) { return s.id === 'q1' ? { id: 'q1', x: 270, y: 118 } : s; }),
			trans: [['q0', '0', 'q0'], ['q0', '1', 'q1'], ['q1', '0', 'q2'], ['q1', '1', 'q0'], ['q2', '0', 'q0'], ['q2', '1', 'q3'], ['q3', '0', 'q3'], ['q3', '1', 'q3']],
			bend: { 'q2>q0': 70 }
		},
		// Error 2: con «100» va a q1 (como si quedara un 1 útil)
		errQ2: {
			nombre: 'Error: δ(q2, 0) = q1', w: 700, h: 240, sigma: ['0', '1'], start: 'q0', finals: ['q3'], states: fila(118),
			trans: [['q0', '0', 'q0'], ['q0', '1', 'q1'], ['q1', '0', 'q2'], ['q1', '1', 'q1'], ['q2', '0', 'q1'], ['q2', '1', 'q3'], ['q3', '0', 'q3'], ['q3', '1', 'q3']]
		},
		// Error 3: q3 no se queda en q3 (olvida que ya encontró 101)
		errQ3: {
			nombre: 'Error: q3 no es absorbente', w: 700, h: 260, sigma: ['0', '1'], start: 'q0', finals: ['q3'],
			states: fila(130).map(function (s) { return s.id === 'q3' ? { id: 'q3', x: 610, y: 130 } : s; }),
			trans: [['q0', '0', 'q0'], ['q0', '1', 'q1'], ['q1', '0', 'q2'], ['q1', '1', 'q1'], ['q2', '0', 'q0'], ['q2', '1', 'q3'], ['q3', '0', 'q2'], ['q3', '1', 'q1']],
			bend: { 'q2>q0': 62, 'q3>q1': -72 }
		}
	};
	Object.keys(DEFS).forEach(function (k) { AFN.AUTOMATAS[k] = DEFS[k]; });
	return DEFS;
});
