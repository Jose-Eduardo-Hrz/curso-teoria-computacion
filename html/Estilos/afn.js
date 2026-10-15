/* =====================================================================
   MOTOR DE AUTÓMATAS FINITOS NO DETERMINISTAS (con transiciones ε)
   Cada autómata se define UNA vez (AUTOMATAS) y de esa definición salen
   su diagrama, su tabla, el árbol de caminos, el simulador por conjuntos,
   la construcción de subconjuntos y la validación.
   Transiciones como lista [p, a, q]; a = 'ε' es una transición vacía.
   El dibujo sigue el mismo trazado que afd.js (presentación anterior).
   Se usa en el navegador (window.AFN) y en Node (require).
   ===================================================================== */
(function (root, factory) {
	if (typeof module === 'object' && module.exports) module.exports = factory();
	else root.AFN = factory();
})(this, function () {
	'use strict';
	var EPS = 'ε';

	/* ---------- Autómatas de la presentación ----------
	   states: id, x, y, loop ('top'|'bottom'|'left'|'right'), label, cap
	   conj: en un AFD obtenido por subconjuntos, el conjunto de estados del AFN que representa
	   bend: curvatura de una flecha concreta, { 'p>q': n } */
	var AUTOMATAS = {
		termina01: {
			nombre: 'AFN: cadenas que terminan en 01', w: 590, h: 210, sigma: ['0', '1'], start: 'q0', finals: ['q2'],
			states: [{ id: 'q0', x: 110, y: 125, loop: 'top' }, { id: 'q1', x: 300, y: 125 }, { id: 'q2', x: 490, y: 125 }],
			trans: [['q0', '0', 'q0'], ['q0', '1', 'q0'], ['q0', '0', 'q1'], ['q1', '1', 'q2']],
			re: '(0+1)*01'
		},
		penultimo1: {
			nombre: 'AFN: el penúltimo símbolo es 1', w: 590, h: 210, sigma: ['0', '1'], start: 'q0', finals: ['q2'],
			states: [{ id: 'q0', x: 110, y: 125, loop: 'top' }, { id: 'q1', x: 300, y: 125 }, { id: 'q2', x: 490, y: 125 }],
			trans: [['q0', '0', 'q0'], ['q0', '1', 'q0'], ['q0', '1', 'q1'], ['q1', '0', 'q2'], ['q1', '1', 'q2']],
			re: '(0+1)*1(0+1)'
		},
		contiene101: {
			nombre: 'AFN: cadenas que contienen 101', w: 680, h: 210, sigma: ['0', '1'], start: 'q0', finals: ['q3'],
			states: [{ id: 'q0', x: 100, y: 125, loop: 'top' }, { id: 'q1', x: 260, y: 125 }, { id: 'q2', x: 420, y: 125 }, { id: 'q3', x: 580, y: 125, loop: 'top' }],
			trans: [['q0', '0', 'q0'], ['q0', '1', 'q0'], ['q0', '1', 'q1'], ['q1', '0', 'q2'], ['q2', '1', 'q3'], ['q3', '0', 'q3'], ['q3', '1', 'q3']],
			re: '(0+1)*101(0+1)*'
		},
		ceros_unos: {
			nombre: 'AFN-ε: ceros y después unos', w: 500, h: 210, sigma: ['0', '1'], start: 'q0', finals: ['q1'],
			states: [{ id: 'q0', x: 130, y: 125, loop: 'top' }, { id: 'q1', x: 370, y: 125, loop: 'top' }],
			trans: [['q0', '0', 'q0'], ['q0', EPS, 'q1'], ['q1', '1', 'q1']],
			re: '0*1*'
		},
		solo: {
			nombre: 'AFN-ε: solo ceros o solo unos', w: 470, h: 320, sigma: ['0', '1'], start: 'q0', finals: ['qa', 'qb'],
			states: [{ id: 'q0', x: 110, y: 160 }, { id: 'qa', x: 340, y: 95, loop: 'right' }, { id: 'qb', x: 340, y: 235, loop: 'right' }],
			trans: [['q0', EPS, 'qa'], ['q0', EPS, 'qb'], ['qa', '0', 'qa'], ['qb', '1', 'qb']],
			re: '0*+1*'
		},
		termina1: {
			nombre: 'AFD: cadenas que terminan en 1', w: 500, h: 210, sigma: ['0', '1'], start: 'q0', finals: ['q1'],
			states: [{ id: 'q0', x: 130, y: 125, loop: 'top' }, { id: 'q1', x: 370, y: 125, loop: 'top' }],
			trans: [['q0', '0', 'q0'], ['q0', '1', 'q1'], ['q1', '0', 'q0'], ['q1', '1', 'q1']],
			re: '(0+1)*1'
		},
		termina01afd: {
			nombre: 'AFD equivalente (subconjuntos): termina en 01', w: 590, h: 290, sigma: ['0', '1'], start: 'A', finals: ['C'], deAFN: 'termina01',
			states: [{ id: 'A', x: 110, y: 110, loop: 'top', label: 'A', conj: 'q0' }, { id: 'B', x: 300, y: 110, loop: 'top', label: 'B', conj: 'q0,q1' }, { id: 'C', x: 490, y: 110, label: 'C', conj: 'q0,q2' }],
			trans: [['A', '1', 'A'], ['A', '0', 'B'], ['B', '0', 'B'], ['B', '1', 'C'], ['C', '0', 'B'], ['C', '1', 'A']],
			bend: { 'C>A': 88 },
			re: '(0+1)*01'
		}
	};

	/* ---------- Conjuntos (arreglos ordenados de ids) ---------- */
	function orden(def) { var o = {}; def.states.forEach(function (s, i) { o[s.id] = i; }); return o; }
	function conjunto(def, arr) {
		var o = orden(def), u = [];
		arr.forEach(function (x) { if (u.indexOf(x) < 0) u.push(x); });
		return u.sort(function (a, b) { return o[a] - o[b]; });
	}
	function texto(S) { return S.length ? '{' + S.join(', ') + '}' : '∅'; }

	/* ---------- Validación y clasificación ---------- */
	function validar(def) {
		var errs = [], ids = def.states.map(function (s) { return s.id; });
		if (ids.indexOf(def.start) < 0) errs.push('El estado inicial ' + def.start + ' no está en Q');
		def.finals.forEach(function (f) { if (ids.indexOf(f) < 0) errs.push('El estado final ' + f + ' no está en Q'); });
		def.trans.forEach(function (t) {
			if (ids.indexOf(t[0]) < 0 || ids.indexOf(t[2]) < 0) errs.push('La transición ' + t.join(' → ') + ' usa un estado fuera de Q');
			if (t[1] !== EPS && def.sigma.indexOf(t[1]) < 0) errs.push('El símbolo «' + t[1] + '» no está en Σ');
		});
		var vistas = {};
		def.trans.forEach(function (t) { var k = t.join('|'); if (vistas[k]) errs.push('Transición repetida ' + t.join(' → ')); vistas[k] = 1; });
		return errs;
	}
	// Devuelve { tipo: 'AFD' | 'AFN' | 'AFN-ε', razones: [...] }
	function clasificar(def) {
		var r = [], eps = def.trans.filter(function (t) { return t[1] === EPS; });
		eps.forEach(function (t) { r.push('transición ε de ' + t[0] + ' a ' + t[2]); });
		def.states.forEach(function (s) {
			def.sigma.forEach(function (a) {
				var d = delta(def, s.id, a);
				if (d.length > 1) r.push('δ(' + s.id + ', ' + a + ') = ' + texto(d) + ': varios destinos');
				if (!d.length) r.push('δ(' + s.id + ', ' + a + ') = ∅: no hay flecha');
			});
		});
		return { tipo: eps.length ? 'AFN-ε' : r.length ? 'AFN' : 'AFD', razones: r };
	}

	/* ---------- Función de transición y ε-clausura ---------- */
	function delta(def, p, a) {
		return conjunto(def, def.trans.filter(function (t) { return t[0] === p && t[1] === a; }).map(function (t) { return t[2]; }));
	}
	function clausura(def, S) {
		var res = S.slice(), pila = S.slice();
		while (pila.length) {
			var p = pila.pop();
			delta(def, p, EPS).forEach(function (q) { if (res.indexOf(q) < 0) { res.push(q); pila.push(q); } });
		}
		return conjunto(def, res);
	}
	function mover(def, S, a) {
		var u = [];
		S.forEach(function (p) { u = u.concat(delta(def, p, a)); });
		return conjunto(def, u);
	}
	function paso(def, S, a) { return clausura(def, mover(def, S, a)); }
	// δ*(q, ε) = ECLOSE(q) ;  δ*(q, wa) = ECLOSE( ⋃_{p ∈ δ*(q, w)} δ(p, a) )
	function deltaExt(def, q, w) {
		if (w === '') return clausura(def, [q]);
		return paso(def, deltaExt(def, q, w.slice(0, -1)), w[w.length - 1]);
	}
	// Simulación por conjuntos: estados activos tras cada símbolo y transiciones usadas
	function simular(def, w) {
		var S = clausura(def, [def.start]), conjuntos = [S], usadas = [];
		for (var i = 0; i < w.length; i++) {
			var a = w[i], u = [];
			S.forEach(function (p) { delta(def, p, a).forEach(function (q) { u.push([p, a, q]); }); });
			var M = conjunto(def, u.map(function (t) { return t[2]; })), C = clausura(def, M);
			C.forEach(function (q) { if (M.indexOf(q) < 0) def.trans.forEach(function (t) { if (t[1] === EPS && t[2] === q && C.indexOf(t[0]) >= 0) u.push(t); }); });
			S = C; conjuntos.push(S); usadas.push(u);
		}
		var fin = S.filter(function (q) { return def.finals.indexOf(q) >= 0; });
		return { conjuntos: conjuntos, usadas: usadas, finales: fin, acepta: fin.length > 0 };
	}
	function acepta(def, w) { return simular(def, w).acepta; }
	function lenguaje(def, k) {
		var out = [], nivel = [''];
		for (var n = 0; n <= k; n++) {
			nivel.forEach(function (w) { if (acepta(def, w)) out.push(w); });
			var sig = [];
			nivel.forEach(function (w) { def.sigma.forEach(function (a) { sig.push(w + a); }); });
			nivel = sig;
		}
		return out;
	}

	/* ---------- Árbol de caminos (AFN sin ε) ----------
	   Nodo: { q, hijos: [...], muere: símbolo que no se pudo leer, fin: true si leyó todo } */
	function arbol(def, w) {
		function nodo(q, i) {
			var n = { q: q, i: i, hijos: [] };
			if (i === w.length) { n.fin = true; n.acepta = def.finals.indexOf(q) >= 0; return n; }
			var d = delta(def, q, w[i]);
			if (!d.length) { n.muere = w[i]; return n; }
			n.hijos = d.map(function (r) { return nodo(r, i + 1); });
			return n;
		}
		return nodo(def.start, 0);
	}
	function contarCaminos(t) {
		if (!t.hijos.length) return { total: 1, aceptan: t.acepta ? 1 : 0, mueren: t.muere ? 1 : 0 };
		return t.hijos.map(contarCaminos).reduce(function (s, c) { return { total: s.total + c.total, aceptan: s.aceptan + c.aceptan, mueren: s.mueren + c.mueren }; }, { total: 0, aceptan: 0, mueren: 0 });
	}

	/* ---------- Construcción de subconjuntos ---------- */
	function subconjuntos(def) {
		var ini = clausura(def, [def.start]), estados = [ini], trans = [], k = 0;
		while (k < estados.length) {
			var S = estados[k++];
			def.sigma.forEach(function (a) {
				var T = paso(def, S, a), j = estados.map(texto).indexOf(texto(T));
				if (j < 0) { estados.push(T); }
				trans.push([texto(S), a, texto(T)]);
			});
		}
		return { estados: estados, trans: trans, finales: estados.filter(function (S) { return S.some(function (q) { return def.finals.indexOf(q) >= 0; }); }).map(texto) };
	}
	// ¿El AFD dibujado a mano (con conj en cada estado) es exactamente el de subconjuntos?
	function compararSubconjuntos(afd) {
		var afn = AUTOMATAS[afd.deAFN], sc = subconjuntos(afn), errs = [], nom = {};
		afd.states.forEach(function (s) { nom[s.id] = texto(s.conj.split(',')); });
		if (sc.estados.length !== afd.states.length) errs.push('subconjuntos da ' + sc.estados.length + ' estados, el AFD tiene ' + afd.states.length);
		sc.trans.forEach(function (t) {
			var ok = afd.trans.some(function (u) { return nom[u[0]] === t[0] && u[1] === t[1] && nom[u[2]] === t[2]; });
			if (!ok) errs.push('falta la transición ' + t.join(' → ') + ' en el AFD');
		});
		if (nom[afd.start] !== sc.estados.map(texto)[0]) errs.push('el estado inicial no es ' + texto(sc.estados[0]));
		var finD = afd.finals.map(function (f) { return nom[f]; }).sort().join(';');
		if (finD !== sc.finales.slice().sort().join(';')) errs.push('los finales del AFD no son ' + sc.finales.join(' y '));
		return errs;
	}

	/* ---------- Diagrama SVG (mismo trazado que afd.js) ---------- */
	var R = 30;
	function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
	function f(n) { return Math.round(n * 10) / 10; }
	function etiqueta(id, def) {
		var s = def.states.filter(function (x) { return x.id === id; })[0];
		if (s && s.label) return esc(s.label);
		return esc(id[0]) + '<tspan class="sb" dy="6" font-size="13">' + esc(id.slice(1)) + '</tspan>';
	}
	function flecha(tx, ty, dx, dy, cls) {
		var L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, b = 13, w = 6.5;
		return '<polygon class="sh ' + (cls || '') + '" points="' + f(tx) + ',' + f(ty) + ' ' + f(tx - ux * b - uy * w) + ',' + f(ty - uy * b + ux * w) + ' ' + f(tx - ux * b + uy * w) + ',' + f(ty - uy * b - ux * w) + '"/>';
	}
	function diagrama(def, opts) {
		opts = opts || {};
		var pos = {}, grupos = {}, ordenG = [];
		def.states.forEach(function (s) { pos[s.id] = s; });
		def.trans.forEach(function (t) {
			var k = t[0] + '>' + t[2];
			if (!grupos[k]) { grupos[k] = []; ordenG.push(k); }
			grupos[k].push(t[1]);
		});
		var aristas = '', etiquetas = '';
		ordenG.forEach(function (k) {
			var pq = k.split('>'), P = pos[pq[0]], Q = pos[pq[1]], sims = grupos[k], soloEps = sims.every(function (a) { return a === EPS; }), d, lx, ly, head;
			var cls = soloEps ? ' eps' : '';
			if (P === Q) {
				var lp = P.loop || 'top', sgn = (lp === 'top' || lp === 'left') ? -1 : 1, vert = lp === 'top' || lp === 'bottom';
				if (vert) {
					var y0 = P.y + sgn * R * 0.8, yc = P.y + sgn * (R + 58), xs = P.x - R * 0.6, xe = P.x + R * 0.6;
					d = 'M' + f(xs) + ' ' + f(y0) + ' C ' + f(P.x - 38) + ' ' + f(yc) + ', ' + f(P.x + 38) + ' ' + f(yc) + ', ' + f(xe) + ' ' + f(y0 + sgn * 6);
					head = flecha(xe, y0, xe - (P.x + 38), y0 - yc, 'e-' + k);
					lx = P.x; ly = P.y + sgn * (R + 56);
				} else {
					var x0 = P.x + sgn * R * 0.8, xc = P.x + sgn * (R + 58), ys = P.y - R * 0.6, ye = P.y + R * 0.6;
					d = 'M' + f(x0) + ' ' + f(ys) + ' C ' + f(xc) + ' ' + f(P.y - 38) + ', ' + f(xc) + ' ' + f(P.y + 38) + ', ' + f(x0 + sgn * 6) + ' ' + f(ye);
					head = flecha(x0, ye, x0 - xc, ye - (P.y + 38), 'e-' + k);
					lx = P.x + sgn * (R + 60); ly = P.y;
				}
			} else {
				var curva = (def.bend && def.bend[k]) || (grupos[pq[1] + '>' + pq[0]] ? 36 : 0);
				var dx = Q.x - P.x, dy = Q.y - P.y, L = Math.hypot(dx, dy), nx = dy / L, ny = -dx / L;
				var cx = (P.x + Q.x) / 2 + nx * curva * 2, cy = (P.y + Q.y) / 2 + ny * curva * 2;
				var borde = function (S, tx, ty, extra) { var ux = tx - S.x, uy = ty - S.y, m = Math.hypot(ux, uy); return [S.x + ux / m * (R + extra), S.y + uy / m * (R + extra)]; };
				var s0 = borde(P, cx, cy, 0), tip = borde(Q, cx, cy, 0), e0 = borde(Q, cx, cy, 8);
				d = 'M' + f(s0[0]) + ' ' + f(s0[1]) + ' Q ' + f(cx) + ' ' + f(cy) + ' ' + f(e0[0]) + ' ' + f(e0[1]);
				head = flecha(tip[0], tip[1], tip[0] - cx, tip[1] - cy, 'e-' + k);
				var off = curva ? curva + 16 : 16;
				lx = (P.x + Q.x) / 2 + nx * off; ly = (P.y + Q.y) / 2 + ny * off;
			}
			aristas += '<path class="ed' + cls + '" data-k="' + k + '" d="' + d + '"/>' + head;
			etiquetas += '<text class="el' + cls + '" data-k="' + k + '" x="' + f(lx) + '" y="' + f(ly) + '">' + esc(sims.join(', ')) + '</text>';
		});
		var S = pos[def.start];
		var inicio = '<g class="start"><line class="ed st-arrow" x1="' + f(S.x - R - 52) + '" y1="' + S.y + '" x2="' + f(S.x - R - 9) + '" y2="' + S.y + '"/>' + flecha(S.x - R, S.y, 1, 0, 'st-arrow') + '</g>';
		var estados = def.states.map(function (s) {
			var fin = def.finals.indexOf(s.id) >= 0;
			return '<g class="state' + (fin ? ' final' : '') + (s.id === def.start ? ' initial' : '') + '" data-s="' + s.id + '">' +
				'<circle class="st" cx="' + s.x + '" cy="' + s.y + '" r="' + R + '"/>' +
				(fin ? '<circle class="st in" cx="' + s.x + '" cy="' + s.y + '" r="' + (R - 6) + '"/>' : '') +
				'<text class="sl" x="' + s.x + '" y="' + s.y + '">' + etiqueta(s.id, def) + '</text>' +
				(s.conj ? '<text class="cap-st" x="' + s.x + '" y="' + (s.y + R + 22) + '">' + esc(texto(s.conj.split(','))) + '</text>' : '') +
				(s.cap ? '<text class="cap-st" x="' + s.x + '" y="' + (s.y + R + 22) + '">' + esc(s.cap) + '</text>' : '') + '</g>';
		}).join('');
		var nombre = 'Diagrama de estados: ' + def.nombre + '. Estados ' + def.states.map(function (s) { return s.label || s.id; }).join(', ') +
			'; inicial ' + def.start + '; finales ' + def.finals.join(', ') + '.';
		return '<svg class="fa-svg afd" viewBox="0 0 ' + def.w + ' ' + def.h + '" width="' + Math.round(def.w * (opts.escala || 1)) + '" role="img" aria-label="' + esc(nombre) + '">' +
			inicio + aristas + estados + etiquetas + '</svg>';
	}

	/* ---------- Tabla de transición (celdas = conjuntos) ---------- */
	function sub2(id) { return id.length > 1 && /^q/.test(id) ? esc(id[0]) + '<sub>' + esc(id.slice(1)) + '</sub>' : esc(id); }
	function conjHTML(S) { return S.length ? '{' + S.map(sub2).join(', ') + '}' : '∅'; }
	function tabla(def, opts) {
		opts = opts || {};
		var cols = def.sigma.slice(), hayEps = def.trans.some(function (t) { return t[1] === EPS; });
		if (hayEps) cols.push(EPS);
		var h = '<table class="tbl ttab"><caption class="sr">Tabla de transición: ' + esc(def.nombre) + '</caption><thead><tr><th>Estado</th>' +
			cols.map(function (a) { return '<th>' + (a === EPS ? '<span class="lc">ε</span>' : 'Entrada ' + esc(a)) + '</th>'; }).join('') + (opts.clausura ? '<th>ECLOSE</th>' : '') + '</tr></thead><tbody>';
		def.states.forEach(function (s) {
			var marcas = (s.id === def.start ? '<span class="mk" title="estado inicial">→</span>' : '') + (def.finals.indexOf(s.id) >= 0 ? '<span class="mk" title="estado final">*</span>' : '');
			h += '<tr' + (def.finals.indexOf(s.id) >= 0 ? ' class="fin"' : '') + '><td class="S">' + marcas + '<span class="qq">' + (s.label ? esc(s.label) : sub2(s.id)) + '</span></td>';
			cols.forEach(function (a) {
				var d = delta(def, s.id, a);
				h += '<td' + (d.length > 1 ? ' class="multi"' : !d.length ? ' class="vacio"' : '') + '>' + (opts.singleton || d.length !== 1 || def.trans.some(function (t) { return t[1] === EPS; }) || clasificar(def).tipo !== 'AFD' ? conjHTML(d) : sub2(d[0])) + '</td>';
			});
			if (opts.clausura) h += '<td class="ecl">' + conjHTML(clausura(def, [s.id])) + '</td>';
			h += '</tr>';
		});
		return h + '</tbody></table>';
	}

	/* ---------- Comprobación de afirmaciones escritas en las diapositivas ----------
	   data-claim  id                      data-acc / data-rej  cadenas aceptadas / rechazadas
	   data-w + data-sets  estados activos tras cada símbolo: "q0;q0,q1;∅"
	   data-delta  "q0:0=q0,q1;q1:0=∅"     data-ext  "q0|01=q0,q2;…"     data-eclose "q0=q0,q1;…"
	   data-caminos "w=total,aceptan,mueren"  data-tipo AFD | AFN | AFN-ε
	   data-re  L(M)=L(re)  · data-equiv  otro autómata con el mismo lenguaje · data-nsub  nº de estados por subconjuntos
	   data-q / data-q0 / data-f  componentes · data-subconj  el AFD dibujado coincide con la construcción */
	function comprobar(a, where, RX) {
		var def = AUTOMATAS[a.claim], errs = [];
		if (!def) return [where + ': no existe el autómata «' + a.claim + '»'];
		var w = where + ' [' + a.claim + ']';
		var L = function (s) { return s ? s.split(',').map(function (x) { x = x.trim(); return x === 'ε' ? '' : x; }) : []; };
		var C = function (s) { return s === '∅' || s === '' ? '∅' : texto(conjunto(def, s.split(','))); };
		validar(def).forEach(function (e) { errs.push(w + ': ' + e); });
		L(a.acc).forEach(function (x) { if (!acepta(def, x)) errs.push(w + ': «' + (x || 'ε') + '» se RECHAZA'); });
		L(a.rej).forEach(function (x) { if (acepta(def, x)) errs.push(w + ': «' + (x || 'ε') + '» se ACEPTA'); });
		if (a.sets !== undefined) {
			var got = simular(def, a.w || '').conjuntos.map(texto).join(' ; '), esp = a.sets.split(';').map(C).join(' ; ');
			if (got !== esp) errs.push(w + ': con «' + (a.w || 'ε') + '» los conjuntos son ' + got + ', no ' + esp);
		}
		(a.delta ? a.delta.split(';') : []).forEach(function (t) {
			var m = t.split('='), pa = m[0].split(':'), r = texto(delta(def, pa[0], pa[1]));
			if (r !== C(m[1])) errs.push(w + ': δ(' + pa[0] + ', ' + pa[1] + ') = ' + r + ', no ' + C(m[1]));
		});
		(a.ext ? a.ext.split(';') : []).forEach(function (t) {
			var m = t.split('='), qw = m[0].split('|'), r = texto(deltaExt(def, qw[0], qw[1] === 'ε' ? '' : qw[1]));
			if (r !== C(m[1])) errs.push(w + ': δ*(' + qw[0] + ', ' + qw[1] + ') = ' + r + ', no ' + C(m[1]));
		});
		(a.eclose ? a.eclose.split(';') : []).forEach(function (t) {
			var m = t.split('='), r = texto(clausura(def, [m[0]]));
			if (r !== C(m[1])) errs.push(w + ': ECLOSE(' + m[0] + ') = ' + r + ', no ' + C(m[1]));
		});
		(a.caminos ? a.caminos.split(';') : []).forEach(function (t) {
			var m = t.split('='), c = contarCaminos(arbol(def, m[0] === 'ε' ? '' : m[0])), e = m[1].split(',').map(Number);
			if (c.total !== e[0] || c.aceptan !== e[1] || c.mueren !== e[2]) errs.push(w + ': «' + m[0] + '» tiene ' + c.total + ' caminos (' + c.aceptan + ' aceptan, ' + c.mueren + ' mueren), no ' + m[1]);
		});
		if (a.tipo !== undefined && clasificar(def).tipo !== a.tipo) errs.push(w + ': es ' + clasificar(def).tipo + ', no ' + a.tipo);
		if (a.q !== undefined && def.states.map(function (s) { return s.id; }).join(',') !== a.q) errs.push(w + ': Q no es {' + a.q + '}');
		if (a.q0 !== undefined && def.start !== a.q0) errs.push(w + ': el estado inicial no es ' + a.q0);
		if (a.f !== undefined && def.finals.join(',') !== a.f) errs.push(w + ': F no es {' + a.f + '}');
		if (a.nsub !== undefined && subconjuntos(def).estados.length !== +a.nsub) errs.push(w + ': la construcción de subconjuntos da ' + subconjuntos(def).estados.length + ' estados, no ' + a.nsub);
		if (a.subconj !== undefined) compararSubconjuntos(def).forEach(function (e) { errs.push(w + ': ' + e); });
		if (a.equiv !== undefined && lenguaje(def, 8).join(',') !== lenguaje(AUTOMATAS[a.equiv], 8).join(',')) errs.push(w + ': no reconoce el mismo lenguaje que ' + a.equiv);
		if (a.re !== undefined) {
			if (!RX) errs.push(w + ': falta el motor de expresiones regulares');
			else if (lenguaje(def, 8).join(',') !== RX.enumerate(RX.parse(a.re), 8).join(',')) errs.push(w + ': L(M) ≠ L(' + a.re + ')');
		}
		return errs;
	}

	return {
		AUTOMATAS: AUTOMATAS, EPS: EPS, validar: validar, clasificar: clasificar, delta: delta, clausura: clausura, mover: mover, paso: paso,
		deltaExt: deltaExt, simular: simular, acepta: acepta, lenguaje: lenguaje, arbol: arbol, contarCaminos: contarCaminos,
		subconjuntos: subconjuntos, compararSubconjuntos: compararSubconjuntos, diagrama: diagrama, tabla: tabla, texto: texto,
		conjHTML: conjHTML, sub2: sub2, comprobar: comprobar,
		lista: function (s) { return s ? s.split(',').map(function (x) { x = x.trim(); return x === 'ε' ? '' : x; }) : []; },
		show: function (w) { return w === '' ? 'ε' : w; }
	};
});
