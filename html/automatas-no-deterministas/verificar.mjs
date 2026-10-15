// Verificación estática de la presentación (sin navegador).
// Uso:  node verificar.mjs
// - Valida cada autómata de afn.js: estructura correcta, clasificación esperada
//   y L(M) = L(expresión regular) en todas las cadenas de longitud ≤ 8.
// - Propiedades del motor: δ* = simulación por conjuntos, construcción de
//   subconjuntos equivalente al AFN, ε-clausura.
// - Comprueba cada afirmación data-claim de index.html.
// - Detectives: hay cadenas aceptadas y rechazadas.
// - Estructura: secciones, ids, botones, archivos locales, fórmulas,
//   fragmentos consecutivos y caracteres de control (barras invertidas perdidas).
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const A = req(join(here, 'afn.js')), RX = req(join(here, 'motor-regex.js'));
const html = readFileSync(join(here, 'index.html'), 'utf8');
const errors = [];

// 0. Autómatas y motor
const todas = A.lenguaje({ sigma: ['0', '1'], start: 'x', finals: ['x'], states: [{ id: 'x' }], trans: [['x', '0', 'x'], ['x', '1', 'x']] }, 7);
for (const [id, d] of Object.entries(A.AUTOMATAS)) {
	errors.push(...A.validar(d).map((e) => `autómata ${id}: ${e}`));
	if (d.re) errors.push(...A.comprobar({ claim: id, re: d.re }, `autómata ${id}`, RX));
	for (const s of d.states) if (s.x < 30 || s.y < 30 || s.x > d.w - 30 || s.y > d.h - 30) errors.push(`autómata ${id}: el estado ${s.id} se sale del dibujo`);
	// δ* (definición recursiva) y la simulación por conjuntos deben coincidir
	const dif = todas.filter((w) => A.texto(A.deltaExt(d, d.start, w)) !== A.texto(A.simular(d, w).conjuntos[w.length])).length;
	if (dif) errors.push(`autómata ${id}: δ* y la simulación difieren en ${dif} cadenas`);
	// El AFD de subconjuntos reconoce el mismo lenguaje que el AFN
	const sc = A.subconjuntos(d), nom = (S) => A.texto(S);
	const dfa = { sigma: d.sigma, start: nom(sc.estados[0]), finals: sc.finales, states: sc.estados.map((S) => ({ id: nom(S) })), trans: sc.trans };
	if (A.lenguaje(dfa, 8).join() !== A.lenguaje(d, 8).join()) errors.push(`autómata ${id}: el AFD de subconjuntos no es equivalente`);
	if (A.clasificar(dfa).tipo !== 'AFD') errors.push(`autómata ${id}: la construcción de subconjuntos no produjo un AFD`);
}
const tipos = { termina01: 'AFN', penultimo1: 'AFN', contiene101: 'AFN', ceros_unos: 'AFN-ε', solo: 'AFN-ε', termina1: 'AFD', termina01afd: 'AFD' };
for (const [id, t] of Object.entries(tipos)) if (A.clasificar(A.AUTOMATAS[id]).tipo !== t) errors.push(`autómata ${id}: clasificado como ${A.clasificar(A.AUTOMATAS[id]).tipo}, se esperaba ${t}`);
if (A.compararSubconjuntos(A.AUTOMATAS.termina01afd).length) errors.push('termina01afd no coincide con la construcción de subconjuntos: ' + A.compararSubconjuntos(A.AUTOMATAS.termina01afd).join(' | '));

// 1. Afirmaciones
let n = 0, nSec = 0;
const unesc = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
for (const sec of html.split(/<section/).slice(1)) {
	nSec++;
	const body = sec.split('</section>')[0];
	for (const m of body.matchAll(/<[a-z]+\s((?:[^>"]|"[^"]*")*\bdata-claim="[^"]*"(?:[^>"]|"[^"]*")*)>/g)) {
		const a = {};
		for (const x of m[1].matchAll(/data-(claim|acc|rej|w|sets|delta|ext|eclose|caminos|tipo|re|equiv|nsub|q0|q|f|subconj)(?![\w-])(?:="([^"]*)")?/g)) a[x[1]] = unesc(x[2] ?? '');
		n++;
		errors.push(...A.comprobar(a, `diapositiva ${nSec}`, RX));
	}
	const idx = [...new Set([...body.matchAll(/data-fragment-index="(\d+)"/g)].map((x) => +x[1]))].sort((p, q) => p - q);
	if (idx.length && idx.some((v, i) => v !== i + 1)) errors.push(`diapositiva ${nSec}: índices de fragmento no consecutivos (${idx.join(',')})`);
	for (const m of body.matchAll(/data-(?:diagram|table|arbol|afn|clasif|det)="([^"]+)"/g)) if (!A.AUTOMATAS[m[1]]) errors.push(`diapositiva ${nSec}: autómata inexistente «${m[1]}»`);
	for (const m of body.matchAll(/data-select="([^"]+)"/g)) for (const id of m[1].split(',')) if (!A.AUTOMATAS[id]) errors.push(`diapositiva ${nSec}: autómata inexistente «${id}»`);
}

// 2. Detectives
for (const m of html.matchAll(/data-det="([^"]+)"[^>]*>([^]*?)<\/div>/g)) {
	const ws = [...m[2].matchAll(/data-w="([^"]*)"/g)].map((x) => x[1]), si = ws.filter((w) => A.acepta(A.AUTOMATAS[m[1]], w)).length;
	if (!si || si === ws.length) errors.push(`detectives: necesita cadenas aceptadas y rechazadas (${si}/${ws.length})`);
}

// 3. Estructura
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
for (const f of ['index.html', 'presentacion.js', 'afn.js', 'afn.css']) {
	const c = (readFileSync(join(here, f), 'utf8').match(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g) || []).length;
	if (c) errors.push(`${f}: ${c} caracteres de control (¿una barra invertida perdida, como \\v o \\b?)`);
}
const mo = (html.match(/\\\(/g) || []).length, mc = (html.match(/\\\)/g) || []).length;
if (mo !== mc) errors.push(`delimitadores \\( \\) desbalanceados: ${mo} / ${mc}`);

console.log(`Secciones: ${open} · fórmulas en línea: ${mo} · autómatas: ${Object.keys(A.AUTOMATAS).length} · afirmaciones: ${n}`);
if (errors.length) { console.error('\nERRORES:\n- ' + errors.join('\n- ')); process.exit(1); }
console.log('\nOK: todas las comprobaciones estáticas pasaron.');
