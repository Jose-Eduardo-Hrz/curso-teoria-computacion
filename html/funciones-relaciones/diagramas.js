/* =====================================================================
   DIAGRAMAS · Funciones y relaciones (SVG generado a partir de datos)

   Cada diagrama se declara en el HTML con atributos data-*; este script
   dibuja el SVG, añade una descripción accesible y COMPRUEBA que las
   propiedades que el autor atribuye al diagrama (data-expect) son las
   que realmente tiene. Si no coinciden, el diagrama se marca con un
   aviso visible y se informa en la consola.

   Sintaxis de pares:  "1>a, 2>b"   (para relaciones: "1>2, 2>2")

   ── Diagrama de flechas entre dos conjuntos ─────────────────────────
   <div class="mapdiag"
        data-a="1,2,3"  data-b="a,b,c"         elementos de A y de B
        data-map="1>a,2>b,3>b"                 flechas (pares)
        data-la="A" data-lb="B"                nombres de los conjuntos
        data-ca="dominio" data-cb="codominio"  rótulos (opcionales)
        data-hl="1>a"                          flechas destacadas
        data-bad="3>b"                         flechas que causan el fallo
        data-mark-a="1" data-mark-b="c"        elementos que causan el fallo
        data-ok-b="a"                          elementos destacados
        data-frag="seq"                        flechas aparecen una por clic
        data-badges="fun,iny,sob,biy"          insignias calculadas
        data-expect="fun,iny,!sob"></div>      propiedades esperadas

   ── Relación sobre un conjunto (grafo dirigido) ─────────────────────
   <div class="reldiag"
        data-set="1,2,3"  data-rel="1>1,1>2"
        data-pos="80,40;160,150;..."           posiciones manuales (opcional)
        data-hl / data-bad / data-missing="1>3" / data-mark="2"
        data-badges="R,S,T"  data-expect="R,!S,T"></div>
   ===================================================================== */
