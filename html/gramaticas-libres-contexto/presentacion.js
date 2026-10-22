/* =====================================================================
   GRAMÁTICAS LIBRES DE CONTEXTO · Inicialización de reveal.js y piezas generadas
   Todo sale de glc.js (una sola fuente de verdad):
   - [data-f]                 forma sentencial con fichas de colores.
   - [data-gram]              gramática (variables, flechas y alternativas).
   - [data-deriv][data-g]     derivación comprobada; resalta la variable que se
                              reemplaza y los símbolos nuevos (un clic por paso).
   - [data-arbol]             árbol de derivación en SVG (crece paso a paso).
   - [data-arcos]             cadena con arcos que unen las parejas de terminales
                              que puso la misma regla.
   - [data-pertenece]         las fichas .cad de dentro están (o no, .fuera) en L(G).
   - Laboratorio, ?verificar y ?mostrar.
   ===================================================================== */
(function () {
	'use strict';
	var G = window.GLC, EPS = G.EPS;
	var VERIFY = /[?&]verificar\b/.test(location.search);
	var MOSTRAR = /[?&]mostrar\b/.test(location.search);
	if (MOSTRAR) document.documentElement.classList.add('mostrar-todo');
	var errores = [];
	function $(id) { return document.getElementById(id); }
	function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
	function cuidado(el, fn) {
		try { fn(); } catch (e) {
			errores.push('MOTOR: ' + e.message + ' (' + (el.dataset.deriv || el.dataset.arbol || el.dataset.arcos || el.dataset.gram || '') + ')');
			el.innerHTML = '<span class="motor-error"><i class="fa-solid fa-triangle-exclamation"></i> ' + esc(e.message) + '</span>';
		}
	}

	/* ---------- Fichas ---------- */
	function clase(x) { return x === EPS ? 'sy-e' : G.esVariable(x) ? 'sy-v' : 'sy-t'; }
	function sy(x, extra, attrs) {
		return '<span class="sy ' + clase(x) + (extra ? ' ' + extra : '') + '"' + (attrs || '') + '>' + esc(x) + '</span>';
	}
	function forma(lista, op) {
		op = op || {};
		if (!lista.length) return sy(EPS, op.nuevoDesde !== undefined ? 'nuevo' : '');
		return lista.map(function (x, i) {
			if (i === op.marca) return sy(x, op.marcaFija ? 'marca fija' : 'marca fragment custom', op.marcaFija ? '' : ' data-fragment-index="' + op.marcaIdx + '"');
			return sy(x, op.nuevoDesde !== undefined && i >= op.nuevoDesde && i < op.nuevoHasta ? 'nuevo' : '');
		}).join('');
	}
	document.querySelectorAll('[data-f]').forEach(function (el) {
		el.innerHTML = forma(G.simbolos(el.dataset.f));
		el.classList.add('forma');
	});

	/* ---------- Gramáticas ---------- */
	function alternativa(der) { return '<span class="forma">' + forma(der) + '</span>'; }
	function gramHTML(g, separadas) {
		var html = '';
		g.V.forEach(function (A) {
			var rs = g.P.filter(function (r) { return r.izq === A; });
			if (separadas) {
				rs.forEach(function (r) { html += '<div class="prod"><span class="forma">' + sy(A) + '</span><span class="fl">→</span>' + alternativa(r.der) + '</div>'; });
			} else {
				html += '<div class="prod"><span class="forma">' + sy(A) + '</span><span class="fl">→</span>' +
					rs.map(function (r) { return alternativa(r.der); }).join('<span class="alt">|</span>') + '</div>';
			}
		});
		return html;
	}
	document.querySelectorAll('[data-gram]').forEach(function (el) {
		cuidado(el, function () {
			el.innerHTML = gramHTML(G.gramatica(el.dataset.gram, true), 'separadas' in el.dataset);
			el.classList.add('prods');
		});
	});

	/* ---------- Derivaciones ---------- */
	function derivHTML(d, op) {
		var idx = op.indice, html = '', frag = op.fragmentos;
		if (op.modo === 'tabla') {
			html = '<thead><tr><th>Paso</th><th>Forma</th><th>Regla aplicada</th>' + (op.notas ? '<th>¿Qué pasó?</th>' : '') + '</tr></thead><tbody>';
			d.formas.forEach(function (f, i) {
				var p = d.pasos[i - 1], sig = d.pasos[i];
				var o = { marca: sig ? sig.pos : undefined, marcaFija: !frag, marcaIdx: idx + i };
				if (p) { o.nuevoDesde = p.pos; o.nuevoHasta = p.pos + p.regla.der.length; }
				html += '<tr' + (i && frag ? ' class="fragment" data-fragment-index="' + (idx + i - 1) + '"' : '') + '>' +
					'<td class="n">' + i + '</td><td><span class="forma">' + forma(f, o) + '</span>' +
					(i === d.formas.length - 1 && d.completa ? ' <span class="fin-ok"><i class="fa-solid fa-flag-checkered"></i> solo terminales</span>' : '') + '</td>' +
					'<td class="rg">' + (p ? '<span class="regla">' + esc(G.regla(p.regla)) + '</span>' : '<span class="muted">inicio</span>') + '</td>' +
					(op.notas ? '<td class="nota">' + (op.notas[i] || '') + '</td>' : '') + '</tr>';
			});
			return html + '</tbody>';
		}
		d.formas.forEach(function (f, i) {
			var p = d.pasos[i - 1], sig = d.pasos[i];
			var o = { marca: op.marcar && sig ? sig.pos : undefined, marcaFija: !frag, marcaIdx: idx + i };
			if (p && op.marcar) { o.nuevoDesde = p.pos; o.nuevoHasta = p.pos + p.regla.der.length; }
			var fragAttr = i && frag ? ' fragment" data-fragment-index="' + (idx + i - 1) + '"' : '"';
			if (i) {
				html += '<span class="paso' + fragAttr + '><span class="dd">⇒' +
					(op.reglas ? '<span class="rl">' + esc(G.regla(p.regla)) + '</span>' : '') + '</span>';
			}
			html += '<span class="forma">' + forma(f, o) + '</span>';
			if (i) html += '</span>';
		});
		return html;
	}
	document.querySelectorAll('[data-deriv]').forEach(function (el) {
		cuidado(el, function () {
			var g = G.gramatica(el.dataset.g), d = G.derivacion(g, el.dataset.deriv), ds = el.dataset;
			if (ds.cadena !== undefined && d.cadena !== ds.cadena) throw new Error('la derivación termina en ' + d.cadena + ', no en ' + ds.cadena);
			el.innerHTML = derivHTML(d, {
				modo: ds.modo, indice: +(ds.indice || 1), fragmentos: !el.closest('[data-sin-fragmentos]'),
				marcar: !('sinMarcas' in ds), reglas: 'reglas' in ds, notas: ds.notas && ds.notas.split('|')
			});
			el.classList.add(ds.modo === 'tabla' ? 'dertab' : 'deriv');
		});
	});

	/* ---------- Árboles de derivación (SVG) ---------- */
	function anchoNodo(s) { return Math.max(34, 16 + 14 * s.length); }
	function nodoSVG(n, ph) {
		var x = n.x, y = n.y, s = esc(n.s);
		if (ph) return '<rect class="nd-ph" x="' + (x - 17) + '" y="' + (y - 17) + '" width="34" height="34" rx="8"/><text class="nd-txt ph" x="' + x + '" y="' + y + '">?</text>';
		if (n.eps) return '<rect class="nd-e" x="' + (x - 17) + '" y="' + (y - 17) + '" width="34" height="34" rx="8"/><text class="nd-txt e" x="' + x + '" y="' + y + '">ε</text>';
		if (G.esVariable(n.s)) return '<circle class="nd-v" cx="' + x + '" cy="' + y + '" r="21"/><text class="nd-txt v" x="' + x + '" y="' + y + '">' + s + '</text>';
		var w = anchoNodo(n.s);
		return '<rect class="nd-t" x="' + (x - w / 2) + '" y="' + (y - 17) + '" width="' + w + '" height="34" rx="8"/><text class="nd-txt t" x="' + x + '" y="' + y + '">' + s + '</text>';
	}
	function arbolSVG(t, op) {
		var DX = op.dx || 58, DY = op.dy || 70, M = 26, hs = t.hojas, prof = 0;
		hs.forEach(function (h, i) { h.x = M + DX / 2 + i * DX; });
		(function ubicar(n, d) {
			n.y = M + d * DY; prof = Math.max(prof, d);
			if (n.hijos) {
				n.hijos.forEach(function (h) { ubicar(h, d + 1); });
				n.x = (n.hijos[0].x + n.hijos[n.hijos.length - 1].x) / 2;
			}
		})(t.raiz, 0);
		var W = 2 * M + hs.length * DX, yL = M + (prof + 1) * DY + 6, H = op.lectura ? yL + 52 : M + prof * DY + 24;
		var grupos = {}, maxPaso = t.derivacion.pasos.length;
		function g(k) { return grupos[k] || (grupos[k] = { aristas: '', nodos: '', ph: '' }); }
		(function recorrer(n) {
			if (!n.hijos) return;
			n.hijos.forEach(function (h) {
				g(h.nace).aristas += '<line class="ar" x1="' + n.x + '" y1="' + (n.y + 21) + '" x2="' + h.x + '" y2="' + (h.y - 18) + '"/>';
				recorrer(h);
			});
		})(t.raiz);
		(function nodos(n) {
			g(n.nace).nodos += nodoSVG(n);
			if (op.plantilla && n.nace > 0) g(n.nace).ph += nodoSVG(n, true);
			(n.hijos || []).forEach(nodos);
		})(t.raiz);
		var esc0 = Math.min(op.escala || 1, op.maxAncho ? op.maxAncho / W : 1, op.maxAlto ? op.maxAlto / H : 1);
		var svg = '<svg class="arbol-svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + Math.round(W * esc0) + '" height="' + Math.round(H * esc0) + '" role="img" aria-label="Árbol de derivación de ' + esc(t.cadena) + '">';
		var aristas = '', nodosHTML = '';
		for (var k = 0; k <= maxPaso; k++) {
			var gr = grupos[k];
			if (!gr) continue;
			var idx = op.indice + k - 1;
			if (k === 0 || !op.crece) { aristas += gr.aristas; nodosHTML += gr.nodos; }
			else if (op.plantilla) {
				aristas += gr.aristas;
				nodosHTML += '<g class="fragment fade-out" data-fragment-index="' + idx + '">' + gr.ph + '</g><g class="fragment" data-fragment-index="' + idx + '">' + gr.nodos + '</g>';
			} else {
				aristas += '<g class="fragment" data-fragment-index="' + idx + '">' + gr.aristas + '</g>';
				nodosHTML += '<g class="fragment" data-fragment-index="' + idx + '">' + gr.nodos + '</g>';
			}
		}
		svg += aristas + nodosHTML;
		if (op.lectura) {
			var lec = '<text class="lec-et" x="' + (M - 6) + '" y="' + (yL + 17) + '">' + '</text>';
			hs.forEach(function (h) {
				if (h.eps) return;
				var w = anchoNodo(h.s);
				lec += '<line class="lec-ln" x1="' + h.x + '" y1="' + (h.y + 18) + '" x2="' + h.x + '" y2="' + yL + '"/>' +
					'<rect class="lec-t" x="' + (h.x - w / 2) + '" y="' + yL + '" width="' + w + '" height="34" rx="8"/><text class="nd-txt t" x="' + h.x + '" y="' + (yL + 17) + '">' + esc(h.s) + '</text>';
			});
			var xs = hs.filter(function (h) { return !h.eps; }).map(function (h) { return h.x; });
			lec += '<path class="lec-fl" d="M' + (xs[0] - 22) + ' ' + (yL + 44) + ' L' + (xs[xs.length - 1] + 22) + ' ' + (yL + 44) + '"/>' +
				'<path class="lec-pt" d="M' + (xs[xs.length - 1] + 22) + ' ' + (yL + 39) + ' l9 5 l-9 5 z"/>';
			svg += op.lectura === true ? lec : '<g class="fragment" data-fragment-index="' + op.lectura + '">' + lec + '</g>';
		}
		return svg + '</svg>';
	}
	document.querySelectorAll('[data-arbol]').forEach(function (el) {
		cuidado(el, function () {
			var ds = el.dataset, t = G.arbol(G.gramatica(ds.g), ds.arbol);
			if (ds.cadena !== undefined && G.lectura(t.raiz) !== ds.cadena) throw new Error('las hojas dicen ' + G.lectura(t.raiz) + ', no ' + ds.cadena);
			el.innerHTML = arbolSVG(t, {
				crece: 'crece' in ds, plantilla: 'plantilla' in ds, indice: +(ds.indice || 1), escala: ds.escala && +ds.escala,
				lectura: ds.lectura === undefined ? false : ds.lectura === '' ? true : +ds.lectura, dx: ds.dx && +ds.dx, dy: ds.dy && +ds.dy
			});
			el.classList.add('arbol');
		});
	});

	/* ---------- Arcos: parejas de terminales que puso la misma regla ---------- */
	document.querySelectorAll('[data-arcos]').forEach(function (el) {
		cuidado(el, function () {
			var ds = el.dataset, t = G.arbol(G.gramatica(ds.g), ds.arcos), W = 50, hs = t.hojas.filter(function (h) { return !h.eps; });
			var pos = new Map(), arcos = [];
			hs.forEach(function (h, i) { pos.set(h, i); });
			(function rec(n) {
				if (!n.hijos) return;
				var ts = n.hijos.filter(function (h) { return !h.hijos && !h.eps; });
				if (ts.length === 2) arcos.push({ i: pos.get(ts[0]), j: pos.get(ts[1]), paso: n.expande });
				n.hijos.forEach(rec);
			})(t.raiz);
			var maxSpan = Math.max.apply(null, arcos.map(function (a) { return a.j - a.i; }).concat([1]));
			var top = 18 + maxSpan * 18, H = top + 46, Wt = hs.length * W + 8;
			var svg = '<svg class="arcos-svg" viewBox="0 0 ' + Wt + ' ' + H + '" width="' + Wt * (+(ds.escala || 1)) + '" height="' + H * (+(ds.escala || 1)) + '" role="img" aria-label="Parejas de ' + esc(t.cadena) + '">';
			arcos.forEach(function (a) {
				var x1 = 4 + a.i * W + W / 2, x2 = 4 + a.j * W + W / 2, h = 14 + (a.j - a.i) * 18;
				var attr = 'crece' in ds ? ' class="fragment" data-fragment-index="' + ((+(ds.indice || 1)) + a.paso - 1) + '"' : '';
				svg += '<g' + attr + '><path class="arco" d="M' + x1 + ' ' + (top - 2) + ' C' + x1 + ' ' + (top - h) + ' ' + x2 + ' ' + (top - h) + ' ' + x2 + ' ' + (top - 2) + '"/>' +
					'<text class="arco-n" x="' + (x1 + x2) / 2 + '" y="' + (top - h * 0.75 - 4) + '">' + a.paso + '</text></g>';
			});
			hs.forEach(function (h, i) {
				var x = 4 + i * W + 4;
				svg += '<rect class="nd-t" x="' + x + '" y="' + top + '" width="' + (W - 8) + '" height="38" rx="8"/><text class="nd-txt t big" x="' + (x + (W - 8) / 2) + '" y="' + (top + 19) + '">' + esc(h.s) + '</text>';
			});
			el.innerHTML = svg + '</svg>';
			el.classList.add('arcos');
		});
	});

	/* ---------- Laboratorio ---------- */
	function labRun() {
		var out = $('lab-out'), err = $('lab-err');
		out.innerHTML = ''; err.textContent = '';
		try {
			var g = G.gramatica($('lab-g').value), w = $('lab-w').value.trim() || EPS;
			G.simbolos(w).forEach(function (x) { if (G.esVariable(x)) throw new Error('la cadena solo puede tener terminales (sin mayúsculas)'); });
			var formas = G.genera(g, w), html = '';
			var lista = G.lenguaje(g, 6).slice(0, 14);
			html += '<div class="lab-fila"><span class="etq">Primeras cadenas de L(G)</span><span class="chips-cad">' +
				lista.map(function (c) { return '<span class="cad">' + esc(c) + '</span>'; }).join('') + '<span class="cad muted-c">…</span></span></div>';
			if (!formas) {
				html += '<div class="lab-fila"><span class="verdict no"><i class="fa-solid fa-xmark"></i> ' + esc(w) + ' NO se puede generar</span>' +
					'<span class="small muted">Se probaron todas las derivaciones por la izquierda que podían llegar a ella.</span></div>';
			} else {
				var d = G.derivacion(g, formas), t = G.arbol(g, formas);
				html += '<div class="lab-fila"><span class="verdict yes"><i class="fa-solid fa-check"></i> ' + esc(w) + ' sí se genera</span>' +
					'<span class="deriv lab-deriv">' + derivHTML(d, { indice: 1, fragmentos: false, marcar: false }) + '</span></div>' +
					'<div class="lab-arbol arbol">' + arbolSVG(t, { indice: 1, lectura: true, maxAncho: 720, maxAlto: 250 }) + '</div>';
			}
			out.innerHTML = html;
		} catch (e) {
			err.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> ' + esc(e.message) + '.';
		}
	}
	if ($('lab-ir')) {
		$('lab-ir').addEventListener('click', function () { labRun(); $('lab-ir').blur(); });
		$('lab-w').addEventListener('keydown', function (e) { if (e.key === 'Enter') labRun(); e.stopPropagation(); });
		$('lab-g').addEventListener('keydown', function (e) { e.stopPropagation(); });
		labRun();
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

	if (!VERIFY) return;

	/* ---------- Modo verificación ---------- */
	function pruebas() {
		var out = errores.slice(), ok = 0;
		function check(cond, msg) { if (cond) ok++; else out.push('PRUEBA: ' + msg); }
		function cadena(el) { var s = el.textContent.replace(/\s+/g, ''); return s === '' ? EPS : s; }

		// 1. Derivaciones y árboles (ya validados al dibujarlos): ¿cuántos hay?
		check(document.querySelectorAll('.deriv, .dertab').length >= 20, 'deberían dibujarse al menos 20 derivaciones');
		check(document.querySelectorAll('.arbol-svg').length >= 6, 'deberían dibujarse al menos 6 árboles');
		document.querySelectorAll('[data-arbol][data-cadena]').forEach(function (el) {
			var hojas = Array.prototype.map.call(el.querySelectorAll('.lec-t + text'), function (t) { return t.textContent; }).join('');
			if (el.querySelector('.lec-t')) check(hojas === el.dataset.cadena, 'la tira de hojas dice ' + hojas + ', se esperaba ' + el.dataset.cadena);
		});

		// 2. Pertenencia: cada ficha .cad dentro de [data-pertenece].
		document.querySelectorAll('[data-pertenece]').forEach(function (cont) {
			var g = G.gramatica(cont.dataset.pertenece);
			cont.querySelectorAll('.cad:not(.muted-c), [data-cad]').forEach(function (c) {
				if (c.classList.contains('cad') && c.closest('[data-cad]')) return; // la fila ya lo afirma
				var w = c.dataset.cad !== undefined ? c.dataset.cad : cadena(c);
				var espera = c.dataset.res !== undefined ? c.dataset.res === 'si' : !c.classList.contains('fuera');
				check(!!G.genera(g, w) === espera, w + (espera ? ' debería' : ' NO debería') + ' generarse con ' + cont.dataset.pertenece);
			});
		});

		// 3. Lenguajes descritos con palabras (comparación hasta longitud 8).
		document.querySelectorAll('[data-lenguaje]').forEach(function (el) {
			var dif = G.comparaLenguaje(G.gramatica(el.dataset.g), el.dataset.lenguaje, 8);
			check(!dif, 'L(' + el.dataset.g + ') ≠ ' + el.dataset.lenguaje + (dif ? ' en ' + dif.cadena : ''));
		});

		// 4. Ambigüedad.
		check(G.contarArboles(G.gramatica('E→E+E|E*E|id'), 'id+id*id') === 2, 'E→E+E|E*E|id debería dar 2 árboles para id+id*id');
		check(G.contarArboles(G.gramatica('E→E+T|T;T→T*F|F;F→(E)|id'), 'id+id*id') === 1, 'la gramática E, T, F debería dar 1 árbol');

		// 5. Laboratorio.
		$('lab-g').value = 'S→aSb|ε'; $('lab-w').value = 'aabb'; $('lab-ir').click();
		check(/sí se genera/.test($('lab-out').textContent) && $('lab-out').querySelector('.arbol-svg'), 'el laboratorio no genera aabb');
		$('lab-w').value = 'aab'; $('lab-ir').click();
		check(/NO se puede/.test($('lab-out').textContent), 'el laboratorio acepta aab');
		$('lab-g').value = 'aS→b'; $('lab-ir').click();
		check(/UNA variable/.test($('lab-err').textContent), 'el laboratorio no avisa de una regla que no es libre de contexto');
		$('lab-g').value = 'E->E+T|T\nT->T*F|F\nF->(E)|id'; $('lab-w').value = '(id+id)*id'; $('lab-ir').click();
		check(/sí se genera/.test($('lab-out').textContent), 'el laboratorio no genera (id+id)*id con la gramática E, T, F');
		$('lab-w').value = 'id+*id'; $('lab-ir').click();
		check(/NO se puede/.test($('lab-out').textContent), 'el laboratorio acepta id+*id');
		$('lab-g').value = 'S→(S)S|ε'; $('lab-w').value = '(()())'; $('lab-ir').click();
		check(/sí se genera/.test($('lab-out').textContent), 'el laboratorio no genera (()())');

		// 6. Número de clics por diapositiva (sin clics vacíos).
		[['fabrica', 5], ['derivar', 5], ['parentesis-paso', 9], ['arbol', 5], ['ej1', 5], ['ej3', 8], ['ej5', 5], ['ej7', 4]].forEach(function (c) {
			var s = $(c[0]), k = Reveal.getIndices(s), m = 0;
			Reveal.slide(k.h, k.v, -1);
			while (Reveal.nextFragment()) m++;
			check(m === c[1], c[0] + ': ' + m + ' clics, se esperaban ' + c[1]);
		});

		// 7. Estructura y navegación.
		check(Reveal.getHorizontalSlides().length === 31, 'deberían ser 31 diapositivas (' + Reveal.getHorizontalSlides().length + ')');
		Reveal.slide(0, 0);
		check(Reveal.isFirstSlide(), 'no se puede volver a la portada');
		return { out: out, ok: ok };
	}

	function informe() {
		var t = pruebas(), out = t.out.slice(), slides = Reveal.getSlides();
		document.documentElement.classList.add('mostrar-todo');
		slides.forEach(function (s, i) {
			s.style.display = 'block';
			var id = (i + 1) + ' «' + ((s.querySelector('h1,h2') || {}).textContent || '').trim().slice(0, 40) + '»';
			if (s.scrollHeight > 722) out.push('DESBORDE VERTICAL ' + id + ': ' + s.scrollHeight + 'px');
			if (s.scrollWidth > 1282) out.push('DESBORDE HORIZONTAL ' + id + ': ' + s.scrollWidth + 'px');
			var box = s.getBoundingClientRect(), sc = box.height / 720;
			s.querySelectorAll('.panel, .def, .item, .step, .note, table, .tabla-caja, .q, .reto, .ans, .two, .three, .four, .arbol, .arcos, .deriv, .prods, .card, .stepc, .pipe, .nodec, .comp').forEach(function (e) {
				var r = e.getBoundingClientRect();
				if (!r.height || e.closest('#lab-out')) return;
				if (r.bottom - box.top > (720 - 6) * sc) out.push('FUERA DEL LIENZO ' + id + ': <' + e.tagName.toLowerCase() + ' class="' + (e.getAttribute('class') || '') + '"> baja hasta ' + Math.round((r.bottom - box.top) / sc) + 'px');
				if (r.right - box.left > (1280 - 4) * sc || r.left < box.left - 2) out.push('FUERA DEL LIENZO (lados) ' + id + ': <' + e.tagName.toLowerCase() + ' class="' + (e.getAttribute('class') || '') + '">');
			});
			s.querySelectorAll('.step, .item, .def .body, .verdict, .pill, .key .v, .cad, .prod').forEach(function (e) {
				if (e.scrollWidth > e.clientWidth + 2) out.push('TEXTO CORTADO ' + id + ': ' + e.className + ' «' + e.textContent.trim().slice(0, 40) + '» (' + e.scrollWidth + ' > ' + e.clientWidth + ')');
			});
		});
		document.querySelectorAll('.katex-error').forEach(function (k) { out.push('KATEX: ' + k.getAttribute('title')); });
		slides.forEach(function (s, i) {
			var w = document.createTreeWalker(s, NodeFilter.SHOW_TEXT);
			while (w.nextNode()) {
				if (w.currentNode.parentElement.closest('script,.katex,pre,textarea')) continue;
				if (/\\\(|\\\[|\\[a-zA-Z]+/.test(w.currentNode.nodeValue)) out.push('MATEMÁTICA SIN RENDERIZAR en diapositiva ' + (i + 1) + ': ' + w.currentNode.nodeValue.trim().slice(0, 60));
			}
		});
		var res = 'VERIFICACIÓN · ' + slides.length + ' diapositivas (' + Reveal.getHorizontalSlides().length + ' principales) · ' + document.querySelectorAll('.katex').length + ' fórmulas · ' +
			document.querySelectorAll('.deriv, .dertab').length + ' derivaciones · ' + document.querySelectorAll('.arbol-svg').length + ' árboles · ' + t.ok + ' pruebas superadas\n' + (out.length ? out.join('\n') : 'SIN PROBLEMAS');
		var pre = document.createElement('pre');
		pre.id = 'verif-report';
		pre.textContent = res;
		document.body.appendChild(pre);
		document.title = out.length ? 'VERIF-FALLA' : 'VERIF-OK';
		console.log(res);
	}
	Reveal.on('ready', function () {
		var t0 = Date.now();
		(function esperar() {
			if (document.querySelector('.katex') || Date.now() - t0 > 15000) setTimeout(informe, 500);
			else setTimeout(esperar, 200);
		})();
	});
})();
