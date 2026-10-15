// Verificación estática de la presentación (sin navegador).
// Uso:  node verificar.mjs
// - Comprueba con motor.js cada afirmación de lenguaje escrita en index.html
//   (data-re + data-exact / data-upto / data-in / data-out / data-inf / data-fin / data-paren).
// - Detectives: cada fila tiene cadenas aceptadas y rechazadas.
// - Estructura: <section> balanceadas, ids, botones de respuesta, hojas de estilo locales,
//   delimitadores de fórmulas e índices de fragmento consecutivos.
// - Pruebas del propio motor contra resultados conocidos de la teoría.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const R = createRequire(import.meta.url)(join(here, 'motor.js'));
const html = readFileSync(join(here, 'index.html'), 'utf8');
const errors = [];
const unesc = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

// 0. El motor frente a resultados conocidos
const motor = [
	['∅', 'exact', ''], ['ε', 'exact', 'ε'], ['∅*', 'exact', 'ε'], ['0∅', 'exact', ''], ['ε0', 'exact', '0'],
	['0+1', 'exact', '0,1'], ['(0+1)(0+1)', 'exact', '00,01,10,11'], ['0*', 'upto', 'ε,0,00,000'],
	['(0+1)*', 'upto', 'ε,0,1,00,01,10,11'], ['(0*1*)*', 'same', '(0+1)*'], ['(0+ε)1', 'exact', '1,01'],
];
for (const [re, k, v] of motor) errors.push(...R.checkClaims({ re, [k]: v }, `motor «${re}»`));
for (const bad of ['', '(0+1', '0++1', '+0', '0)', '2^3', '*0']) { try { R.parse(bad); errors.push(`motor: «${bad}» debería ser inválida`); } catch { /* esperado */ } }
if (R.explicit(R.parse('0+10*'), true) !== '0+(1(0*))') errors.push('motor: precedencia incorrecta');

// 1. Afirmaciones de las diapositivas
let nClaims = 0, nSec = 0;
for (const sec of html.split(/<section/).slice(1)) {
	nSec++;
	const body = sec.split('</section>')[0];
	for (const m of body.matchAll(/<[a-z]+\s((?:[^>"]|"[^"]*")*\bdata-re="[^"]*"(?:[^>"]|"[^"]*")*)>/g)) {
		const a = {};
		for (const x of m[1].matchAll(/data-(re|exact|upto|in|out|inf|fin|paren|same)(?:="([^"]*)")?/g)) a[x[1]] = unesc(x[2] ?? '');
		nClaims++;
		errors.push(...R.checkClaims(a, `diapositiva ${nSec}`));
	}
	// Fragmentos con índice explícito: consecutivos desde 1
	const idx = [...new Set([...body.matchAll(/data-fragment-index="(\d+)"/g)].map((x) => +x[1]))].sort((p, q) => p - q);
	if (idx.length && idx.some((v, i) => v !== i + 1)) errors.push(`diapositiva ${nSec}: índices de fragmento no consecutivos (${idx.join(',')})`);
}

// 2. Detectives
let nDet = 0;
for (const m of html.matchAll(/data-det="([^"]+)">([^]*?)<\/div>/g)) {
	nDet++;
	const r = R.parse(m[1]), ws = [...m[2].matchAll(/data-w="([^"]*)"/g)].map((x) => x[1]);
	const si = ws.filter((w) => R.member(r, w)).length;
	if (!si || si === ws.length) errors.push(`detectives ${m[1]}: necesita cadenas aceptadas y rechazadas (${si}/${ws.length})`);
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
for (const f of ['index.html', 'presentacion.js', 'motor.js', 'regex.css']) {
	const n = (readFileSync(join(here, f), 'utf8').match(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g) || []).length;
	if (n) errors.push(`${f}: ${n} caracteres de control (¿una barra invertida perdida, como \\v o \\b?)`);
}
const mo = (html.match(/\\\(/g) || []).length, mc = (html.match(/\\\)/g) || []).length;
if (mo !== mc) errors.push(`delimitadores \\( \\) desbalanceados: ${mo} / ${mc}`);
for (const m of html.matchAll(/\\\(([^]*?)\\\)/g)) if (/</.test(m[1])) errors.push(`"<" dentro de fórmula: ${m[1].slice(0, 40)}`);

console.log(`Secciones: ${open} · fórmulas en línea: ${mo} · afirmaciones de lenguajes: ${nClaims} · filas de detectives: ${nDet}`);
if (errors.length) { console.error('\nERRORES:\n- ' + errors.join('\n- ')); process.exit(1); }
console.log('\nOK: todas las comprobaciones estáticas pasaron.');
