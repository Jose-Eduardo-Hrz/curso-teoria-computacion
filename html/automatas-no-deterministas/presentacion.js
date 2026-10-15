/* =====================================================================
   AUTÓMATAS NO DETERMINISTAS · Inicialización de reveal.js e interacciones
   Todo sale de afn.js (window.AFN): diagramas, tablas, árboles de caminos,
   simuladores por conjuntos, clasificación y detectives usan la función de
   transición real (con ε-clausura).
   - .route data-on · [data-diagram] · [data-table] (+data-clausura, data-singleton)
   - [data-arbol] árbol de caminos · .sim[data-afn] simulador por conjuntos
   - [data-clasif] clasificación AFD/AFN/AFN-ε · #det detectives
   - Fragmentos con data-hl: resaltan piezas del diagrama de la diapositiva.
   - ?verificar: informe de afirmaciones, desbordes e interacciones.
   - ?mostrar: todos los fragmentos visibles (revisión / capturas).
   ===================================================================== */
(function () {
	'use strict';
	var A = window.AFN, AUT = A.AUTOMATAS;
	var VERIFY = /[?&]verificar\b/.test(location.search);
	if (/[?&]mostrar\b/.test(location.search)) document.documentElement.classList.add('mostrar-todo');
	var BLOQUES = ['¿Por qué?', 'Leer un AFN', 'Matemática', 'Simular', 'AFD vs AFN', 'Transiciones ε', 'Ejercicios'];
	function $(id) { return document.getElementById(id); }
	function onClick(el, fn) { if (el) el.addEventListener('click', function () { fn(el); el.blur(); }); } // blur: el teclado vuelve a reveal
	var ROM = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

	/* ---------- Cinta de bloques ---------- */
	document.querySelectorAll('.route').forEach(function (r) {
		var on = (r.dataset.on || '').split(',').map(Number);
		r.setAttribute('aria-label', 'Bloque: ' + on.filter(Boolean).map(function (i) { return BLOQUES[i - 1]; }).join(', '));
		BLOQUES.forEach(function (s, i) {
			var span = document.createElement('span');
			span.textContent = ROM[i] + ' ' + s;
			if (on.indexOf(i + 1) >= 0) span.className = 'on';
			r.appendChild(span);
		});
	});

	/* ---------- Diagramas y tablas ---------- */
	document.querySelectorAll('[data-diagram]').forEach(function (el) {
		el.innerHTML = A.diagrama(AUT[el.dataset.diagram], { escala: parseFloat(el.dataset.escala || '1') });
		(el.dataset.marca || '').split(';').filter(Boolean).forEach(function (m) {
			var p = m.split(':'), g = el.querySelector('.state[data-s="' + p[0] + '"]');
			if (g) g.classList.add(p[1]);
		});
	});
	document.querySelectorAll('[data-table]').forEach(function (el) {
		el.innerHTML = A.tabla(AUT[el.dataset.table], { clausura: el.hasAttribute('data-clausura'), singleton: el.hasAttribute('data-singleton') });
	});

	/* ---------- Árbol de caminos ---------- */
	function sub(id) { return id[0] + '<tspan dy="5" font-size="11">' + id.slice(1) + '</tspan>'; }
	function dibujarArbol(def, w) {
		var t = A.arbol(def, w), COL = 110, FIL = 52, R0 = 17, hojas = 0;
		(function medir(n) {
			if (!n.hijos.length) { n._y = hojas++ * FIL; return; }
			n.hijos.forEach(medir);
			n._y = n.hijos.reduce(function (s, h) { return s + h._y; }, 0) / n.hijos.length;
		})(t);
		var W = w.length * COL + 2 * R0 + 190, H = Math.max(1, hojas - 1) * FIL + 2 * R0 + 34, h = '';
		for (var i = 0; i < w.length; i++) h += '<text class="col" x="' + (i * COL + COL / 2) + '" y="' + (-R0 - 12) + '">lee ' + w[i] + '</text>';
		(function pintar(n) {
			var x = n.i * COL;
			n.hijos.forEach(function (c) {
				var cx = c.i * COL;
				h += '<path class="e" d="M' + (x + R0) + ' ' + n._y + ' L' + (cx - R0) + ' ' + c._y + '"/>';
				pintar(c);
			});
			var cls = n.fin ? (n.acepta ? ' acc' : ' rej') : '';
			h += '<g class="nd' + cls + '"><circle cx="' + x + '" cy="' + n._y + '" r="' + R0 + '"/><text x="' + x + '" y="' + n._y + '">' + sub(n.q) + '</text></g>';
			if (n.muere) h += '<text class="x" x="' + (x + R0 + 8) + '" y="' + (n._y + 5) + '">✗ muere: no hay flecha con ' + n.muere + '</text>';
			if (n.fin) h += '<text class="' + (n.acepta ? 'ok' : 'x') + '" x="' + (x + R0 + 8) + '" y="' + (n._y + 5) + '">' + (n.acepta ? '✓ termina en final' : '✗ no es final') + '</text>';
		})(t);
		var c = A.contarCaminos(t);
		return '<svg class="arbol" viewBox="' + (-R0 - 4) + ' ' + (-R0 - 30) + ' ' + W + ' ' + H + '" width="' + W + '" role="img" aria-label="Árbol de caminos de la cadena ' + A.show(w) + ': ' + c.total + ' caminos, ' + c.aceptan + ' terminan en un estado final y ' + c.mueren + ' mueren">' + h + '</svg>';
	}
	document.querySelectorAll('[data-arbol]').forEach(function (el) { el.innerHTML = dibujarArbol(AUT[el.dataset.arbol], el.dataset.w || ''); });

	/* ---------- Conjuntos en HTML ---------- */
	function conj(def, S, extra) { return '<span class="conj' + (S.length ? '' : ' vacio') + (extra || '') + '">' + A.conjHTML(S) + '</span>'; }
	function setsHTML(def, sim, hasta) {
		var h = '';
		for (var i = 0; i <= hasta; i++) {
			if (i > 0) h += '<span class="ar"><b>' + sim.w[i - 1] + '</b>⟶</span>';
			var fin = i === hasta && i === sim.w.length ? (sim.r.acepta ? ' fin-ok' : ' fin-no') : '';
			h += conj(def, sim.r.conjuntos[i], fin);
		}
		return h;
	}

	/* ---------- Simulador por conjuntos ---------- */
	var sims = [];
	function Sim(el) {
		var s = this, n = sims.length;
		s.el = el; s.id = el.dataset.afn; s.w = el.dataset.w || ''; s.k = 0;
		s.parte = function (c) { return el.querySelector('.' + c); };
		var ctrl = s.parte('sim-ctrl');
		ctrl.className += ' ctrl';
		ctrl.innerHTML = (el.hasAttribute('data-edit') ? '<label class="sr" for="sim-in-' + n + '">Cadena</label><input id="sim-in-' + n + '" type="text" autocomplete="off" spellcheck="false" value="' + s.w + '" placeholder="ε">' : '') +
			'<button class="btn" data-a="reset"><i class="fa-solid fa-backward-fast"></i> Reiniciar</button>' +
			'<button class="btn" data-a="back"><i class="fa-solid fa-backward-step"></i> Atrás</button>' +
			'<button class="btn" data-a="step"><i class="fa-solid fa-forward-step"></i> Paso</button>' +
			'<button class="btn" data-a="all"><i class="fa-solid fa-forward-fast"></i> Toda la cadena</button>';
		ctrl.querySelectorAll('button').forEach(function (b) {
			onClick(b, function () {
				var L = s.w.length, a = b.dataset.a;
				s.k = a === 'reset' ? 0 : a === 'back' ? Math.max(0, s.k - 1) : a === 'step' ? Math.min(L, s.k + 1) : L;
				s.render();
			});
		});
		var inp = ctrl.querySelector('input');
		if (inp) inp.addEventListener('input', function () { s.w = inp.value.replace(/\s+/g, '').replace(/^ε$/, ''); s.k = 0; s.render(); });
		var eleg = s.parte('sim-elegir');
		if (eleg && el.dataset.select) {
			eleg.innerHTML = '<label for="sim-sel-' + n + '" class="hint">Autómata:</label><select id="sim-sel-' + n + '">' +
				el.dataset.select.split(',').map(function (id) { return '<option value="' + id + '">' + AUT[id].nombre + '</option>'; }).join('') + '</select>';
			eleg.querySelector('select').addEventListener('change', function (e) { s.id = e.target.value; s.k = 0; s.diag = null; s.render(); });
		}
		var ew = s.parte('sim-elegir-w');
		if (ew && el.dataset.ws) {
			ew.innerHTML = '<span class="hint">Cadena:</span>' + A.lista(el.dataset.ws).map(function (w) { return '<button class="btn" data-w="' + w + '">' + A.show(w) + '</button>'; }).join('');
			ew.querySelectorAll('button').forEach(function (b) { onClick(b, function () { s.w = b.dataset.w; s.k = 0; s.render(); }); });
		}
		s.render();
	}
	Sim.prototype.render = function () {
		var s = this, def = AUT[s.id], L = s.w.length;
		var d = s.parte('sim-diag');
		if (s.diag !== s.id) { d.innerHTML = A.diagrama(def); s.diag = s.id; }
		var svg = d.querySelector('svg');
		svg.querySelectorAll('.on, .ok, .bad').forEach(function (e) { e.classList.remove('on', 'ok', 'bad'); });
		var t = s.parte('sim-tabla');
		if (t) t.innerHTML = A.tabla(def);
		var cinta = s.parte('sim-cinta'), est = s.parte('sim-estado'), sets = s.parte('sim-sets'), ecl = s.parte('sim-ecl');
		cinta.className = 'sim-cinta cinta'; est.className = 'sim-estado estado-sim'; if (sets) sets.className = 'sim-sets sets';
		s.parte('sim-elegir-w') && s.parte('sim-elegir-w').querySelectorAll('button').forEach(function (b) { b.classList.toggle('sel', b.dataset.w === s.w); });
		var malo = s.w.split('').filter(function (c) { return def.sigma.indexOf(c) < 0; })[0];
		if (malo !== undefined) {
			cinta.innerHTML = s.w.split('').map(function (c) { return '<span class="c">' + c + '</span>'; }).join('');
			est.innerHTML = '<span class="res nop"><i class="fa-solid fa-triangle-exclamation"></i> El símbolo «' + malo + '» no está en Σ = {' + def.sigma.join(', ') + '}</span>';
			if (sets) sets.innerHTML = ''; if (ecl) ecl.innerHTML = '';
			s.botones(true);
			return;
		}
		var r = A.simular(def, s.w), S = r.conjuntos[s.k];
		s.r = r;
		cinta.innerHTML = L ? s.w.split('').map(function (c, i) { return '<span class="c' + (i < s.k ? ' leido' : '') + (i === s.k ? ' actual' : '') + '">' + c + '</span>'; }).join('') +
			(s.k === L ? '<span class="c fin-c actual">fin</span>' : '') : '<span class="c vacia actual">ε</span>';
		S.forEach(function (q) { svg.querySelector('.state[data-s="' + q + '"]').classList.add('on'); });
		if (s.k > 0) {
			r.usadas[s.k - 1].forEach(function (u) {
				var key = u[0] + '>' + u[2];
				svg.querySelectorAll('[data-k="' + key + '"], [class~="e-' + key + '"]').forEach(function (e) { e.classList.add('on'); });
			});
			if (t) {
				var prev = r.conjuntos[s.k - 1], ids = def.states.map(function (x) { return x.id; }), col = def.sigma.indexOf(s.w[s.k - 1]);
				prev.forEach(function (p) { t.querySelectorAll('tbody tr')[ids.indexOf(p)].children[col + 1].classList.add('on'); });
			}
		}
		if (ecl) {
			var antes = s.k === 0 ? [def.start] : A.mover(def, r.conjuntos[s.k - 1], s.w[s.k - 1]), extra = S.filter(function (q) { return antes.indexOf(q) < 0; });
			ecl.innerHTML = extra.length ? '<i class="fa-solid fa-circle-nodes"></i> La ε-clausura añadió ' + extra.map(A.sub2).join(', ') + ' sin leer ningún símbolo.' : '';
		}
		if (s.k === L) {
			var fin = r.finales;
			S.forEach(function (q) { svg.querySelector('.state[data-s="' + q + '"]').classList.add(def.finals.indexOf(q) >= 0 ? 'ok' : 'bad'); });
			est.innerHTML = (L ? 'Se leyó toda la cadena. ' : 'Cadena vacía: no se lee ningún símbolo. ') + 'Activos ' + conj(def, S) + ' ∩ F = ' + conj(def, fin) +
				(r.acepta ? ' &nbsp;<span class="res si"><i class="fa-solid fa-circle-check"></i> se acepta</span>' : ' &nbsp;<span class="res nop"><i class="fa-solid fa-circle-xmark"></i> se rechaza</span>');
		} else {
			est.innerHTML = 'Estados activos: ' + conj(def, S) + ' · siguiente símbolo: <b class="mono">' + s.w[s.k] + '</b> · leídos ' + s.k + ' de ' + L +
				(S.length ? '' : ' · <b class="no-t">todos los caminos murieron</b>');
		}
		if (sets) sets.innerHTML = setsHTML(def, { w: s.w, r: r }, s.k);
		s.botones(false);
	};
	Sim.prototype.botones = function (bloq) {
		var s = this, L = s.w.length, b = function (a) { return s.parte('sim-ctrl').querySelector('[data-a="' + a + '"]'); };
		b('reset').disabled = bloq || s.k === 0; b('back').disabled = bloq || s.k === 0;
		b('step').disabled = bloq || s.k === L; b('all').disabled = bloq || s.k === L;
	};
	document.querySelectorAll('.sim[data-afn]').forEach(function (el) { sims.push(new Sim(el)); });

	/* ---------- Clasificación AFD / AFN / AFN-ε ---------- */
	function clasifRevelar(panel, mostrar) {
		var box = panel.querySelector('.razones'), btn = panel.querySelector('[data-revelar]');
		if (!mostrar) { box.innerHTML = ''; btn.textContent = '¿Qué es?'; btn.setAttribute('aria-expanded', 'false'); return; }
		var c = A.clasificar(AUT[panel.dataset.clasif]);
		box.innerHTML = '<div class="center"><span class="tag ' + (c.tipo === 'AFD' ? 'ac' : 'am') + '" style="font-size:16px">' + c.tipo + '</span></div>' +
			(c.razones.length ? '<ul>' + c.razones.slice(0, 3).map(function (x) { return '<li>' + x + '</li>'; }).join('') + (c.razones.length > 3 ? '<li>… y ' + (c.razones.length - 3) + ' más</li>' : '') + '</ul>'
				: '<div class="center">una flecha por estado y símbolo, sin ε</div>');
		btn.textContent = 'Ocultar'; btn.setAttribute('aria-expanded', 'true');
	}
	document.querySelectorAll('[data-clasif]').forEach(function (p) {
		var b = p.querySelector('[data-revelar]');
		b.setAttribute('aria-expanded', 'false');
		onClick(b, function () { clasifRevelar(p, b.getAttribute('aria-expanded') !== 'true'); });
	});

	/* ---------- Detectives ---------- */
	function detRevelar(b, mostrar) {
		var def = AUT[b.parentNode.dataset.det], w = b.dataset.w;
		b.classList.remove('q', 'si', 'nop');
		if (!mostrar) { b.classList.add('q'); b.removeAttribute('aria-label'); return; }
		var r = A.simular(def, w);
		b.classList.add(r.acepta ? 'si' : 'nop');
		b.setAttribute('aria-label', A.show(w) + (r.acepta ? ' se acepta' : ' se rechaza'));
		$('det-sets').innerHTML = '<b class="mono">' + A.show(w) + '</b>: ' + setsHTML(def, { w: w, r: r }, w.length);
	}
	document.querySelectorAll('[data-det] button').forEach(function (b) { onClick(b, function () { detRevelar(b, true); }); });
	onClick($('det-todo'), function () { document.querySelectorAll('[data-det] button').forEach(function (b) { detRevelar(b, true); }); });
	function detOcultar() { document.querySelectorAll('[data-det] button').forEach(function (b) { detRevelar(b, false); }); if ($('det-sets')) $('det-sets').textContent = 'Pulsa una tarjeta para ver sus conjuntos de estados.'; }
	onClick($('det-ocultar'), detOcultar);

	/* ---------- Resaltado de piezas con fragmentos (data-hl) ---------- */
	var HL = ['multi', 'faltan'];
	function aplicarHL(sec) {
		if (!sec) return;
		var vis = sec.querySelectorAll('.fragment.visible[data-hl]'), cual = vis.length ? vis[vis.length - 1].dataset.hl : '';
		sec.querySelectorAll('[data-diagram]').forEach(function (d) {
			HL.forEach(function (h) { d.classList.remove('hl-' + h); });
			if (cual) d.classList.add('hl-' + cual);
		});
	}

	/* ---------- Botones «Ver respuesta» ---------- */
	function setAnswer(btn, open) {
		var ans = $(btn.getAttribute('aria-controls'));
		ans.hidden = !open;
		ans.classList.toggle('show', open);
		btn.setAttribute('aria-expanded', String(open));
		btn.innerHTML = open ? '<i class="fa-solid fa-eye-slash"></i> Ocultar solución' : '<i class="fa-solid fa-eye"></i> Ver una solución';
	}
	document.querySelectorAll('.ans-btn').forEach(function (btn) { onClick(btn, function () { setAnswer(btn, btn.getAttribute('aria-expanded') !== 'true'); }); });

	if (VERIFY) document.querySelectorAll('[data-transition]').forEach(function (s) { s.removeAttribute('data-transition'); });

	Reveal.initialize({
		hash: true, width: 1280, height: 720, margin: 0.04, center: false,
		controls: true, progress: true, slideNumber: 'c/t', keyboard: true,
		transition: VERIFY ? 'none' : 'slide', transitionSpeed: 'fast', backgroundTransition: 'fade',
		viewDistance: VERIFY ? 100 : 3,
		katex: {
			version: '0.16.11',
			local: 'lib/katex', // KaTeX servido desde esta carpeta: no depende de cdn.jsdelivr.net
			delimiters: [
				{ left: '\\[', right: '\\]', display: true },
				{ left: '\\(', right: '\\)', display: false }
			],
			ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']
		},
		plugins: [RevealMath.KaTeX, RevealNotes]
	});
	Reveal.on('fragmentshown', function () { aplicarHL(Reveal.getCurrentSlide()); });
	Reveal.on('fragmenthidden', function () { aplicarHL(Reveal.getCurrentSlide()); });
	Reveal.on('slidechanged', function (e) {
		aplicarHL(e.currentSlide);
		if (!e.previousSlide) return;
		e.previousSlide.querySelectorAll('.ans-btn[aria-expanded="true"]').forEach(function (b) { setAnswer(b, false); });
		e.previousSlide.querySelectorAll('[data-clasif]').forEach(function (p) { clasifRevelar(p, false); });
		if (e.previousSlide.id === 'detectives') detOcultar();
		sims.forEach(function (s) { if (e.previousSlide.contains(s.el)) { s.k = 0; s.render(); } });
	});

	if (!VERIFY) return;

	/* ---------- Modo verificación ---------- */
	var CLAVES = ['claim', 'acc', 'rej', 'w', 'sets', 'delta', 'ext', 'eclose', 'caminos', 'tipo', 're', 'equiv', 'nsub', 'q', 'q0', 'f', 'subconj'];
	function attrs(el) { var a = {}; CLAVES.forEach(function (k) { if (el.hasAttribute('data-' + k)) a[k] = el.getAttribute('data-' + k); }); return a; }
	function interactionTests() {
		var out = [], ok = 0;
		function check(c, m) { if (c) ok++; else out.push('INTERACCIÓN: ' + m); }
		var activos = function (s) { return Array.prototype.map.call(s.el.querySelectorAll('.state.on'), function (g) { return g.dataset.s; }).join(','); };
		// 1. Simulador 0101: conjuntos y flechas resaltadas
		var s = sims[0], st = function (x, a) { x.parte('sim-ctrl').querySelector('[data-a="' + a + '"]').click(); };
		check(activos(s) === 'q0', 'el simulador no empieza en {q0}');
		st(s, 'step');
		check(activos(s) === 'q0,q1' && s.el.querySelectorAll('.ed.on').length === 2, 'tras leer 0 deberían estar activos q0 y q1 con 2 flechas resaltadas');
		st(s, 'all');
		check(/se acepta/.test(s.parte('sim-estado').textContent) && s.el.querySelector('.state.ok'), '0101 debería aceptarse');
		st(s, 'back');
		check(s.k === 3 && activos(s) === 'q0,q1', '«Atrás» no regresa a {q0,q1}');
		st(s, 'reset');
		// 2. Simulador 0110: rechazo y camino que muere
		var s2 = sims[1]; st(s2, 'all');
		check(/se rechaza/.test(s2.parte('sim-estado').textContent), '0110 debería rechazarse');
		st(s2, 'reset');
		// 3. Laboratorio
		var lab = sims.filter(function (x) { return x.el.closest('#laboratorio'); })[0], inp = lab.parte('sim-ctrl').querySelector('input'), sel = lab.parte('sim-elegir').querySelector('select');
		sel.value = 'penultimo1'; sel.dispatchEvent(new Event('change'));
		inp.value = '0110'; inp.dispatchEvent(new Event('input')); st(lab, 'all');
		check(/se acepta/.test(lab.parte('sim-estado').textContent), 'laboratorio: 0110 debería aceptarse con «penúltimo es 1»');
		check(lab.parte('sim-tabla').querySelectorAll('td.on').length === A.simular(AUT.penultimo1, '011').conjuntos[3].length, 'laboratorio: deberían resaltarse las casillas de cada estado activo');
		sel.value = 'solo'; sel.dispatchEvent(new Event('change')); inp.value = ''; inp.dispatchEvent(new Event('input')); st(lab, 'all');
		check(/se acepta/.test(lab.parte('sim-estado').textContent), 'laboratorio: ε debería aceptarse con «solo ceros o solo unos»');
		inp.value = '102'; inp.dispatchEvent(new Event('input'));
		check(/no está en Σ/.test(lab.parte('sim-estado').textContent), 'laboratorio: «2» debería marcarse como símbolo inválido');
		sel.value = 'termina01'; sel.dispatchEvent(new Event('change')); inp.value = '1001'; inp.dispatchEvent(new Event('input'));
		// 4. Simulador con ε: la clausura inicial y la elección de cadenas
		var se = sims.filter(function (x) { return x.el.closest('#sim-eps'); })[0];
		check(activos(se) === 'q0,q1', 'AFN-ε: al inicio deberían estar activos q0 y q1 (ε-clausura)');
		se.parte('sim-elegir-w').querySelector('[data-w="010"]').click(); st(se, 'all');
		check(/se rechaza/.test(se.parte('sim-estado').textContent) && /todos|∅/.test(se.parte('sim-estado').textContent + se.parte('sim-sets').textContent), 'AFN-ε: 010 debería rechazarse con conjunto vacío');
		se.parte('sim-elegir-w').querySelector('[data-w="0011"]').click();
		// 5. Simulación por conjuntos = δ* para todas las cadenas cortas de todos los autómatas
		Object.keys(AUT).forEach(function (id) {
			var d = AUT[id], bad = 0;
			['', '0', '1', '00', '01', '10', '11', '010', '101', '0110', '1001', '01101', '110010'].forEach(function (w) {
				if (A.texto(A.simular(d, w).conjuntos[w.length]) !== A.texto(A.deltaExt(d, d.start, w))) bad++;
			});
			check(bad === 0, id + ': simulación y δ* difieren en ' + bad + ' cadenas');
		});
		// 6. Clasificación y detectives
		document.querySelectorAll('[data-clasif]').forEach(function (p) {
			p.querySelector('[data-revelar]').click();
			check(p.querySelector('.razones .tag').textContent === p.dataset.tipo, 'clasificación de ' + p.dataset.clasif + ' incorrecta');
			p.querySelector('[data-revelar]').click();
			check(p.querySelector('.razones').textContent === '', 'clasificación: «Ocultar» no limpia la respuesta');
		});
		var bs = document.querySelectorAll('[data-det] button'), si = 0;
		bs.forEach(function (b) { b.click(); if (b.classList.contains('si')) si++; });
		check(si > 0 && si < bs.length, 'detectives: debería haber cadenas aceptadas y rechazadas');
		detOcultar();
		// 7. Resaltado de piezas y navegación
		var m = $('multiples'), mi = Reveal.getIndices(m);
		Reveal.slide(mi.h, mi.v, -1); Reveal.next();
		check(m.querySelector('[data-diagram]').classList.contains('hl-multi'), 'transiciones múltiples: el primer clic debería resaltar las dos flechas con 0');
		Reveal.slide(0, 0); check(Reveal.isFirstSlide(), 'no se vuelve a la portada');
		var last = Reveal.getSlides().slice(-1)[0], li = Reveal.getIndices(last);
		Reveal.slide(li.h, li.v); check(Reveal.isLastSlide(), 'no se llega a la última diapositiva');
		Reveal.slide(0, 0);
		return { out: out, ok: ok };
	}
	function report() {
		var tests = interactionTests(), out = tests.out.slice(), slides = Reveal.getSlides(), n = 0;
		document.querySelectorAll('[data-claim]').forEach(function (el) {
			n++;
			out = out.concat(A.comprobar(attrs(el), 'diapositiva ' + (slides.indexOf(el.closest('section')) + 1), window.RegexFormal).map(function (m) { return 'AFIRMACIÓN: ' + m; }));
		});
		document.querySelectorAll('.ans-btn').forEach(function (b) { setAnswer(b, true); });
		document.querySelectorAll('[data-clasif]').forEach(function (p) { clasifRevelar(p, true); });
		document.querySelectorAll('[data-det] button').forEach(function (b) { detRevelar(b, true); });
		slides.forEach(function (s, i) {
			s.style.display = 'block';
			var id = (i + 1) + ' «' + ((s.querySelector('h1,h2') || {}).textContent || '').trim().slice(0, 50) + '»';
			if (s.scrollHeight > 722) out.push('DESBORDE VERTICAL ' + id + ': ' + s.scrollHeight + 'px');
			if (s.scrollWidth > 1282) out.push('DESBORDE HORIZONTAL ' + id + ': ' + s.scrollWidth + 'px');
			var box = s.getBoundingClientRect(), sc = box.height / 720;
			s.querySelectorAll('.panel, .def, .item, .pieza, .note, .calc .ln, .ans, .q, .sim > *, svg.afd, svg.arbol, .quote, table, .comp, .cinta, .strs, .sets, .clasif, .bubble').forEach(function (e) {
				var r = e.getBoundingClientRect();
				if (!r.width) return;
				if (r.bottom - box.top > (720 - 6) * sc) out.push('FUERA DEL LIENZO ' + id + ': <' + e.tagName.toLowerCase() + ' class="' + (e.getAttribute('class') || '') + '"> baja hasta ' + Math.round((r.bottom - box.top) / sc) + 'px');
				if (r.right - box.left > (1280 - 4) * sc) out.push('FUERA DEL LIENZO (derecha) ' + id + ': <' + e.tagName.toLowerCase() + ' class="' + (e.getAttribute('class') || '') + '"> llega a ' + Math.round((r.right - box.left) / sc) + 'px');
			});
			s.querySelectorAll('.item, .pieza, .def .body, .calc .ln, .note, .estado-sim, .str, .comp > *, .razones, .figcap').forEach(function (e) {
				if (e.scrollWidth > e.clientWidth + 2) out.push('TEXTO CORTADO ' + id + ': ' + e.className + ' «' + e.textContent.trim().slice(0, 40) + '» (' + e.scrollWidth + ' > ' + e.clientWidth + ')');
			});
		});
		document.querySelectorAll('.katex-error').forEach(function (k) { out.push('KATEX: ' + k.getAttribute('title')); });
		slides.forEach(function (s, i) {
			var w = document.createTreeWalker(s, NodeFilter.SHOW_TEXT);
			while (w.nextNode()) {
				var p = w.currentNode.parentElement;
				if (p.closest('.notes,script,.katex')) continue;
				if (/\\\(|\\\[|\\[a-zA-Z]+/.test(w.currentNode.nodeValue)) out.push('MATEMÁTICA SIN RENDERIZAR en diapositiva ' + (i + 1) + ': ' + w.currentNode.nodeValue.trim().slice(0, 60));
			}
		});
		var res = 'VERIFICACIÓN · ' + slides.length + ' diapositivas · ' + document.querySelectorAll('.katex').length + ' fórmulas · ' + document.querySelectorAll('svg.afd').length +
			' diagramas · ' + n + ' afirmaciones comprobadas · ' + tests.ok + ' pruebas de interacción superadas\n' + (out.length ? out.join('\n') : 'SIN PROBLEMAS');
		var pre = document.createElement('pre');
		pre.id = 'verif-report'; pre.textContent = res;
		document.body.appendChild(pre);
		document.title = out.length ? 'VERIF-FALLA' : 'VERIF-OK';
		console.log(res);
	}
	Reveal.on('ready', function () {
		var t0 = Date.now();
		(function wait() {
			if (document.querySelector('.katex') || Date.now() - t0 > 15000) setTimeout(report, 500);
			else setTimeout(wait, 200);
		})();
	});
})();
