/* =====================================================================
   VALIDADOR DE IDENTIFICADORES · Inicialización de reveal.js e interacciones
   - Resaltado de sintaxis Python en los bloques <pre data-archivo>.
   - [data-diagrama] y [data-tabla]: dibujados por afn.js con la definición
     de automata.js; las etiquetas L, D, O se muestran como letra, dígito, otro.
   - .sim[data-afn] simulador: cada carácter se convierte en su tipo
     (letra, dígito, _ u otro) y la máquina lee los tipos.
   - Fragmentos con data-hl: resaltan un estado del diagrama.
   - ?verificar: ejemplos (data-ej-val / data-ej-inv), afirmaciones, desbordes e interacciones.
   - ?mostrar: todos los fragmentos visibles (revisión / capturas).
   ===================================================================== */
(function () {
	'use strict';
	var A = window.AFN, AUT = A.AUTOMATAS, I = window.Ident;
	var VERIFY = /[?&]verificar\b/.test(location.search);
	if (/[?&]mostrar\b/.test(location.search)) document.documentElement.classList.add('mostrar-todo');
	var BLOQUES = ['El problema', 'La expresión', 'El autómata', 'Python', 'Pruebas'];
	function $(id) { return document.getElementById(id); }
	function onClick(el, fn) { if (el) el.addEventListener('click', function () { fn(el); el.blur(); }); } // blur: el teclado vuelve a reveal
	function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
	var q = A.sub2;
	function ver(c) { return c === ' ' ? '␠' : c === '\n' ? '↵' : c === '\t' ? '⇥' : c; }

	/* ---------- Resaltado de sintaxis Python ---------- */
	var PY = /("""[\s\S]*?""")|(#.*$)|([rf]?"(?:[^"\\\n]|\\.)*"|[rf]?'(?:[^'\\\n]|\\.)*')|\b(def|return|for|in|if|else|not|is|None|True|False|import|from|class|with|and|or|try|except|as)\b|\b(isinstance|str|print|len|range|repr|all|bool)\b(?=\()|\b(\d+)\b|([A-Za-z_]\w*)(?=\()/gm;
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
	function dibujar(el, def, escala) {
		el.innerHTML = A.diagrama(def, { escala: escala || 1 });
		I.etiquetas(el.querySelector('svg'));
	}
	document.querySelectorAll('[data-diagrama]').forEach(function (el) { dibujar(el, AUT[el.dataset.diagrama], parseFloat(el.dataset.escala || '1')); });
	document.querySelectorAll('[data-tabla]').forEach(function (el) { el.innerHTML = A.tabla(AUT[el.dataset.tabla]); });

	/* ---------- Simulador: caracteres → tipos → estados ---------- */
	var sims = [];
	function Sim(el) {
		var s = this, n = sims.length;
		s.el = el; s.def = AUT[el.dataset.afn]; s.w = el.dataset.w || ''; s.k = 0;
		s.parte = function (c) { return el.querySelector('.' + c); };
		var ctrl = s.parte('sim-ctrl');
		ctrl.className += ' ctrl';
		ctrl.innerHTML = (el.hasAttribute('data-edit') ? '<label class="sr" for="sim-in-' + n + '">Nombre</label><input id="sim-in-' + n + '" type="text" autocomplete="off" spellcheck="false" value="' + esc(s.w) + '" placeholder="(vacía)">' : '') +
			'<button class="btn" data-a="reset"><i class="fa-solid fa-backward-fast"></i> Reiniciar</button>' +
			'<button class="btn" data-a="back"><i class="fa-solid fa-backward-step"></i> Atrás</button>' +
			'<button class="btn" data-a="step"><i class="fa-solid fa-forward-step"></i> Paso</button>' +
			'<button class="btn" data-a="all"><i class="fa-solid fa-forward-fast"></i> Toda la cadena</button>';
		ctrl.querySelectorAll('button').forEach(function (b) {
			onClick(b, function () {
				var L = Array.from(s.w).length, a = b.dataset.a;
				s.k = a === 'reset' ? 0 : a === 'back' ? Math.max(0, s.k - 1) : a === 'step' ? Math.min(L, s.k + 1) : L;
				s.render();
			});
		});
		var inp = ctrl.querySelector('input');
		if (inp) inp.addEventListener('input', function () { s.w = inp.value; s.k = 0; s.render(); });
		dibujar(s.parte('sim-diag'), s.def);
		s.render();
	}
	Sim.prototype.render = function () {
		var s = this, chars = Array.from(s.w), L = chars.length, tipos = I.clases(s.w), svg = s.parte('sim-diag').querySelector('svg');
		svg.querySelectorAll('.on, .ok, .bad').forEach(function (e) { e.classList.remove('on', 'ok', 'bad'); });
		var r = A.simular(s.def, tipos), estado = r.conjuntos[s.k][0];
		var cinta = s.parte('sim-cinta'), est = s.parte('sim-estado');
		cinta.className = 'sim-cinta cinta'; est.className = 'sim-estado estado-sim';
		cinta.innerHTML = L ? chars.map(function (c, i) {
			var t = tipos[i];
			return '<span class="c' + (i < s.k ? ' leido' : '') + (i === s.k ? ' actual' : '') + (c === ' ' || c === '\n' ? ' esp' : '') + '">' + esc(ver(c)) +
				'<span class="cl ' + (t === '_' ? 'G' : t) + '">' + I.NOMBRES[t] + '</span></span>';
		}).join('') + (s.k === L ? '<span class="c fin-c actual">fin</span>' : '') : '<span class="c vacia actual">vacía</span>';
		svg.querySelector('.state[data-s="' + estado + '"]').classList.add('on');
		if (s.k > 0) {
			var u = r.usadas[s.k - 1][0], key = u[0] + '>' + u[2];
			svg.querySelectorAll('[data-k="' + key + '"], [class~="e-' + key + '"]').forEach(function (e) { e.classList.add('on'); });
		}
		var nombre = { q0: 'inicio', q1: 'válido', qe: 'error' }[estado];
		if (s.k === L) {
			var ok = estado === 'q1';
			svg.querySelector('.state[data-s="' + estado + '"]').classList.add(ok ? 'ok' : 'bad');
			est.innerHTML = (L ? 'Se revisó todo el nombre. ' : 'Cadena vacía: no hay primera letra. ') + 'Termina en ' + q(estado) + ' (' + nombre + ')' +
				(ok ? ' &nbsp;<span class="res si"><i class="fa-solid fa-circle-check"></i> válido (True)</span>' : ' &nbsp;<span class="res nop"><i class="fa-solid fa-circle-xmark"></i> inválido (False)</span>');
		} else {
			est.innerHTML = 'Estado: <b>' + q(estado) + '</b> (' + nombre + ') · siguiente carácter: <b class="mono">' + esc(ver(chars[s.k])) + '</b>, tipo <b>' + I.NOMBRES[tipos[s.k]] + '</b> · revisados ' + s.k + ' de ' + L;
		}
		var b = function (a) { return s.parte('sim-ctrl').querySelector('[data-a="' + a + '"]'); };
		b('reset').disabled = s.k === 0; b('back').disabled = s.k === 0; b('step').disabled = s.k === L; b('all').disabled = s.k === L;
	};
	document.querySelectorAll('.sim[data-afn]').forEach(function (el) { sims.push(new Sim(el)); });

	/* ---------- Resaltado de un estado (data-hl) ---------- */
	var HL = ['q0', 'q1', 'qe'];
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
	var CLAVES = ['claim', 'tipo', 'q', 'q0', 'f'];
	function attrs(el) { var a = {}; CLAVES.forEach(function (k) { if (el.hasAttribute('data-' + k)) a[k] = el.getAttribute('data-' + k); }); return a; }
	function interactionTests() {
		var out = [], ok = 0;
		function check(c, m) { if (c) ok++; else out.push('INTERACCIÓN: ' + m); }
		var st = function (x, a) { x.parte('sim-ctrl').querySelector('[data-a="' + a + '"]').click(); };
		var activo = function (x) { return x.el.querySelector('.state.on').dataset.s; };
		// 1. edad_2: q0 → q1 y se queda en q1
		var s = sims[0];
		check(activo(s) === 'q0', 'edad_2: no empieza en q0');
		st(s, 'step'); check(activo(s) === 'q1', 'edad_2: tras la «e» debería estar en q1');
		st(s, 'all'); check(activo(s) === 'q1' && /válido \(True\)/.test(s.parte('sim-estado').textContent), 'edad_2 debería ser válido');
		check(s.parte('sim-cinta').querySelectorAll('.cl')[4].textContent === '_' && s.parte('sim-cinta').querySelectorAll('.cl')[5].textContent === 'dígito', 'edad_2: los tipos bajo la cinta son incorrectos');
		st(s, 'reset');
		// 2. mi-var: cae en el error con el guion y no sale
		var s2 = sims[1];
		st(s2, 'step'); st(s2, 'step'); st(s2, 'step');
		check(activo(s2) === 'qe', 'mi-var: tras el guion debería estar en qe');
		st(s2, 'all'); check(activo(s2) === 'qe' && /inválido/.test(s2.parte('sim-estado').textContent), 'mi-var debería ser inválido y terminar en qe');
		st(s2, 'reset');
		// 3. Laboratorio: casos límite
		var lab = sims[2], inp = lab.parte('sim-ctrl').querySelector('input');
		var probar = function (w) { inp.value = w; inp.dispatchEvent(new Event('input')); st(lab, 'all'); return /válido \(True\)/.test(lab.parte('sim-estado').textContent); };
		check(!probar(''), 'laboratorio: la cadena vacía debería ser inválida');
		check(probar('x'), 'laboratorio: «x» debería ser válido');
		check(!probar('año'), 'laboratorio: «año» debería ser inválido');
		check(!probar('a b'), 'laboratorio: «a b» debería ser inválido (espacio)');
		check(!probar('x²'), 'laboratorio: «x²» debería ser inválido');
		check(probar('A1_b2'), 'laboratorio: «A1_b2» debería ser válido');
		inp.value = 'Total_2024'; inp.dispatchEvent(new Event('input'));
		// 4. Resaltado de estados
		var a = $('automata'), ai = Reveal.getIndices(a);
		Reveal.slide(ai.h, ai.v, -1); Reveal.next(); Reveal.next(); Reveal.next();
		check(a.querySelector('[data-diagrama]').classList.contains('hl-qe'), 'el tercer clic de «el autómata» debería resaltar qe');
		// 5. Etiquetas con nombres
		check(/letra/.test(a.querySelector('svg').textContent) && !/\bL\b/.test(a.querySelector('svg').textContent.replace(/[^\w ,]/g, ' ')), 'las etiquetas del diagrama deberían decir letra/dígito/otro');
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
			out = out.concat(A.comprobar(attrs(el), 'diapositiva ' + (slides.indexOf(el.closest('section')) + 1)).map(function (m) { return 'AFIRMACIÓN: ' + m; }));
		});
		document.querySelectorAll('[data-ej-val], [data-ej-inv]').forEach(function (el) {
			var where = 'diapositiva ' + (slides.indexOf(el.closest('section')) + 1);
			JSON.parse(el.getAttribute('data-ej-val') || '[]').forEach(function (w) { n++; if (!I.acepta(w)) out.push('EJEMPLO: ' + where + ': ' + JSON.stringify(w) + ' debería ser válido'); });
			JSON.parse(el.getAttribute('data-ej-inv') || '[]').forEach(function (w) { n++; if (I.acepta(w)) out.push('EJEMPLO: ' + where + ': ' + JSON.stringify(w) + ' debería ser inválido'); });
		});
		slides.forEach(function (s, i) {
			s.style.display = 'block';
			var id = (i + 1) + ' «' + ((s.querySelector('h1,h2') || {}).textContent || '').trim().slice(0, 50) + '»';
			if (s.scrollHeight > 722) out.push('DESBORDE VERTICAL ' + id + ': ' + s.scrollHeight + 'px');
			if (s.scrollWidth > 1282) out.push('DESBORDE HORIZONTAL ' + id + ': ' + s.scrollWidth + 'px');
			var box = s.getBoundingClientRect(), sc = box.height / 720;
			s.querySelectorAll('.panel, .def, .item, .note, .step, .q, .code, .term, .sim > *, svg.afd, table, .cls, .comp, .cinta, .quote, .rx-piezas').forEach(function (e) {
				var r = e.getBoundingClientRect();
				if (!r.width) return;
				if (r.bottom - box.top > (720 - 6) * sc) out.push('FUERA DEL LIENZO ' + id + ': <' + e.tagName.toLowerCase() + ' class="' + (e.getAttribute('class') || '') + '"> baja hasta ' + Math.round((r.bottom - box.top) / sc) + 'px');
				if (r.right - box.left > (1280 - 4) * sc) out.push('FUERA DEL LIENZO (derecha) ' + id + ': <' + e.tagName.toLowerCase() + ' class="' + (e.getAttribute('class') || '') + '"> llega a ' + Math.round((r.right - box.left) / sc) + 'px');
			});
			s.querySelectorAll('.item, .def .body, .note, .step, .estado-sim, .cls, .code pre, .term pre, .comp > *').forEach(function (e) {
				if (e.scrollWidth > e.clientWidth + 2) out.push('TEXTO CORTADO ' + id + ': ' + e.className + ' «' + e.textContent.trim().slice(0, 40) + '» (' + e.scrollWidth + ' > ' + e.clientWidth + ')');
			});
		});
		document.querySelectorAll('.katex-error').forEach(function (k) { out.push('KATEX: ' + k.getAttribute('title')); });
		slides.forEach(function (s, i) {
			var w = document.createTreeWalker(s, NodeFilter.SHOW_TEXT);
			while (w.nextNode()) {
				var p = w.currentNode.parentElement;
				if (p.closest('.notes,script,.katex,pre')) continue;
				if (/\\\(|\\\[|\\[a-zA-Z]+\{/.test(w.currentNode.nodeValue)) out.push('MATEMÁTICA SIN RENDERIZAR en diapositiva ' + (i + 1) + ': ' + w.currentNode.nodeValue.trim().slice(0, 60));
			}
		});
		var res = 'VERIFICACIÓN · ' + slides.length + ' diapositivas · ' + document.querySelectorAll('.katex').length + ' fórmulas · ' + document.querySelectorAll('svg.afd').length +
			' diagramas · ' + document.querySelectorAll('pre[data-archivo]').length + ' bloques de código · ' + n + ' afirmaciones y ejemplos · ' + tests.ok + ' pruebas de interacción superadas\n' + (out.length ? out.join('\n') : 'SIN PROBLEMAS');
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
