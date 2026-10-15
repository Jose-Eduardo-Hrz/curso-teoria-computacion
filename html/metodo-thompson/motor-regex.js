/* =====================================================================
   MOTOR DE EXPRESIONES REGULARES FORMALES (teoría de autómatas)
   Notación de la clase:  r + s  unión · rs  concatenación · r*  estrella
                          ε cadena vacía · ∅ conjunto vacío · ( ) agrupar
   Precedencia: *  >  concatenación  >  +
   Símbolos del alfabeto admitidos: 0-9 y a-d.
   Se usa en el navegador (window.RegexFormal) y en Node (require).
   ===================================================================== */
(function (root, factory) {
	if (typeof module === 'object' && module.exports) module.exports = factory();
	else root.RegexFormal = factory();
})(this, function () {
	'use strict';
	var SIMBOLO = /^[0-9a-d]$/;

	/* ---------- Análisis sintáctico (descenso recursivo) ---------- */
	function parse(src) {
		var s = String(src).replace(/\s+/g, '').replace(/\\varepsilon|\\epsilon/g, 'ε').replace(/\\varnothing|\\emptyset/g, '∅')
			.replace(/\^\*|\^\{\*\}/g, '*');
		var i = 0;
		function err(msg) { var e = new Error(msg + (i < s.length ? ' (posición ' + (i + 1) + ', «' + s[i] + '»)' : ' (al final)')); e.pos = i; throw e; }
		function inicioFactor(c) { return c !== undefined && (SIMBOLO.test(c) || c === 'ε' || c === '∅' || c === '('); }
		function expr() {
			var n = term();
			while (s[i] === '+') { i++; n = { t: 'union', a: n, b: term() }; }
			return n;
		}
		function term() {
			if (!inicioFactor(s[i])) err(s[i] === undefined ? 'Falta una expresión' : 'Se esperaba un símbolo, ε, ∅ o «(»');
			var n = factor();
			while (inicioFactor(s[i])) n = { t: 'cat', a: n, b: factor() };
			return n;
		}
		function factor() {
			var n = atom();
			while (s[i] === '*') { i++; n = { t: 'star', a: n }; }
			return n;
		}
		function atom() {
			var c = s[i];
			if (SIMBOLO.test(c)) { i++; return { t: 'sym', v: c }; }
			if (c === 'ε') { i++; return { t: 'eps' }; }
			if (c === '∅') { i++; return { t: 'empty' }; }
			if (c === '(') {
				i++;
				var n = expr();
				if (s[i] !== ')') err('Falta cerrar un paréntesis');
				i++;
				return n;
			}
			err('Símbolo no válido');
		}
		if (!s.length) { var e = new Error('La expresión está vacía'); e.pos = 0; throw e; }
		var arbol = expr();
		if (i < s.length) err(s[i] === ')' ? 'Sobra un paréntesis de cierre' : 'Símbolo inesperado');
		return arbol;
	}

	/* ---------- Semántica: L(r) restringido a cadenas de longitud ≤ k ---------- */
	function lang(n, k) {
		var out = new Set();
		switch (n.t) {
			case 'empty': return out;
			case 'eps': out.add(''); return out;
			case 'sym': if (k >= 1) out.add(n.v); return out;
			case 'union': lang(n.a, k).forEach(function (x) { out.add(x); }); lang(n.b, k).forEach(function (x) { out.add(x); }); return out;
			case 'cat':
				var A = lang(n.a, k), B = lang(n.b, k);
				A.forEach(function (x) { B.forEach(function (y) { if (x.length + y.length <= k) out.add(x + y); }); });
				return out;
			case 'star':
				var base = Array.from(lang(n.a, k)).filter(function (x) { return x.length > 0; });
				out.add('');
				var frontera = [''];
				while (frontera.length) {
					var nueva = [];
					frontera.forEach(function (x) {
						base.forEach(function (y) {
							var z = x + y;
							if (z.length <= k && !out.has(z)) { out.add(z); nueva.push(z); }
						});
					});
					frontera = nueva;
				}
				return out;
		}
	}
	function ordenar(arr) { return arr.slice().sort(function (x, y) { return x.length - y.length || (x < y ? -1 : x > y ? 1 : 0); }); }
	function member(n, w) { return lang(n, w.length).has(w); }

	/* ---------- Propiedades estructurales ---------- */
	function isEmpty(n) {
		switch (n.t) {
			case 'empty': return true;
			case 'eps': case 'sym': case 'star': return false;
			case 'union': return isEmpty(n.a) && isEmpty(n.b);
			case 'cat': return isEmpty(n.a) || isEmpty(n.b);
		}
	}
	function hasNonEmptyString(n) {
		switch (n.t) {
			case 'empty': case 'eps': return false;
			case 'sym': return true;
			case 'union': return hasNonEmptyString(n.a) || hasNonEmptyString(n.b);
			case 'cat': return !isEmpty(n) && (hasNonEmptyString(n.a) || hasNonEmptyString(n.b));
			case 'star': return hasNonEmptyString(n.a);
		}
	}
	function isInfinite(n) {
		switch (n.t) {
			case 'empty': case 'eps': case 'sym': return false;
			case 'union': return isInfinite(n.a) || isInfinite(n.b);
			case 'cat': return (isInfinite(n.a) && !isEmpty(n.b)) || (isInfinite(n.b) && !isEmpty(n.a));
			case 'star': return hasNonEmptyString(n.a);
		}
	}

	/* ---------- Escritura ---------- */
	// Agrupación explícita: 0+10*  →  0+(1(0*))
	function explicit(n, top) {
		var r;
		switch (n.t) {
			case 'empty': return '∅';
			case 'eps': return 'ε';
			case 'sym': return n.v;
			case 'union': r = explicit(n.a) + '+' + explicit(n.b); break;
			case 'cat': r = explicit(n.a) + explicit(n.b); break;
			case 'star': r = explicit(n.a) + '*'; break;
		}
		return top ? r : '(' + r + ')';
	}
	function show(w) { return w === '' ? 'ε' : w; }
	function list(s) { return s ? s.split(',').map(function (x) { x = x.trim(); return x === 'ε' ? '' : x; }) : []; }

	/* ---------- Comprobación de afirmaciones escritas en las diapositivas ----------
	   data-re      expresión
	   data-exact   el lenguaje es EXACTAMENTE esta lista (finito)
	   data-upto    la lista contiene TODAS las cadenas del lenguaje hasta la longitud de la más larga
	   data-in      cadenas que pertenecen        data-out   cadenas que no pertenecen
	   data-inf     el lenguaje es infinito       data-fin   el lenguaje es finito
	   data-paren   agrupación explícita esperada (p. ej. 0+(1(0*)))
	   data-same    otra expresión con el mismo lenguaje (comparado hasta longitud 8)          */
	function checkClaims(a, where) {
		var errs = [], n;
		try { n = parse(a.re); } catch (e) { return [where + ': no se puede analizar «' + a.re + '»: ' + e.message]; }
		if (a.exact !== undefined) {
			var esp = ordenar(list(a.exact)), got = ordenar(Array.from(lang(n, 10)));
			if (isInfinite(n) || esp.join(',') !== got.join(',')) errs.push(where + ': L(' + a.re + ') es {' + (isInfinite(n) ? 'infinito' : got.map(show).join(',')) + '}, no {' + esp.map(show).join(',') + '}');
		}
		if (a.upto !== undefined) {
			var u = ordenar(list(a.upto)), max = u.reduce(function (m, x) { return Math.max(m, x.length); }, 0);
			var g = ordenar(Array.from(lang(n, max)));
			if (u.join(',') !== g.join(',')) errs.push(where + ': las cadenas de L(' + a.re + ') hasta longitud ' + max + ' son {' + g.map(show).join(',') + '}, no {' + u.map(show).join(',') + '}');
		}
		list(a['in']).forEach(function (w) { if (!member(n, w)) errs.push(where + ': «' + show(w) + '» NO pertenece a L(' + a.re + ')'); });
		list(a.out).forEach(function (w) { if (member(n, w)) errs.push(where + ': «' + show(w) + '» SÍ pertenece a L(' + a.re + ')'); });
		if (a.inf !== undefined && !isInfinite(n)) errs.push(where + ': L(' + a.re + ') es finito');
		if (a.fin !== undefined && isInfinite(n)) errs.push(where + ': L(' + a.re + ') es infinito');
		if (a.paren !== undefined && explicit(n, true) !== a.paren) errs.push(where + ': ' + a.re + ' se agrupa como ' + explicit(n, true) + ', no ' + a.paren);
		if (a.same !== undefined) {
			var m = parse(a.same), x = ordenar(Array.from(lang(n, 8))).join(','), y = ordenar(Array.from(lang(m, 8))).join(',');
			if (x !== y) errs.push(where + ': ' + a.re + ' y ' + a.same + ' no describen el mismo lenguaje');
		}
		return errs;
	}

	return {
		parse: parse, lang: lang, member: member, ordenar: ordenar, isEmpty: isEmpty, isInfinite: isInfinite,
		explicit: explicit, show: show, list: list, checkClaims: checkClaims,
		enumerate: function (n, k, limite) { return ordenar(Array.from(lang(n, k))).slice(0, limite || 1e9); }
	};
});
