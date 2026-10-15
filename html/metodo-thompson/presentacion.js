/* =====================================================================
   MÉTODO DE THOMPSON · Inicialización de reveal.js e interacciones
   Todo sale de thompson.js (construcción real) + afn.js (simulación con
   ε-clausura, dibujo, comprobaciones) + motor-regex.js (análisis).
   - [data-thompson] autómata (o una etapa con data-etapa)
   - [data-construccion] construcción por etapas con subtítulos (fragmentos)
   - [data-pruebas] cadenas con sus conjuntos de estados y veredicto
   - .sim[data-t] simulador por conjuntos · [data-ast] árbol numerado
   - [data-tabla-pasos] · [data-checklist] · [data-erroneo] · laboratorio
   - ?verificar: informe de afirmaciones, invariantes, desbordes e interacciones.
   - ?mostrar: todos los fragmentos visibles (revisión / capturas).
   ===================================================================== */
(function () {
	'use strict';
	var A = window.AFN, TH = window.Thompson, RX = window.RegexFormal;
	var VERIFY = /[?&]verificar\b/.test(location.search);
	if (/[?&]mostrar\b/.test(location.search)) document.documentElement.classList.add('mostrar-todo');
	var BLOQUES = ['Motivación', 'Reglas', 'Construcción guiada', 'Procedimiento', 'Práctica'];
	function $(id) { return document.getElementById(id); }
	function onClick(el, fn) { if (el) el.addEventListener('click', function () { fn(el); el.blur(); }); } // blur: el teclado vuelve a reveal
	function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
	var q = A.sub2;

	/* ---------- Construcciones (una por expresión) y registro en afn.js ---------- */
	var CACHE = {};
	function T(src) {
		if (!CACHE[src]) { CACHE[src] = TH.construir(src); A.AUTOMATAS['T:' + src] = CACHE[src].def; }
		return CACHE[src];
	}
	Object.keys(TH.ERRONEOS).forEach(function (k) { A.AUTOMATAS[k] = TH.ERRONEOS[k]; });
	document.querySelectorAll('[data-claim^="T:"]').forEach(function (el) { T(el.dataset.claim.slice(2)); });

	/* ---------- Cinta de bloques ---------- */
	document.querySelectorAll('.route').forEach(function (r) {
		var on = (r.dataset.on || '').split(',').map(Number);
		r.setAttribute('aria-label', 'Bloque: ' + on.filter(Boolean).map(function (i) { return BLOQUES[i - 1]; }).join(', '));
		BLOQUES.forEach(function (s, i) {
			var span = document.createElement('span');
			span.textContent = 'ABCDE'[i] + ' ' + s;
			if (on.indexOf(i + 1) >= 0) span.className = 'on';
			r.appendChild(span);
		});
	});

	/* ---------- Diagramas ---------- */
	document.querySelectorAll('[data-thompson]').forEach(function (el) {
		var t = T(el.dataset.thompson), k = el.hasAttribute('data-etapa') ? +el.dataset.etapa : null;
		el.innerHTML = TH.diagrama(t, k, { escala: parseFloat(el.dataset.escala || '1'), nuevo: false });
	});
	document.querySelectorAll('[data-erroneo]').forEach(function (el) {
		el.innerHTML = A.diagrama(TH.ERRONEOS[el.dataset.erroneo], { escala: parseFloat(el.dataset.escala || '1') });
	});

	/* ---------- Construcción por etapas ---------- */
	function textoPaso(t, p) {
		var e = '<span class="mono">' + esc(p.expr) + '</span>', nt = p.nuevasTrans;
		var fl = function (x) { return q(x[0]) + ' <span class="mono">—' + x[1] + '→</span> ' + q(x[2]); };
		switch (p.tipo) {
			case 'símbolo': return '<b>Símbolo</b> ' + e + ': estados nuevos ' + q(p.ini) + ' (entrada) y ' + q(p.fin) + ' (salida), y la flecha ' + fl(nt[0]) + '.';
			case 'concatenación': return '<b>Concatenación</b> ' + e + ': flecha ε de la salida ' + q(nt[0][0]) + ' a la entrada ' + q(nt[0][2]) + '. No se crean estados.';
			case 'unión': return '<b>Unión</b> ' + e + ': nuevo inicio ' + q(p.ini) + ' con ε hacia ' + q(nt[0][2]) + ' y ' + q(nt[1][2]) + '; nuevo final ' + q(p.fin) + ' con ε desde ' + q(nt[2][0]) + ' y ' + q(nt[3][0]) + '.';
			case 'estrella': return '<b>Estrella</b> ' + e + ': nuevos ' + q(p.ini) + ' y ' + q(p.fin) + '; ε para entrar, <span class="rp" style="color:var(--pend)">repetir</span> ' + fl(nt[1]) + ', <span style="color:#14518f">saltar</span> ' + fl(nt[2]) + ' y salir.';
			default: return '<b>' + p.tipo + '</b> ' + e;
		}
	}
	document.querySelectorAll('[data-construccion]').forEach(function (el) {
		var t = T(el.dataset.construccion), n = t.pasos.length, esc2 = parseFloat(el.dataset.escala || '1'), h = '<div class="etapas">', c = '<div class="captions etc">';
		var cls = function (k) { return k === 0 ? ' fragment fade-out" data-fragment-index="1' : k < n ? ' fragment fade-in-then-out" data-fragment-index="' + k : ' fragment" data-fragment-index="' + n; };
		for (var k = 0; k <= n; k++) {
			var completo = k === n;
			h += '<div class="etapa' + cls(k) + '">' + TH.diagrama(t, completo ? n - 1 : k, { escala: esc2, nuevo: !completo }) + '</div>';
			c += '<div class="cap' + (completo ? ' done' : '') + cls(k) + '"><span class="n">' + (completo ? '<i class="fa-solid fa-check" style="font-size:18px"></i>' : k + 1) + '</span><span>' +
				(completo ? '<b>Autómata completo</b> para <span class="mono">' + esc(t.src) + '</span>: inicial ' + q(t.def.start) + ', final ' + q(t.def.finals[0]) + ', ' + t.def.states.length + ' estados.' : textoPaso(t, t.pasos[k])) + '</span></div>';
		}
		el.innerHTML = h + '</div>' + c + '</div>';
	});

	/* ---------- Conjuntos y pruebas ---------- */
	function conj(S, extra) { return '<span class="conj' + (S.length ? '' : ' vacio') + (extra || '') + '">' + A.conjHTML(S) + '</span>'; }
	function setsHTML(w, r, hasta) {
		var h = '';
		for (var i = 0; i <= hasta; i++) {
			if (i > 0) h += '<span class="ar"><b>' + w[i - 1] + '</b>⟶</span>';
			h += conj(r.conjuntos[i], i === hasta && i === w.length ? (r.acepta ? ' fin-ok' : ' fin-no') : '');
		}
		return h;
	}
	document.querySelectorAll('[data-pruebas]').forEach(function (el) {
		var def = A.AUTOMATAS[el.dataset.pruebas] || T(el.dataset.pruebas.slice(2)).def;
		el.innerHTML = A.lista(el.dataset.ws).map(function (w) {
			var r = A.simular(def, w), fin = r.conjuntos[w.length];
			return '<div class="prueba pt"><span class="str' + (w ? '' : ' eps') + '">' + A.show(w) + '</span>' +
				'<span class="str ' + (r.acepta ? 'si">acepta' : 'nop">rechaza') + '</span>' +
				(el.hasAttribute('data-compacto') ? '' : '<span class="fin-conj">termina en ' + conj(fin) + '</span>') + '</div>';
		}).join('') + '';
	});

	/* ---------- Simulador por conjuntos ---------- */
	var sims = [];
	function Sim(el) {
		var s = this, n = sims.length;
		s.el = el; s.t = T(el.dataset.t); s.w = el.dataset.w || ''; s.k = 0;
		s.parte = function (c) { return el.querySelector('.' + c); };
		var ctrl = s.parte('sim-ctrl');
		ctrl.className += ' ctrl';
		ctrl.innerHTML = '<button class="btn" data-a="reset"><i class="fa-solid fa-backward-fast"></i> Reiniciar</button>' +
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
		var ew = s.parte('sim-elegir-w');
		if (ew && el.dataset.ws) {
			ew.className += ' ctrl';
			ew.innerHTML = '<span class="hint">Cadena:</span>' + A.lista(el.dataset.ws).map(function (w) { return '<button class="btn" data-w="' + w + '">' + A.show(w) + '</button>'; }).join('');
			ew.querySelectorAll('button').forEach(function (b) { onClick(b, function () { s.w = b.dataset.w; s.k = 0; s.render(); }); });
		}
		s.parte('sim-diag').innerHTML = TH.diagrama(s.t, null, { nuevo: false });
		s.render();
	}
	Sim.prototype.render = function () {
		var s = this, def = s.t.def, L = s.w.length, svg = s.parte('sim-diag').querySelector('svg');
		svg.querySelectorAll('.on, .ok, .bad').forEach(function (e) { e.classList.remove('on', 'ok', 'bad'); });
		var cinta = s.parte('sim-cinta'), est = s.parte('sim-estado'), sets = s.parte('sim-sets');
		est.className = 'sim-estado estado-sim'; if (sets) sets.className = 'sim-sets sets';
		var ew = s.parte('sim-elegir-w');
		if (ew) ew.querySelectorAll('button').forEach(function (b) { b.classList.toggle('sel', b.dataset.w === s.w); });
		var r = A.simular(def, s.w), S = r.conjuntos[s.k];
		if (cinta) {
			cinta.className = 'sim-cinta cinta';
			cinta.innerHTML = L ? s.w.split('').map(function (c, i) { return '<span class="c' + (i < s.k ? ' leido' : '') + (i === s.k ? ' actual' : '') + '">' + c + '</span>'; }).join('') +
				(s.k === L ? '<span class="c fin-c actual">fin</span>' : '') : '<span class="c vacia actual">ε</span>';
		}
		S.forEach(function (x) { svg.querySelector('.state[data-s="' + x + '"]').classList.add('on'); });
		if (s.k > 0) r.usadas[s.k - 1].forEach(function (u) {
			var key = u[0] + '>' + u[2];
			svg.querySelectorAll('[data-k="' + key + '"], [class~="e-' + key + '"]').forEach(function (e) { e.classList.add('on'); });
		});
		if (s.k === L) {
			S.forEach(function (x) { svg.querySelector('.state[data-s="' + x + '"]').classList.add(def.finals.indexOf(x) >= 0 ? 'ok' : 'bad'); });
			est.innerHTML = (L ? 'Se leyó toda la cadena. ' : 'Cadena vacía: no se lee ningún símbolo. ') + 'Activos ' + conj(S) + ' ∩ F = ' + conj(r.finales) +
				(r.acepta ? ' &nbsp;<span class="res si"><i class="fa-solid fa-circle-check"></i> se acepta</span>' : ' &nbsp;<span class="res nop"><i class="fa-solid fa-circle-xmark"></i> se rechaza</span>');
		} else {
			est.innerHTML = 'Estados activos: ' + conj(S) + ' · siguiente símbolo: <b class="mono">' + s.w[s.k] + '</b> · leídos ' + s.k + ' de ' + L + (S.length ? '' : ' · <b class="no-t">todos los caminos murieron</b>');
		}
		if (sets) sets.innerHTML = setsHTML(s.w, r, s.k);
		var b = function (a) { return s.parte('sim-ctrl').querySelector('[data-a="' + a + '"]'); };
		b('reset').disabled = s.k === 0; b('back').disabled = s.k === 0; b('step').disabled = s.k === L; b('all').disabled = s.k === L;
	};
	document.querySelectorAll('.sim[data-t]').forEach(function (el) { sims.push(new Sim(el)); });

	/* ---------- Árbol sintáctico numerado en orden de construcción ---------- */
	var NODO = { union: '+', cat: '·', star: '*', eps: 'ε', empty: '∅' };
	function dibujarArbol(ast) {
		var SEP = 64, NIV = 70, R0 = 21, hojas = 0, prof = 0, orden = 0;
		(function medir(n, d) {
			prof = Math.max(prof, d);
			var hijos = n.t === 'star' ? [n.a] : n.a ? [n.a, n.b] : [];
			hijos.forEach(function (h) { medir(h, d + 1); });
			if (!hijos.length) n._x = hojas++ * SEP; else n._x = hijos.reduce(function (s, h) { return s + h._x; }, 0) / hijos.length;
			n._y = d * NIV; n._k = ++orden;          // postorden = orden de construcción
		})(ast, 0);
		var w = Math.max(1, hojas - 1) * SEP + 2 * R0 + 30, h = prof * NIV + 2 * R0 + 12, lin = '', nod = '';
		(function pintar(n) {
			var hijos = n.t === 'star' ? [n.a] : n.a ? [n.a, n.b] : [];
			hijos.forEach(function (c) { lin += '<line class="e" x1="' + n._x + '" y1="' + n._y + '" x2="' + c._x + '" y2="' + c._y + '"/>'; pintar(c); });
			var cls = n.t === 'union' ? 'nd un' : n.t === 'star' ? 'nd st' : n.t === 'cat' ? 'nd op' : 'nd';
			nod += '<g class="' + cls + '"><circle cx="' + n._x + '" cy="' + n._y + '" r="' + R0 + '"/><text x="' + n._x + '" y="' + n._y + '">' + (NODO[n.t] || n.v) + '</text></g>' +
				'<g class="num"><circle cx="' + (n._x + R0) + '" cy="' + (n._y - R0 + 2) + '" r="10"/><text x="' + (n._x + R0) + '" y="' + (n._y - R0 + 2) + '">' + n._k + '</text></g>';
		})(ast);
		return '<svg class="ast" viewBox="' + (-R0 - 6) + ' ' + (-R0 - 14) + ' ' + w + ' ' + h + '" width="' + w + '" role="img" aria-label="Árbol sintáctico de ' + esc(RX.explicit(ast, true)) + ' con el orden de construcción">' + lin + nod + '</svg>';
	}
	document.querySelectorAll('[data-ast]').forEach(function (el) { el.innerHTML = dibujarArbol(RX.parse(el.dataset.ast)); });

	/* ---------- Tabla de pasos ---------- */
	document.querySelectorAll('[data-tabla-pasos]').forEach(function (el) {
		var t = T(el.dataset.tablaPasos);
		el.innerHTML = '<table class="tbl pasos"><thead><tr><th>Paso</th><th>Nodo</th><th>Regla</th><th>Estados nuevos</th><th>Flechas nuevas</th></tr></thead><tbody>' +
			t.pasos.map(function (p, i) {
				return '<tr><td class="mono">' + (i + 1) + '</td><td class="mono">' + esc(p.expr) + '</td><td>' + p.tipo + '</td><td class="mono">' + (p.nuevosEstados.length ? p.nuevosEstados.map(q).join(', ') : '—') + '</td><td class="mono">' +
					p.nuevasTrans.map(function (x) { return q(x[0]) + '<span style="color:var(--muted)">→</span>' + q(x[2]) + (x[1] === 'ε' ? '' : '<sup>' + x[1] + '</sup>'); }).join(' ') + '</td></tr>';
			}).join('') + '</tbody></table><div class="hint" style="font-size:14px">Flechas: el superíndice es el símbolo; sin superíndice, ε.</div>';
	});

	/* ---------- Lista de comprobación en vivo ---------- */
	function filaChecklist(src) {
		var t = T(src), d = t.def, inv = TH.invariantes(t), ent = 0, sal = 0;
		d.trans.forEach(function (x) { if (x[2] === d.start) ent++; if (x[0] === d.finals[0]) sal++; });
		var simb = d.trans.filter(function (x) { return x[1] !== 'ε'; }).length, hojas = (src.match(/[01]/g) || []).length;
		var lang = A.lenguaje(d, 8).join(',') === RX.enumerate(t.ast, 8).join(',');
		var c = function (ok) { return '<td class="' + (ok ? 'si">✓' : 'no">✗') + '</td>'; };
		return '<tr><td class="mono">' + esc(src) + '</td><td class="mono" style="text-align:center">' + d.states.length + '</td>' + c(ent === 0) + c(d.finals.length === 1 && sal === 0) + c(simb === hojas) + c(inv.length === 0) + c(lang) + '</tr>';
	}
	document.querySelectorAll('[data-checklist]').forEach(function (el) {
		el.innerHTML = '<table class="tbl checks"><thead><tr><th>Expresión</th><th>Estados</th><th>Inicio</th><th>Final</th><th>Símbolos</th><th>Reglas</th><th>L(M)=L(r)</th></tr></thead><tbody>' +
			el.dataset.checklist.split(',').map(filaChecklist).join('') + '</tbody></table>';
	});

	/* ---------- Laboratorio ---------- */
	var lab = { t: null, k: 0 };
	function labRender() {
		if (!$('lab-re')) return;
		var src = $('lab-re').value.replace(/\s+/g, ''), w = $('lab-w').value.replace(/\s+/g, '').replace(/^ε$/, '');
		$('lab-msg').className = 'msg center mt8';
		try {
			if (/[2-9a-d]/.test(src)) throw new Error('En el laboratorio usa solo los símbolos 0 y 1');
			if (src.length > 14) throw new Error('Usa expresiones de hasta 14 caracteres para que el dibujo sea legible');
			if (!lab.t || lab.t.src !== src) { lab.t = TH.construir(src); lab.k = lab.t.pasos.length; }
		} catch (e) {
			$('lab-msg').className = 'msg err center mt8'; $('lab-msg').innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> ' + esc(e.message);
			$('lab-diag').innerHTML = ''; $('lab-etapa').textContent = ''; $('lab-paso').innerHTML = ''; $('lab-res').innerHTML = '';
			lab.t = null; return;
		}
		var t = lab.t, n = t.pasos.length, completo = lab.k >= n;
		$('lab-msg').innerHTML = '<i class="fa-solid fa-check ac"></i> Se lee como <span class="mono">' + esc(RX.explicit(t.ast, true)) + '</span> · ' + t.def.states.length + ' estados';
		$('lab-diag').innerHTML = TH.diagrama(t, completo ? n - 1 : lab.k, { nuevo: !completo });
		$('lab-etapa').textContent = completo ? 'completo' : 'etapa ' + (lab.k + 1) + ' de ' + n;
		$('lab-paso').innerHTML = completo ? 'Autómata completo: inicial ' + q(t.def.start) + ', final ' + q(t.def.finals[0]) + '.' : textoPaso(t, t.pasos[lab.k]);
		$('lab-atras').disabled = lab.k === 0; $('lab-sig').disabled = completo; $('lab-fin').disabled = completo;
		if (!/^[01]*$/.test(w)) { $('lab-res').innerHTML = '<span class="res nop">La cadena solo puede tener 0 y 1</span>'; return; }
		var r = A.simular(t.def, w);
		$('lab-res').innerHTML = '<b class="mono">' + A.show(w) + '</b>: ' + setsHTML(w, r, w.length).replace(/<span class="ar">/g, ' <span class="ar">') +
			(r.acepta ? ' <span class="res si"><i class="fa-solid fa-circle-check"></i> se acepta</span>' : ' <span class="res nop"><i class="fa-solid fa-circle-xmark"></i> se rechaza</span>');
	}
	if ($('lab-re')) {
		['lab-re', 'lab-w'].forEach(function (id) { $(id).addEventListener('input', labRender); });
		onClick($('lab-atras'), function () { lab.k = Math.max(0, lab.k - 1); labRender(); });
		onClick($('lab-sig'), function () { lab.k = Math.min(lab.t.pasos.length, lab.k + 1); labRender(); });
		onClick($('lab-fin'), function () { lab.k = lab.t.pasos.length; labRender(); });
		document.querySelectorAll('[data-ins]').forEach(function (b) {
			b.addEventListener('click', function () {
				var inp = $('lab-re'), a = inp.selectionStart == null ? inp.value.length : inp.selectionStart;
				inp.value = inp.value.slice(0, a) + b.dataset.ins + inp.value.slice(a);
				inp.focus(); inp.setSelectionRange(a + 1, a + 1); labRender();
			});
		});
		labRender();
	}

	/* ---------- Botones «Ver respuesta» ---------- */
	function setAnswer(btn, open) {
		var ans = $(btn.getAttribute('aria-controls'));
		ans.hidden = !open;
		ans.classList.toggle('show', open);
		btn.setAttribute('aria-expanded', String(open));
		btn.innerHTML = open ? '<i class="fa-solid fa-eye-slash"></i> Ocultar la solución' : '<i class="fa-solid fa-eye"></i> Ver la solución';
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
	Reveal.on('slidechanged', function (e) {
		if (!e.previousSlide) return;
		e.previousSlide.querySelectorAll('.ans-btn[aria-expanded="true"]').forEach(function (b) { setAnswer(b, false); });
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
		// 1. Simulador de 01: ε-clausura tras leer 0 y aceptación
		var s = sims.filter(function (x) { return x.el.closest('#completo-01'); })[0], st = function (x, a) { x.parte('sim-ctrl').querySelector('[data-a="' + a + '"]').click(); };
		check(activos(s) === 'q0', '01: el simulador no empieza en {q0}');
		st(s, 'step');
		check(activos(s) === 'q1,q2', '01: tras leer 0 deberían estar activos q1 y q2 (por la flecha ε)');
		st(s, 'all');
		check(/se acepta/.test(s.parte('sim-estado').textContent), '01 debería aceptarse');
		st(s, 'reset');
		// 2. Simulador de 0*: ε aceptada sin leer y 1 rechazada
		var se = sims.filter(function (x) { return x.el.closest('#ejercicio-estrella'); })[0];
		st(se, 'all');
		check(/se acepta/.test(se.parte('sim-estado').textContent) && activos(se) === 'q0,q2,q3', '0*: ε debería aceptarse con activos {q0,q2,q3}');
		se.parte('sim-elegir-w').querySelector('[data-w="1"]').click(); st(se, 'all');
		check(/se rechaza/.test(se.parte('sim-estado').textContent), '0*: 1 debería rechazarse');
		se.parte('sim-elegir-w').querySelector('[data-w=""]').click();
		// 3. Construcciones por etapas: número de etapas y subtítulos
		document.querySelectorAll('[data-construccion]').forEach(function (el) {
			var t = T(el.dataset.construccion);
			check(el.querySelectorAll('.etapa').length === t.pasos.length + 1 && el.querySelectorAll('.cap').length === t.pasos.length + 1, el.dataset.construccion + ': etapas o subtítulos incompletos');
			check(el.querySelectorAll('.etapa')[t.pasos.length - 1].querySelectorAll('.new, .nuevo').length > 0, el.dataset.construccion + ': la última operación debería resaltarse');
			check(el.querySelectorAll('.etapa')[t.pasos.length].querySelectorAll('.new, .nuevo').length === 0, el.dataset.construccion + ': el autómata completo no debería tener resaltados');
		});
		var c01 = document.querySelector('[data-construccion="01"]'), si = Reveal.getIndices(c01.closest('section'));
		Reveal.slide(si.h, si.v, -1);
		var pasosVistos = 0; while (Reveal.nextFragment()) pasosVistos++;
		check(pasosVistos === 3 && c01.querySelectorAll('.etapa')[3].classList.contains('visible'), '01: la construcción debería avanzar en 3 clics hasta el autómata completo');
		// 4. Laboratorio
		$('lab-re').value = '(0+1)*1'; $('lab-w').value = '0101'; $('lab-re').dispatchEvent(new Event('input'));
		check(/se acepta/.test($('lab-res').textContent), 'laboratorio: 0101 debería aceptarse con (0+1)*1');
		$('lab-atras').click();
		check(/etapa \d+ de \d+/.test($('lab-etapa').textContent), 'laboratorio: «Etapa anterior» no muestra una etapa');
		$('lab-re').value = '(0+1'; $('lab-re').dispatchEvent(new Event('input'));
		check(/err/.test($('lab-msg').className), 'laboratorio: «(0+1» debería mostrar un error');
		$('lab-re').value = '0(1+0)*'; $('lab-w').value = '0110'; $('lab-re').dispatchEvent(new Event('input'));
		// 5. Lista de comprobación: todo en verde
		check(document.querySelectorAll('[data-checklist] td.no').length === 0, 'la lista de comprobación tiene casillas en rojo');
		// 6. Navegación
		Reveal.slide(0, 0); check(Reveal.isFirstSlide(), 'no se vuelve a la portada');
		var last = Reveal.getSlides().slice(-1)[0], li = Reveal.getIndices(last);
		Reveal.slide(li.h, li.v); check(Reveal.isLastSlide(), 'no se llega a la última diapositiva');
		Reveal.slide(0, 0);
		return { out: out, ok: ok };
	}
	function report() {
		var tests = interactionTests(), out = tests.out.slice(), slides = Reveal.getSlides(), n = 0, nInv = 0;
		document.querySelectorAll('[data-claim]').forEach(function (el) {
			n++;
			var where = 'diapositiva ' + (slides.indexOf(el.closest('section')) + 1);
			out = out.concat(A.comprobar(attrs(el), where, RX).map(function (m) { return 'AFIRMACIÓN: ' + m; }));
			if (el.hasAttribute('data-inv')) { nInv++; out = out.concat(TH.invariantes(T(el.dataset.claim.slice(2))).map(function (m) { return 'THOMPSON ' + where + ' [' + el.dataset.claim + ']: ' + m; })); }
		});
		document.querySelectorAll('[data-rx]').forEach(function (el) {
			n++;
			var a = { re: el.dataset.rx };
			['in', 'out', 'exact', 'paren'].forEach(function (k) { if (el.hasAttribute('data-rx-' + k)) a[k] = el.getAttribute('data-rx-' + k); });
			out = out.concat(RX.checkClaims(a, 'diapositiva ' + (slides.indexOf(el.closest('section')) + 1)).map(function (m) { return 'EXPRESIÓN: ' + m; }));
		});
		document.querySelectorAll('.ans-btn').forEach(function (b) { setAnswer(b, true); });
		slides.forEach(function (s, i) {
			s.style.display = 'block';
			var id = (i + 1) + ' «' + ((s.querySelector('h1,h2') || {}).textContent || '').trim().slice(0, 50) + '»';
			if (s.scrollHeight > 722) out.push('DESBORDE VERTICAL ' + id + ': ' + s.scrollHeight + 'px');
			if (s.scrollWidth > 1282) out.push('DESBORDE HORIZONTAL ' + id + ': ' + s.scrollWidth + 'px');
			var box = s.getBoundingClientRect(), sc = box.height / 720;
			s.querySelectorAll('.panel, .def, .item, .note, .ans, .q, .reto, .sim > *, svg.afd, svg.ast, table, .captions, .etapas, .flujo, .piezas, .tuberia, .term, .lab > *').forEach(function (e) {
				var r = e.getBoundingClientRect();
				if (!r.width) return;
				if (r.bottom - box.top > (720 - 6) * sc) out.push('FUERA DEL LIENZO ' + id + ': <' + e.tagName.toLowerCase() + ' class="' + (e.getAttribute('class') || '') + '"> baja hasta ' + Math.round((r.bottom - box.top) / sc) + 'px');
				if (r.right - box.left > (1280 - 4) * sc) out.push('FUERA DEL LIENZO (derecha) ' + id + ': <' + e.tagName.toLowerCase() + ' class="' + (e.getAttribute('class') || '') + '"> llega a ' + Math.round((r.right - box.left) / sc) + 'px');
			});
			s.querySelectorAll('.item, .def .body, .note, .cap, .estado-sim, .str, .prueba, .pz, .frase').forEach(function (e) {
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
			' diagramas · ' + n + ' afirmaciones (' + nInv + ' con invariantes de Thompson) · ' + tests.ok + ' pruebas de interacción superadas\n' + (out.length ? out.join('\n') : 'SIN PROBLEMAS');
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
