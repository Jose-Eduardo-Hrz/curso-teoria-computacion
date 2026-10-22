// Verificación estática de la presentación (sin navegador).
// Uso:  node verificar.mjs
// 1. Comprueba A MANO (tablas escritas aquí) cada paso de las conversiones de la clase.
// 2. Compara el motor posfija.js con un analizador independiente (descenso recursivo)
//    en cientos de expresiones aleatorias.
// 3. EJECUTA el bloque de código de la diapositiva y lo compara con el motor.
// 4. Comprueba las afirmaciones del HTML (data-posfija-de, data-norm-de, data-infija-de,
//    data-no-posfija-de, data-re) y la estructura (secciones, ids, fórmulas, caracteres de control).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const P = createRequire(import.meta.url)(join(here, 'posfija.js'));
const html = readFileSync(join(here, 'index.html'), 'utf8');
const errors = [];
let ok = 0;
const check = (cond, msg) => { if (cond) ok++; else errors.push(msg); };
const decode = (s) => s.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');

// 1. Seguimiento comprobado a mano: [símbolo leído, salida, pila] por paso ('' = fin).
const MANUAL = {
	'(a+b)*·a·b': [['(', '', '('], ['a', 'a', '('], ['+', 'a', '(+'], ['b', 'ab', '(+'], [')', 'ab+', ''], ['*', 'ab+*', ''],
		['·', 'ab+*', '·'], ['a', 'ab+*a', '·'], ['·', 'ab+*a·', '·'], ['b', 'ab+*a·b', '·'], ['', 'ab+*a·b·', '']],
	'a+b·a': [['a', 'a', ''], ['+', 'a', '+'], ['b', 'ab', '+'], ['·', 'ab', '+·'], ['a', 'aba', '+·'], ['', 'aba·', '+'], ['', 'aba·+', '']],
	'a·(b+a)': [['a', 'a', ''], ['·', 'a', '·'], ['(', 'a', '·('], ['b', 'ab', '·('], ['+', 'ab', '·(+'], ['a', 'aba', '·(+'], [')', 'aba+', '·'], ['', 'aba+·', '']],
	'(a+b)·a*': [['(', '', '('], ['a', 'a', '('], ['+', 'a', '(+'], ['b', 'ab', '(+'], [')', 'ab+', ''], ['·', 'ab+', '·'], ['a', 'ab+a', '·'], ['*', 'ab+a*', '·'], ['', 'ab+a*·', '']]
};
for (const [expr, filas] of Object.entries(MANUAL)) {
	const pasos = P.trazar(expr).pasos;
	check(pasos.length === filas.length, `${expr}: ${pasos.length} pasos, a mano ${filas.length}`);
	filas.forEach(([s, sal, pila], i) => {
		const p = pasos[i] || {};
		check((p.simbolo || '') === s && (p.salida || []).join('') === sal && (p.pila || []).join('') === pila,
			`${expr} paso ${i + 1}: motor [${p.simbolo || 'fin'}, ${(p.salida || []).join('')}, ${(p.pila || []).join('')}] ≠ a mano [${s || 'fin'}, ${sal}, ${pila}]`);
	});
}
check(P.normalizar('(a+b)*ab') === '(a+b)*·a·b', 'normalizar((a+b)*ab)');
check(P.aPosfija('(a+b)*ab') === 'ab+*a·b·', 'LA SOLUCIÓN PRINCIPAL NO ES ab+*a·b·');
check(P.normalizar('a(b+a)') === 'a·(b+a)' && P.normalizar('(a+b)a*') === '(a+b)·a*', 'normalizar de los ejercicios');
check(P.normalizar(P.normalizar('(a+b)*ab')) === '(a+b)*·a·b', 'normalizar no es idempotente');
for (const malo of ['(a+b', 'a+b)', 'a+', '+a', '*a', '()', 'a A']) {
	let lanzo = false; try { P.aPosfija(malo); } catch { lanzo = true; }
	check(lanzo, `«${malo}» debería dar error`);
}

