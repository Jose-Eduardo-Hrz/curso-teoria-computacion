/* =====================================================================
   MOTOR DE AUTÓMATAS FINITOS DETERMINISTAS
   Cada autómata se define UNA vez (AUTOMATAS) y de esa definición salen
   su diagrama, su tabla de transición, el simulador y la validación.
   Transiciones como lista [p, a, q] para poder representar también
   diagramas incorrectos (transición repetida o que falta).
   Se usa en el navegador (window.AFD) y en Node (require).
   ===================================================================== */
(function (root, factory) {
	if (typeof module === 'object' && module.exports) module.exports = factory();
	else root.AFD = factory();
})(this, function () {
	'use strict';

	/* ---------- Autómatas de la presentación ----------
	   states: id, x, y (centro en el SVG), loop: 'top' | 'bottom' | 'left' | 'right',
	           label (texto libre), cap (leyenda bajo el estado)
	   ilustracion: true → analogía, no se valida como AFD
	   esperaErrores: número de errores que DEBE tener (diagrama incorrecto a propósito) */
	var AUTOMATAS = {
		termina1: {
			nombre: 'Cadenas binarias que terminan en 1', w: 500, h: 210, sigma: ['0', '1'], start: 'q0', finals: ['q1'],
			states: [{ id: 'q0', x: 130, y: 125, loop: 'top' }, { id: 'q1', x: 370, y: 125, loop: 'top' }],
			trans: [['q0', '0', 'q0'], ['q0', '1', 'q1'], ['q1', '0', 'q0'], ['q1', '1', 'q1']],
			re: '(0+1)*1'
		},
		alMenosUn1: {
			nombre: 'Cadenas con al menos un 1', w: 500, h: 210, sigma: ['0', '1'], start: 'q0', finals: ['q1'],
			states: [{ id: 'q0', x: 130, y: 125, loop: 'top' }, { id: 'q1', x: 370, y: 125, loop: 'top' }],
			trans: [['q0', '0', 'q0'], ['q0', '1', 'q1'], ['q1', '0', 'q1'], ['q1', '1', 'q1']],
			re: '0*1(0+1)*'
		},
		par1: {
			nombre: 'Cadenas con un número par de unos', w: 500, h: 210, sigma: ['0', '1'], start: 'qP', finals: ['qP'],
			states: [{ id: 'qP', x: 130, y: 125, loop: 'top' }, { id: 'qI', x: 370, y: 125, loop: 'top' }],
			trans: [['qP', '0', 'qP'], ['qP', '1', 'qI'], ['qI', '0', 'qI'], ['qI', '1', 'qP']],
			re: '0*(10*10*)*'
		},
		empieza1: {
			nombre: 'Cadenas que empiezan con 1', w: 470, h: 320, sigma: ['0', '1'], start: 'q0', finals: ['q1'],
			states: [{ id: 'q0', x: 110, y: 160 }, { id: 'q1', x: 340, y: 95, loop: 'right' }, { id: 'qt', x: 340, y: 235, loop: 'right' }],
			trans: [['q0', '1', 'q1'], ['q0', '0', 'qt'], ['q1', '0', 'q1'], ['q1', '1', 'q1'], ['qt', '0', 'qt'], ['qt', '1', 'qt']],
			re: '1(0+1)*'
		},
		contiene11: {
			nombre: 'Cadenas que contienen 11', w: 600, h: 210, sigma: ['0', '1'], start: 'q0', finals: ['q2'],
			states: [{ id: 'q0', x: 110, y: 125, loop: 'top' }, { id: 'q1', x: 300, y: 125 }, { id: 'q2', x: 490, y: 125, loop: 'top' }],
			trans: [['q0', '0', 'q0'], ['q0', '1', 'q1'], ['q1', '0', 'q0'], ['q1', '1', 'q2'], ['q2', '0', 'q2'], ['q2', '1', 'q2']],
			re: '(0+1)*11(0+1)*'
		},
		termina0: {
			nombre: 'Cadenas binarias que terminan en 0', w: 500, h: 210, sigma: ['0', '1'], start: 'q0', finals: ['q1'],
			states: [{ id: 'q0', x: 130, y: 125, loop: 'top' }, { id: 'q1', x: 370, y: 125, loop: 'top' }],
			trans: [['q0', '1', 'q0'], ['q0', '0', 'q1'], ['q1', '1', 'q0'], ['q1', '0', 'q1']],
			re: '(0+1)*0'
		},
		conError: {
			nombre: 'Diagrama con errores', w: 500, h: 210, sigma: ['0', '1'], start: 'q0', finals: ['q1'], esperaErrores: 2,
			states: [{ id: 'q0', x: 130, y: 125, loop: 'top' }, { id: 'q1', x: 370, y: 125, loop: 'top' }],
			trans: [['q0', '0', 'q0'], ['q0', '1', 'q0'], ['q0', '1', 'q1'], ['q1', '1', 'q1']]
		},
		cerradura: {
			nombre: 'Cerradura (analogía)', ilustracion: true, w: 560, h: 190, sigma: [], start: 'A', finals: ['B'],
			states: [{ id: 'A', x: 130, y: 85, label: 'A', cap: 'aún no se lee el código completo' }, { id: 'B', x: 430, y: 85, label: 'B', cap: 'código reconocido' }],
			trans: [['A', 'código correcto', 'B']]
		},
		expendedora: {
			nombre: 'Máquina expendedora (analogía)', ilustracion: true, w: 640, h: 190, sigma: [], start: 'e0', finals: ['e10'],
			states: [{ id: 'e0', x: 110, y: 85, label: '$0', cap: 'esperando' }, { id: 'e5', x: 320, y: 85, label: '$5', cap: 'falta dinero' }, { id: 'e10', x: 530, y: 85, label: '$10', cap: 'entrega el dulce' }],
			trans: [['e0', '+$5', 'e5'], ['e5', '+$5', 'e10']]
		}
	};

	/* ---------- Validación: ¿es un AFD completo? ---------- */
	function validar(def) {
		var errs = [], ids = def.states.map(function (s) { return s.id; });
		if (ids.indexOf(def.start) < 0) errs.push('El estado inicial ' + def.start + ' no está en Q');
		def.finals.forEach(function (f) { if (ids.indexOf(f) < 0) errs.push('El estado final ' + f + ' no está en Q (F debe ser subconjunto de Q)'); });
		var vistos = {};
		def.trans.forEach(function (t) {
			if (ids.indexOf(t[0]) < 0 || ids.indexOf(t[2]) < 0) errs.push('La transición ' + t.join(' → ') + ' usa un estado que no está en Q');
			if (def.sigma.indexOf(t[1]) < 0) errs.push('El símbolo «' + t[1] + '» no está en el alfabeto');
			var k = t[0] + '|' + t[1];
			(vistos[k] = vistos[k] || []).push(t[2]);
		});
		ids.forEach(function (p) {
			def.sigma.forEach(function (a) {
				var d = vistos[p + '|' + a];
				if (!d) errs.push('Falta δ(' + p + ', ' + a + '): desde ' + p + ' no sale ninguna flecha con ' + a);
				else if (d.length > 1) errs.push('δ(' + p + ', ' + a + ') tiene ' + d.length + ' destinos (' + d.join(' y ') + '): no es determinista');
			});
		});
		return errs;
	}

	/* ---------- Función de transición ---------- */
	function delta(def, p, a) {
		for (var i = 0; i < def.trans.length; i++) if (def.trans[i][0] === p && def.trans[i][1] === a) return def.trans[i][2];
		return null;
	}
	// δ*(q, w) definida recursivamente: δ*(q, ε) = q ; δ*(q, wa) = δ(δ*(q, w), a)
	function deltaExt(def, q, w) {
		if (w === '') return q;
		var prev = deltaExt(def, q, w.slice(0, -1));
		return prev === null ? null : delta(def, prev, w[w.length - 1]);
	}
	// Recorrido completo: estados visitados y transiciones usadas
	function recorrer(def, w) {
		var q = def.start, camino = [q], pasos = [];
		for (var i = 0; i < w.length; i++) {
			var r = delta(def, q, w[i]);
			if (r === null) return { camino: camino, pasos: pasos, acepta: false, atascado: { estado: q, simbolo: w[i], pos: i } };
			pasos.push({ de: q, simbolo: w[i], a: r });
			q = r; camino.push(q);
		}
		return { camino: camino, pasos: pasos, acepta: def.finals.indexOf(q) >= 0, final: q };
	}
	function acepta(def, w) { return recorrer(def, w).acepta; }
	// Todas las cadenas de Σ* de longitud ≤ k que acepta
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

	/* ---------- Diagrama SVG ---------- */
	var R = 30;
	function sub(id, def) {
		var s = def.states.filter(function (x) { return x.id === id; })[0];
		if (s && s.label) return esc(s.label);
		return esc(id[0]) + '<tspan class="sb" dy="6" font-size="13">' + esc(id.slice(1)) + '</tspan>';
	}
	function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
	function f(n) { return Math.round(n * 10) / 10; }
	function flecha(tx, ty, dx, dy, cls) {
		var L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, b = 13, w = 6.5;
		return '<polygon class="sh ' + (cls || '') + '" points="' + f(tx) + ',' + f(ty) + ' ' + f(tx - ux * b - uy * w) + ',' + f(ty - uy * b + ux * w) + ' ' + f(tx - ux * b + uy * w) + ',' + f(ty - uy * b - ux * w) + '"/>';
	}
	function diagrama(def, opts) {
		opts = opts || {};
		var pos = {}, grupos = {}, orden = [];
		def.states.forEach(function (s) { pos[s.id] = s; });
		def.trans.forEach(function (t) {
			var k = t[0] + '>' + t[2];
			if (!grupos[k]) { grupos[k] = []; orden.push(k); }
			grupos[k].push(t[1]);
		});
		var aristas = '', etiquetas = '';
		orden.forEach(function (k) {
			var pq = k.split('>'), P = pos[pq[0]], Q = pos[pq[1]], lab = esc(grupos[k].join(', ')), d, lx, ly, head;
			if (P === Q) {
				var lp = P.loop || 'top', sgn = (lp === 'top' || lp === 'left') ? -1 : 1, vert = lp === 'top' || lp === 'bottom';
				if (vert) {
					var y0 = P.y + sgn * R * 0.8, yc = P.y + sgn * (R + 58);
					var xs = P.x - R * 0.6, xe = P.x + R * 0.6;
					d = 'M' + f(xs) + ' ' + f(y0) + ' C ' + f(P.x - 38) + ' ' + f(yc) + ', ' + f(P.x + 38) + ' ' + f(yc) + ', ' + f(xe) + ' ' + f(y0 + sgn * 6);
					head = flecha(xe, y0, xe - (P.x + 38), y0 - yc, 'e-' + k);
					lx = P.x; ly = P.y + sgn * (R + 56);
				} else {
					var x0 = P.x + sgn * R * 0.8, xc = P.x + sgn * (R + 58);
					var ys = P.y - R * 0.6, ye = P.y + R * 0.6;
					d = 'M' + f(x0) + ' ' + f(ys) + ' C ' + f(xc) + ' ' + f(P.y - 38) + ', ' + f(xc) + ' ' + f(P.y + 38) + ', ' + f(x0 + sgn * 6) + ' ' + f(ye);
					head = flecha(x0, ye, x0 - xc, ye - (P.y + 38), 'e-' + k);
					lx = P.x + sgn * (R + 60); ly = P.y;
				}
			} else {
				var inv = grupos[pq[1] + '>' + pq[0]] ? 36 : 0, dx = Q.x - P.x, dy = Q.y - P.y, L = Math.hypot(dx, dy);
				var nx = dy / L, ny = -dx / L;                                 // normal a la izquierda del sentido P→Q
				var cx = (P.x + Q.x) / 2 + nx * inv * 2, cy = (P.y + Q.y) / 2 + ny * inv * 2;
				function borde(S, tx, ty, extra) { var ux = tx - S.x, uy = ty - S.y, m = Math.hypot(ux, uy); return [S.x + ux / m * (R + extra), S.y + uy / m * (R + extra)]; }
				var s0 = borde(P, cx, cy, 0), tip = borde(Q, cx, cy, 0), e0 = borde(Q, cx, cy, 8);
				d = 'M' + f(s0[0]) + ' ' + f(s0[1]) + ' Q ' + f(cx) + ' ' + f(cy) + ' ' + f(e0[0]) + ' ' + f(e0[1]);
				head = flecha(tip[0], tip[1], tip[0] - cx, tip[1] - cy, 'e-' + k);
				var off = inv ? inv + 16 : 16;
				lx = (P.x + Q.x) / 2 + nx * off; ly = (P.y + Q.y) / 2 + ny * off;
			}
			aristas += '<path class="ed" data-k="' + k + '" d="' + d + '"/>' + head;
			etiquetas += '<text class="el" data-k="' + k + '" x="' + f(lx) + '" y="' + f(ly) + '">' + lab + '</text>';
		});
		var S = pos[def.start];
		var inicio = '<g class="start"><line class="ed st-arrow" x1="' + f(S.x - R - 52) + '" y1="' + S.y + '" x2="' + f(S.x - R - 9) + '" y2="' + S.y + '"/>' + flecha(S.x - R, S.y, 1, 0, 'st-arrow') + '</g>';
		var estados = def.states.map(function (s) {
			var fin = def.finals.indexOf(s.id) >= 0;
			return '<g class="state' + (fin ? ' final' : '') + (s.id === def.start ? ' initial' : '') + '" data-s="' + s.id + '">' +
				'<circle class="st" cx="' + s.x + '" cy="' + s.y + '" r="' + R + '"/>' +
				(fin ? '<circle class="st in" cx="' + s.x + '" cy="' + s.y + '" r="' + (R - 6) + '"/>' : '') +
				'<text class="sl" x="' + s.x + '" y="' + s.y + '">' + sub(s.id, def) + '</text>' +
				(s.cap ? '<text class="cap-st" x="' + s.x + '" y="' + (s.y + R + 26) + '">' + esc(s.cap) + '</text>' : '') + '</g>';
		}).join('');
		var nombre = 'Diagrama de estados: ' + def.nombre + '. Estados ' + def.states.map(function (s) { return s.label || s.id; }).join(', ') +
			'; inicial ' + (pos[def.start].label || def.start) + '; finales ' + def.finals.map(function (x) { return pos[x].label || x; }).join(', ') + '.';
		return '<svg class="fa-svg afd" viewBox="0 0 ' + def.w + ' ' + def.h + '" width="' + Math.round(def.w * (opts.escala || 1)) + '" role="img" aria-label="' + esc(nombre) + '">' +
			inicio + aristas + estados + etiquetas + '</svg>';
	}

	/* ---------- Tabla de transición ---------- */
	function tabla(def) {
		var h = '<table class="tbl ttab"><caption class="sr">Tabla de transición: ' + esc(def.nombre) + '</caption><thead><tr><th>Estado</th>' +
			def.sigma.map(function (a) { return '<th>Entrada ' + esc(a) + '</th>'; }).join('') + '</tr></thead><tbody>';
		def.states.forEach(function (s) {
			var marcas = (s.id === def.start ? '<span class="mk" title="estado inicial">→</span>' : '') + (def.finals.indexOf(s.id) >= 0 ? '<span class="mk" title="estado final">*</span>' : '');
			h += '<tr' + (def.finals.indexOf(s.id) >= 0 ? ' class="fin"' : '') + '><td class="S">' + marcas + '<span class="qq">' + sub2(s.id) + '</span></td>';
			def.sigma.forEach(function (a) {
				var d = def.trans.filter(function (t) { return t[0] === s.id && t[1] === a; }).map(function (t) { return t[2]; });
				h += !d.length ? '<td class="bad">— falta</td>' : d.length > 1 ? '<td class="bad">' + d.map(sub2).join(' y ') + '</td>' : '<td>' + sub2(d[0]) + '</td>';
			});
			h += '</tr>';
		});
		return h + '</tbody></table>';
	}
	function sub2(id) { return esc(id[0]) + '<sub>' + esc(id.slice(1)) + '</sub>'; }

	/* ---------- Comprobación de afirmaciones escritas en las diapositivas ----------
	   data-claim  id del autómata          data-acc / data-rej  cadenas aceptadas / rechazadas
	   data-w + data-path  recorrido q0,q1,…  data-ext "q|w|r;…"  δ*(q,w)=r
	   data-delta "p,a,q;…"  δ(p,a)=q        data-re  L(M)=L(re) (hasta longitud 8; requiere el motor de regex)
	   data-q / data-q0 / data-f  componentes   data-errores  número de errores de validación esperado */
	function comprobar(a, where, RX) {
		var def = AUTOMATAS[a.claim], errs = [], L = function (s) { return s ? s.split(',').map(function (x) { x = x.trim(); return x === 'ε' ? '' : x; }) : []; };
		if (!def) return [where + ': no existe el autómata «' + a.claim + '»'];
		var w = where + ' [' + a.claim + ']';
		if (a.errores !== undefined) { var n = validar(def).length; if (n !== +a.errores) errs.push(w + ': se esperaban ' + a.errores + ' errores de validación y hay ' + n); }
		L(a.acc).forEach(function (x) { if (!acepta(def, x)) errs.push(w + ': «' + (x || 'ε') + '» se RECHAZA'); });
		L(a.rej).forEach(function (x) { if (acepta(def, x)) errs.push(w + ': «' + (x || 'ε') + '» se ACEPTA'); });
		if (a.path !== undefined) { var c = recorrer(def, a.w || '').camino.join(','); if (c !== a.path) errs.push(w + ': el recorrido de «' + (a.w || 'ε') + '» es ' + c + ', no ' + a.path); }
		(a.ext ? a.ext.split(';') : []).forEach(function (t) { var p = t.split('|'), cad = p[1] === 'ε' ? '' : p[1], r = deltaExt(def, p[0], cad); if (r !== p[2]) errs.push(w + ': δ*(' + p[0] + ', ' + p[1] + ') = ' + r + ', no ' + p[2]); });
		(a.delta ? a.delta.split(';') : []).forEach(function (t) { var p = t.split(','), r = delta(def, p[0], p[1]); if (r !== p[2]) errs.push(w + ': δ(' + p[0] + ', ' + p[1] + ') = ' + r + ', no ' + p[2]); });
		if (a.q !== undefined && def.states.map(function (s) { return s.id; }).join(',') !== a.q) errs.push(w + ': Q no es {' + a.q + '}');
		if (a.q0 !== undefined && def.start !== a.q0) errs.push(w + ': el estado inicial no es ' + a.q0);
		if (a.f !== undefined && def.finals.join(',') !== a.f) errs.push(w + ': F no es {' + a.f + '}');
		if (a.re !== undefined) {
			if (!RX) errs.push(w + ': falta el motor de expresiones regulares para comprobar ' + a.re);
			else { var x = lenguaje(def, 8).join(','), y = RX.enumerate(RX.parse(a.re), 8).join(','); if (x !== y) errs.push(w + ': L(M) ≠ L(' + a.re + ')'); }
		}
		return errs;
	}

	return { AUTOMATAS: AUTOMATAS, validar: validar, delta: delta, deltaExt: deltaExt, recorrer: recorrer, acepta: acepta, lenguaje: lenguaje,
		diagrama: diagrama, tabla: tabla, sub2: sub2, comprobar: comprobar,
		lista: function (s) { return s ? s.split(',').map(function (x) { x = x.trim(); return x === 'ε' ? '' : x; }) : []; },
		show: function (w) { return w === '' ? 'ε' : w; } };
});
