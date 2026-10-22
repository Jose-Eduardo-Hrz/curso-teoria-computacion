/* =====================================================================
   POSFIJA · Motor de la presentación (navegador y Node)
   Una sola fuente de verdad para todas las tablas y resultados:
   - normalizar(expr): inserta la concatenación explícita «·».
   - trazar(expr):     convierte infija → posfija con una pila y registra
                       CADA símbolo leído (salida, pila, regla aplicada).
   - aPosfija(expr):   normaliza y devuelve la cadena posfija.
   - evaluar(pos):     recorre la posfija con una pila de fragmentos
                       (lo que hará Thompson con sus AFN).
   - aInfija(pos):     reconstruye la infija con los paréntesis mínimos.
   Operadores: «*» unario posfijo (3) · «·» concatenación (2) · «+» unión (1).
   «·» y «+» son asociativos por la izquierda.
   ===================================================================== */
(function (root) {
	'use strict';
	var PREC = { '*': 3, '·': 2, '+': 1 };
	var NOMBRE = { '*': 'estrella', '·': 'concatenación', '+': 'unión' };

	function esSimbolo(c) { return /^[a-z0-9]$/.test(c); }
	function esOperador(c) { return c === '*' || c === '·' || c === '+'; }

	function simbolos(expr) {
		var out = [];
		Array.from(String(expr)).forEach(function (c) {
			if (c === ' ') return;
			if (c === '.') c = '·';
			if (!esSimbolo(c) && !esOperador(c) && c !== '(' && c !== ')') throw new Error('símbolo no permitido: «' + c + '»');
			out.push(c);
		});
		return out;
	}

	// Va un «·» entre x e y cuando x cierra algo (letra, «)» o «*») e y abre algo (letra o «(»).
	function necesitaPunto(x, y) {
		return (esSimbolo(x) || x === ')' || x === '*') && (esSimbolo(y) || y === '(');
	}
	function normalizar(expr) {
		var s = simbolos(expr), out = [];
		s.forEach(function (c, i) {
			if (i > 0 && necesitaPunto(s[i - 1], c)) out.push('·');
			out.push(c);
		});
		return out.join('');
	}
	// Posiciones (en la expresión original) antes de las cuales se inserta un «·».
	function puntosInsertados(expr) {
		var s = simbolos(expr), pos = [];
		for (var i = 1; i < s.length; i++) if (necesitaPunto(s[i - 1], s[i])) pos.push(i);
		return pos;
	}

	/* Conversión infija → posfija (algoritmo de la pila, «shunting-yard»).
	   Cada paso: { n, i, simbolo, tipo, regla, sacados, descartados, metido,
	                motivo, salida, pila, nuevos }                              */
	function trazar(expr) {
		var s = simbolos(expr), salida = [], pila = [], pasos = [];
		function tope() { return pila[pila.length - 1]; }
		function paso(p) {
			p.n = pasos.length + 1;
			p.salida = salida.slice();
			p.pila = pila.slice();
			p.sacados = p.sacados || [];
			p.descartados = p.descartados || [];
			pasos.push(p);
		}
		s.forEach(function (c, i) {
			if (i > 0 && necesitaPunto(s[i - 1], c)) throw new Error('falta la concatenación explícita entre «' + s[i - 1] + '» y «' + c + '»');
			if (esSimbolo(c)) {                                   // regla 2
				salida.push(c);
				paso({ i: i, simbolo: c, tipo: 'simbolo', regla: 'R2', nuevos: 1 });
			} else if (c === '(') {                               // regla 3
				pila.push(c);
				paso({ i: i, simbolo: c, tipo: 'abre', regla: 'R3', metido: c, nuevos: 0 });
			} else if (c === ')') {                               // regla 6
				var sac = [];
				while (pila.length && tope() !== '(') { sac.push(pila.pop()); salida.push(sac[sac.length - 1]); }
				if (!pila.length) throw new Error('hay un «)» sin su «(»');
				pila.pop();
				paso({ i: i, simbolo: c, tipo: 'cierra', regla: 'R6', sacados: sac, descartados: ['(', ')'], nuevos: sac.length });
			} else if (c === '*') {
				// Unario posfijo: su operando ya está completo en la salida y ningún
				// operador pesa más que él, así que meterlo y sacarlo de inmediato
				// equivale a pasarlo directo a la salida.
				salida.push(c);
				paso({ i: i, simbolo: c, tipo: 'estrella', regla: 'R4★', nuevos: 1 });
			} else {                                              // reglas 4 y 5
				var sacados = [], motivo;
				while (pila.length && tope() !== '(' && PREC[tope()] >= PREC[c]) {
					sacados.push(pila.pop());
					salida.push(sacados[sacados.length - 1]);
				}
				motivo = !pila.length ? 'vacia' : tope() === '(' ? 'parentesis' : 'menor';
				pila.push(c);
				paso({ i: i, simbolo: c, tipo: 'operador', regla: sacados.length ? 'R4 R5' : 'R5', sacados: sacados, metido: c, motivo: motivo, nuevos: sacados.length });
			}
		});
		while (pila.length) {                                     // regla 7
			var op = pila.pop();
			if (op === '(') throw new Error('hay un «(» sin su «)»');
			salida.push(op);
			paso({ i: s.length, simbolo: null, tipo: 'fin', regla: 'R7', sacados: [op], nuevos: 1 });
		}
		var posfija = salida.join('');
		evaluar(posfija); // lanza un error si la expresión estaba mal formada
		return { entrada: s.join(''), pasos: pasos, posfija: posfija };
	}
	function aPosfija(expr) { return trazar(normalizar(expr)).posfija; }

	/* Árbol de la expresión a partir de la posfija. */
	function arbol(pos) {
		var pila = [];
		simbolos(pos).forEach(function (c) {
			if (esSimbolo(c)) pila.push({ op: c });
			else if (c === '*') {
				if (pila.length < 1) throw new Error('«*» sin operando');
				pila.push({ op: '*', izq: pila.pop() });
			} else if (c === '·' || c === '+') {
				if (pila.length < 2) throw new Error('«' + c + '» necesita dos operandos');
				var der = pila.pop(), izq = pila.pop();
				pila.push({ op: c, izq: izq, der: der });
			} else throw new Error('la posfija no lleva paréntesis');
		});
		if (pila.length !== 1) throw new Error('la posfija deja ' + pila.length + ' piezas en la pila');
		return pila[0];
	}
	function prec(n) { return esSimbolo(n.op) ? 4 : PREC[n.op]; }
	function infijaDe(n, punto) {
		function lado(h, estricto) {
			var t = infijaDe(h, punto);
			return (estricto ? prec(h) <= prec(n) : prec(h) < prec(n)) ? '(' + t + ')' : t;
		}
		if (esSimbolo(n.op)) return n.op;
		if (n.op === '*') return lado(n.izq, false) + '*';
		return lado(n.izq, false) + (n.op === '·' ? (punto ? '·' : '') : '+') + lado(n.der, true);
	}
	function aInfija(pos, punto) { return infijaDe(arbol(pos), !!punto); }
	// Forma con TODOS los paréntesis (para comparar estructuras).
	function completa(n) {
		if (esSimbolo(n.op)) return n.op;
		if (n.op === '*') return '(' + completa(n.izq) + ')*';
		return '(' + completa(n.izq) + n.op + completa(n.der) + ')';
	}

	/* Recorrido de la posfija con una pila de fragmentos (preparación de Thompson). */
	function evaluar(pos) {
		var pila = [], pasos = [];
		simbolos(pos).forEach(function (c) {
			var p = { simbolo: c };
			if (esSimbolo(c)) { pila.push({ op: c }); p.accion = 'apilar'; p.toma = 0; }
			else if (c === '*') {
				if (pila.length < 1) throw new Error('«*» sin operando');
				pila.push({ op: '*', izq: pila.pop() }); p.accion = 'combinar'; p.toma = 1;
			} else {
				if (pila.length < 2) throw new Error('«' + c + '» necesita dos operandos');
				var der = pila.pop(), izq = pila.pop();
				pila.push({ op: c, izq: izq, der: der }); p.accion = 'combinar'; p.toma = 2;
			}
			p.pila = pila.map(function (n) { return infijaDe(n, false); });
			pasos.push(p);
		});
		if (pila.length !== 1) throw new Error('la posfija deja ' + pila.length + ' piezas en la pila');
		return { pasos: pasos, resultado: infijaDe(pila[0], false) };
	}

	var api = {
		PREC: PREC, NOMBRE: NOMBRE, esSimbolo: esSimbolo, esOperador: esOperador, simbolos: simbolos,
		necesitaPunto: necesitaPunto, normalizar: normalizar, puntosInsertados: puntosInsertados,
		trazar: trazar, aPosfija: aPosfija, arbol: arbol, aInfija: aInfija,
		completa: function (pos) { return completa(arbol(pos)); }, evaluar: evaluar
	};
	if (typeof module === 'object' && module.exports) module.exports = api;
	else root.Posfija = api;
})(this);
