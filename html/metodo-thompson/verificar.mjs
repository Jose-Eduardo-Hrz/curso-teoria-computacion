// Verificación estática de la presentación (sin navegador).
// Uso:  node verificar.mjs
// - Construye con thompson.js cada expresión usada en index.html y comprueba
//   los invariantes de Thompson (un inicio sin entradas, un final sin salidas,
//   ≤ 2 salidas por estado, 2 estados por símbolo/unión/estrella) y que
//   L(M) = L(r) en todas las cadenas de longitud ≤ 8.
// - Comprueba que cada regla añade exactamente lo que dice (estados y flechas).
// - Comprueba cada afirmación data-claim (afn.js) y data-rx (motor-regex.js).
// - Diagramas erróneos: fallan como se afirma.
// - Estructura: secciones, ids, botones, archivos locales, fórmulas, caracteres de control.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const RX = req(join(here, 'motor-regex.js')), A = req(join(here, 'afn.js')), TH = req(join(here, 'thompson.js'));
const html = readFileSync(join(here, 'index.html'), 'utf8');
const errors = [];
const unesc = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

// 0. Todas las expresiones de la presentación
const exprs = new Set();
for (const m of html.matchAll(/data-(?:thompson|construccion|t|ast|tabla-pasos)="([^"]+)"/g)) exprs.add(unesc(m[1]));
for (const m of html.matchAll(/data-claim="T:([^"]+)"/g)) exprs.add(unesc(m[1]));
for (const m of html.matchAll(/data-checklist="([^"]+)"/g)) unesc(m[1]).split(',').forEach((e) => exprs.add(e));
for (const src of exprs) {
	const t = TH.construir(src);
	errors.push(...TH.invariantes(t).map((e) => `Thompson «${src}»: ${e}`));
	A.AUTOMATAS['T:' + src] = t.def;
	// Cada paso añade exactamente lo que dice su regla
	for (const p of t.pasos) {
		const esp = { 'símbolo': [2, 1], 'épsilon': [2, 1], 'vacío': [2, 0], 'unión': [2, 4], 'concatenación': [0, 1], 'estrella': [2, 4] }[p.tipo];
		if (p.nuevosEstados.length !== esp[0] || p.nuevasTrans.length !== esp[1]) errors.push(`Thompson «${src}», paso ${p.expr} (${p.tipo}): añade ${p.nuevosEstados.length} estados y ${p.nuevasTrans.length} flechas, se esperaban ${esp[0]} y ${esp[1]}`);
		if (p.tipo !== 'símbolo' && p.tipo !== 'vacío' && p.nuevasTrans.some((x) => x[1] !== 'ε')) errors.push(`Thompson «${src}»: la regla de ${p.tipo} solo debe añadir flechas ε`);
	}
	// Una etapa intermedia: un fragmento suelto por elemento de la pila, cada uno con entrada y salida distintas
	for (const p of t.pasos) for (const f of p.activos) if (f.ini === f.fin) errors.push(`Thompson «${src}»: fragmento con entrada = salida`);
	// Los estados caben en el dibujo
	for (const s of t.def.states) if (s.x < 30 || s.y < 30 || s.x > t.def.w - 30 || s.y > t.def.h - 30) errors.push(`Thompson «${src}»: ${s.id} se sale del dibujo`);
}
// Precedencia: la raíz de 10* es una concatenación y la de (0+1)* una estrella
if (TH.construir('10*').pasos.at(-1).tipo !== 'concatenación') errors.push('10* debería terminar con una concatenación');
if (TH.construir('(0+1)*').pasos.at(-1).tipo !== 'estrella') errors.push('(0+1)* debería terminar con una estrella');
for (const k of Object.keys(TH.ERRONEOS)) A.AUTOMATAS[k] = TH.ERRONEOS[k];

