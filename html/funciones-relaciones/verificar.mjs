// Verificación estática de la presentación (sin navegador).
// Uso:  node verificar.mjs
// Comprueba: propiedades declaradas de cada diagrama (data-expect),
// elementos de pares que pertenecen a sus conjuntos, ids duplicados,
// botones de respuesta con destino, enlaces internos y <section> balanceadas.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const C = require(join(here, 'diagramas.js'));
const html = readFileSync(join(here, 'index.html'), 'utf8');

const errors = [];
const attrs = (tag) => {
	const o = {};
	for (const m of tag.matchAll(/data-([\w-]+)(?:="([^"]*)")?/g)) o[m[1]] = m[2] ?? '';
	return o;
};

let nMap = 0, nRel = 0, nExpect = 0;
for (const m of html.matchAll(/<div class="(mapdiag|reldiag)"((?:[^>"]|"[^"]*")*)>/g)) {
	const a = attrs(m[2]);
	if (m[1] === 'mapdiag') {
		nMap++;
		const where = `mapdiag #${nMap} (${a.map})`;
		const A = C.list(a.a), B = C.list(a.b), M = C.pairs(a.map);
		errors.push(...C.validateMap(A, B, M, where));
		for (const k of ['hl', 'bad']) for (const p of C.list(a[k])) if (!C.list(a.map).includes(p)) errors.push(`${where}: data-${k} "${p}" no es una flecha del diagrama`);
		if (a.expect) { nExpect++; errors.push(...C.checkExpect(a.expect, C.mapProps(A, B, M), where)); }
		else errors.push(`${where}: sin data-expect`);
	} else {
		nRel++;
		const where = `reldiag #${nRel} (${a.rel})`;
		const S = C.list(a.set), R = C.pairs(a.rel);
		errors.push(...C.validateRel(S, R, where));
		for (const p of C.pairs(a.missing)) if (C.list(a.rel).includes(p.join('>'))) errors.push(`${where}: el par "faltante" ${p} sí está en la relación`);
		if (a.pos && a.pos.split(';').length !== S.length) errors.push(`${where}: data-pos no tiene ${S.length} posiciones`);
		if (a.expect) { nExpect++; errors.push(...C.checkExpect(a.expect, C.relProps(S, R), where)); }
		else errors.push(`${where}: sin data-expect`);
	}
}

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
ids.filter((x, i) => ids.indexOf(x) !== i).forEach((x) => errors.push(`id duplicado: ${x}`));
for (const m of html.matchAll(/aria-controls="([^"]+)"/g)) if (!ids.includes(m[1])) errors.push(`botón sin respuesta: ${m[1]}`);
for (const m of html.matchAll(/href="#\/([^"]+)"/g)) if (!ids.includes(m[1])) errors.push(`enlace roto: #/${m[1]}`);
const open = (html.match(/<section[\s>]/g) || []).length, close = (html.match(/<\/section>/g) || []).length;
if (open !== close) errors.push(`<section> desbalanceadas: ${open} abiertas, ${close} cerradas`);
const mathOpen = (html.match(/\\\(/g) || []).length, mathClose = (html.match(/\\\)/g) || []).length;
if (mathOpen !== mathClose) errors.push(`delimitadores \\( \\) desbalanceados: ${mathOpen} / ${mathClose}`);
const dOpen = (html.match(/\\\[/g) || []).length, dClose = (html.match(/\\\]/g) || []).length;
if (dOpen !== dClose) errors.push(`delimitadores \\[ \\] desbalanceados: ${dOpen} / ${dClose}`);
for (const m of html.matchAll(/\\\(([^]*?)\\\)/g)) if (/<(?!\/?(b|i|span)\b)/.test(m[1])) errors.push(`"<" sin escapar dentro de fórmula: ${m[1].slice(0, 40)}`);

console.log(`Diagramas: ${nMap} de flechas, ${nRel} de relaciones (${nExpect} con propiedades verificadas)`);
console.log(`Secciones: ${open} · fórmulas en línea: ${mathOpen} · en bloque: ${dOpen}`);
if (errors.length) { console.error('\nERRORES:\n- ' + errors.join('\n- ')); process.exit(1); }
console.log('\nOK: todas las comprobaciones estáticas pasaron.');