(function (global) {
	'use strict';

	/* ---------- Utilidades de análisis (también usadas por verificar.mjs) ---------- */
	function list(s) {
		return (s || '').split(',').map(function (t) { return t.trim(); }).filter(Boolean);
	}
	function pairs(s) {
		return list(s).map(function (t) {
			var p = t.split('>').map(function (x) { return x.trim(); });
			if (p.length !== 2 || !p[0] || !p[1]) throw new Error('Par mal escrito: "' + t + '"');
			return p;
		});
	}
	function key(p) { return p[0] + '>' + p[1]; }

	function mapProps(A, B, M) {
		var out = {}, inc = {};
		A.forEach(function (a) { out[a] = 0; });
		B.forEach(function (b) { inc[b] = 0; });
		M.forEach(function (p) { out[p[0]]++; inc[p[1]]++; });
		var fun = A.every(function (a) { return out[a] === 1; });
		var iny = fun && B.every(function (b) { return inc[b] <= 1; });
		var sob = fun && B.every(function (b) { return inc[b] >= 1; });
		return { fun: fun, iny: iny, sob: sob, biy: iny && sob };
	}

	function relProps(S, R) {
		var has = {};
		R.forEach(function (p) { has[key(p)] = true; });
		var refl = S.every(function (a) { return has[a + '>' + a]; });
		var sim = R.every(function (p) { return has[p[1] + '>' + p[0]]; });
		var tra = R.every(function (p) {
			return R.every(function (q) { return p[1] !== q[0] || has[p[0] + '>' + q[1]]; });
		});
		return { R: refl, S: sim, T: tra };
	}

	/* Comprueba data-expect frente a las propiedades reales. Devuelve errores. */
	function checkExpect(expect, props, where) {
		var errs = [];
		list(expect).forEach(function (tok) {
			var neg = tok[0] === '!', name = neg ? tok.slice(1) : tok;
			if (!(name in props)) { errs.push(where + ': propiedad desconocida "' + name + '"'); return; }
			if (props[name] === neg) errs.push(where + ': se esperaba ' + tok + ' pero es ' + (props[name] ? name : '!' + name));
		});
		return errs;
	}

	function validateMap(A, B, M, where) {
		var errs = [];
		M.forEach(function (p) {
			if (A.indexOf(p[0]) < 0) errs.push(where + ': "' + p[0] + '" no está en A');
			if (B.indexOf(p[1]) < 0) errs.push(where + ': "' + p[1] + '" no está en B');
		});
		return errs;
	}
	function validateRel(S, R, where) {
		var errs = [];
		R.forEach(function (p) {
			p.forEach(function (x) { if (S.indexOf(x) < 0) errs.push(where + ': "' + x + '" no está en el conjunto'); });
		});
		return errs;
	}

	var Check = { list: list, pairs: pairs, mapProps: mapProps, relProps: relProps, checkExpect: checkExpect, validateMap: validateMap, validateRel: validateRel };

	if (typeof module !== 'undefined' && module.exports) { module.exports = Check; return; }
	global.DiagramCheck = Check;

	/* ---------- Dibujo ---------- */
	var NS = 'http://www.w3.org/2000/svg';
	var NAMES = { fun: 'Función', iny: 'Inyectiva', sob: 'Sobreyectiva', biy: 'Biyectiva', R: 'Reflexiva', S: 'Simétrica', T: 'Transitiva' };

	function el(tag, attrs, parent) {
		var e = document.createElementNS(NS, tag);
		for (var k in attrs) e.setAttribute(k, attrs[k]);
		if (parent) parent.appendChild(e);
		return e;
	}
	function txt(parent, x, y, s, cls) {
		var t = el('text', { x: x, y: y, 'class': cls }, parent);
		t.textContent = s;
		return t;
	}
	function nodeW(label) { return Math.max(42, label.length * 11 + 22); }

	/* Marcadores de flecha (una sola vez por documento) */
	function ensureMarkers() {
		if (document.getElementById('dg-defs')) return;
		var svg = el('svg', { id: 'dg-defs', width: 0, height: 0, 'aria-hidden': 'true', style: 'position:absolute' });
		var defs = el('defs', {}, svg);
		[['ah', 'var(--navy)'], ['ah-hl', 'var(--accent)'], ['ah-bad', 'var(--red)'], ['ah-mut', '#8b96a1']].forEach(function (m) {
			var mk = el('marker', { id: m[0], viewBox: '0 0 12 12', refX: 11, refY: 6, markerWidth: 13, markerHeight: 13, markerUnits: 'userSpaceOnUse', orient: 'auto' }, defs);
			el('path', { d: 'M0,0 L12,6 L0,12 z', style: 'fill:' + m[1] }, mk);
		});
		document.body.insertBefore(svg, document.body.firstChild);
	}

	function edgeClass(k, opt) {
		if (opt.bad[k]) return 'bad';
		if (opt.hl[k]) return 'hl';
		return '';
	}
	function marker(cls) { return cls === 'bad' ? 'url(#ah-bad)' : cls === 'hl' ? 'url(#ah-hl)' : cls === 'miss' ? 'url(#ah-bad)' : 'url(#ah)'; }
	function toSet(arr) { var o = {}; arr.forEach(function (x) { o[x] = true; }); return o; }

	/* Cruz (forma) para señalar el fallo sin depender del color */
	function crossAt(g, x, y) {
		var c = el('g', { 'class': 'dg-x', transform: 'translate(' + x + ',' + y + ')' }, g);
		el('circle', { r: 11 }, c);
		el('path', { d: 'M-5,-5 L5,5 M5,-5 L-5,5' }, c);
		return c;
	}

	function badgesRow(host, props, which, frag) {
		var row = document.createElement('div');
		row.className = 'dg-badges' + (frag ? ' fragment' : '');
		list(which).forEach(function (n) {
			var b = document.createElement('span');
			b.className = 'dg-badge ' + (props[n] ? 'yes' : 'no');
			b.innerHTML = '<i class="fa-solid ' + (props[n] ? 'fa-check' : 'fa-xmark') + '" aria-hidden="true"></i>' +
				(props[n] ? '' : 'No ') + (props[n] ? NAMES[n] : NAMES[n].toLowerCase());
			row.appendChild(b);
		});
		host.appendChild(row);
	}

	function flagError(host, errs) {
		errs.forEach(function (e) { console.error('[diagramas] ' + e); });
		host.classList.add('dg-error');
		host.setAttribute('data-errors', errs.join(' | '));
		var w = document.createElement('div');
		w.className = 'dg-warn';
		w.textContent = '⚠ ' + errs.join(' · ');
		host.appendChild(w);
		(global.__diagErrors = global.__diagErrors || []).push.apply(global.__diagErrors, errs);
	}

	/* Diagrama de flechas A → B */
	function drawMap(host, idx) {
		var d = host.dataset, where = 'mapdiag #' + idx + ' (' + (d.map || '') + ')';
		var A = list(d.a), B = list(d.b), M = pairs(d.map);
		var errs = validateMap(A, B, M, where);
		var props = mapProps(A, B, M);
		errs = errs.concat(checkExpect(d.expect, props, where));

		var opt = { hl: toSet(list(d.hl)), bad: toSet(list(d.bad)) };
		var markA = toSet(list(d.markA)), markB = toSet(list(d.markB)), okB = toSet(list(d.okB));
		var gap = +(d.gap || 56), top = d.ca || d.cb ? 74 : 52;
		var n = Math.max(A.length, B.length);
		var H = top + n * gap + 14;
		var wA = Math.max.apply(null, A.map(nodeW)), wB = Math.max.apply(null, B.map(nodeW));
		var rxA = wA / 2 + 26, rxB = wB / 2 + 26;
		var W = +(d.w || Math.max(380, rxA * 2 + rxB * 2 + 150));
		var xA = 8 + rxA, xB = W - 8 - rxB, cy = top + (n * gap) / 2 - 4;
		var ry = (n * gap) / 2 + 12;

		var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, 'class': 'dg', role: 'img' });
		[[xA, rxA, d.la || 'A', d.ca, 'dom'], [xB, rxB, d.lb || 'B', d.cb, 'cod']].forEach(function (s) {
			el('ellipse', { cx: s[0], cy: cy, rx: s[1], ry: ry, 'class': 'dg-set ' + s[4] }, svg);
			txt(svg, s[0], 20, s[2], 'dg-setname');
			if (s[3]) txt(svg, s[0], 44, s[3], 'dg-setcap');
		});

		function y(i, len) { return cy - ((len - 1) * gap) / 2 + i * gap; }
		var posA = {}, posB = {};
		A.forEach(function (a, i) { posA[a] = y(i, A.length); });
		B.forEach(function (b, i) { posB[b] = y(i, B.length); });

		var edges = el('g', {}, svg), nodes = el('g', {}, svg), marks = el('g', {}, svg);
		var fragIdx = 0;
		M.forEach(function (p) {
			var k = key(p), cls = edgeClass(k, opt);
			var x1 = xA + nodeW(p[0]) / 2 + 3, y1 = posA[p[0]], x2 = xB - nodeW(p[1]) / 2 - 4, y2 = posB[p[1]];
			var g = el('g', { 'class': 'dg-edge ' + cls }, edges);
			el('line', { x1: x1, y1: y1, x2: x2, y2: y2, 'marker-end': marker(cls) }, g);
			if (cls === 'bad') {
				// Flechas que salen del mismo elemento: cruz cerca del final; que llegan al mismo: cerca del inicio.
				var sameSrc = M.filter(function (q) { return q[0] === p[0] && opt.bad[key(q)]; }).length > 1;
				var sameDst = M.filter(function (q) { return q[1] === p[1] && opt.bad[key(q)]; }).length > 1;
				var t = sameSrc ? 0.68 : sameDst ? 0.32 : 0.5;
				crossAt(g, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t);
			}
			if (d.frag === 'seq') { g.classList.add('fragment'); g.setAttribute('data-fragment-index', fragIdx++); }
			if (d.anim === 'flow') g.classList.add('flow');
		});

		function node(x, yv, label, extra) {
			var w = nodeW(label);
			var g = el('g', { 'class': 'dg-node ' + extra }, nodes);
			el('rect', { x: x - w / 2, y: yv - 18, width: w, height: 36, rx: 18 }, g);
			txt(g, x, yv + 1, label, 'dg-lbl');
			if (extra.indexOf('mark') >= 0) {
				el('rect', { x: x - w / 2 - 7, y: yv - 25, width: w + 14, height: 50, rx: 25, 'class': 'dg-ring' }, marks);
				crossAt(marks, x + w / 2 + 4, yv - 20);
			}
		}
		A.forEach(function (a) { node(xA, posA[a], a, 'a' + (markA[a] ? ' mark' : '')); });
		B.forEach(function (b) { node(xB, posB[b], b, 'b' + (markB[b] ? ' mark' : okB[b] ? ' ok' : '')); });

		svg.setAttribute('aria-label', (d.label ? d.label + '. ' : '') + 'Diagrama de flechas de ' + (d.la || 'A') + ' = {' + A.join(', ') + '} en ' +
			(d.lb || 'B') + ' = {' + B.join(', ') + '}. Flechas: ' + (M.length ? M.map(function (p) { return p[0] + ' va a ' + p[1]; }).join('; ') : 'ninguna') + '.');
		host.appendChild(svg);
		if (d.badges) badgesRow(host, props, d.badges, d.badgesFrag !== undefined);
		if (errs.length) flagError(host, errs);
	}

	/* Relación sobre un conjunto */
	function drawRel(host, idx) {
		var d = host.dataset, where = 'reldiag #' + idx + ' (' + (d.rel || '') + ')';
		var S = list(d.set), R = pairs(d.rel), MISS = pairs(d.missing);
		var errs = validateRel(S, R, where);
		var props = relProps(S, R);
		errs = errs.concat(checkExpect(d.expect, props, where));
		var opt = { hl: toSet(list(d.hl)), bad: toSet(list(d.bad)) };
		var mark = toSet(list(d.mark));

		var W = +(d.w || 300), H = +(d.h || 260), n = S.length;
		var cx = W / 2, cy = H / 2 + 8, rad = Math.min(W, H) / 2 - 68;
		var pos = {};
		if (d.pos) {
			d.pos.split(';').forEach(function (s, i) { var c = s.split(',').map(Number); pos[S[i]] = { x: c[0], y: c[1] }; });
		} else if (d.layout === 'line') {
			S.forEach(function (s, i) { pos[s] = { x: 50 + i * (W - 100) / Math.max(1, n - 1), y: H / 2 + 20 }; });
		} else {
			var start = n === 4 ? -3 * Math.PI / 4 : -Math.PI / 2;
			S.forEach(function (s, i) {
				var t = start + (2 * Math.PI * i) / n;
				pos[s] = { x: cx + rad * Math.cos(t), y: cy + rad * Math.sin(t) };
			});
		}
		var rOf = function (s) { return Math.max(22, s.length * 5.6 + 10); };
		var has = toSet(R.map(key).concat(MISS.map(key)));

		var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, 'class': 'dg dg-rel', role: 'img' });
		if (d.name) txt(svg, 12, 24, d.name, 'dg-relname');
		var edges = el('g', {}, svg), nodes = el('g', {}, svg), marks = el('g', {}, svg);

		function unit(dx, dy) { var l = Math.hypot(dx, dy) || 1; return { x: dx / l, y: dy / l }; }
		function outward(s) {
			if (d.layout === 'line' || n === 1) return { x: 0, y: -1 };
			if (d.loops) { var t = d.loops.split(';')[S.indexOf(s)]; if (t) return unit(Math.cos(t * Math.PI / 180), Math.sin(t * Math.PI / 180)); }
			return unit(pos[s].x - cx, pos[s].y - cy);
		}
		function drawEdge(p, cls, dashed) {
			var a = pos[p[0]], b = pos[p[1]], g = el('g', { 'class': 'dg-edge ' + cls }, edges), path, mid;
			if (p[0] === p[1]) {
				var u = outward(p[0]), r = rOf(p[0]), ang = Math.atan2(u.y, u.x), sp = 0.36, L = r + 66;
				var P = function (rr, t) { return (a.x + rr * Math.cos(t)).toFixed(1) + ',' + (a.y + rr * Math.sin(t)).toFixed(1); };
				path = 'M' + P(r + 1, ang - sp) + ' C' + P(L, ang - 0.62) + ' ' + P(L, ang + 0.62) + ' ' + P(r + 3, ang + sp);
				mid = { x: a.x + (r + 48) * Math.cos(ang), y: a.y + (r + 48) * Math.sin(ang) };
			} else {
				var both = has[p[1] + '>' + p[0]];
				var dir = unit(b.x - a.x, b.y - a.y), nrm = { x: -dir.y, y: dir.x };
				var off = both ? 22 : (+(d['bend' + p[0] + p[1]] || 0));
				var q = { x: (a.x + b.x) / 2 + nrm.x * off, y: (a.y + b.y) / 2 + nrm.y * off };
				var ua = unit(q.x - a.x, q.y - a.y), ub = unit(q.x - b.x, q.y - b.y);
				var s0 = { x: a.x + ua.x * (rOf(p[0]) + 2), y: a.y + ua.y * (rOf(p[0]) + 2) };
				var s1 = { x: b.x + ub.x * (rOf(p[1]) + 3), y: b.y + ub.y * (rOf(p[1]) + 3) };
				path = 'M' + s0.x.toFixed(1) + ',' + s0.y.toFixed(1) + ' Q' + q.x.toFixed(1) + ',' + q.y.toFixed(1) + ' ' + s1.x.toFixed(1) + ',' + s1.y.toFixed(1);
				mid = { x: 0.25 * s0.x + 0.5 * q.x + 0.25 * s1.x, y: 0.25 * s0.y + 0.5 * q.y + 0.25 * s1.y };
			}
			el('path', { d: path, 'marker-end': marker(cls) }, g);
			if (cls === 'bad' || cls === 'miss') crossAt(g, mid.x, mid.y);
			if (cls === 'miss') {
				var away = unit(mid.x - cx, mid.y - cy);
				var t = txt(g, mid.x + away.x * 30, mid.y + away.y * 30 + 5, 'falta', 'dg-miss');
				t.setAttribute('text-anchor', 'middle');
			}
			return g;
		}
		R.forEach(function (p) { drawEdge(p, edgeClass(key(p), opt)); });
		MISS.forEach(function (p) {
			var g = drawEdge(p, 'miss', true);
			if (d.missingFrag !== undefined) g.classList.add('fragment');
		});

		S.forEach(function (s) {
			var r = rOf(s), g = el('g', { 'class': 'dg-node' + (mark[s] ? ' mark' : '') }, nodes);
			el('circle', { cx: pos[s].x, cy: pos[s].y, r: r }, g);
			txt(g, pos[s].x, pos[s].y + 1, s, 'dg-lbl');
			if (mark[s]) {
				el('circle', { cx: pos[s].x, cy: pos[s].y, r: r + 7, 'class': 'dg-ring' }, marks);
				crossAt(marks, pos[s].x + r + 2, pos[s].y + r);
			}
		});

		svg.setAttribute('aria-label', (d.label ? d.label + '. ' : '') + 'Relación sobre el conjunto {' + S.join(', ') + '} con los pares ' +
			(R.length ? R.map(function (p) { return '(' + p[0] + ', ' + p[1] + ')'; }).join(', ') : '(ninguno)') +
			(MISS.length ? '. Falta el par ' + MISS.map(function (p) { return '(' + p[0] + ', ' + p[1] + ')'; }).join(', ') : '') + '.');
		host.appendChild(svg);
		if (d.badges) badgesRow(host, props, d.badges, d.badgesFrag !== undefined);
		if (errs.length) flagError(host, errs);
	}

	function renderAll(root) {
		ensureMarkers();
		(root || document).querySelectorAll('.mapdiag').forEach(function (h, i) { drawMap(h, i + 1); });
		(root || document).querySelectorAll('.reldiag').forEach(function (h, i) { drawRel(h, i + 1); });
	}
	global.Diagramas = { renderAll: renderAll };
})(typeof window !== 'undefined' ? window : globalThis);
