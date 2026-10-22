/* =====================================================================
   NOTACIÓN POSFIJA · Inicialización de reveal.js y piezas generadas
   Todo sale de posfija.js (una sola fuente de verdad):
   - [data-tk]           fichas de colores de una expresión.
   - [data-insertar]     cinta con los «·» que se insertan (un clic cada uno).
   - [data-cinta]        cinta de lectura con flecha que sigue a la tabla.
   - table[data-traza]   seguimiento del algoritmo (una fila por símbolo).
   - table[data-evalua]  recorrido de la posfija con una pila de piezas.
   - [data-leyenda]      leyenda de colores.
   - Laboratorio, resaltado de código, ?verificar y ?mostrar.
   ===================================================================== */
(function () {
	'use strict';
	var P = window.Posfija;
	var VERIFY = /[?&]verificar\b/.test(location.search);
	var MOSTRAR = /[?&]mostrar\b/.test(location.search);
	if (MOSTRAR) document.documentElement.classList.add('mostrar-todo');
	function $(id) { return document.getElementById(id); }
	function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

	/* ---------- Fichas ---------- */
	function clase(c) { return P.esSimbolo(c) ? 'sym' : P.esOperador(c) ? 'opr' : 'par'; }
	function tk(c, extra) { return '<span class="tk ' + clase(c) + (extra ? ' ' + extra : '') + '">' + esc(c) + '</span>'; }
	function fichas(lista, nuevosDesde) {
		return lista.map(function (c, i) { return tk(c, nuevosDesde !== undefined && i >= nuevosDesde ? 'nuevo' : ''); }).join('');
	}
	function x(c) { return '<span class="expr">' + tk(c) + '</span>'; }
	function lista(ops) { return ops.map(x).join(' '); }

	document.querySelectorAll('[data-tk]').forEach(function (el) {
		el.innerHTML = fichas(Array.from(el.dataset.tk));
		el.classList.add('expr');
	});

	/* ---------- Leyenda de colores ---------- */
	document.querySelectorAll('[data-leyenda]').forEach(function (el) {
		el.innerHTML =
			'<span><span class="expr">' + tk('a') + '</span> letra del alfabeto</span>' +
			'<span><span class="expr">' + tk('·') + '</span> operador en espera (pila)</span>' +
			'<span><span class="expr">' + tk('+', 'nuevo') + '</span> pasa a la salida</span>' +
			'<span><span class="expr">' + tk('(', 'del') + tk(')', 'del') + '</span> paréntesis que se eliminan</span>';
	});

	/* ---------- Cinta con los «·» insertados ---------- */
	document.querySelectorAll('[data-insertar]').forEach(function (el) {
		var s = P.simbolos(el.dataset.insertar), pos = P.puntosInsertados(el.dataset.insertar), html = '', k = 0;
		s.forEach(function (c, i) {
			if (pos.indexOf(i) >= 0) {
				k++;
				html += '<div class="casilla ins fragment" data-fragment-index="' + k + '">' + tk('·') +
					'<span class="por">entre ' + esc(s[i - 1]) + ' y ' + esc(c) + '</span></div>';
			}
			html += '<div class="casilla">' + tk(c) + '</div>';
		});
		el.innerHTML = html;
	});

	/* ---------- Cinta de lectura ---------- */
	document.querySelectorAll('[data-cinta]').forEach(function (el) {
		var s = P.simbolos(el.dataset.cinta);
		el.innerHTML = s.map(function (c, i) {
			return '<div class="casilla">' + tk(c) + '<span class="num">' + (i + 1) + '</span></div>';
		}).join('') + '<div class="casilla fin"><span class="tk vacio">fin</span><span class="num">&nbsp;</span></div>';
	});
	function actualizarCinta(slide) {
		var cinta = slide && slide.querySelector('.cinta[data-cinta]');
		if (!cinta) return;
		var actual = -1, previa = -1;
		slide.querySelectorAll('table[data-traza] tr[data-i]').forEach(function (tr) {
			var i = +tr.dataset.i;
			if (!tr.classList.contains('fragment')) previa = Math.max(previa, i);
			else if (MOSTRAR || tr.classList.contains('visible')) actual = Math.max(actual, i);
		});
		Array.prototype.forEach.call(cinta.children, function (c, j) {
			c.classList.toggle('actual', j === actual);
			c.classList.toggle('leida', actual >= 0 ? j < actual : j <= previa);
		});
	}

	/* ---------- Explicaciones en lenguaje sencillo ---------- */
	function explicar(p) {
		var c = p.simbolo, pesa = function (o) { return P.PREC[o] === P.PREC[c] ? 'lo mismo' : 'más'; };
		switch (p.tipo) {
			case 'simbolo': return x(c) + ' es una letra: va directo a la salida.';
			case 'abre': return 'Empieza un grupo: guardamos ' + x('(') + ' en la pila como marca.';
			case 'cierra':
				return 'Termina el grupo: ' + (p.sacados.length ? 'sale ' + lista(p.sacados) + ' a la salida' : 'no hay operadores dentro') +
					' y se tiran <span class="expr">' + tk('(', 'del') + tk(')', 'del') + '</span>.';
			case 'estrella': return x('*') + ' repite lo que ya está a su izquierda en la salida: pasa directo.';
			case 'fin': return 'Se acabó la expresión: sacamos ' + x(p.sacados[0]) + ' de la pila a la salida.';
		}
		var antes = p.pila[p.pila.length - 2];
		if (p.sacados.length) {
			return (p.sacados.length > 1 ? 'Salen ' : 'Sale ') + lista(p.sacados) + ': pesa ' + p.sacados.map(pesa).filter(function (v, i, a) { return a.indexOf(v) === i; }).join(' o ') +
				' que ' + x(c) + '. Luego guardamos ' + x(c) + '.';
		}
		if (p.motivo === 'vacia') return 'La pila está vacía: guardamos ' + x(c) + '.';
		if (p.motivo === 'parentesis') return 'Arriba hay ' + x('(') + ', que es un límite: guardamos ' + x(c) + ' encima.';
		return 'Arriba hay ' + x(antes) + ', que pesa menos: guardamos ' + x(c) + ' encima.';
	}
	var NOMBRE_REGLA = { R2: 'letra → salida', R3: '( → pila', R5: 'meter operador', 'R4 R5': 'sacar los que pesan ≥ y meter', R6: ') → sacar hasta (', 'R4★': 'estrella → salida', R7: 'vaciar la pila' };

	/* ---------- Tabla de seguimiento ---------- */
	var COLS = { n: '#', lee: 'Lee', salida: 'Salida posfija', pila: 'Pila (tope →)', regla: 'Regla', exp: 'Explicación' };
	function celda(col, p) {
		switch (col) {
			case 'n': return '<td class="n">' + p.n + '</td>';
			case 'lee': return '<td class="lee">' + (p.simbolo ? '<span class="expr">' + tk(p.simbolo) + '</span>' : '<span class="finlbl">fin</span>') + '</td>';
			case 'salida': return '<td class="sal"><span class="expr">' + (p.salida.length ? fichas(p.salida, p.salida.length - p.nuevos) : '<span class="tk vacio">∅</span>') + '</span></td>';
			case 'pila': return '<td class="pil"><span class="pila-c"><span class="expr">' + (p.pila.length ? fichas(p.pila) : '') + '</span>' +
				(p.pila.length ? '' : '<span class="vac">vacía</span>') + '</span></td>';
			case 'regla': return '<td class="reg"><span title="' + esc(NOMBRE_REGLA[p.regla]) + '">' + esc(p.regla) + '</span></td>';
			case 'exp': return '<td class="exp">' + explicar(p) + '</td>';
		}
	}
	function hueco(html, idx) {
		return '<span class="slot"><span class="hueco fragment fade-out" data-fragment-index="' + idx + '">?</span>' +
			'<span class="fragment fade-in" data-fragment-index="' + idx + '">' + html + '</span></span>';
	}
	function tablaTraza(tabla, pasos, op) {
		var cols = op.columnas || ['n', 'lee', 'salida', 'pila', 'regla', 'exp'];
		var html = '<thead><tr>' + cols.map(function (c) { return '<th>' + COLS[c] + '</th>'; }).join('') + '</tr></thead><tbody>';
		var idx = op.indice || 1;
		pasos.forEach(function (p) {
			var adivina = op.adivinar && p.n >= op.adivinar, previa = op.previa && p.n <= op.previa;
			var esFrag = !op.adivinar && !previa && op.fragmentos;
			html += '<tr data-i="' + p.i + '"' + (esFrag ? ' class="fragment" data-fragment-index="' + idx++ + '"' : previa ? ' class="previa"' : '') + '>';
			cols.forEach(function (c) {
				var td = celda(c, p);
				if (adivina && c !== 'n' && c !== 'lee') td = td.replace(/^(<td[^>]*>)([^]*)(<\/td>)$/, function (m, a, b, z) { return a + hueco(b, idx) + z; });
				html += td;
			});
			if (adivina) idx++;
			html += '</tr>';
		});
		tabla.innerHTML = html + '</tbody>';
	}
	document.querySelectorAll('table[data-traza]').forEach(function (t) {
		var traza = P.trazar(t.dataset.traza), d = t.dataset, desde = 1, hasta = traza.pasos.length;
		if (d.filas) { desde = +d.filas.split('-')[0]; hasta = +d.filas.split('-')[1]; }
		if (d.previa) desde = Math.min(desde, +d.previa);
		tablaTraza(t, traza.pasos.filter(function (p) { return p.n >= desde && p.n <= hasta; }), {
			columnas: d.columnas && d.columnas.split(','), previa: d.previa && +d.previa, adivinar: d.adivinar && +d.adivinar,
			indice: d.indice && +d.indice, fragmentos: !('sinFragmentos' in d)
		});
	});

	/* ---------- Recorrido de la posfija con una pila de piezas ---------- */
	document.querySelectorAll('table[data-evalua]').forEach(function (t) {
		var ev = P.evaluar(t.dataset.evalua), html = '<thead><tr><th>#</th><th>Lee</th><th>Qué hace</th><th>Pila de piezas (tope →)</th><th>En Thompson será…</th></tr></thead><tbody>';
		ev.pasos.forEach(function (p, j) {
			var c = p.simbolo, accion, thompson;
			if (p.toma === 0) { accion = 'apila la pieza ' + x(c); thompson = 'un AFN pequeño que lee <b>' + esc(c) + '</b>'; }
			else if (p.toma === 1) { accion = 'saca <b>1</b> pieza, le pone la estrella y la apila'; thompson = 'el AFN de la <b>estrella</b>'; }
			else if (c === '+') { accion = 'saca <b>2</b> piezas, las <b>une</b> y apila el resultado'; thompson = 'el AFN de la <b>unión</b>'; }
			else { accion = 'saca <b>2</b> piezas, las <b>concatena</b> y apila el resultado'; thompson = 'el AFN de la <b>concatenación</b>'; }
			html += '<tr class="fragment" data-fragment-index="' + (j + 1) + '"><td class="n">' + (j + 1) + '</td><td class="lee"><span class="expr">' + tk(c) + '</span></td>' +
				'<td class="exp">' + accion + '</td><td><span class="pila-c">' + p.pila.map(function (s, k) {
					return '<span class="pieza' + (k === p.pila.length - 1 ? ' nueva' : '') + '">' + esc(s) + '</span>';
				}).join('') + '</span></td><td class="exp">' + thompson + '</td></tr>';
		});
		t.innerHTML = html + '</tbody>';
	});

	/* ---------- Resaltado de sintaxis ---------- */
	var TOKENS = /(\/\/.*$)|('(?:[^'\\]|\\.)*')|\b(const|function|for|of|if|else|while|return)\b|\b(\d+)\b|([A-Za-z_]\w*)(?=\()/gm;
	document.querySelectorAll('.code pre code').forEach(function (code) {
		var src = code.textContent, out = '', last = 0;
		src.replace(TOKENS, function (m, com, str, kw, num, fn, at) {
			out += esc(src.slice(last, at));
			out += '<span class="' + (com ? 'c' : str ? 's' : kw ? 'k' : num ? 'n' : 'f') + '">' + esc(m) + '</span>';
			last = at + m.length;
			return m;
		});
		code.innerHTML = out + esc(src.slice(last));
	});

	/* ---------- Laboratorio ---------- */
	function labRun() {
		var v = $('lab-expr').value.trim();
		['lab-norm', 'lab-pos', 'lab-inf', 'lab-tabla'].forEach(function (id) { $(id).innerHTML = ''; });
		$('lab-err').textContent = '';
		if (!v) { $('lab-err').textContent = 'Escribe una expresión, por ejemplo (a+b)*ab.'; return; }
		try {
			var n = P.normalizar(v), t = P.trazar(n);
			$('lab-norm').innerHTML = '<span class="expr sm">' + fichas(Array.from(n)) + '</span>';
			$('lab-pos').innerHTML = '<span class="expr sm">' + fichas(Array.from(t.posfija)) + '</span>';
			$('lab-inf').innerHTML = '<span class="mono">' + esc(P.aInfija(t.posfija)) + '</span>';
			tablaTraza($('lab-tabla'), t.pasos, { fragmentos: false });
		} catch (e) {
			$('lab-err').innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> No se puede convertir: ' + esc(e.message) + '.';
		}
	}
	if ($('lab-ir')) {
		$('lab-ir').addEventListener('click', function () { labRun(); $('lab-ir').blur(); });
		$('lab-expr').addEventListener('keydown', function (e) { if (e.key === 'Enter') labRun(); e.stopPropagation(); });
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
	['ready', 'slidechanged', 'fragmentshown', 'fragmenthidden'].forEach(function (ev) {
		Reveal.on(ev, function () { actualizarCinta(Reveal.getCurrentSlide()); });
	});
	if (MOSTRAR) document.querySelectorAll('.reveal .slides section').forEach(actualizarCinta);

	if (!VERIFY) return;

	/* ---------- Modo verificación ---------- */
	function pruebas() {
		var out = [], ok = 0;
		function check(cond, msg) { if (cond) ok++; else out.push('PRUEBA: ' + msg); }
		function texto(el) { return el.textContent.replace(/\s+/g, ''); }

		// 1. Resultado principal y ejercicios, con el motor.
		check(P.normalizar('(a+b)*ab') === '(a+b)*·a·b', 'normalizar((a+b)*ab)');
		check(P.aPosfija('(a+b)*ab') === 'ab+*a·b·', 'la posfija principal no es ab+*a·b·');
		check(P.aPosfija('a+b·a') === 'aba·+', 'a+b·a');
		check(P.aPosfija('a(b+a)') === 'aba+·', 'a(b+a)');
		check(P.aPosfija('(a+b)a*') === 'ab+a*·', '(a+b)a*');

		// 2. Afirmaciones del HTML.
		document.querySelectorAll('[data-posfija-de]').forEach(function (el) {
			var esperado = el.dataset.tk || el.dataset.tkCheck, real = P.aPosfija(el.dataset.posfijaDe);
			check(real === esperado, 'aPosfija(' + el.dataset.posfijaDe + ') = ' + real + ', la diapositiva dice ' + esperado);
			if (el.dataset.tk) check(texto(el) === esperado, 'las fichas no muestran ' + esperado);
		});
		document.querySelectorAll('[data-norm-de]').forEach(function (el) {
			check(P.normalizar(el.dataset.normDe) === el.dataset.tk, 'normalizar(' + el.dataset.normDe + ') ≠ ' + el.dataset.tk);
		});
		document.querySelectorAll('[data-no-posfija-de]').forEach(function (el) {
			check(P.aPosfija(el.dataset.noPosfijaDe) !== el.dataset.tk, el.dataset.tk + ' no debería ser la posfija de ' + el.dataset.noPosfijaDe);
		});
		document.querySelectorAll('[data-infija-de]').forEach(function (el) {
			var real = P.aInfija(el.dataset.infijaDe, 'conPunto' in el.dataset), esp = el.dataset.tkPlain || el.dataset.tk;
			check(real === esp && texto(el) === esp, 'aInfija(' + el.dataset.infijaDe + ') = ' + real + ', la diapositiva dice ' + esp);
		});
		document.querySelectorAll('[data-re]').forEach(function (el) {
			var re = new RegExp('^(?:' + el.dataset.re.replace(/\+/g, '|').replace(/·/g, '') + ')$');
			(el.dataset.en || '').split(',').forEach(function (w) { check(re.test(w), w + ' debería estar en L(' + el.dataset.re + ')'); });
			(el.dataset.fuera || '').split(',').forEach(function (w) { check(!re.test(w), w + ' no debería estar en L(' + el.dataset.re + ')'); });
		});

		// 3. Tablas de seguimiento: cada fila coincide con el motor.
		document.querySelectorAll('table[data-traza]').forEach(function (t) {
			var pasos = P.trazar(t.dataset.traza).pasos;
			t.querySelectorAll('tbody tr').forEach(function (tr) {
				var n = +tr.querySelector('td.n').textContent, p = pasos[n - 1];
				var sal = tr.querySelector('td.sal'), pil = tr.querySelector('td.pil');
				check(texto(sal).replace('?', '') === (p.salida.join('') || '∅'), t.dataset.traza + ' fila ' + n + ': salida ' + texto(sal));
				check(texto(pil).replace('?', '').replace('vacía', '') === p.pila.join(''), t.dataset.traza + ' fila ' + n + ': pila ' + texto(pil));
				check(!/[()]/.test(texto(sal)), 'paréntesis en la salida, fila ' + n);
			});
		});
		var t14 = $('parseo-1').querySelectorAll('tbody tr'), t15 = $('parseo-2').querySelectorAll('tbody tr.fragment');
		check(t14.length === 6 && t15.length === 5, 'las partes 1 y 2 deberían tener 6 y 5 filas (' + t14.length + ', ' + t15.length + ')');
		var ultima = t15[t15.length - 1];
		check(ultima && texto(ultima.querySelector('td.sal')) === 'ab+*a·b·' && /vacía/.test(ultima.querySelector('td.pil').textContent), 'la última fila no termina en ab+*a·b· con la pila vacía');
		var ultEval = Array.prototype.slice.call($('programa').querySelectorAll('tbody tr')).pop();
		check(ultEval && texto(ultEval.querySelector('.pila-c')) === '(a+b)*ab', 'la pila de piezas no termina en (a+b)*ab');

		// 4. La flecha de la cinta sigue a la tabla.
		var s14 = $('parseo-1'), ix = Reveal.getIndices(s14);
		Reveal.slide(ix.h, ix.v, -1);
		check(!s14.querySelector('.casilla.actual'), 'la cinta no debería señalar nada al empezar');
		Reveal.nextFragment(); Reveal.nextFragment(); Reveal.nextFragment();
		var act = s14.querySelectorAll('.cinta .casilla');
		check(act[2].classList.contains('actual') && act[1].classList.contains('leida'), 'tras 3 clics la cinta debería señalar el símbolo 3');
		var s15 = $('parseo-2'), iy = Reveal.getIndices(s15);
		Reveal.slide(iy.h, iy.v, -1);
		check(s15.querySelectorAll('.casilla.leida').length === 6, 'la parte 2 debería empezar con 6 símbolos leídos');
		var n = 0; while (Reveal.nextFragment()) n++;
		check(n === 5 && s15.querySelector('.casilla.fin.actual'), 'la parte 2 debería terminar en «fin» tras 5 clics');

		// 5. Número de clics por diapositiva (sin clics vacíos) y huecos del ejercicio.
		[['ejemplo', 9], ['ejercicio', 8], ['reto', 4], ['programa', 9], ['concatenacion', 5], ['pila', 4], ['por-que', 7]].forEach(function (c) {
			var s = $(c[0]), k = Reveal.getIndices(s), m = 0;
			Reveal.slide(k.h, k.v, -1);
			while (Reveal.nextFragment()) m++;
			check(m === c[1], c[0] + ': ' + m + ' clics, se esperaban ' + c[1]);
		});
		check($('ejercicio').querySelectorAll('.hueco').length === 1 + 6 * 4, 'el ejercicio debería tener 25 huecos');

		// 6. Laboratorio.
		function lab(v) { $('lab-expr').value = v; $('lab-ir').click(); return texto($('lab-pos')); }
		check(lab('(a+b)*ab') === 'ab+*a·b·' && texto($('lab-norm')) === '(a+b)*·a·b' && $('lab-tabla').querySelectorAll('tbody tr').length === 11, 'laboratorio con (a+b)*ab');
		check(lab('a(b+a)') === 'aba+·', 'laboratorio con a(b+a)');
		check(lab('a.b') === 'ab·', 'laboratorio con el punto escrito como «.»');
		check(lab('(a+b') === '' && /sin su/.test($('lab-err').textContent), 'el laboratorio no avisa del paréntesis sin cerrar');
		check(lab('a+') === '' && /operandos/.test($('lab-err').textContent), 'el laboratorio no avisa de a+');
		lab('(a+b)*ab');

		// 7. Estructura y navegación.
		check(Reveal.getHorizontalSlides().length === 21, 'deberían ser 21 diapositivas principales (' + Reveal.getHorizontalSlides().length + ')');
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
			s.querySelectorAll('.panel, .def, .code, .item, .step, .note, .captions, table, .tabla-caja, .err, .cmp-row, .caja-expr, .pipe, .q, .reto, .cinta, .leyenda, .three, .two, .lab-res').forEach(function (e) {
				var r = e.getBoundingClientRect();
				if (!r.height || e.closest(".lab-tabla") && e !== e.closest(".lab-tabla")) return;
				if (r.bottom - box.top > (720 - 6) * sc) out.push('FUERA DEL LIENZO ' + id + ': <' + e.tagName.toLowerCase() + ' class="' + (e.getAttribute('class') || '') + '"> baja hasta ' + Math.round((r.bottom - box.top) / sc) + 'px');
				if (r.right - box.left > (1280 - 4) * sc || r.left < box.left - 2) out.push('FUERA DEL LIENZO (lados) ' + id + ': <' + e.tagName.toLowerCase() + ' class="' + (e.getAttribute('class') || '') + '">');
			});
			s.querySelectorAll('.step, .item, .def .body, .cap, .verdict, .err, .parte, .pill, .key .v, .code pre, .caja-expr').forEach(function (e) {
				if (e.scrollWidth > e.clientWidth + 2) out.push('TEXTO CORTADO ' + id + ': ' + e.className + ' «' + e.textContent.trim().slice(0, 40) + '» (' + e.scrollWidth + ' > ' + e.clientWidth + ')');
			});
		});
		document.querySelectorAll('.katex-error').forEach(function (k) { out.push('KATEX: ' + k.getAttribute('title')); });
		slides.forEach(function (s, i) {
			var w = document.createTreeWalker(s, NodeFilter.SHOW_TEXT);
			while (w.nextNode()) {
				if (w.currentNode.parentElement.closest('script,.katex,pre')) continue;
				if (/\\\(|\\\[|\\[a-zA-Z]+/.test(w.currentNode.nodeValue)) out.push('MATEMÁTICA SIN RENDERIZAR en diapositiva ' + (i + 1) + ': ' + w.currentNode.nodeValue.trim().slice(0, 60));
			}
		});
		var res = 'VERIFICACIÓN · ' + slides.length + ' diapositivas (' + Reveal.getHorizontalSlides().length + ' principales) · ' + document.querySelectorAll('.katex').length + ' fórmulas · ' +
			document.querySelectorAll('table[data-traza] tbody tr').length + ' filas de seguimiento · ' + t.ok + ' pruebas superadas\n' + (out.length ? out.join('\n') : 'SIN PROBLEMAS');
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
