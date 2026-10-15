/* =====================================================================
   RECURSIVIDAD · Inicialización de reveal.js y piezas interactivas
   - Resaltado de sintaxis de los bloques <pre><code> (antes de reveal).
   - Cinta de la ruta didáctica (.route data-on="1,2").
   - Foto dentro de una foto: dibujada por una función recursiva.
   - Laboratorio de la pila de llamadas (factorial real instrumentado).
   - Simulación controlada de recursión infinita (nunca se ejecuta).
   - Recorrido recursivo del árbol de carpetas.
   - Botones «Ver respuesta» accesibles (aria-expanded / aria-controls).
   - ?verificar: informe de desbordes, fórmulas y pruebas de interacción.
   - ?mostrar: todos los fragmentos visibles (revisión / capturas).
   ===================================================================== */
(function () {
	'use strict';
	var VERIFY = /[?&]verificar\b/.test(location.search);
	if (/[?&]mostrar\b/.test(location.search)) document.documentElement.classList.add('mostrar-todo');
	var STEPS = ['Historia', 'Dibujo', 'Matemáticas', 'Código', 'Práctica'];
	function $(id) { return document.getElementById(id); }
	function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

	/* ---------- Resaltado de sintaxis ---------- */
	var TOKENS = /(\/\/.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|\b(function|if|else|return|throw|new|for|let|const|of|función|si|terminar|mostrar)(?![\wáéíóú])|\b(\d+(?:\.\d+)?)\b|([A-Za-z_]\w*)(?=\()/gm;
	document.querySelectorAll('.code pre code').forEach(function (code) {
		var src = code.textContent, out = '', last = 0;
		src.replace(TOKENS, function (m, com, str, kw, num, fn, at) {
			out += esc(src.slice(last, at));
			var cls = com ? 'c' : str ? 's' : kw ? 'k' : num ? 'n' : 'f';
			out += '<span class="' + cls + '">' + esc(m) + '</span>';
			last = at + m.length;
			return m;
		});
		code.innerHTML = out + esc(src.slice(last));
	});

	/* ---------- Ruta didáctica ---------- */
	document.querySelectorAll('.route').forEach(function (r) {
		var on = (r.dataset.on || '').split(',').map(Number);
		r.setAttribute('aria-label', 'Etapa de la ruta: ' + on.filter(Boolean).map(function (i) { return STEPS[i - 1]; }).join(', '));
		STEPS.forEach(function (s, i) {
			var span = document.createElement('span');
			span.textContent = (i + 1) + ' ' + s;
			if (on.indexOf(i + 1) >= 0) span.className = 'on';
			r.appendChild(span);
		});
	});

	/* ---------- Foto dentro de una foto (dibujo recursivo) ---------- */
	var SVGNS = 'http://www.w3.org/2000/svg';
	function el(parent, tag, attrs) {
		var e = document.createElementNS(SVGNS, tag);
		for (var k in attrs) e.setAttribute(k, attrs[k]);
		parent.appendChild(e);
		return e;
	}
	// Dibuja una foto (marco + persona) y, dentro de la foto que sostiene la persona,
	// se vuelve a dibujar a sí misma más pequeña. Caso base: foto demasiado pequeña.
	function dibujarFoto(g, x, y, w, h, nivel) {
		if (nivel === 0 || w < 12) return;                                       // caso base
		el(g, 'rect', { x: x, y: y, width: w, height: h, rx: w * 0.03, class: 'box', 'stroke-width': Math.max(1, w / 110) });
		var s = w / 300, lw = Math.max(1, 2.5 * s);
		el(g, 'circle', { cx: x + 80 * s, cy: y + 58 * s, r: 24 * s, class: 'face', 'stroke-width': lw });
		el(g, 'path', { d: 'M' + (x + 40 * s) + ' ' + (y + h) + ' Q' + (x + 80 * s) + ' ' + (y + 80 * s) + ' ' + (x + 120 * s) + ' ' + (y + h), class: 'box ac', 'stroke-width': lw });
		el(g, 'path', { d: 'M' + (x + 110 * s) + ' ' + (y + 125 * s) + ' L' + (x + 140 * s) + ' ' + (y + 112 * s), class: 'ln', 'stroke-width': lw });
		dibujarFoto(g, x + 140 * s, y + 52 * s, w * 0.48, h * 0.48, nivel - 1);  // caso recursivo
	}
	var droste = $('droste');
	if (droste) dibujarFoto(droste, 2, 2, 296, 186, 6);

	/* ---------- Laboratorio: pila de llamadas de factorial(n) ---------- */
	// Ejecuta la función factorial real y registra cada llamada y cada retorno.
	function trazarFactorial(n) {
		var eventos = [];
		function factorial(k) {
			eventos.push({ tipo: 'llamada', k: k });
			var r = k === 0 ? 1 : k * factorial(k - 1);
			eventos.push({ tipo: 'retorno', k: k, r: r });
			return r;
		}
		return { eventos: eventos, resultado: factorial(n) };
	}
	var lab = { n: 4, paso: 0, traza: trazarFactorial(4) };
	function labRender() {
		if (!$('lab-stack')) return;
		var ev = lab.traza.eventos, pila = [], ret = {};
		for (var i = 0; i < lab.paso; i++) {
			if (ev[i].tipo === 'llamada') pila.push(ev[i].k);
			else { pila.pop(); ret[ev[i].k] = ev[i].r; }
		}
		var ultimo = ev[lab.paso - 1];
		var box = $('lab-stack');
		box.innerHTML = '';
		pila.forEach(function (k, j) {
			var f = document.createElement('div'), tope = j === pila.length - 1;
			f.className = 'frame' + (k === 0 ? ' base' : '') + (tope ? ' top' : '') + (tope && ultimo && ultimo.tipo === 'llamada' ? ' new' : '');
			var estado = k === 0 ? '<span class="val"><i class="fa-solid fa-flag-checkered"></i> caso base: 1</span>'
				: (ret[k - 1] !== undefined ? '<span class="val">' + k + ' × ' + ret[k - 1] + ' = ' + k * ret[k - 1] + '</span>'
					: '<span class="wait"><i class="fa-solid fa-hourglass-half"></i> ' + k + ' × ?</span>');
			f.innerHTML = '<span class="nm">factorial(' + k + ')</span><span class="st">' + estado + '</span>';
			box.appendChild(f);
		});
		var log = ev.slice(0, lab.paso).map(function (e) {
			var sangria = new Array(lab.n - e.k + 1).join('  ');
			return e.tipo === 'llamada' ? '<span class="push">' + sangria + '→ factorial(' + e.k + ')</span>'
				: '<span class="pop">' + sangria + '← factorial(' + e.k + ') retorna ' + e.r + '</span>';
		});
		$('lab-log').innerHTML = log.slice(-9).join('') || '<span class="muted">Aún no hay llamadas.</span>';
		$('lab-cont').textContent = 'paso ' + lab.paso + ' de ' + ev.length;
		var msg;
		if (!ultimo) msg = 'Pulsa <b>Siguiente paso</b> para llamar a <span class="mono">factorial(' + lab.n + ')</span>.';
		else if (lab.paso === ev.length) msg = '<i class="fa-solid fa-circle-check ac"></i> La pila está vacía. Resultado: <b>factorial(' + lab.n + ') = ' + lab.traza.resultado + '</b>';
		else if (ultimo.tipo === 'llamada' && ultimo.k === 0) msg = '<span class="kw base">caso base</span> <span class="mono">factorial(0)</span> ya sabe la respuesta: 1.';
		else if (ultimo.tipo === 'llamada') msg = '<span class="kw llam">llamada</span> Se apila <span class="mono">factorial(' + ultimo.k + ')</span>; queda pendiente ' + ultimo.k + ' × ?';
		else msg = '<span class="kw ret">retorno</span> Se quita <span class="mono">factorial(' + ultimo.k + ')</span> y entrega ' + ultimo.r + ' a la llamada de abajo.';
		$('lab-status').innerHTML = msg;
		$('lab-menos').disabled = lab.n <= 0;
		$('lab-mas').disabled = lab.n >= 6;
		$('lab-atras').disabled = lab.paso === 0;
		$('lab-paso').disabled = lab.paso === ev.length;
	}
	function labSet(n) { lab.n = n; lab.paso = 0; lab.traza = trazarFactorial(n); labRender(); }
	function onClick(id, fn) {
		var b = $(id);
		if (b) b.addEventListener('click', function () { fn(); b.blur(); }); // devuelve el teclado a reveal
	}
	onClick('lab-menos', function () { labSet(Math.max(0, lab.n - 1)); });
	onClick('lab-mas', function () { labSet(Math.min(6, lab.n + 1)); });
	onClick('lab-paso', function () { lab.paso = Math.min(lab.traza.eventos.length, lab.paso + 1); labRender(); });
	onClick('lab-atras', function () { lab.paso = Math.max(0, lab.paso - 1); labRender(); });
	onClick('lab-reset', function () { labSet(lab.n); });
	labRender();

	/* ---------- Simulación controlada de recursión infinita ----------
	   No ejecuta contar(n) sin caso base: solo imita lo que mostraría el navegador. */
	var LIMITE = 10000, sim = { timer: null, prof: 0, lineas: [] };
	function simPintar() {
		$('sim-out').innerHTML = sim.lineas.slice(-6).join('');
		$('sim-prof').textContent = 'profundidad ' + sim.prof.toLocaleString('es-MX');
		$('sim-meter').style.width = (100 * sim.prof / LIMITE) + '%';
	}
	function simPaso() {
		if (sim.prof >= LIMITE) {
			sim.lineas.push('<span class="err">✗ RangeError: Maximum call stack size exceeded</span>');
			simParar();
			simPintar();
			return false;
		}
		var antes = sim.prof;
		sim.prof = sim.prof < 12 ? sim.prof + 1 : Math.min(LIMITE, Math.round(sim.prof * 1.7));
		if (sim.prof - antes > 1) sim.lineas.push('<span class="muted">… ' + (sim.prof - antes - 1).toLocaleString('es-MX') + ' líneas más …</span>');
		sim.lineas.push('<span>' + (5 - sim.prof + 1) + '</span>');
		simPintar();
		return true;
	}
	function simParar() { clearInterval(sim.timer); sim.timer = null; if ($('sim-run')) $('sim-run').disabled = false; }
	function simReset() { simParar(); sim.prof = 0; sim.lineas = ['<span class="muted">Pulsa «Simular contar(5)».</span>']; simPintar(); }
	onClick('sim-run', function () {
		simReset();
		sim.lineas = [];
		$('sim-run').disabled = true;
		sim.timer = setInterval(simPaso, 160);
	});
	onClick('sim-reset', simReset);

	/* ---------- Recorrido recursivo del árbol de carpetas ---------- */
	// Misma idea que contarArchivos(carpeta), pero sobre la lista anidada de la diapositiva.
	function contarArchivosDOM(li, pasos) {
		var total = 0;
		pasos.push({ on: li });
		Array.prototype.forEach.call(li.querySelector(':scope > ul').children, function (hijo) {
			if (hijo.classList.contains('file')) { total += 1; pasos.push({ on: hijo }); }   // caso base
			else total += contarArchivosDOM(hijo, pasos);                                     // subcarpeta
		});
		pasos.push({ fin: li, total: total });
		return total;
	}
	var arbolTimers = [];
	function arbolReset() {
		arbolTimers.forEach(clearTimeout); arbolTimers = [];
		document.querySelectorAll('#arbol .nd').forEach(function (n) { n.classList.remove('on', 'seen'); });
		if ($('arbol-run')) $('arbol-run').disabled = false;
	}
	function arbolAplicar(p) {
		document.querySelectorAll('#arbol .nd.on').forEach(function (n) { n.classList.remove('on'); n.classList.add('seen'); });
		var li = p.on || p.fin, nd = li.querySelector(':scope > .nd');
		nd.classList.add('on');
		if (p.fin) {
			nd.querySelector('.cnt').textContent = p.total + (p.total === 1 ? ' archivo' : ' archivos');
			$('arbol-msg').innerHTML = 'Termina <b>' + nd.textContent.replace(/\d+ archivos?/, '').trim() + '</b> y regresa su total: <b>' + p.total + '</b>.';
		} else {
			$('arbol-msg').innerHTML = li.classList.contains('dir') ? 'Entra en una carpeta: <b>llamada recursiva</b>.' : 'Un archivo: <b>suma 1</b> (caso base).';
		}
	}
	function arbolContar(sincrono) {
		arbolReset();
		var pasos = [], total = contarArchivosDOM(document.querySelector('#arbol > ul > li'), pasos);
		if (sincrono) { pasos.forEach(arbolAplicar); return total; }
		$('arbol-run').disabled = true;
		pasos.forEach(function (p, i) { arbolTimers.push(setTimeout(function () { arbolAplicar(p); }, 550 * i)); });
		arbolTimers.push(setTimeout(function () {
			$('arbol-msg').innerHTML = '<i class="fa-solid fa-circle-check ac"></i> Total: <b>' + total + ' archivos</b> en todas las carpetas.';
			$('arbol-run').disabled = false;
		}, 550 * pasos.length));
		return total;
	}
	onClick('arbol-run', function () { arbolContar(false); });

	/* ---------- Botones «Ver respuesta» ---------- */
	function setAnswer(btn, open) {
		var ans = $(btn.getAttribute('aria-controls'));
		ans.hidden = !open;
		ans.classList.toggle('show', open);
		btn.setAttribute('aria-expanded', String(open));
		btn.innerHTML = open ? '<i class="fa-solid fa-eye-slash"></i> Ocultar respuesta' : '<i class="fa-solid fa-eye"></i> Ver respuesta';
	}
	document.querySelectorAll('.ans-btn').forEach(function (btn) {
		btn.addEventListener('click', function () { setAnswer(btn, btn.getAttribute('aria-expanded') !== 'true'); btn.blur(); });
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

	// Al salir de una diapositiva se detienen sus animaciones y se ocultan sus respuestas.
	Reveal.on('slidechanged', function (e) {
		if (!e.previousSlide) return;
		e.previousSlide.querySelectorAll('.ans-btn[aria-expanded="true"]').forEach(function (b) { setAnswer(b, false); });
		if (e.previousSlide.id === 'sin-caso-base') simReset();
		if (e.previousSlide.id === 'usos') arbolReset();
	});

	if (!VERIFY) return;

	/* ---------- Modo verificación ---------- */
	function interactionTests() {
		var out = [], ok = 0;
		function check(cond, msg) { if (cond) ok++; else out.push('INTERACCIÓN: ' + msg); }

		// 1. Botones «Ver respuesta».
		document.querySelectorAll('.ans-btn').forEach(function (b) {
			var ans = $(b.getAttribute('aria-controls'));
			check(ans && ans.hidden, 'la respuesta debería empezar oculta');
			b.click();
			check(!ans.hidden && b.getAttribute('aria-expanded') === 'true', 'la respuesta no se abre');
			b.click();
			check(ans.hidden && b.getAttribute('aria-expanded') === 'false', 'la respuesta no se cierra');
		});
		// 2. Laboratorio: factorial(4) termina en 24 con la pila vacía; factorial(0) en 2 pasos.
		labSet(4);
		check($('lab-stack').children.length === 0, 'el laboratorio no empieza con la pila vacía');
		for (var i = 0; i < 5; i++) $('lab-paso').click();
		check($('lab-stack').children.length === 5 && $('lab-stack').lastChild.classList.contains('base'), 'tras 5 pasos la pila debería tener 5 llamadas con el caso base arriba');
		for (i = 0; i < 20; i++) $('lab-paso').click();
		check($('lab-stack').children.length === 0 && /= 24/.test($('lab-status').textContent), 'el laboratorio no termina en factorial(4) = 24');
		check($('lab-paso').disabled, '«Siguiente paso» debería deshabilitarse al terminar');
		$('lab-atras').click();
		check($('lab-stack').children.length === 1, '«Paso anterior» no regresa un paso');
		labSet(0); $('lab-paso').click(); $('lab-paso').click();
		check(/= 1/.test($('lab-status').textContent), 'factorial(0) no da 1 en el laboratorio');
		[1, 2, 3, 5, 6].forEach(function (n) {
			var f = 1; for (var k = 2; k <= n; k++) f *= k;
			check(trazarFactorial(n).resultado === f && trazarFactorial(n).eventos.length === 2 * (n + 1), 'traza incorrecta para n = ' + n);
		});
		labSet(4);
		// 3. Simulación: llega al error sin ejecutar recursión real.
		simReset(); sim.lineas = [];
		var guard = 0; while (simPaso() && guard++ < 100) { /* avanza */ }
		check(/RangeError/.test($('sim-out').textContent) && sim.prof === LIMITE, 'la simulación no termina con RangeError');
		simReset();
		// 4. Árbol de carpetas: 5 archivos en total y 2 en «Fotos».
		check(arbolContar(true) === 5, 'el recorrido del árbol no cuenta 5 archivos');
		check(/3 archivos/.test(document.querySelectorAll('#arbol .cnt')[1].textContent), '«Fotos» debería contener 3 archivos');
		arbolReset();
		// 5. La pila de la diapositiva 12 se recorre con 10 clics.
		var pila = $('pila'), pi = Reveal.getIndices(pila);
		Reveal.slide(pi.h, pi.v, -1);
		var n = 0; while (Reveal.nextFragment()) n++;
		check(n === 10, 'la pila de llamadas debería tener 10 pasos (tiene ' + n + ')');
		check(pila.querySelector('.cap.done').classList.contains('visible'), 'el último subtítulo de la pila no se muestra');
		// 6. Navegación.
		Reveal.slide(0, 0);
		check(Reveal.isFirstSlide(), 'no se puede volver a la portada');
		var last = Reveal.getSlides().slice(-1)[0], li = Reveal.getIndices(last);
		Reveal.slide(li.h, li.v);
		check(Reveal.isLastSlide(), 'no se llega a la última diapositiva');
		Reveal.slide(0, 0);
		return { out: out, ok: ok };
	}

	function report() {
		var tests = interactionTests();
		var out = tests.out.slice(), slides = Reveal.getSlides();
		document.querySelectorAll('.ans-btn').forEach(function (b) { setAnswer(b, true); });
		slides.forEach(function (s, i) {
			s.style.display = 'block';
			var id = (i + 1) + ' «' + ((s.querySelector('h1,h2') || {}).textContent || '').trim().slice(0, 50) + '»';
			if (s.scrollHeight > 722) out.push('DESBORDE VERTICAL ' + id + ': ' + s.scrollHeight + 'px');
			if (s.scrollWidth > 1282) out.push('DESBORDE HORIZONTAL ' + id + ': ' + s.scrollWidth + 'px');
			var box = s.getBoundingClientRect(), sc = box.height / 720;
			s.querySelectorAll('.panel, .def, .code, .console, .item, .step, .note, .captions, table, .qz, .ci, .stack, .trace, .big-idea, .quote, svg.ill, .lab-ctrl').forEach(function (e) {
				var r = e.getBoundingClientRect();
				if (r.bottom - box.top > (720 - 6) * sc) out.push('FUERA DEL LIENZO ' + id + ': <' + e.tagName.toLowerCase() + ' class="' + (e.getAttribute('class') || '') + '"> baja hasta ' + Math.round((r.bottom - box.top) / sc) + 'px');
				if (r.right - box.left > (1280 - 4) * sc) out.push('FUERA DEL LIENZO (derecha) ' + id + ': <' + e.tagName.toLowerCase() + ' class="' + (e.getAttribute('class') || '') + '"> llega hasta ' + Math.round((r.right - box.left) / sc) + 'px');
			});
			s.querySelectorAll('.step, .item, .def .body, .figcap, .cap, .verdict, .call, .tc, .frame, .qz, .ci, .code pre, .bubble').forEach(function (e) {
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
		var res = 'VERIFICACIÓN · ' + slides.length + ' diapositivas · ' + document.querySelectorAll('.katex').length + ' fórmulas · ' +
			document.querySelectorAll('.code pre').length + ' bloques de código · ' + tests.ok + ' pruebas de interacción superadas\n' + (out.length ? out.join('\n') : 'SIN PROBLEMAS');
		var pre = document.createElement('pre');
		pre.id = 'verif-report';
		pre.textContent = res;
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
