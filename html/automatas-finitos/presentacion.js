/* =====================================================================
   AUTÓMATAS FINITOS · Inicialización de reveal.js e interacciones
   Todo sale de afd.js (window.AFD): diagramas, tablas, pruebas,
   simuladores y detectives usan la función de transición real.
   - Cinta de bloques (.route data-on="1").
   - [data-diagram] diagrama · [data-table] tabla · [data-pruebas] pruebas.
   - .sim[data-afd] simulador paso a paso (data-w, data-edit, data-select).
   - Fragmentos con data-hl: resaltan piezas del diagrama de la diapositiva.
   - Detectives (#det) y botones «Ver respuesta».
   - ?verificar: informe de afirmaciones, validación, desbordes e interacciones.
   - ?mostrar: todos los fragmentos visibles (revisión / capturas).
   ===================================================================== */
(function () {
	'use strict';
	var A = window.AFD, AUT = A.AUTOMATAS;
	var VERIFY = /[?&]verificar\b/.test(location.search);
	if (/[?&]mostrar\b/.test(location.search)) document.documentElement.classList.add('mostrar-todo');
	var BLOQUES = ['¿Qué es?', 'Leer diagramas', 'Matemática', 'Simular', 'Construir', 'Actividades'];
	function $(id) { return document.getElementById(id); }
	function onClick(el, fn) { if (el) el.addEventListener('click', function () { fn(el); el.blur(); }); } // blur: el teclado vuelve a reveal
	function q(id) { return A.sub2(id); }

	/* ---------- Cinta de bloques ---------- */
	document.querySelectorAll('.route').forEach(function (r) {
		var on = (r.dataset.on || '').split(',').map(Number);
		r.setAttribute('aria-label', 'Bloque: ' + on.filter(Boolean).map(function (i) { return BLOQUES[i - 1]; }).join(', '));
		BLOQUES.forEach(function (s, i) {
			var span = document.createElement('span');
			span.textContent = ['I', 'II', 'III', 'IV', 'V', 'VI'][i] + ' ' + s;
			if (on.indexOf(i + 1) >= 0) span.className = 'on';
			r.appendChild(span);
		});
	});

	/* ---------- Diagramas, tablas y pruebas ---------- */
	function pintarDiagrama(el, id) {
		el.innerHTML = A.diagrama(AUT[id], { escala: parseFloat(el.dataset.escala || '1') });
		(el.dataset.marca || '').split(';').filter(Boolean).forEach(function (m) {
			var p = m.split(':'), g = el.querySelector('.state[data-s="' + p[0] + '"]');
			if (g) g.classList.add(p[1]);
		});
	}
	document.querySelectorAll('[data-diagram]').forEach(function (el) { pintarDiagrama(el, el.dataset.diagram); });
	document.querySelectorAll('[data-table]').forEach(function (el) { el.innerHTML = A.tabla(AUT[el.dataset.table]); });

	function caminoHTML(def, r, hasta) {
		var n = hasta == null ? r.pasos.length : hasta;
		var h = '<span class="qs' + (n === 0 && def.finals.indexOf(r.camino[0]) >= 0 ? ' fin' : '') + '">' + q(r.camino[0]) + '</span>';
		for (var i = 0; i < n; i++) {
			var dst = r.pasos[i].a, fin = i === n - 1 && def.finals.indexOf(dst) >= 0;
			h += '<span class="ar"><b>' + r.pasos[i].simbolo + '</b>⟶</span><span class="qs' + (fin ? ' fin' : '') + '">' + q(dst) + '</span>';
		}
		return h;
	}
	document.querySelectorAll('[data-pruebas]').forEach(function (el) {
		var def = AUT[el.dataset.pruebas];
		el.innerHTML = A.lista(el.dataset.ws).map(function (w) {
			var r = A.recorrer(def, w);
			return '<div class="prueba fragment fade-up"><span class="str' + (w ? '' : ' eps') + '">' + A.show(w) + '</span>' +
				'<span class="camino">' + caminoHTML(def, r) + '</span>' +
				'<span class="str ' + (r.acepta ? 'si">acepta' : 'nop">rechaza') + '</span></div>';
		}).join('');
	});

	/* ---------- Simulador paso a paso ---------- */
	var sims = [];
	function Sim(el) {
		var s = this;
		s.el = el; s.id = el.dataset.afd; s.w = el.dataset.w || ''; s.k = 0; s.error = '';
		s.parte = function (c) { return el.querySelector('.' + c); };
		var ctrl = s.parte('sim-ctrl');
		ctrl.className += ' ctrl';
		ctrl.innerHTML = (el.hasAttribute('data-edit') ? '<label class="sr" for="sim-in-' + sims.length + '">Cadena</label><input id="sim-in-' + sims.length + '" type="text" autocomplete="off" spellcheck="false" value="' + s.w + '" placeholder="ε">' : '') +
			'<button class="btn" data-a="reset"><i class="fa-solid fa-backward-fast"></i> Reiniciar</button>' +
			'<button class="btn" data-a="back"><i class="fa-solid fa-backward-step"></i> Atrás</button>' +
			'<button class="btn" data-a="step"><i class="fa-solid fa-forward-step"></i> Paso</button>' +
			'<button class="btn" data-a="all"><i class="fa-solid fa-forward-fast"></i> Toda la cadena</button>';
		ctrl.querySelectorAll('button').forEach(function (b) {
			onClick(b, function () {
				var n = s.w.length, a = b.dataset.a;
				s.k = a === 'reset' ? 0 : a === 'back' ? Math.max(0, s.k - 1) : a === 'step' ? Math.min(n, s.k + 1) : n;
				s.render();
			});
		});
		var inp = ctrl.querySelector('input');
		if (inp) inp.addEventListener('input', function () { s.w = inp.value.replace(/\s+/g, '').replace(/^ε$/, ''); s.k = 0; s.render(); });
		var eleg = s.parte('sim-elegir');
		if (eleg && el.dataset.select) {
			eleg.innerHTML = '<label for="sim-sel-' + sims.length + '" class="hint">Autómata:</label><select id="sim-sel-' + sims.length + '">' +
				el.dataset.select.split(',').map(function (id) { return '<option value="' + id + '">' + AUT[id].nombre + '</option>'; }).join('') + '</select>';
			eleg.querySelector('select').addEventListener('change', function (e) { s.id = e.target.value; s.k = 0; s.diag = null; s.render(); });
		}
		s.render();
	}
	Sim.prototype.render = function () {
		var s = this, def = AUT[s.id], n = s.w.length;
		var malos = s.w.split('').filter(function (c) { return def.sigma.indexOf(c) < 0; });
		s.error = malos.length ? 'El símbolo «' + malos[0] + '» no está en Σ = {' + def.sigma.join(', ') + '}' : '';
		var d = s.parte('sim-diag');
		if (s.diag !== s.id) { d.innerHTML = A.diagrama(def); s.diag = s.id; }
		var svg = d.querySelector('svg');
		svg.querySelectorAll('.on, .ok, .bad').forEach(function (e) { e.classList.remove('on', 'ok', 'bad'); });
		var t = s.parte('sim-tabla');
		if (t) t.innerHTML = A.tabla(def);
		var cinta = s.parte('sim-cinta'), est = s.parte('sim-estado'), cam = s.parte('sim-camino');
		cinta.className = 'sim-cinta cinta'; est.className = 'sim-estado estado-sim'; if (cam) cam.className = 'sim-camino camino';
		if (s.error) {
			cinta.innerHTML = s.w.split('').map(function (c) { return '<span class="c">' + c + '</span>'; }).join('');
			est.innerHTML = '<span class="res nop"><i class="fa-solid fa-triangle-exclamation"></i> ' + s.error + '</span>';
			if (cam) cam.innerHTML = '';
			s.botones(true);
			return;
		}
		var r = A.recorrer(def, s.w), actual = r.camino[s.k];
		cinta.innerHTML = n ? s.w.split('').map(function (c, i) { return '<span class="c' + (i < s.k ? ' leido' : '') + (i === s.k ? ' actual' : '') + '">' + c + '</span>'; }).join('') +
			(s.k === n ? '<span class="c fin-c actual">fin</span>' : '')
			: '<span class="c vacia actual">ε</span>';
		svg.querySelector('.state[data-s="' + actual + '"]').classList.add('on');
		if (s.k > 0) {
			var p = r.pasos[s.k - 1], key = p.de + '>' + p.a;
			svg.querySelectorAll('[data-k="' + key + '"], [class~="e-' + key + '"]').forEach(function (e) { e.classList.add('on'); });
			if (t) {
				var fila = def.states.map(function (x) { return x.id; }).indexOf(p.de), col = def.sigma.indexOf(p.simbolo);
				t.querySelectorAll('tbody tr')[fila].children[col + 1].classList.add('on');
			}
		}
		if (s.k === n) {
			svg.querySelector('.state[data-s="' + actual + '"]').classList.add(r.acepta ? 'ok' : 'bad');
			est.innerHTML = (n ? 'Se leyó toda la cadena. ' : 'La cadena vacía no tiene símbolos: no hay transiciones. ') + 'Termina en ' + q(actual) +
				(r.acepta ? ' ∈ F &nbsp;<span class="res si"><i class="fa-solid fa-circle-check"></i> se acepta</span>' : ' ∉ F &nbsp;<span class="res nop"><i class="fa-solid fa-circle-xmark"></i> se rechaza</span>');
		} else {
			est.innerHTML = 'Estado actual: <b>' + q(actual) + '</b> · siguiente símbolo: <b class="mono">' + s.w[s.k] + '</b> · leídos ' + s.k + ' de ' + n;
		}
		if (cam) cam.innerHTML = caminoHTML(def, r, s.k);
		s.botones(false);
	};
	Sim.prototype.botones = function (bloq) {
		var s = this, n = s.w.length, b = function (a) { return s.parte('sim-ctrl').querySelector('[data-a="' + a + '"]'); };
		b('reset').disabled = bloq || s.k === 0; b('back').disabled = bloq || s.k === 0;
		b('step').disabled = bloq || s.k === n; b('all').disabled = bloq || s.k === n;
	};
	document.querySelectorAll('.sim[data-afd]').forEach(function (el) { sims.push(new Sim(el)); });

	/* ---------- Resaltado de piezas con fragmentos (data-hl) ---------- */
	var HL = ['estados', 'alfabeto', 'transiciones', 'inicial', 'final', 'una'];
	function aplicarHL(sec) {
		if (!sec) return;
		var vis = sec.querySelectorAll('.fragment.visible[data-hl]'), cual = vis.length ? vis[vis.length - 1].dataset.hl : '';
		sec.querySelectorAll('[data-diagram]').forEach(function (d) {
			HL.forEach(function (h) { d.classList.remove('hl-' + h); });
			if (cual) d.classList.add('hl-' + cual);
		});
	}

	/* ---------- Detectives ---------- */
	function detRevelar(b, mostrar) {
		var def = AUT[b.parentNode.dataset.det], w = b.dataset.w;
		b.classList.remove('q', 'si', 'nop');
		if (!mostrar) { b.classList.add('q'); b.removeAttribute('aria-label'); return; }
		var r = A.recorrer(def, w);
		b.classList.add(r.acepta ? 'si' : 'nop');
		b.setAttribute('aria-label', A.show(w) + (r.acepta ? ' se acepta' : ' se rechaza'));
		$('det-camino').innerHTML = '<b class="mono">' + A.show(w) + '</b>: ' + caminoHTML(def, r) + (r.acepta ? ' · <span class="yes-t">acepta</span>' : ' · <span class="no-t">rechaza</span>');
	}
	document.querySelectorAll('[data-det] button').forEach(function (b) { onClick(b, function () { detRevelar(b, true); }); });
	onClick($('det-todo'), function () { document.querySelectorAll('[data-det] button').forEach(function (b) { detRevelar(b, true); }); });
	function detOcultar() { document.querySelectorAll('[data-det] button').forEach(function (b) { detRevelar(b, false); }); if ($('det-camino')) $('det-camino').textContent = 'Pulsa una tarjeta para ver su recorrido.'; }
	onClick($('det-ocultar'), detOcultar);

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
		if (e.previousSlide.id === 'detectives') detOcultar();
		sims.forEach(function (s) { if (e.previousSlide.contains(s.el)) { s.k = 0; s.render(); } });
	});

	if (!VERIFY) return;

	/* ---------- Modo verificación ---------- */
	var CLAVES = ['claim', 'acc', 'rej', 'w', 'path', 'ext', 'delta', 're', 'q', 'q0', 'f', 'errores'];
	function attrs(el) { var a = {}; CLAVES.forEach(function (k) { if (el.hasAttribute('data-' + k)) a[k] = el.getAttribute('data-' + k); }); return a; }
	function interactionTests() {
		var out = [], ok = 0;
		function check(c, m) { if (c) ok++; else out.push('INTERACCIÓN: ' + m); }
		// 1. Validación de todos los autómatas
		Object.keys(AUT).forEach(function (id) {
			var d = AUT[id]; if (d.ilustracion) return;
			var n = A.validar(d).length;
			check(n === (d.esperaErrores || 0), id + ': ' + n + ' errores de validación, se esperaban ' + (d.esperaErrores || 0));
		});
		// 2. Simulador de la diapositiva 8 (termina1, 101)
		var s = sims[0], st = function (a) { s.parte('sim-ctrl').querySelector('[data-a="' + a + '"]').click(); };
		check(s.k === 0 && s.el.querySelector('.state.on').dataset.s === 'q0', 'el simulador no empieza en q0');
		st('step');
		check(s.el.querySelector('.state.on').dataset.s === 'q1' && s.el.querySelector('.ed.on[data-k="q0>q1"]'), 'tras leer 1 debería estar en q1 con la flecha q0→q1 resaltada');
		st('step'); st('step');
		check(/se acepta/.test(s.parte('sim-estado').textContent) && s.el.querySelector('.state.ok'), '101 debería aceptarse al final');
		check(s.parte('sim-ctrl').querySelector('[data-a="step"]').disabled, '«Paso» debería deshabilitarse al final');
		st('back');
		check(s.k === 2 && s.el.querySelector('.state.on').dataset.s === 'q0', '«Atrás» no regresa un paso');
		st('reset');
		// 3. Laboratorio: cambio de autómata, cadena escrita, símbolo inválido y tabla resaltada
		var lab = sims.filter(function (x) { return x.el.closest('#laboratorio'); })[0], inp = lab.parte('sim-ctrl').querySelector('input'), sel = lab.parte('sim-elegir').querySelector('select');
		sel.value = 'par1'; sel.dispatchEvent(new Event('change'));
		inp.value = '101'; inp.dispatchEvent(new Event('input'));
		lab.parte('sim-ctrl').querySelector('[data-a="all"]').click();
		check(/se acepta/.test(lab.parte('sim-estado').textContent), 'laboratorio: 101 debería aceptarse con «par de unos»');
		check(lab.parte('sim-tabla').querySelectorAll('td.on').length === 1, 'laboratorio: la tabla debería resaltar una casilla');
		inp.value = '12'; inp.dispatchEvent(new Event('input'));
		check(/no está en Σ/.test(lab.parte('sim-estado').textContent), 'laboratorio: «2» debería rechazarse como símbolo inválido');
		inp.value = ''; inp.dispatchEvent(new Event('input'));
		lab.parte('sim-ctrl').querySelector('[data-a="all"]').click();
		check(/se acepta/.test(lab.parte('sim-estado').textContent), 'laboratorio: ε debería aceptarse con «par de unos»');
		sel.value = 'termina1'; sel.dispatchEvent(new Event('change')); inp.value = '0110'; inp.dispatchEvent(new Event('input'));
		// 4. Simuladores = definición para todas las cadenas cortas
		['termina1', 'alMenosUn1', 'par1', 'empieza1', 'contiene11', 'termina0'].forEach(function (id) {
			var d = AUT[id], bad = 0;
			A.lenguaje({ sigma: d.sigma, start: 'x', finals: ['x'], trans: d.sigma.map(function (a) { return ['x', a, 'x']; }), states: [{ id: 'x' }] }, 6).forEach(function (w) {
				if (A.acepta(d, w) !== (A.deltaExt(d, d.start, w) !== null && d.finals.indexOf(A.deltaExt(d, d.start, w)) >= 0)) bad++;
			});
			check(bad === 0, id + ': recorrer y δ* no coinciden en ' + bad + ' cadenas');
		});
		// 5. Detectives
		var bs = document.querySelectorAll('[data-det] button'), si = 0;
		bs.forEach(function (b) { b.click(); if (b.classList.contains('si')) si++; });
		check(si > 0 && si < bs.length, 'detectives: debería haber cadenas aceptadas y rechazadas');
		detOcultar();
		check(document.querySelectorAll('[data-det] button.q').length === bs.length, 'detectives: «Ocultar» no restablece las tarjetas');
		// 6. Resaltado de piezas
		var pz = $('piezas'), pi = Reveal.getIndices(pz);
		Reveal.slide(pi.h, pi.v, -1); Reveal.next();
		check(pz.querySelector('[data-diagram]').classList.contains('hl-estados'), 'piezas: el primer clic debería resaltar los estados');
		Reveal.next(); Reveal.next(); Reveal.next();
		check(pz.querySelector('[data-diagram]').classList.contains('hl-inicial'), 'piezas: el cuarto clic debería resaltar el estado inicial');
		// 7. Navegación
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
		document.querySelectorAll('[data-det] button').forEach(function (b) { detRevelar(b, true); });
		slides.forEach(function (s, i) {
			s.style.display = 'block';
			var id = (i + 1) + ' «' + ((s.querySelector('h1,h2') || {}).textContent || '').trim().slice(0, 50) + '»';
			if (s.scrollHeight > 722) out.push('DESBORDE VERTICAL ' + id + ': ' + s.scrollHeight + 'px');
			if (s.scrollWidth > 1282) out.push('DESBORDE HORIZONTAL ' + id + ': ' + s.scrollWidth + 'px');
			var box = s.getBoundingClientRect(), sc = box.height / 720;
			s.querySelectorAll('.panel, .def, .item, .pieza, .step, .note, .calc .ln, .reto, .ans, .q, .sim > *, svg.afd, .quote, table, .prueba, .comp, .cinta, .strs').forEach(function (e) {
				var r = e.getBoundingClientRect();
				if (!r.width) return;
				if (r.bottom - box.top > (720 - 6) * sc) out.push('FUERA DEL LIENZO ' + id + ': <' + e.tagName.toLowerCase() + ' class="' + (e.getAttribute('class') || '') + '"> baja hasta ' + Math.round((r.bottom - box.top) / sc) + 'px');
				if (r.right - box.left > (1280 - 4) * sc) out.push('FUERA DEL LIENZO (derecha) ' + id + ': <' + e.tagName.toLowerCase() + ' class="' + (e.getAttribute('class') || '') + '"> llega a ' + Math.round((r.right - box.left) / sc) + 'px');
			});
			s.querySelectorAll('.item, .pieza, .step, .def .body, .calc .ln, .note, .prueba, .estado-sim, .camino, .str, .comp > *').forEach(function (e) {
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