// 2. Analizador independiente: E := T ('+' T)* · T := F (('·')? F)* · F := A '*'* · A := letra | '(' E ')'
function analizar(src) {
	const s = [...src]; let i = 0;
	const ver = () => s[i];
	function E() { let n = T(); while (ver() === '+') { i++; n = `(${n}+${T()})`; } return n; }
	function T() {
		let n = F();
		while (ver() === '·' || /[a-z(]/.test(ver() || '')) { if (ver() === '·') i++; n = `(${n}·${F()})`; }
		return n;
	}
	function F() { let n = A(); while (ver() === '*') { i++; n = `(${n})*`; } return n; }
	function A() {
		const c = s[i++];
		if (/[a-z]/.test(c || '')) return c;
		if (c === '(') { const n = E(); if (s[i++] !== ')') throw new Error('falta )'); return n; }
		throw new Error('símbolo inesperado ' + c);
	}
	const n = E();
	if (i !== s.length) throw new Error('sobra texto');
	return n;
}
let semilla = 7;
const azar = (k) => { semilla = (semilla * 1103515245 + 12345) % 2147483648; return semilla % k; };
function generar(d) {
	const r = d > 3 ? 0 : azar(6);
	if (r <= 1) return 'ab'[azar(2)];
	if (r === 2) { const g = generar(d + 1); return (g.length > 1 ? `(${g})` : g) + '*'; }
	if (r === 3) return `(${generar(d + 1)})`;
	if (r === 4) return generar(d + 1) + (azar(2) ? '·' : '') + generar(d + 1);
	return generar(d + 1) + '+' + generar(d + 1);
}
let nAzar = 0;
for (let k = 0; k < 600; k++) {
	const e = generar(0);
	if (/\*\*/.test(e)) continue;
	let esperado;
	try { esperado = analizar(e); } catch { continue; }
	const pos = P.aPosfija(e);
	check(P.completa(pos) === esperado, `${e}: posfija ${pos} tiene estructura ${P.completa(pos)}, el analizador dice ${esperado}`);
	check(!/[()]/.test(pos), `${e}: la posfija ${pos} tiene paréntesis`);
	check(P.aPosfija(P.aInfija(pos)) === pos, `${e}: releer ${P.aInfija(pos)} no devuelve ${pos}`);
	nAzar++;
}

// 3. Código de la diapositiva
let nCode = 0;
for (const m of html.matchAll(/<pre([^>]*)><code>([^]*?)<\/code><\/pre>/g)) {
	const code = decode(m[2]), chk = m[1].match(/data-check="([^"]*)"/);
	if (!chk) { errors.push('bloque de código sin data-check'); continue; }
	const __out = [];
	try {
		const f = new Function('console', '__out', `${code}\nreturn { ok: (${decode(chk[1])}), aPosfija };`)({ log: (...a) => __out.push(a.join(' ')) }, __out);
		check(f.ok === true, `el código de la diapositiva no pasa «${decode(chk[1])}» (salida ${JSON.stringify(__out)})`);
		semilla = 99;
		for (let k = 0; k < 300; k++) {
			const n = P.normalizar(generar(0));
			check(f.aPosfija(n) === P.trazar(n).posfija, `el código de la diapositiva da ${f.aPosfija(n)} para ${n}; el motor, ${P.trazar(n).posfija}`);
		}
		nCode++;
	} catch (e) { errors.push('error al ejecutar el código de la diapositiva: ' + e.message); }
}

