/* =====================================================================
   PRESENTACIÓN · Inicialización de reveal.js y utilidades didácticas
   - Dibuja los diagramas (diagramas.js) antes de iniciar reveal, para
     que los fragmentos dentro de los SVG queden registrados.
   - Cinta de la ruta pedagógica (.route data-on="1,2").
   - Botones «Ver respuesta» accesibles (aria-expanded / aria-controls).
   - Modo verificación: abre index.html?verificar para obtener un informe
     de desbordes, errores de fórmulas y diagramas inconsistentes.
   ===================================================================== */
(function () {
	'use strict';
	var VERIFY = /[?&]verificar\b/.test(location.search);
	// ?mostrar: todos los fragmentos y respuestas visibles (revisión del docente / capturas).
	if (/[?&]mostrar\b/.test(location.search)) document.documentElement.classList.add('mostrar-todo');
	var STEPS =['Pregunta', 'Analogía', 'Visual', 'Intuición', 'Definición', 'Ejemplo', 'Contraejemplo', 'Reto', 'Respuesta'];

	Diagramas.renderAll();
	// En verificación se quitan las transiciones 3D para medir sin distorsión.
	if (VERIFY) document.querySelectorAll('[data-transition]').forEach(function (s) { s.removeAttribute('data-transition'); });

	document.querySelectorAll('.route').forEach(function (r) {
		var on = (r.dataset.on || '').split(',').map(Number);
		r.setAttribute('aria-label', 'Pasos de la ruta pedagógica en esta diapositiva: ' +
			(on.filter(Boolean).map(function (i) { return STEPS[i - 1]; }).join(', ') || 'todos'));
		STEPS.forEach(function (s, i) {
			var span = document.createElement('span');
			span.textContent = (i + 1) + ' ' + s;
			if (on.indexOf(i + 1) >= 0) span.className = 'on';
			r.appendChild(span);
		});
	});

	function setAnswer(btn, open) {
		var ans = document.getElementById(btn.getAttribute('aria-controls'));
		ans.hidden = !open;
		ans.classList.toggle('show', open);
		btn.setAttribute('aria-expanded', String(open));
		btn.innerHTML = open ? '<i class="fa-solid fa-eye-slash"></i> Ocultar respuesta' : '<i class="fa-solid fa-eye"></i> Ver respuesta';
	}
	document.querySelectorAll('.ans-btn').forEach(function (btn) {
		btn.addEventListener('click', function () {
			setAnswer(btn, btn.getAttribute('aria-expanded') !== 'true');
			btn.blur(); // devuelve el teclado a reveal (espacio / flechas)
		});
	});

	Reveal.initialize({
		hash: true, width: 1280, height: 720, margin: 0.04, center: false,
		controls: true, progress: true, slideNumber: 'c/t',
		transition: VERIFY ? 'none' : 'slide', backgroundTransition: 'fade',
		autoAnimateDuration: 1.1, autoAnimateEasing: 'cubic-bezier(.6,.05,.3,1)',
		viewDistance: VERIFY ? 100 : 3,
		katex: {
			version: '0.16.11',
			delimiters: [
				{ left: '\\[', right: '\\]', display: true },
				{ left: '\\(', right: '\\)', display: false }
			],
			ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']
		},
		plugins: [RevealMath.KaTeX, RevealNotes]
	});

	// Al salir de una diapositiva se ocultan otra vez sus respuestas.
	Reveal.on('slidechanged', function (e) {
		if (!e.previousSlide) return;
		e.previousSlide.querySelectorAll('.ans-btn[aria-expanded="true"]').forEach(function (b) { setAnswer(b, false); });
	});

	if (!VERIFY) return;

	/* ---------- Modo verificación ---------- */
	// Pruebas de interacción: se ejecutan ANTES de medir, sobre el comportamiento real.
	function interactionTests() {
		var out = [], ok = 0;
		function check(cond, msg) { if (cond) ok++; else out.push('INTERACCIÓN: ' + msg); }

		// 1. Cada botón «Ver respuesta» abre y cierra su respuesta y actualiza aria-expanded.
		document.querySelectorAll('.ans-btn').forEach(function (b) {
			var ans = document.getElementById(b.getAttribute('aria-controls'));
			check(ans && ans.hidden, b.getAttribute('aria-controls') + ' debería empezar oculta');
			b.click();
			check(!ans.hidden && b.getAttribute('aria-expanded') === 'true', b.getAttribute('aria-controls') + ' no se abre al hacer clic');
			b.click();
			check(ans.hidden && b.getAttribute('aria-expanded') === 'false', b.getAttribute('aria-controls') + ' no se cierra con el segundo clic');
		});

		// 2. Los fragmentos de la máquina avanzan con «siguiente» y se ven en orden.
		var machine = document.querySelector('.machine').closest('section');
		var idx = Reveal.getIndices(machine);
		Reveal.slide(idx.h, idx.v, -1);
		var total = machine.querySelectorAll('.captions .cap').length;
		check(machine.querySelectorAll('.captions .cap.visible').length === 0, 'la máquina no empieza en el paso 0');
		Reveal.next(); Reveal.next(); Reveal.next();
		check(machine.querySelector('.cap.done').classList.contains('visible'), 'tras 3 clics no se muestra el último subtítulo de la máquina');
		check(total === 4, 'la máquina debería tener 4 subtítulos');

		// 3. Los enlaces del índice llevan a la sección correcta.
		document.querySelectorAll('.toc a.item').forEach(function (a) {
			var target = document.getElementById(a.getAttribute('href').slice(2));
			var t = Reveal.getIndices(target);
			Reveal.slide(t.h, t.v);
			check(Reveal.getCurrentSlide() === target, 'el enlace ' + a.getAttribute('href') + ' no navega a su sección');
		});

		// 4. Al salir de una diapositiva, sus respuestas abiertas vuelven a ocultarse.
		var btn = document.querySelector('.ans-btn'), sec = btn.closest('section'), si = Reveal.getIndices(sec);
		Reveal.slide(si.h, si.v);
		btn.click();
		Reveal.next();
		check(document.getElementById(btn.getAttribute('aria-controls')).hidden, 'las respuestas no se ocultan al cambiar de diapositiva');

		// 5. Navegación global: primera y última diapositiva alcanzables.
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
			var box = s.getBoundingClientRect();
			s.querySelectorAll('.panel, .def, .reto, .ex, .item, .step, .note, svg.dg, .captions, table').forEach(function (e) {
				var r = e.getBoundingClientRect(), sc = box.height / 720;
				if (r.bottom - box.top > (720 - 6) * sc) out.push('FUERA DEL LIENZO ' + id + ': <' + e.tagName.toLowerCase() + ' class="' + (e.getAttribute('class') || '') + '"> baja hasta ' + Math.round((r.bottom - box.top) / sc) + 'px');
			});
			// Texto que rebasa su propia caja
			s.querySelectorAll('.step, .item, .ex, .def .body, .figcap, .cap, .verdict, .dg-badge, .nodec').forEach(function (e) {
				if (e.scrollWidth > e.clientWidth + 2) out.push('TEXTO CORTADO ' + id + ': ' + e.className + ' «' + e.textContent.trim().slice(0, 40) + '»');
			});
		});
		var kerr = document.querySelectorAll('.katex-error');
		kerr.forEach(function (k) { out.push('KATEX: ' + k.getAttribute('title')); });
		var raw = [];
		slides.forEach(function (s, i) {
			var w = document.createTreeWalker(s, NodeFilter.SHOW_TEXT);
			while (w.nextNode()) {
				var p = w.currentNode.parentElement;
				if (p.closest('.notes,script,.katex')) continue;
				if (/\\\(|\\\[|\\[a-zA-Z]+/.test(w.currentNode.nodeValue)) raw.push((i + 1) + ': ' + w.currentNode.nodeValue.trim().slice(0, 60));
			}
		});
		raw.forEach(function (r) { out.push('MATEMÁTICA SIN RENDERIZAR en diapositiva ' + r); });
		(window.__diagErrors || []).forEach(function (e) { out.push('DIAGRAMA: ' + e); });
		var res = 'VERIFICACIÓN · ' + slides.length + ' diapositivas · ' + document.querySelectorAll('.mapdiag,.reldiag').length +
			' diagramas · ' + document.querySelectorAll('.katex').length + ' fórmulas · ' + tests.ok + ' pruebas de interacción superadas\n' + (out.length ? out.join('\n') : 'SIN PROBLEMAS');
		var pre = document.createElement('pre');
		pre.id = 'verif-report';
		pre.textContent = res;
		document.body.appendChild(pre);
		document.title = out.length ? 'VERIF-FALLA' : 'VERIF-OK';
		console.log(res);
	}
	// Espera a que KaTeX (carga asíncrona desde CDN) haya renderizado.
	Reveal.on('ready', function () {
		var t0 = Date.now();
		(function wait() {
			if (document.querySelector('.katex') || Date.now() - t0 > 15000) setTimeout(report, 500);
			else setTimeout(wait, 200);
		})();
	});
})();
