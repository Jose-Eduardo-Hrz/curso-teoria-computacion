/* =====================================================================
   MÉTODO DE THOMPSON · expresión regular → AFN-ε
   Usa motor-regex.js (análisis de la expresión, precedencia * > · > +)
   y afn.js (simulación con ε-clausura, dibujo, tablas, comprobaciones).
   Variante: cada fragmento tiene UNA entrada y UNA salida;
     símbolo a     i --a--> f                          (2 estados nuevos)
     ε             i --ε--> f                          (2 estados nuevos)
     ∅             i        f   (sin flechas)          (2 estados nuevos)
     unión  r+s    i --ε--> r.i, i --ε--> s.i, r.f --ε--> f, s.f --ε--> f   (2 nuevos)
     concat rs     r.f --ε--> s.i                       (0 nuevos)
     estrella r*   i --ε--> r.i, r.f --ε--> r.i (repite), i --ε--> f (salto), r.f --ε--> f   (2 nuevos)
   Los estados se numeran q0, q1, … en el orden en que se crean (recorrido
   en postorden del árbol). La geometría se calcula una sola vez, así que
   todas las etapas de la construcción conservan las mismas posiciones.
   Se usa en el navegador (window.Thompson) y en Node (require).
   ===================================================================== */
(function (root, factory) {
	if (typeof module === 'object' && module.exports) module.exports = factory(require('./motor-regex.js'), require('./afn.js'));
	else root.Thompson = factory(root.RegexFormal, root.AFN);
})(this, function (RX, AFN) {
	'use strict';
	var EPS = 'ε', G = 105, MARGEN_IZQ = 95, MARGEN_DER = 45, MARGEN_V = 18;

	function construir(src) {
		var ast = RX.parse(src), n = 0, states = [], trans = [], pasos = [], pila = [], especiales = {}, bends = {};
		function nuevo() { var s = { id: 'q' + (n++) }; states.push(s); return s; }
		function arista(p, a, q) { var t = [p.id, a, q.id]; trans.push(t); return t; }
		function paso(tipo, nodo, frag, nuevosE, nuevasT, nh) {
			pila.splice(pila.length - nh, nh, { ini: frag.ini.id, fin: frag.fin.id });
			pasos.push({ tipo: tipo, expr: RX.explicit(nodo, true), ini: frag.ini.id, fin: frag.fin.id,
				nuevosEstados: nuevosE.map(function (s) { return s.id; }), nuevasTrans: nuevasT,
				activos: pila.map(function (x) { return { ini: x.ini, fin: x.fin }; }) });
		}
		// Cada fragmento: entrada/salida, ancho, espacio arriba/abajo de su línea base y piezas posicionables
		function build(nodo) {
			var f, i, fi, t = [];
			switch (nodo.t) {
				case 'sym': case 'eps': case 'empty':
					i = nuevo(); fi = nuevo();
					if (nodo.t !== 'empty') t.push(arista(i, nodo.t === 'sym' ? nodo.v : EPS, fi));
					f = { ini: i, fin: fi, w: G, up: 42, down: 30, own: [[i, 0, 0], [fi, G, 0]], kids: [] };
					paso(nodo.t === 'sym' ? 'símbolo' : nodo.t === 'eps' ? 'épsilon' : 'vacío', nodo, f, [i, fi], t, 0);
					return f;
				case 'cat':
					var A = build(nodo.a), B = build(nodo.b);
					t.push(arista(A.fin, EPS, B.ini));
					f = { ini: A.ini, fin: B.fin, w: A.w + G + B.w, up: Math.max(A.up, B.up), down: Math.max(A.down, B.down), own: [], kids: [[A, 0, 0], [B, A.w + G, 0]] };
					paso('concatenación', nodo, f, [], t, 2);
					return f;
				case 'union':
					var R1 = build(nodo.a), R2 = build(nodo.b);
					i = nuevo(); fi = nuevo();
					var inner = Math.max(R1.w, R2.w), yA = -(R1.down + 16), yB = R2.up + 16;
					t.push(arista(i, EPS, R1.ini), arista(i, EPS, R2.ini), arista(R1.fin, EPS, fi), arista(R2.fin, EPS, fi));
					f = { ini: i, fin: fi, w: 2 * G + inner, up: -yA + R1.up, down: yB + R2.down, own: [[i, 0, 0], [fi, 2 * G + inner, 0]], kids: [[R1, G, yA], [R2, G, yB]] };
					paso('unión', nodo, f, [i, fi], t, 2);
					return f;
				case 'star':
					var S = build(nodo.a);
					i = nuevo(); fi = nuevo();
					var tr = arista(S.fin, EPS, S.ini), ts = arista(i, EPS, fi);
					t.push(arista(i, EPS, S.ini), tr, ts, arista(S.fin, EPS, fi));
					especiales[S.fin.id + '>' + S.ini.id] = 'repite';
					especiales[i.id + '>' + fi.id] = 'salto';
					var cR = S.up + 28, cS = S.down + 40;
					bends[S.fin.id + '>' + S.ini.id] = -cR;                         // regreso: curva por arriba
					bends[i.id + '>' + fi.id] = -cS;                                // salto: curva por abajo
					if (trans.some(function (x) { return x[0] === S.ini.id && x[2] === S.fin.id; })) bends[S.ini.id + '>' + S.fin.id] = 0.001; // la flecha interna sigue recta
					f = { ini: i, fin: fi, w: 2 * G + S.w, up: cR + 22, down: cS + 26, own: [[i, 0, 0], [fi, 2 * G + S.w, 0]], kids: [[S, G, 0]] };
					paso('estrella', nodo, f, [i, fi], t, 1);
					return f;
			}
		}
		var raiz = build(ast);
		(function colocar(fr, x, y) {
			fr.own.forEach(function (o) { o[0].x = x + o[1]; o[0].y = y + o[2]; });
			fr.kids.forEach(function (k) { colocar(k[0], x + k[1], y + k[2]); });
		})(raiz, MARGEN_IZQ, MARGEN_V + raiz.up);
		var def = {
			nombre: 'AFN-ε de Thompson para ' + src, w: MARGEN_IZQ + raiz.w + MARGEN_DER, h: MARGEN_V * 2 + raiz.up + raiz.down,
			sigma: ['0', '1'], start: raiz.ini.id, finals: [raiz.fin.id],
			states: states.map(function (s) { return { id: s.id, x: Math.round(s.x), y: Math.round(s.y) }; }),
			trans: trans, bend: bends, re: src
		};
		return { src: src, ast: ast, def: def, pasos: pasos, especiales: especiales };
	}

	/* ---------- Diagrama de una etapa (o del autómata completo) ----------
	   Etapa k: estados y flechas creados hasta el paso k. Cada fragmento suelto
	   se dibuja con su propia entrada (flecha) y su salida (doble círculo).
	   Lo creado en el paso k lleva la clase «new» del tema. */
	function diagrama(T, k, opts) {
		opts = opts || {};
		if (k == null) k = T.pasos.length - 1;
		var p = T.pasos[k], vivos = {}, tset = {};
		T.pasos.slice(0, k + 1).forEach(function (q) { q.nuevosEstados.forEach(function (s) { vivos[s] = 1; }); q.nuevasTrans.forEach(function (t) { tset[t.join('|')] = 1; }); });
		var def = {
			nombre: T.def.nombre + (k < T.pasos.length - 1 ? ' (etapa ' + (k + 1) + ')' : ''), w: T.def.w, h: T.def.h, sigma: T.def.sigma, bend: T.def.bend,
			start: p.activos[0].ini, finals: p.activos.map(function (a) { return a.fin; }),
			states: T.def.states.filter(function (s) { return vivos[s.id]; }),
			trans: T.def.trans.filter(function (t) { return tset[t.join('|')]; })
		};
		var svg = AFN.diagrama(def, { escala: opts.escala || 1 });
		// Entradas de los demás fragmentos sueltos: en diagonal desde arriba, para que no
		// parezcan una transición desde el fragmento de la izquierda (que aún no existe)
		var extra = p.activos.slice(1).map(function (a) {
			var s = def.states.filter(function (x) { return x.id === a.ini; })[0], R = 30, u = Math.SQRT1_2;
			var tx = s.x - R * u, ty = s.y - R * u, bx = tx - 13 * u, by = ty - 13 * u;
			return '<g class="start"><line class="ed st-arrow" x1="' + (tx - 34) + '" y1="' + (ty - 34) + '" x2="' + (tx - 7) + '" y2="' + (ty - 7) + '"/>' +
				'<polygon class="sh st-arrow" points="' + tx + ',' + ty + ' ' + (bx - 6.5 * u) + ',' + (by + 6.5 * u) + ' ' + (bx + 6.5 * u) + ',' + (by - 6.5 * u) + '"/></g>';
		}).join('');
		svg = svg.replace(/(<g class="start">[^]*?<\/g>)/, '$1' + extra);
		// Marcas: lo nuevo de esta etapa, y las flechas «repite» / «salto» de la estrella
		var marcar = function (key, cls) {
			svg = svg.replace(new RegExp('class="(ed(?: eps)?)" data-k="' + key + '"', 'g'), 'class="$1 ' + cls + '" data-k="' + key + '"')
				.replace(new RegExp('class="(el(?: eps)?)" data-k="' + key + '"', 'g'), 'class="$1 ' + cls + '" data-k="' + key + '"')
				.replace(new RegExp('class="sh e-' + key + '"', 'g'), 'class="sh e-' + key + ' ' + cls + '"');
		};
		if (opts.nuevo !== false && k < T.pasos.length - 1 || opts.nuevo === true) {
			p.nuevasTrans.forEach(function (t) { marcar(t[0] + '>' + t[2], 'new'); });
			p.nuevosEstados.forEach(function (s) {
				svg = svg.replace(new RegExp('<g class="state([^"]*)" data-s="' + s + '">'), '<g class="state$1 nuevo" data-s="' + s + '">');
			});
		}
		if (opts.especiales !== false) Object.keys(T.especiales).forEach(function (key) { if (tset[key.replace('>', '|ε|')]) marcar(key, T.especiales[key]); });
		return svg;
	}

	/* ---------- Invariantes de la construcción de Thompson ---------- */
	function invariantes(T) {
		var d = T.def, errs = [], ent = {}, sal = {};
		d.states.forEach(function (s) { ent[s.id] = []; sal[s.id] = []; });
		d.trans.forEach(function (t) { sal[t[0]].push(t); ent[t[2]].push(t); });
		if (d.finals.length !== 1) errs.push('debe haber exactamente un estado final');
		if (ent[d.start].length) errs.push('al estado inicial no debe llegar ninguna flecha');
		if (sal[d.finals[0]].length) errs.push('del estado final no debe salir ninguna flecha');
		d.states.forEach(function (s) {
			var o = sal[s.id], simb = o.filter(function (t) { return t[1] !== EPS; });
			if (o.length > 2) errs.push(s.id + ' tiene ' + o.length + ' flechas de salida (máximo 2)');
			if (simb.length && o.length > 1) errs.push(s.id + ' mezcla una flecha con símbolo y otras flechas');
		});
		// Estados: 2 por cada símbolo, ε, ∅, unión y estrella (la concatenación no crea estados)
		var cuenta = 0;
		(function c(n) { if (n.t !== 'cat') cuenta += 2; if (n.a) c(n.a); if (n.b) c(n.b); })(T.ast);
		if (d.states.length !== cuenta) errs.push('tiene ' + d.states.length + ' estados y la construcción produce ' + cuenta);
		// Mismo lenguaje que la expresión (todas las cadenas de longitud ≤ 8)
		if (AFN.lenguaje(d, 8).join(',') !== RX.enumerate(T.ast, 8).join(',')) errs.push('L(M) ≠ L(' + T.src + ')');
		AFN.validar(d).forEach(function (e) { errs.push(e); });
		return errs;
	}

	/* ---------- Diagramas con errores (para la diapositiva de errores frecuentes) ---------- */
	var ERRONEOS = {
		// Unión dibujada como concatenación (para 0+1)
		errUnion: { nombre: 'Error: unión dibujada en fila', w: 560, h: 110, sigma: ['0', '1'], start: 'q0', finals: ['q3'],
			states: [{ id: 'q0', x: 70, y: 60 }, { id: 'q1', x: 200, y: 60 }, { id: 'q2', x: 330, y: 60 }, { id: 'q3', x: 460, y: 60 }],
			trans: [['q0', '0', 'q1'], ['q1', EPS, 'q2'], ['q2', '1', 'q3']] },
		// Estrella sin la flecha de salto (para 0*)
		errSinSalto: { nombre: 'Error: estrella sin salto', w: 560, h: 150, sigma: ['0', '1'], start: 'q2', finals: ['q3'], bend: { 'q1>q0': -55, 'q0>q1': 0.001 },
			states: [{ id: 'q2', x: 70, y: 100 }, { id: 'q0', x: 200, y: 100 }, { id: 'q1', x: 330, y: 100 }, { id: 'q3', x: 460, y: 100 }],
			trans: [['q2', EPS, 'q0'], ['q0', '0', 'q1'], ['q1', EPS, 'q0'], ['q1', EPS, 'q3']] },
		// Estrella sin la flecha de regreso (para 0*)
		errSinRegreso: { nombre: 'Error: estrella sin regreso', w: 560, h: 150, sigma: ['0', '1'], start: 'q2', finals: ['q3'], bend: { 'q2>q3': -55 },
			states: [{ id: 'q2', x: 70, y: 50 }, { id: 'q0', x: 200, y: 50 }, { id: 'q1', x: 330, y: 50 }, { id: 'q3', x: 460, y: 50 }],
			trans: [['q2', EPS, 'q0'], ['q0', '0', 'q1'], ['q1', EPS, 'q3'], ['q2', EPS, 'q3']] },
		// 0*1* sin estados nuevos: las estrellas comparten el estado m y aparece un camino para «10»
		errSinNuevos: { nombre: 'Error: estrellas sin estados nuevos', w: 560, h: 200, sigma: ['0', '1'], start: 'p', finals: ['r'],
			bend: { 'm>p': -45, 'p>m': -45, 'r>m': -45, 'm>r': -45 },
			states: [{ id: 'p', x: 90, y: 100, label: 'p' }, { id: 'm', x: 280, y: 100, label: 'm' }, { id: 'r', x: 470, y: 100, label: 'r' }],
			trans: [['p', '0', 'm'], ['m', EPS, 'p'], ['p', EPS, 'm'], ['m', '1', 'r'], ['r', EPS, 'm'], ['m', EPS, 'r']] }
	};

	return { construir: construir, diagrama: diagrama, invariantes: invariantes, ERRONEOS: ERRONEOS, G: G };
});