// 4. Afirmaciones del HTML
const attr = (tag, name) => { const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`)); return m && decode(m[1]); };
let nAf = 0;
for (const [tag] of html.matchAll(/<[a-z]+\s[^>]*data-(?:posfija-de|norm-de|infija-de|no-posfija-de|re)="[^>]*>/g)) {
	const tk = attr(tag, 'data-tk') || attr(tag, 'data-tk-check') || attr(tag, 'data-tk-plain');
	const pd = attr(tag, 'data-posfija-de'), nd = attr(tag, 'data-norm-de'), id = attr(tag, 'data-infija-de'), no = attr(tag, 'data-no-posfija-de'), re = attr(tag, 'data-re');
	if (pd !== null) check(P.aPosfija(pd) === tk, `aPosfija(${pd}) = ${P.aPosfija(pd)}, la diapositiva dice ${tk}`);
	if (nd !== null) check(P.normalizar(nd) === tk, `normalizar(${nd}) = ${P.normalizar(nd)}, la diapositiva dice ${tk}`);
	if (id !== null) check(P.aInfija(id, /data-con-punto/.test(tag)) === tk, `aInfija(${id}) = ${P.aInfija(id)}, la diapositiva dice ${tk}`);
	if (no !== null) check(P.aPosfija(no) !== tk, `${tk} sí es la posfija de ${no} (debería ser un error)`);
	if (re !== null) {
		const rx = new RegExp('^(?:' + re.replace(/\+/g, '|').replace(/·/g, '') + ')$');
		(attr(tag, 'data-en') || '').split(',').filter(Boolean).forEach((w) => check(rx.test(w), `${w} debería estar en L(${re})`));
		(attr(tag, 'data-fuera') || '').split(',').filter(Boolean).forEach((w) => check(!rx.test(w), `${w} no debería estar en L(${re})`));
	}
	nAf++;
}
// Las fichas escritas a mano dentro de un data-tk-check deben decir lo mismo.
for (const m of html.matchAll(/data-tk-check="([^"]*)"[^>]*>([^]*?)<\/span>\s*<\/span>\s*<\/span>/g)) {
	const fichas = [...m[2].matchAll(/<span class="tk [a-z]+">([^<]*)<\/span>/g)].map((t) => t[1]).join('');
	check(fichas === m[1], `las fichas dibujadas (${fichas}) no dicen ${m[1]}`);
	nAf++;
}
check(/data-tk-check="aba·\+"/.test(html), 'falta la posfija dibujada a mano de la diapositiva 7');
for (const m of html.matchAll(/data-traza="([^"]*)"/g)) { try { P.trazar(m[1]); ok++; } catch (e) { errors.push(`data-traza="${m[1]}": ${e.message}`); } }

// 5. Estructura
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
ids.filter((v, i) => ids.indexOf(v) !== i).forEach((v) => errors.push(`id duplicado: ${v}`));
const js = readFileSync(join(here, 'presentacion.js'), 'utf8');
for (const m of js.matchAll(/\$\('([\w-]+)'\)/g)) if (!ids.includes(m[1])) errors.push(`presentacion.js usa #${m[1]}, que no existe en index.html`);
const open = (html.match(/<section[\s>]/g) || []).length, close = (html.match(/<\/section>/g) || []).length;
check(open === close, `<section> desbalanceadas: ${open} / ${close}`);
let principales = 0, prof = 0;
for (const m of html.matchAll(/<(\/?)section[\s>]/g)) { if (m[1]) prof--; else if (prof++ === 0) principales++; }
check(principales === 21, `deberían ser 21 diapositivas principales (hay ${principales})`);
for (const m of html.matchAll(/<(?:link[^>]*href|script[^>]*src)="([^"]+)"/g)) {
	check(!/^https?:/.test(m[1]), `recurso externo: ${m[1]}`);
	try { readFileSync(join(here, m[1])); } catch { errors.push(`archivo inexistente: ${m[1]}`); }
}
const mOpen = (html.match(/\\\(/g) || []).length, mClose = (html.match(/\\\)/g) || []).length;
check(mOpen === mClose, `delimitadores \\( \\) desbalanceados: ${mOpen} / ${mClose}`);
for (const f of ['index.html', 'presentacion.js', 'posfija.js', 'posfija.css']) {
	const t = readFileSync(join(here, f), 'utf8');
	const cc = t.match(/[\x00-\x08\x0b\x0c\x0e-\x1f]/);
	check(!cc, `${f}: carácter de control U+${cc && cc[0].charCodeAt(0).toString(16).padStart(4, '0')}`);
}

console.log(`Seguimientos a mano: ${Object.keys(MANUAL).length} · expresiones aleatorias: ${nAzar} · bloques de código: ${nCode} · afirmaciones del HTML: ${nAf}`);
console.log(`Secciones: ${open} (${principales} principales) · fórmulas en línea: ${mOpen} · comprobaciones superadas: ${ok}`);
if (errors.length) { console.error('\nERRORES:\n- ' + errors.join('\n- ')); process.exit(1); }
console.log('\nOK: ab+*a·b· y todas las comprobaciones estáticas pasaron.');