// 1. Afirmaciones
let n = 0, nSec = 0;
for (const sec of html.split(/<section/).slice(1)) {
	nSec++;
	const body = sec.split('</section>')[0];
	for (const m of body.matchAll(/<[a-z]+\s((?:[^>"]|"[^"]*")*\bdata-claim="[^"]*"(?:[^>"]|"[^"]*")*)>/g)) {
		const a = {};
		for (const x of m[1].matchAll(/data-(claim|acc|rej|w|sets|delta|ext|eclose|caminos|tipo|re|equiv|nsub|q0|q|f|subconj)(?![\w-])(?:="([^"]*)")?/g)) a[x[1]] = unesc(x[2] ?? '');
		n++;
		errors.push(...A.comprobar(a, `diapositiva ${nSec}`, RX));
	}
	for (const m of body.matchAll(/<[a-z]+\s((?:[^>"]|"[^"]*")*\bdata-rx="[^"]*"(?:[^>"]|"[^"]*")*)>/g)) {
		const a = {};
		for (const x of m[1].matchAll(/data-rx(?:-(in|out|exact|paren))?="([^"]*)"/g)) a[x[1] || 're'] = unesc(x[2]);
		n++;
		errors.push(...RX.checkClaims(a, `diapositiva ${nSec}`));
	}
	const idx = [...new Set([...body.matchAll(/data-fragment-index="(\d+)"/g)].map((x) => +x[1]))].sort((p, q) => p - q);
	if (idx.length && idx.some((v, i) => v !== i + 1)) errors.push(`diapositiva ${nSec}: índices de fragmento no consecutivos (${idx.join(',')})`);
	for (const m of body.matchAll(/data-erroneo="([^"]+)"/g)) if (!TH.ERRONEOS[m[1]]) errors.push(`diapositiva ${nSec}: diagrama erróneo inexistente «${m[1]}»`);
}

// 2. Estructura
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
ids.filter((x, i) => ids.indexOf(x) !== i).forEach((x) => errors.push(`id duplicado: ${x}`));
for (const m of html.matchAll(/aria-controls="([^"]+)"/g)) if (!ids.includes(m[1])) errors.push(`botón sin respuesta: ${m[1]}`);
const js = readFileSync(join(here, 'presentacion.js'), 'utf8');
for (const m of js.matchAll(/\$\('([\w-]+)'\)/g)) if (!ids.includes(m[1])) errors.push(`presentacion.js usa #${m[1]}, que no existe`);
const open = (html.match(/<section[\s>]/g) || []).length, close = (html.match(/<\/section>/g) || []).length;
if (open !== close) errors.push(`<section> desbalanceadas: ${open} / ${close}`);
for (const m of html.matchAll(/<(?:link rel="stylesheet"|script) (?:href|src)="(?!https)([^"]+)"/g)) {
	if (m[1].startsWith('..')) errors.push(`dependencia fuera de la carpeta: ${m[1]}`);
	try { readFileSync(join(here, m[1])); } catch { errors.push(`archivo inexistente: ${m[1]}`); }
}
for (const f of ['index.html', 'presentacion.js', 'thompson.js', 'thompson.css']) {
	const c = (readFileSync(join(here, f), 'utf8').match(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g) || []).length;
	if (c) errors.push(`${f}: ${c} caracteres de control (¿una barra invertida perdida?)`);
}
const mo = (html.match(/\\\(/g) || []).length, mc = (html.match(/\\\)/g) || []).length;
if (mo !== mc) errors.push(`delimitadores \\( \\) desbalanceados: ${mo} / ${mc}`);
// ε en textos que se escriben en mayúsculas debe ir protegida
for (const m of html.matchAll(/class="(?:kicker|head)"[^>]*>([^\n]*)/g)) if (/ε/.test(m[1].replace(/<span class="lc">ε<\/span>/g, '').replace(/\\\([^]*?\\\)/g, ''))) errors.push(`ε sin proteger en un texto en mayúsculas: ${m[1].slice(0, 50)}`);

console.log(`Secciones: ${open} · expresiones construidas: ${exprs.size} · afirmaciones: ${n} · fórmulas en línea: ${mo}`);
if (errors.length) { console.error('\nERRORES:\n- ' + errors.join('\n- ')); process.exit(1); }
console.log('\nOK: todas las comprobaciones estáticas pasaron.');
