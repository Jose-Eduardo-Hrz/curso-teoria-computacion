/* =====================================================================
   DETECTOR DE 101 · Inicialización de reveal.js e interacciones
   - Resaltado de sintaxis Python en los bloques <pre data-archivo>.
   - [data-diagrama] y [data-tabla]: dibujados por afn.js con la definición
     de automata.js (la misma tabla que usa detector_101.py).
   - .sim[data-afn] simulador paso a paso (data-edit: cadena escrita).
   - Fragmentos con data-hl: resaltan grupos de flechas del diagrama.
   - ?verificar: informe de afirmaciones, desbordes e interacciones.
   - ?mostrar: todos los fragmentos visibles (revisión / capturas).
   ===================================================================== */
(function () {
	'use strict';
	var A = window.AFN, AUT = A.AUTOMATAS, RX = window.RegexFormal;
	var VERIFY = /[?&]verificar\b/.test(location.search);
	if (/[?&]mostrar\b/.test(location.search)) document.documentElement.classList.add('mostrar-todo');
	var BLOQUES = ['El problema', 'Diseñar el AFD', 'Verlo funcionar', 'Python', 'Pruebas'];
	function $(id) { return document.getElementById(id); }
	function onClick(el, fn) { if (el) el.addEventListener('click', function () { fn(el); el.blur(); }); } // blur: el teclado vuelve a reveal
	function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
	var q = A.sub2;

	/* ---------- Resaltado de sintaxis Python ---------- */
	var PY = /("""[\s\S]*?""")|(#.*$)|(f?"(?:[^"\\\n]|\\.)*"|f?'(?:[^'\\\n]|\\.)*')|\b(def|return|for|in|if|else|not|is|None|True|False|import|from|class|with)\b|\b(isinstance|str|print|len|range)\b(?=\()|\b(\d+)\b|([A-Za-z_]\w*)(?=\()/gm;
	document.querySelectorAll('pre[data-archivo] code').forEach(function (code) {
		var src = code.textContent, out = '', last = 0;
		src.replace(PY, function (m, doc, com, str, kw, bi, num, fn, at) {
			out += esc(src.slice(last, at));
			var cls = doc || com ? 'c' : str ? 's' : kw ? 'k' : bi ? 'b' : num ? 'n' : 'f';
			out += '<span class="' + cls + '">' + esc(m) + '</span>';
			last = at + m.length;
			return m;
		});
		code.innerHTML = out + esc(src.slice(last));
	});

	/* ---------- Cinta de bloques ---------- */
	document.querySelectorAll('.route').forEach(function (r) {
		var on = (r.dataset.on || '').split(',').map(Number);
		r.setAttribute('aria-label', 'Bloque: ' + on.filter(Boolean).map(function (i) { return BLOQUES[i - 1]; }).join(', '));
		BLOQUES.forEach(function (s, i) {
			var span = document.createElement('span');
			span.textContent = ['I', 'II', 'III', 'IV', 'V'][i] + ' ' + s;
			if (on.indexOf(i + 1) >= 0) span.className = 'on';
			r.appendChild(span);
		});
	});

	/* ---------- Diagramas y tablas ---------- */
	document.querySelectorAll('[data-diagrama]').forEach(function (el) {
		el.innerHTML = A.diagrama(AUT[el.dataset.diagrama], { escala: parseFloat(el.dataset.escala || '1') });
		(el.dataset.marca || '').split(';').filter(Boolean).forEach(function (m) {
			var p = m.split(':'), g = el.querySelector('.state[data-s="' + p[0] + '"]');
			if (g) g.classList.add(p[1]);
		});
	});
	document.querySelectorAll('[data-tabla]').forEach(function (el) { el.innerHTML = A.tabla(AUT[el.dataset.tabla]); });

	/* ---------- Simulador paso a paso (un estado a la vez: es determinista) ---------- */
	var sims = [];
	function Sim(el) {
		var s = this, n = sims.length;
		s.el = el; s.def = AUT[el.dataset.afn]; s.w = el.dataset.w || ''; s.k = 0;
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
				var L = s.pasos(), a = b.dataset.a;
				s.k = a === 'reset' ? 0 : a === 'back' ? Math.max(0, s.k - 1) : a === 'step' ? Math.min(L, s.k + 1) : L;
				s.render();
			});
		});
		var inp = ctrl.querySelector('input');
		if (inp) inp.addEventListener('input', function () { s.w = inp.value.replace(/^ε$/, ''); s.k = 0; s.render(); });
		s.parte('sim-diag').innerHTML = A.diagrama(s.def);
		s.render();
	}
	// Pasos que se pueden dar: hasta el final, o hasta el símbolo inválido (ahí se detiene, como en Python)
	Sim.prototype.pasos = function () {
		// conjuntos[i] es el estado tras leer i símbolos; si queda vacío, el símbolo i-ésimo no tenía flecha
		var r = A.simular(this.def, this.w), i = r.conjuntos.findIndex(function (S) { return !S.length; });
		return i < 0 ? this.w.length : i - 1;
	};
	Sim.prototype.render = function () {
		var s = this, def = s.def, L = s.w.length, P = s.pasos(), svg = s.parte('sim-diag').querySelector('svg');
		svg.querySelectorAll('.on, .ok, .bad').forEach(function (e) { e.classList.remove('on', 'ok', 'bad'); });
		var r = A.simular(def, s.w), estado = r.conjuntos[s.k][0], invalido = P < L;
		var cinta = s.parte('sim-cinta'), est = s.parte('sim-estado'), cam = s.parte('sim-camino');
		cinta.className = 'sim-cinta cinta'; est.className = 'sim-estado estado-sim'; cam.className = 'sim-camino camino';
		cinta.innerHTML = L ? s.w.split('').map(function (c, i) {
			return '<span class="c' + (i < s.k ? ' leido' : '') + (i === s.k ? ' actual' : '') + (invalido && i === P && s.k === P ? ' raro' : '') + '">' + esc(c) + '</span>';
		}).join('') + (s.k === L ? '<span class="c fin-c actual">fin</span>' : '') : '<span class="c vacia actual">ε</span>';
		svg.querySelector('.state[data-s="' + estado + '"]').classList.add('on');
		if (s.k > 0) {
			var u = r.usadas[s.k - 1][0], key = u[0] + '>' + u[2];
			svg.querySelectorAll('[data-k="' + key + '"], [class~="e-' + key + '"]').forEach(function (e) { e.classList.add('on'); });
		}
		var camino = '<span class="qs">' + q(r.conjuntos[0][0]) + '</span>';
		for (var i = 1; i <= s.k; i++) camino += '<span class="ar"><b>' + esc(s.w[i - 1]) + '</b>⟶</span><span class="qs' + (i === s.k && r.conjuntos[i][0] === 'q3' ? ' fin' : '') + '">' + q(r.conjuntos[i][0]) + '</span>';
		cam.innerHTML = camino;
		if (invalido && s.k === P) {
			svg.querySelector('.state[data-s="' + estado + '"]').classList.add('bad');
			est.innerHTML = 'Desde ' + q(estado) + ' no hay flecha con «' + esc(s.w[P]) + '»: símbolo fuera de Σ = {0, 1} &nbsp;<span class="res nop"><i class="fa-solid fa-circle-xmark"></i> se rechaza</span>';
		} else if (s.k === L) {
			var ok = estado === 'q3';
			svg.querySelector('.state[data-s="' + estado + '"]').classList.add(ok ? 'ok' : 'bad');
			est.innerHTML = (L ? 'Se leyó toda la cadena. ' : 'Cadena vacía: no hay tarjetas. ') + 'Termina en ' + q(estado) +
				(ok ? ' &nbsp;<span class="res si"><i class="fa-solid fa-circle-check"></i> se acepta (True)</span>' : ' &nbsp;<span class="res nop"><i class="fa-solid fa-circle-xmark"></i> se rechaza (False)</span>');
		} else {
			est.innerHTML = 'Estado actual: <b>' + q(estado) + '</b> · siguiente tarjeta: <b class="mono">' + esc(s.w[s.k]) + '</b> · leídas ' + s.k + ' de ' + L;
		}
		var b = function (a) { return s.parte('sim-ctrl').querySelector('[data-a="' + a + '"]'); };
		b('reset').disabled = s.k === 0; b('back').disabled = s.k === 0; b('step').disabled = s.k === P; b('all').disabled = s.k === P;
	};
	document.querySelectorAll('.sim[data-afn]').forEach(function (el) { sims.push(new Sim(el)); });

	/* ---------- Resaltado de grupos de flechas (data-hl) ---------- */
	var HL = ['avanza', 'quedarse', 'reinicia', 'trampa'];
	function aplicarHL(sec) {
		if (!sec) return;
		var vis = sec.querySelectorAll('.fragment.visible[data-hl]'), cual = vis.length ? vis[vis.length - 1].dataset.hl : '';
		sec.querySelectorAll('[data-diagrama]').forEach(function (d) {
			HL.forEach(function (h) { d.classList.remove('hl-' + h); });
			if (cual) d.classList.add('hl-' + cual);
		});
	}

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
		sims.forEach(function (s) { if (e.previousSlide.contains(s.el)) { s.k = 0; s.render(); } });
	});

	if (!VERIFY) return;

	/* ---------- Modo verificación ---------- */
	var CLAVES = ['claim', 'acc', 'rej', 'w', 'sets', 'delta', 'tipo', 're', 'q', 'q0', 'f'];
	function attrs(el) { var a = {}; CLAVES.forEach(function (k) { if (el.hasAttribute('data-' + k)) a[k] = el.getAttribute('data-' + k); }); return a; }
	function interactionTests() {
		var out = [], ok = 0;
		function check(c, m) { if (c) ok++; else out.push('INTERACCIÓN: ' + m); }
		var st = function (x, a) { x.parte('sim-ctrl').querySelector('[data-a="' + a + '"]').click(); };
		var activo = function (x) { return x.el.querySelector('.state.on').dataset.s; };
		// 1. 01010: recorrido completo y aceptación
		var s = sims[0];
		var esperado = ['q0', 'q0', 'q1', 'q2', 'q3', 'q3'];
		check(activo(s) === 'q0', '01010: no empieza en q0');
		for (var i = 1; i <= 5; i++) { st(s, 'step'); check(activo(s) === esperado[i], '01010: tras ' + i + ' tarjetas debería estar en ' + esperado[i]); }
		check(/se acepta/.test(s.parte('sim-estado').textContent) && s.el.querySelector('.state.ok'), '01010 debería aceptarse');
		check(s.parte('sim-ctrl').querySelector('[data-a="step"]').disabled, '«Paso» debería deshabilitarse al final');
		st(s, 'back'); check(s.k === 4, '«Atrás» no regresa un paso'); st(s, 'reset');
		// 2. 1001: rechazo
		var s2 = sims[1]; st(s2, 'all');
		check(/se rechaza/.test(s2.parte('sim-estado').textContent) && activo(s2) === 'q1', '1001 debería rechazarse terminando en q1');
		st(s2, 'reset');
		// 3. Laboratorio: símbolo inválido detiene la lectura, ε se rechaza
		var lab = sims[2], inp = lab.parte('sim-ctrl').querySelector('input');
		inp.value = '1021'; inp.dispatchEvent(new Event('input')); st(lab, 'all');
		check(/fuera de Σ/.test(lab.parte('sim-estado').textContent) && lab.k === 2, 'laboratorio: «1021» debería detenerse en el «2» y rechazarse');
		inp.value = ''; inp.dispatchEvent(new Event('input')); st(lab, 'all');
		check(/se rechaza/.test(lab.parte('sim-estado').textContent), 'laboratorio: ε debería rechazarse');
		inp.value = '0001010000'; inp.dispatchEvent(new Event('input')); st(lab, 'all');
		check(/se acepta/.test(lab.parte('sim-estado').textContent), 'laboratorio: 0001010000 debería aceptarse');
		inp.value = '110100'; inp.dispatchEvent(new Event('input'));
		// 4. El simulador coincide con la definición en todas las cadenas de longitud ≤ 8
		var malas = 0;
		A.lenguaje({ sigma: ['0', '1'], start: 'x', finals: ['x'], states: [{ id: 'x' }], trans: [['x', '0', 'x'], ['x', '1', 'x']] }, 8).forEach(function (w) {
			inp.value = w; inp.dispatchEvent(new Event('input')); st(lab, 'all');
			if (/se acepta/.test(lab.parte('sim-estado').textContent) !== RX.member(RX.parse('(0+1)*101(0+1)*'), w)) malas++;
		});
		check(malas === 0, 'el laboratorio y L((0+1)*101(0+1)*) difieren en ' + malas + ' cadenas');
		inp.value = '110100'; inp.dispatchEvent(new Event('input'));
		// 5. Resaltado de grupos de flechas
		var t = $('truco'), ti = Reveal.getIndices(t);
		Reveal.slide(ti.h, ti.v, -1); Reveal.next(); Reveal.next(); Reveal.next();
		check(t.querySelector('[data-diagrama]').classList.contains('hl-reinicia'), 'el tercer clic de «flechas con truco» debería resaltar q2 → q0');
		// 6. Navegación
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
			out = out.concat(A.comprobar(attrs(el), 'diapositiva ' + (slides.indexOf(el.closest('section')) + 1), RX).map(function (m) { return 'AFIRMACIÓN: ' + m; }));
		});
		slides.forEach(function (s, i) {
			s.style.display = 'block';
			var id = (i + 1) + ' «' + ((s.querySelector('h1,h2') || {}).textContent || '').trim().slice(0, 50) + '»';
			if (s.scrollHeight > 722) out.push('DESBORDE VERTICAL ' + id + ': ' + s.scrollHeight + 'px');
			if (s.scrollWidth > 1282) out.push('DESBORDE HORIZONTAL ' + id + ': ' + s.scrollWidth + 'px');
			var box = s.getBoundingClientRect(), sc = box.height / 720;
			s.querySelectorAll('.panel, .def, .item, .pieza, .note, .step, .q, .code, .term, .sim > *, svg.afd, table, .prog, .comp, .cinta, .quote').forEach(function (e) {
				var r = e.getBoundingClientRect();
				if (!r.width) return;
				if (r.bottom - box.top > (720 - 6) * sc) out.push('FUERA DEL LIENZO ' + id + ': <' + e.tagName.toLowerCase() + ' class="' + (e.getAttribute('class') || '') + '"> baja hasta ' + Math.round((r.bottom - box.top) / sc) + 'px');
				if (r.right - box.left > (1280 - 4) * sc) out.push('FUERA DEL LIENZO (derecha) ' + id + ': <' + e.tagName.toLowerCase() + ' class="' + (e.getAttribute('class') || '') + '"> llega a ' + Math.round((r.right - box.left) / sc) + 'px');
			});
			s.querySelectorAll('.item, .pieza, .def .body, .note, .step, .estado-sim, .prog, .code pre, .term pre, .comp > *').forEach(function (e) {
				if (e.scrollWidth > e.clientWidth + 2) out.push('TEXTO CORTADO ' + id + ': ' + e.className + ' «' + e.textContent.trim().slice(0, 40) + '» (' + e.scrollWidth + ' > ' + e.clientWidth + ')');
			});
		});
		document.querySelectorAll('.katex-error').forEach(function (k) { out.push('KATEX: ' + k.getAttribute('title')); });
		slides.forEach(function (s, i) {
			var w = document.createTreeWalker(s, NodeFilter.SHOW_TEXT);
			while (w.nextNode()) {
				var p = w.currentNode.parentElement;
				if (p.closest('.notes,script,.katex,pre')) continue;
				if (/\\\(|\\\[|\\[a-zA-Z]+/.test(w.currentNode.nodeValue)) out.push('MATEMÁTICA SIN RENDERIZAR en diapositiva ' + (i + 1) + ': ' + w.currentNode.nodeValue.trim().slice(0, 60));
			}
		});
		var res = 'VERIFICACIÓN · ' + slides.length + ' diapositivas · ' + document.querySelectorAll('.katex').length + ' fórmulas · ' + document.querySelectorAll('svg.afd').length +
			' diagramas · ' + document.querySelectorAll('pre[data-archivo]').length + ' bloques de código · ' + n + ' afirmaciones · ' + tests.ok + ' pruebas de interacción superadas\n' + (out.length ? out.join('\n') : 'SIN PROBLEMAS');
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
