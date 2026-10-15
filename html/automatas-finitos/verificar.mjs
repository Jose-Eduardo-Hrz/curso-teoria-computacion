// Verificación estática de la presentación (sin navegador).
// Uso:  node verificar.mjs
// - Valida cada autómata de afd.js (AFD completo y determinista; o el número
//   de errores esperado si el diagrama es incorrecto a propósito).
// - Comprueba cada afirmación data-claim de index.html (aceptadas, rechazadas,
//   recorridos, δ, δ*, componentes y L(M) = L(expresión regular)).
// - Detectives: hay cadenas aceptadas y rechazadas.
// - Estructura: secciones, ids, botones, archivos locales, fórmulas,
//   fragmentos consecutivos y caracteres de control (barras invertidas perdidas).
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const A = req(join(here, 'afd.js')), RX = req(join(here, 'motor-regex.js'));
const html = readFileSync(join(here, 'index.html'), 'utf8');
const errors = [];

// 0. Autómatas
for (const [id, d] of Object.entries(A.AUTOMATAS)) {
	if (d.ilustracion) continue;
	const e = A.validar(d), esp = d.esperaErrores || 0;
	if (e.length !== esp) errors.push(`autómata ${id}: ${e.length} errores (se esperaban ${esp}): ${e.join(' | ')}`);
	if (!esp && d.re) errors.push(...A.comprobar({ claim: id, re: d.re }, `autómata ${id}`, RX));
	for (const s of d.states) if (s.x < 30 || s.y < 30 || s.x > d.w - 30 || s.y > d.h - 30) errors.push(`autómata ${id}: el estado ${s.id} se sale del dibujo`);
}
// Motor: recorridos y δ* conocidos
const t = A.AUTOMATAS.termina1;
if (A.recorrer(t, '101').camino.join() !== 'q0,q1,q0,q1') errors.push('motor: recorrido de 101 incorrecto');
if (A.deltaExt(t, 'q0', '') !== 'q0') errors.push('motor: δ*(q0, ε) debería ser q0');
if (A.delta(A.AUTOMATAS.conError, 'q1', '0') !== null || A.recorrer(A.AUTOMATAS.empieza1, '').camino.join() !== 'q0') errors.push('motor: δ indefinida o recorrido de ε incorrecto');

// 1. Afirmaciones
let n = 0, nSec = 0;
const unesc = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
for (const sec of html.split(/<section/).slice(1)) {
	nSec++;
	const body = sec.split('</section>')[0];
	for (const m of body.matchAll(/<[a-z]+\s((?:[^>"]|"[^"]*")*\bdata-claim="[^"]*"(?:[^>"]|"[^"]*")*)>/g)) {
		const a = {};
		for (const x of m[1].matchAll(/data-(claim|acc|rej|w|path|ext|delta|re|q0|q|f|errores)="([^"]*)"/g)) a[x[1]] = unesc(x[2]);
		n++;
		errors.push(...A.comprobar(a, `diapositiva ${nSec}`, RX));
	}
	const idx = [...new Set([...body.matchAll(/data-fragment-index="(\d+)"/g)].map((x) => +x[1]))].sort((p, q) => p - q);
	if (idx.length && idx.some((v, i) => v !== i + 1)) errors.push(`diapositiva ${nSec}: índices de fragmento no consecutivos (${idx.join(',')})`);
	for (const m of body.matchAll(/data-(?:diagram|table|pruebas|afd)="([^"]+)"/g)) if (!A.AUTOMATAS[m[1]]) errors.push(`diapositiva ${nSec}: autómata inexistente «${m[1]}»`);
	for (const m of body.matchAll(/data-select="([^"]+)"/g)) for (const id of m[1].split(',')) if (!A.AUTOMATAS[id]) errors.push(`diapositiva ${nSec}: autómata inexistente «${id}» en el selector`);
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
for (const f of ['index.html', 'presentacion.js', 'afd.js', 'afd.css']) {
	const c = (readFileSync(join(here, f), 'utf8').match(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g) || []).length;
	if (c) errors.push(`${f}: ${c} caracteres de control (¿una barra invertida perdida, como \\v o \\b?)`);
}
const mo = (html.match(/\\\(/g) || []).length, mc = (html.match(/\\\)/g) || []).length;
if (mo !== mc) errors.push(`delimitadores \\( \\) desbalanceados: ${mo} / ${mc}`);

console.log(`Secciones: ${open} · fórmulas en línea: ${mo} · autómatas: ${Object.keys(A.AUTOMATAS).length} · afirmaciones: ${n}`);
if (errors.length) { console.error('\nERRORES:\n- ' + errors.join('\n- ')); process.exit(1); }
console.log('\nOK: todas las comprobaciones estáticas pasaron.');
