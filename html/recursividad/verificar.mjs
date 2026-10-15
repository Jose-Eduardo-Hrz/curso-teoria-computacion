// Verificación estática de la presentación (sin navegador).
// Uso:  node verificar.mjs
// Comprueba: <section> balanceadas, ids duplicados, botones de respuesta con
// destino, delimitadores de fórmulas, "<" sin escapar en fórmulas y,
// sobre todo, EJECUTA cada bloque de código JavaScript con data-check y
// comprueba su resultado (console.log se captura en __out).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, 'index.html'), 'utf8');
const errors = [];
const decode = (s) => s.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');

// 1. Código de las diapositivas
let nRun = 0, nNoRun = 0, nPseudo = 0;
for (const m of html.matchAll(/<pre([^>]*)><code>([^]*?)<\/code><\/pre>/g)) {
	const attrs = m[1], code = decode(m[2]);
	const name = (code.match(/function (\w+)/) || [, code.slice(0, 30)])[1];
	if (/data-lang="pseudo"/.test(attrs)) { nPseudo++; continue; }
	if (/data-norun/.test(attrs)) { nNoRun++; continue; }   // ejemplo infinito: jamás se ejecuta
	const chk = attrs.match(/data-check="([^"]*)"/);
	if (!chk) { errors.push(`bloque ${name}: sin data-check (ni data-norun)`); continue; }
	const __out = [];
	const fakeConsole = { log: (...a) => __out.push(a.length === 1 ? a[0] : a.join(' ')) };
	try {
		const ok = new Function('console', '__out', `${code}\nreturn (${decode(chk[1])});`)(fakeConsole, __out);
		if (ok !== true) errors.push(`bloque ${name}: la comprobación «${decode(chk[1])}» dio ${ok} (salida: ${JSON.stringify(__out)})`);
		else nRun++;
	} catch (e) { errors.push(`bloque ${name}: error al ejecutar: ${e.message}`); }
}
// La versión sin caso base debe, efectivamente, no tener caso base (sin if).
for (const m of html.matchAll(/<pre[^>]*data-norun[^>]*><code>([^]*?)<\/code><\/pre>/g)) if (/\bif\b/.test(decode(m[1]))) errors.push('el ejemplo «sin caso base» contiene un if');
// El factorial con entrada negativa debe lanzar error.
const fact = decode((html.match(/<pre[^>]*><code>(function factorial[^]*?)<\/code><\/pre>/) || [])[1] || '');
try { new Function('console', fact + '\nfactorial(-1);')({ log() {} }); errors.push('factorial(-1) no lanza error'); } catch { /* esperado */ }

// 2. Estructura
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
ids.filter((x, i) => ids.indexOf(x) !== i).forEach((x) => errors.push(`id duplicado: ${x}`));
for (const m of html.matchAll(/aria-controls="([^"]+)"/g)) if (!ids.includes(m[1])) errors.push(`botón sin respuesta: ${m[1]}`);
const js = readFileSync(join(here, 'presentacion.js'), 'utf8');
for (const m of js.matchAll(/\$\('([\w-]+)'\)/g)) if (!ids.includes(m[1])) errors.push(`presentacion.js usa #${m[1]}, que no existe en index.html`);
const open = (html.match(/<section[\s>]/g) || []).length, close = (html.match(/<\/section>/g) || []).length;
if (open !== close) errors.push(`<section> desbalanceadas: ${open} abiertas, ${close} cerradas`);
for (const m of html.matchAll(/<link rel="stylesheet" href="(?!https)([^"]+)"/g)) {
	try { readFileSync(join(here, m[1])); } catch { errors.push(`hoja de estilos inexistente: ${m[1]}`); }
}

// 3. Fórmulas
const mathOpen = (html.match(/\\\(/g) || []).length, mathClose = (html.match(/\\\)/g) || []).length;
if (mathOpen !== mathClose) errors.push(`delimitadores \\( \\) desbalanceados: ${mathOpen} / ${mathClose}`);
const dOpen = (html.match(/\\\[/g) || []).length, dClose = (html.match(/\\\]/g) || []).length;
if (dOpen !== dClose) errors.push(`delimitadores \\[ \\] desbalanceados: ${dOpen} / ${dClose}`);
for (const m of html.matchAll(/\\\(([^]*?)\\\)/g)) if (/</.test(m[1])) errors.push(`"<" sin escapar dentro de fórmula: ${m[1].slice(0, 40)}`);

// 4. Fragmentos: índices consecutivos por diapositiva (sin huecos que obliguen a clics vacíos)
let nSec = 0;
for (const sec of html.split(/<section/).slice(1)) {
	nSec++;
	const idx = [...new Set([...sec.split('</section>')[0].matchAll(/data-fragment-index="(\d+)"/g)].map((m) => +m[1]))].sort((a, b) => a - b);
	if (idx.length && idx.some((v, i) => v !== i + 1)) errors.push(`diapositiva ${nSec}: índices de fragmento no consecutivos (${idx.join(',')})`);
}

console.log(`Secciones: ${open} · fórmulas en línea: ${mathOpen} · en bloque: ${dOpen}`);
console.log(`Código: ${nRun} bloques ejecutados y comprobados · ${nNoRun} sin ejecutar (infinito a propósito) · ${nPseudo} de pseudocódigo`);
if (errors.length) { console.error('\nERRORES:\n- ' + errors.join('\n- ')); process.exit(1); }
console.log('\nOK: todas las comprobaciones estáticas pasaron.');
