/* =====================================================================
   EXPRESIONES REGULARES · Inicialización de reveal.js e interacciones
   Todo lo que decide si una cadena pertenece a un lenguaje usa motor.js
   (RegexFormal), el mismo que verifica las afirmaciones de las diapositivas.
   - Cinta de bloques (.route data-on="1").
   - Constructor de cadenas (diapositiva 5).
   - Árboles de agrupación ([data-ast]).
   - Laboratorio de expresiones (diapositiva 25).
   - Detectives de cadenas (diapositiva 30).
   - Simulador del autómata de 0*1 (diapositiva 33).
   - ?verificar: informe de afirmaciones, desbordes, fórmulas e interacciones.
   - ?mostrar: todos los fragmentos visibles (revisión / capturas).
   ===================================================================== */
(function () {
	'use strict';
	var R = window.RegexFormal;
	var VERIFY = /[?&]verificar\b/.test(location.search);
	if (/[?&]mostrar\b/.test(location.search)) document.documentElement.classList.add('mostrar-todo');
	var BLOQUES = ['Patrones', 'Vacíos', 'Reglas', 'Calcular', 'Construir', 'Cierre'];
	function $(id) { return document.getElementById(id); }
	function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
	function onClick(el, fn) { if (el) el.addEventListener('click', function () { fn(el); el.blur(); }); } // blur: el teclado vuelve a reveal

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

	/* ---------- Constructor de cadenas ---------- */
	var cons = '';
	function consRender() {
		if (!$('cons-cadena')) return;
		$('cons-cadena').innerHTML = cons
			? '<span class="palabra ac">' + cons.split('').map(function (c) { return '<span class="ficha">' + c + '</span>'; }).join('') + '</span>'
			: '<span class="ficha eps" style="min-width:70px">ε</span>';
		$('cons-long').innerHTML = cons ? 'w = <b class="mono">' + cons + '</b> &nbsp;·&nbsp; |w| = ' + cons.length
			: 'w = ε &nbsp;·&nbsp; |w| = 0 &nbsp;<span class="hint">(la cadena vacía)</span>';
		$('cons-borrar').disabled = !cons;
	}
	document.querySelectorAll('[data-add]').forEach(function (b) { onClick(b, function () { if (cons.length < 10) cons += b.dataset.add; consRender(); }); });
	onClick($('cons-borrar'), function () { cons = cons.slice(0, -1); consRender(); });
	onClick($('cons-vaciar'), function () { cons = ''; consRender(); });
	consRender();

	/* ---------- Árbol de agrupación de una expresión ---------- */
	var NODO = { union: '+', cat: '·', star: '*', eps: 'ε', empty: '∅' };
	function dibujarArbol(arbol, compacto) {
		var NS = 'http://www.w3.org/2000/svg', SEP = compacto ? 46 : 52, NIV = compacto ? 50 : 62, R0 = compacto ? 18 : 20;
		var hojas = 0, prof = 0;
		(function medir(n, d) {
			prof = Math.max(prof, d);
			var hijos = n.t === 'star' ? [n.a] : n.a ? [n.a, n.b] : [];
			if (!hijos.length) { n._x = hojas++ * SEP; } else { hijos.forEach(function (h) { medir(h, d + 1); }); n._x = hijos.reduce(function (s, h) { return s + h._x; }, 0) / hijos.length; }
			n._y = d * NIV;
		})(arbol, 0);
		var w = Math.max(1, hojas - 1) * SEP + 2 * R0 + 8, h = prof * NIV + 2 * R0 + 8;
		var svg = document.createElementNS(NS, 'svg');
		svg.setAttribute('class', 'ast');
		svg.setAttribute('viewBox', (-R0 - 4) + ' ' + (-R0 - 4) + ' ' + w + ' ' + h);
		svg.setAttribute('width', w); svg.setAttribute('height', h);
		svg.setAttribute('role', 'img');
		svg.setAttribute('aria-label', 'Árbol de la expresión ' + R.explicit(arbol, true) + '; la operación de arriba es la última que se aplica');
		var lineas = [], nodos = [];
		(function pintar(n) {
			var hijos = n.t === 'star' ? [n.a] : n.a ? [n.a, n.b] : [];
			hijos.forEach(function (c) {
				lineas.push('<line class="e" x1="' + n._x + '" y1="' + n._y + '" x2="' + c._x + '" y2="' + c._y + '"/>');
				pintar(c);
			});
			var cls = n.t === 'union' ? 'nd un' : n.t === 'star' ? 'nd st' : n.t === 'cat' ? 'nd op' : 'nd';
			nodos.push('<g class="' + cls + '"><circle cx="' + n._x + '" cy="' + n._y + '" r="' + R0 + '"/><text x="' + n._x + '" y="' + n._y + '">' + (NODO[n.t] || n.v) + '</text></g>');
		})(arbol);
		svg.innerHTML = lineas.join('') + nodos.join('');
		return svg;
	}
	document.querySelectorAll('[data-ast]').forEach(function (el) { el.appendChild(dibujarArbol(R.parse(el.dataset.ast))); });

	/* ---------- Laboratorio ---------- */
	function labActualizar() {
		if (!$('lab-re')) return;
		var src = $('lab-re').value, w = $('lab-w').value.replace(/\s+/g, '').replace(/^ε$/, ''), arbol;
		$('lab-msg').className = 'msg';
		try { arbol = R.parse(src); }
		catch (e) {
			$('lab-msg').className = 'msg err';
			$('lab-msg').innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> ' + esc(e.message);
			$('lab-res').className = 'res mt16'; $('lab-res').textContent = 'Corrige la expresión para comprobar cadenas.';
			$('lab-lista').innerHTML = ''; $('lab-tipo').innerHTML = ''; $('lab-paren').textContent = ''; $('lab-arbol').innerHTML = '';
			return;
		}
		$('lab-msg').innerHTML = '<i class="fa-solid fa-check ac"></i> Expresión válida.';
		var lista = R.enumerate(arbol, 5, 14);
		$('lab-lista').innerHTML = lista.length
			? lista.map(function (x) { return '<span class="str' + (x === '' ? ' eps' : '') + '">' + esc(R.show(x)) + '</span>'; }).join('') + (R.isInfinite(arbol) || lista.length === 14 ? '<span class="mid muted">…</span>' : '')
			: '<span class="hint">ninguna: el lenguaje es ∅</span>';
		$('lab-tipo').innerHTML = R.isEmpty(arbol) ? '<span class="tag fin">lenguaje vacío</span>'
			: R.isInfinite(arbol) ? '<span class="tag inf"><i class="fa-solid fa-infinity"></i> infinito</span>' : '<span class="tag fin">finito</span>';
		$('lab-paren').textContent = R.explicit(arbol, true);
		$('lab-arbol').innerHTML = ''; $('lab-arbol').appendChild(dibujarArbol(arbol, true));
		if (!/^[0-9a-d]*$/.test(w)) {
			$('lab-res').className = 'res mt16';
			$('lab-res').innerHTML = '<i class="fa-solid fa-circle-question"></i> La cadena solo puede usar los símbolos 0-9 y a-d.';
			return;
		}
		var si = R.member(arbol, w);
		$('lab-res').className = 'res mt16 ' + (si ? 'si' : 'nop');
		$('lab-res').innerHTML = (si ? '<i class="fa-solid fa-circle-check"></i> ' : '<i class="fa-solid fa-circle-xmark"></i> ') +
			'<span><b class="mono">' + esc(R.show(w)) + '</b> ' + (si ? 'pertenece' : 'no pertenece') + ' a L(' + esc(src.trim()) + ')</span>';
	}
	['lab-re', 'lab-w'].forEach(function (id) { if ($(id)) $(id).addEventListener('input', labActualizar); });
	document.querySelectorAll('[data-ins]').forEach(function (b) {
		b.addEventListener('click', function () {
			var inp = $('lab-re'), a = inp.selectionStart == null ? inp.value.length : inp.selectionStart, z = inp.selectionEnd == null ? a : inp.selectionEnd;
			inp.value = inp.value.slice(0, a) + b.dataset.ins + inp.value.slice(z);
			inp.focus(); inp.setSelectionRange(a + b.dataset.ins.length, a + b.dataset.ins.length);
			labActualizar();
		});
	});
	labActualizar();

	/* ---------- Detectives de cadenas ---------- */
	function detRevelar(b, mostrar) {
		var re = b.closest('[data-det]').dataset.det, w = b.dataset.w;
		b.classList.remove('q', 'si', 'nop');
		if (!mostrar) { b.classList.add('q'); b.removeAttribute('aria-label'); return; }
		var si = R.member(R.parse(re), w);
		b.classList.add(si ? 'si' : 'nop');
		b.setAttribute('aria-label', R.show(w) + (si ? ' pertenece' : ' no pertenece') + ' al lenguaje');
	}
	document.querySelectorAll('[data-det] button').forEach(function (b) { onClick(b, function () { detRevelar(b, true); }); });
	onClick($('det-todo'), function () { document.querySelectorAll('[data-det] button').forEach(function (b) { detRevelar(b, true); }); });
	function detOcultar() { document.querySelectorAll('[data-det] button').forEach(function (b) { detRevelar(b, false); }); }
	onClick($('det-ocultar'), detOcultar);

	/* ---------- Autómata de 0*1 ---------- */
	// Tabla de transiciones; si no hay flecha, la cadena se rechaza.
	var DELTA = { q0: { '0': ['q0', 'aut-loop'], '1': ['q1', 'aut-e01'] }, q1: {} };
	function autRecorrer(w) {
		var pasos = [{ q: 'q0' }], q = 'q0';
		for (var i = 0; i < w.length; i++) {
			var t = DELTA[q][w[i]];
			if (!t) { pasos.push({ q: q, atasco: w[i], i: i }); return { pasos: pasos, acepta: false }; }
			q = t[0];
			pasos.push({ q: q, arista: t[1], c: w[i] });
		}
		return { pasos: pasos, acepta: q === 'q1' };
	}
	var autTimers = [];
	function autLimpiar() {
		autTimers.forEach(clearTimeout); autTimers = [];
		document.querySelectorAll('#automata .on, #automata .acc-ok, #automata .acc-no').forEach(function (e) { e.classList.remove('on', 'acc-ok', 'acc-no'); });
	}
	function autPintar(r, k, w) {
		document.querySelectorAll('#automata .on').forEach(function (e) { e.classList.remove('on'); });
		var p = r.pasos[k];
		$('aut-' + p.q).classList.add('on');
		if (p.arista) $(p.arista).classList.add('on');
		var leido = r.pasos.slice(1, k + 1).filter(function (x) { return x.c; }).map(function (x) { return x.c; }).join('');
		var txt = 'Cadena <b>' + w + '</b> · leído: <b>' + (leido || 'ε') + '</b> · estado: <b>' + p.q + '</b>';
		if (p.atasco) txt = 'Desde ' + p.q + ' no hay flecha con «' + p.atasco + '»: <b class="no-t">✗ rechaza</b> ' + w;
		else if (k === r.pasos.length - 1) txt += r.acepta ? ' · <b class="yes-t">✓ acepta</b> (termina en q1)' : ' · <b class="no-t">✗ rechaza</b> (no termina en q1)';
		$('aut-traza').innerHTML = txt;
		if (k === r.pasos.length - 1) $('aut-' + p.q).classList.add(r.acepta ? 'acc-ok' : 'acc-no');
	}
	document.querySelectorAll('[data-aut]').forEach(function (b) {
		onClick(b, function () {
			autLimpiar();
			var w = b.dataset.aut, r = autRecorrer(w);
			r.pasos.forEach(function (_, k) { autTimers.push(setTimeout(function () { autPintar(r, k, w); }, 650 * k)); });
		});
	});

	/* ---------- Botones «Ver respuesta» ---------- */
	function setAnswer(btn, open) {
		var ans = $(btn.getAttribute('aria-controls'));
		ans.hidden = !open;
		ans.classList.toggle('show', open);
		btn.setAttribute('aria-expanded', String(open));
		btn.innerHTML = open ? '<i class="fa-solid fa-eye-slash"></i> Ocultar respuesta' : '<i class="fa-solid fa-eye"></i> Ver respuesta';
	}
	document.querySelectorAll('.ans-btn').forEach(function (btn) {
		onClick(btn, function () { setAnswer(btn, btn.getAttribute('aria-expanded') !== 'true'); });
	});

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

	// Al salir de una diapositiva se reinician sus respuestas y animaciones.
	Reveal.on('slidechanged', function (e) {
		if (!e.previousSlide) return;
		e.previousSlide.querySelectorAll('.ans-btn[aria-expanded="true"]').forEach(function (b) { setAnswer(b, false); });
		if (e.previousSlide.id === 'detectives') detOcultar();
		if (e.previousSlide.id === 'automata') { autLimpiar(); $('aut-traza').textContent = 'Elige una cadena para ver al autómata leerla.'; }
	});

	if (!VERIFY) return;

	/* ---------- Modo verificación ---------- */
	function claimAttrs(el) {
		var a = {};
		['re', 'exact', 'upto', 'in', 'out', 'inf', 'fin', 'paren', 'same'].forEach(function (k) { if (el.hasAttribute('data-' + k)) a[k] = el.getAttribute('data-' + k); });
		return a;
	}
	function interactionTests() {
		var out = [], ok = 0;
		function check(cond, msg) { if (cond) ok++; else out.push('INTERACCIÓN: ' + msg); }
		// 1. Respuestas ocultas.
		document.querySelectorAll('.ans-btn').forEach(function (b) {
			var ans = $(b.getAttribute('aria-controls'));
			check(ans.hidden, b.getAttribute('aria-controls') + ' debería empezar oculta');
			b.click(); check(!ans.hidden && b.getAttribute('aria-expanded') === 'true', b.getAttribute('aria-controls') + ' no se abre');
			b.click(); check(ans.hidden, b.getAttribute('aria-controls') + ' no se cierra');
		});
		// 2. Constructor.
		$('cons-vaciar').click();
		check(/\|w\| = 0/.test($('cons-long').textContent), 'el constructor vacío debería mostrar |w| = 0');
		document.querySelector('[data-add="1"]').click(); document.querySelector('[data-add="0"]').click(); document.querySelector('[data-add="1"]').click();
		check(/101/.test($('cons-long').textContent) && /\|w\| = 3/.test($('cons-long').textContent), 'el constructor no forma 101 con longitud 3');
		$('cons-borrar').click();
		check(/\|w\| = 2/.test($('cons-long').textContent), '«Quitar» no elimina la última ficha');
		$('cons-vaciar').click();
		// 3. Laboratorio.
		function lab(re, w) { $('lab-re').value = re; $('lab-w').value = w; labActualizar(); return $('lab-res').className; }
		check(/\bsi\b/.test(lab('(0+1)*0', '110')), 'laboratorio: 110 debería pertenecer a (0+1)*0');
		check(/\bnop\b/.test(lab('(0+1)*0', '')), 'laboratorio: ε no debería pertenecer a (0+1)*0');
		check(/\bsi\b/.test(lab('0*', '')), 'laboratorio: ε debería pertenecer a 0*');
		lab('(0+1', '0');
		check(/err/.test($('lab-msg').className), 'laboratorio: «(0+1» debería mostrar un error');
		lab('∅', '');
		check(/vacío/.test($('lab-tipo').textContent), 'laboratorio: ∅ debería mostrarse como lenguaje vacío');
		lab('0+10*', '100');
		check($('lab-paren').textContent === '0+(1(0*))', 'laboratorio: agrupación de 0+10* incorrecta');
		lab('(0+1)*0', '110');
		// 4. Detectives: cada fila tiene aceptadas y rechazadas, y el botón coincide con el motor.
		document.querySelectorAll('[data-det]').forEach(function (row) {
			var bs = row.querySelectorAll('button'), si = 0;
			bs.forEach(function (b) { b.click(); if (b.classList.contains('si')) si++; check(!b.classList.contains('q'), 'detectives: la tarjeta no se revela'); });
			check(si > 0 && si < bs.length, 'detectives: la fila ' + row.dataset.det + ' debería tener cadenas aceptadas y rechazadas');
		});
		detOcultar();
		check(document.querySelectorAll('[data-det] button.q').length === 20, 'detectives: «Ocultar» no restablece las 20 tarjetas');
		// 5. Autómata = motor para todas las cadenas de longitud ≤ 6.
		var re01 = R.parse('0*1'), dif = 0;
		R.enumerate(R.parse('(0+1)*'), 6).forEach(function (w) { if (autRecorrer(w).acepta !== R.member(re01, w)) dif++; });
		check(dif === 0, 'el autómata y L(0*1) difieren en ' + dif + ' cadenas');
		// 6. Navegación.
		Reveal.slide(0, 0); check(Reveal.isFirstSlide(), 'no se vuelve a la portada');
		var last = Reveal.getSlides().slice(-1)[0], li = Reveal.getIndices(last);
		Reveal.slide(li.h, li.v); check(Reveal.isLastSlide(), 'no se llega a la última diapositiva');
		Reveal.slide(0, 0);
		return { out: out, ok: ok };
	}
	function report() {
		var tests = interactionTests(), out = tests.out.slice(), slides = Reveal.getSlides(), nClaims = 0;
		document.querySelectorAll('[data-re]').forEach(function (el) {
			nClaims++;
			var s = el.closest('section');
			out = out.concat(R.checkClaims(claimAttrs(el), 'diapositiva ' + (slides.indexOf(s) + 1)).map(function (m) { return 'LENGUAJE: ' + m; }));
		});
		document.querySelectorAll('.ans-btn').forEach(function (b) { setAnswer(b, true); });
		document.querySelectorAll('[data-det] button').forEach(function (b) { detRevelar(b, true); });
		slides.forEach(function (s, i) {
			s.style.display = 'block';
			var id = (i + 1) + ' «' + ((s.querySelector('h1,h2') || {}).textContent || '').trim().slice(0, 50) + '»';
			if (s.scrollHeight > 722) out.push('DESBORDE VERTICAL ' + id + ': ' + s.scrollHeight + 'px');
			if (s.scrollWidth > 1282) out.push('DESBORDE HORIZONTAL ' + id + ': ' + s.scrollWidth + 'px');
			var box = s.getBoundingClientRect(), sc = box.height / 720;
			s.querySelectorAll('.panel, .def, .item, .step, .note, .setbox, .calc .ln, .rl, .bug, .ex, .reto, .ans, .q, .flow, .res, .trace, svg, .quote, .det, .ctrl, .lenrow').forEach(function (e) {
				var r = e.getBoundingClientRect();
				if (r.width === 0) return;
				if (r.bottom - box.top > (720 - 6) * sc) out.push('FUERA DEL LIENZO ' + id + ': <' + e.tagName.toLowerCase() + ' class="' + (e.getAttribute('class') || '') + '"> baja hasta ' + Math.round((r.bottom - box.top) / sc) + 'px');
				if (r.right - box.left > (1280 - 4) * sc) out.push('FUERA DEL LIENZO (derecha) ' + id + ': <' + e.tagName.toLowerCase() + ' class="' + (e.getAttribute('class') || '') + '"> llega a ' + Math.round((r.right - box.left) / sc) + 'px');
			});
			s.querySelectorAll('.step, .item, .def .body, .figcap, .calc .ln, .rl, .bug, .ex, .setbox, .str, .lenrow, .res, .trace, .note').forEach(function (e) {
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
		var res = 'VERIFICACIÓN · ' + slides.length + ' diapositivas · ' + document.querySelectorAll('.katex').length + ' fórmulas · ' + nClaims +
			' afirmaciones de lenguajes comprobadas · ' + tests.ok + ' pruebas de interacción superadas\n' + (out.length ? out.join('\n') : 'SIN PROBLEMAS');
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
