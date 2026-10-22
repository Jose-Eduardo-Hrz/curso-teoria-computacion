/* =====================================================================
   GLC · Motor de gramáticas libres de contexto (navegador y Node)
   Una sola fuente de verdad para todo lo que muestran las diapositivas:
   - gramatica(texto):        lee «S→aS|b; T→…» (también «->», «ε» o vacío).
   - simbolos(forma):         separa una forma sentencial en símbolos.
   - derivacion(g, formas):   comprueba que cada forma se obtiene de la
                              anterior reemplazando UNA variable con UNA regla.
   - arbol(g, formas):        árbol de derivación que corresponde a esa derivación.
   - genera(g, w):            ¿w ∈ L(G)? Devuelve una derivación por la izquierda o null.
   - lenguaje(g, n):          todas las cadenas de L(G) con longitud ≤ n.
   - contarArboles(g, w):     número de derivaciones por la izquierda (= árboles) de w.
   Convenciones: una MAYÚSCULA es una variable (no terminal); «id» es un
   terminal de dos letras; cualquier otro carácter es un terminal.
   La longitud de una cadena se mide en símbolos («id» cuenta como 1).
   ===================================================================== */
(function (root) {
	'use strict';
	var EPS = 'ε';
	var LIMITE = 400000; // formas exploradas como máximo en una búsqueda

	function esVariable(x) { return /^[A-Z]$/.test(x); }

	function simbolos(forma) {
		var s = String(forma).replace(/\s+/g, '');
		if (s === EPS || s === '') return [];
		var out = [], i = 0;
		while (i < s.length) {
			if (s.slice(i, i + 2) === 'id') { out.push('id'); i += 2; continue; }
			var c = s[i++];
			if (c === EPS) throw new Error('«ε» solo puede escribirse sola: representa la cadena vacía');
			if (c === '|' || c === '→') throw new Error('símbolo no permitido en una cadena: «' + c + '»');
			out.push(c);
		}
		return out;
	}
	function texto(lista) { return lista.length ? lista.join('') : EPS; }

	// suelta: solo para mostrar reglas aisladas (A → aB) sin exigir reglas para cada variable.
	function gramatica(fuente, suelta) {
		var P = [], V = [], T = [];
		String(fuente).split(/[;\n]/).map(function (l) { return l.trim(); }).filter(Boolean).forEach(function (linea) {
			var partes = linea.split(/→|->/);
			if (partes.length !== 2) throw new Error('cada regla necesita exactamente una flecha: «' + linea + '»');
			var A = partes[0].trim();
			if (!esVariable(A)) throw new Error('el lado izquierdo debe ser UNA variable (una mayúscula): «' + A + '»');
			if (V.indexOf(A) < 0) V.push(A);
			partes[1].split('|').forEach(function (alt) {
				var der = simbolos(alt.trim());
				der.forEach(function (x) {
					if (esVariable(x)) { if (V.indexOf(x) < 0) V.push(x); }
					else if (T.indexOf(x) < 0) T.push(x);
				});
				P.push({ n: P.length, izq: A, der: der });
			});
		});
		if (!P.length) throw new Error('la gramática no tiene reglas');
		V.forEach(function (X) {
			if (!suelta && !P.some(function (r) { return r.izq === X; })) throw new Error('la variable ' + X + ' no tiene reglas');
		});
		var g = { V: V.filter(function (X) { return P.some(function (r) { return r.izq === X; }); }), T: T, P: P, S: P[0].izq };
		g.anulables = anulables(g);
		return g;
	}
	function regla(r) { return r.izq + ' → ' + texto(r.der); }

	// Variables que pueden producir ε (sirven para acotar la búsqueda).
	function anulables(g) {
		var N = {}, cambio = true;
		while (cambio) {
			cambio = false;
			g.P.forEach(function (r) {
				if (!N[r.izq] && r.der.every(function (x) { return N[x]; })) { N[r.izq] = true; cambio = true; }
			});
		}
		return N;
	}

	function iguales(a, b) { return a.length === b.length && a.every(function (x, i) { return x === b[i]; }); }

	// ¿Cómo se pasa de «antes» a «despues»? Prueba las variables de izquierda a derecha.
	function paso(g, antes, despues) {
		for (var pos = 0; pos < antes.length; pos++) {
			if (!esVariable(antes[pos])) continue;
			for (var k = 0; k < g.P.length; k++) {
				var r = g.P[k];
				if (r.izq !== antes[pos]) continue;
				if (iguales(antes.slice(0, pos).concat(r.der, antes.slice(pos + 1)), despues)) {
					return { pos: pos, regla: r, izquierda: antes.slice(0, pos).every(function (x) { return !esVariable(x); }) };
				}
			}
		}
		return null;
	}

	function derivacion(g, formas) {
		var fs = (typeof formas === 'string' ? formas.split(';') : formas).map(simbolos);
		if (!iguales(fs[0], [g.S])) throw new Error('una derivación empieza con el símbolo inicial ' + g.S + ', no con ' + texto(fs[0]));
		var pasos = [];
		for (var i = 1; i < fs.length; i++) {
			var p = paso(g, fs[i - 1], fs[i]);
			if (!p) throw new Error('el paso ' + texto(fs[i - 1]) + ' ⇒ ' + texto(fs[i]) + ' no aplica ninguna regla');
			p.n = i;
			pasos.push(p);
		}
		var ultima = fs[fs.length - 1];
		return { formas: fs, pasos: pasos, completa: ultima.every(function (x) { return !esVariable(x); }), cadena: texto(ultima) };
	}

	function arbol(g, formas) {
		var d = derivacion(g, formas);
		var raiz = { s: g.S, nace: 0, hijos: null }, frontera = [raiz];
		d.pasos.forEach(function (p) {
			var nodo = frontera[p.pos];
			nodo.expande = p.n;
			nodo.regla = p.regla;
			nodo.hijos = p.regla.der.length ? p.regla.der.map(function (x) { return { s: x, nace: p.n, hijos: null }; })
				: [{ s: EPS, nace: p.n, hijos: null, eps: true }];
			Array.prototype.splice.apply(frontera, [p.pos, 1].concat(p.regla.der.length ? nodo.hijos : []));
		});
		return { raiz: raiz, derivacion: d, cadena: d.cadena, hojas: hojas(raiz) };
	}
	function hojas(nodo) {
		if (!nodo.hijos) return [nodo];
		return nodo.hijos.reduce(function (acc, h) { return acc.concat(hojas(h)); }, []);
	}
	// Lo que se lee en las hojas, de izquierda a derecha (ε no aporta símbolos).
	function lectura(nodo) {
		return texto(hojas(nodo).filter(function (h) { return !h.eps; }).map(function (h) { return h.s; }));
	}

	/* ---------- Búsquedas (derivaciones por la izquierda) ---------- */
	function minimo(g, forma) {
		return forma.reduce(function (n, x) { return n + (esVariable(x) && g.anulables[x] ? 0 : 1); }, 0);
	}
	function primeraVariable(forma) {
		for (var i = 0; i < forma.length; i++) if (esVariable(forma[i])) return i;
		return -1;
	}
	// Recorre las formas por la izquierda que todavía pueden llegar a w (o a cadenas de longitud ≤ max).
	function explorar(g, opciones, visita) {
		var w = opciones.w, max = w ? w.length : opciones.max;
		var cola = [{ f: [g.S], padre: null }], vistos = {}, k = 0;
		vistos[g.S] = true;
		while (k < cola.length) {
			if (k > LIMITE) throw new Error('la búsqueda es demasiado larga');
			var nodo = cola[k++], f = nodo.f, i = primeraVariable(f);
			if (i < 0) { if (visita(nodo) === false) return; continue; }
			g.P.forEach(function (r) {
				if (r.izq !== f[i]) return;
				var nf = f.slice(0, i).concat(r.der, f.slice(i + 1));
				if (minimo(g, nf) > max) return;
				if (w) {
					var j = primeraVariable(nf), pref = j < 0 ? nf : nf.slice(0, j);
					if (!iguales(pref, w.slice(0, pref.length))) return;
					if (j < 0 && pref.length !== w.length) return;
					var u = nf.length - 1, suf = 0;
					while (u >= 0 && !esVariable(nf[u])) { u--; suf++; }
					if (j >= 0 && !iguales(nf.slice(nf.length - suf), w.slice(w.length - suf))) return;
				}
				var clave = nf.join('\u0001');
				if (opciones.todas !== true) { if (vistos[clave]) return; vistos[clave] = true; }
				cola.push({ f: nf, padre: nodo });
			});
		}
	}
	function genera(g, w) {
		var meta = typeof w === 'string' ? simbolos(w) : w, hallado = null;
		explorar(g, { w: meta }, function (n) { if (iguales(n.f, meta)) { hallado = n; return false; } });
		if (!hallado) return null;
		var formas = [];
		for (var n = hallado; n; n = n.padre) formas.unshift(texto(n.f));
		return formas;
	}
	function lenguaje(g, max) {
		var out = {};
		explorar(g, { max: max }, function (n) { out[texto(n.f)] = true; });
		return Object.keys(out).sort(function (a, b) { return (a === EPS ? 0 : simbolos(a).length) - (b === EPS ? 0 : simbolos(b).length) || (a < b ? -1 : 1); });
	}
	// Sin «vistos»: cada camino distinto cuenta (solo para gramáticas sin ciclos de variables).
	function contarArboles(g, w) {
		var meta = simbolos(w), n = 0;
		explorar(g, { w: meta, todas: true }, function (x) { if (iguales(x.f, meta)) n++; });
		return n;
	}

	/* ---------- Descripciones de lenguajes que afirman las diapositivas ---------- */
	function cuenta(w, c) { return w.split(c).length - 1; }
	var PATRONES = {
		'a^n b': function (w) { return /^a*b$/.test(w); },
		'a^n b^n': function (w) { return /^a*b*$/.test(w) && cuenta(w, 'a') === cuenta(w, 'b'); },
		'a^n b^n+1': function (w) { return /^a*b+$/.test(w) && cuenta(w, 'b') === cuenta(w, 'a') + 1; },
		'palindromos': function (w) { return w.split('').reverse().join('') === w; },
		'parentesis': function (w) {
			var nivel = 0;
			for (var i = 0; i < w.length; i++) { nivel += w[i] === '(' ? 1 : -1; if (nivel < 0) return false; }
			return nivel === 0;
		}
	};
	// Todas las cadenas sobre el alfabeto con longitud ≤ max (ε se escribe «ε»).
	function cadenasHasta(alfabeto, max) {
		var out = [''], capa = [''];
		for (var n = 1; n <= max; n++) {
			capa = capa.reduce(function (acc, w) { return acc.concat(alfabeto.map(function (c) { return w + c; })); }, []);
			out = out.concat(capa);
		}
		return out.map(function (w) { return w || EPS; });
	}
	// ¿L(G) coincide con el patrón en todas las cadenas de longitud ≤ max? Devuelve la primera diferencia o null.
	function comparaLenguaje(g, patron, max) {
		var gen = {};
		lenguaje(g, max).forEach(function (w) { gen[w] = true; });
		var todas = cadenasHasta(g.T, max);
		for (var i = 0; i < todas.length; i++) {
			var w = todas[i], esperado = PATRONES[patron](w === EPS ? '' : w);
			if (!!gen[w] !== esperado) return { cadena: w, generada: !!gen[w], patron: esperado };
		}
		return null;
	}

	var api = {
		EPS: EPS, esVariable: esVariable, simbolos: simbolos, texto: texto, gramatica: gramatica, regla: regla,
		paso: paso, derivacion: derivacion, arbol: arbol, hojas: hojas, lectura: lectura,
		genera: genera, lenguaje: lenguaje, contarArboles: contarArboles,
		PATRONES: PATRONES, cadenasHasta: cadenasHasta, comparaLenguaje: comparaLenguaje
	};
	if (typeof module === 'object' && module.exports) module.exports = api;
	else root.GLC = api;
})(this);
