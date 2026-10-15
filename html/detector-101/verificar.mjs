// Verificación estática de la presentación (sin navegador).
// Uso:  node verificar.mjs
// - Ejecuta detector_101.py y las pruebas de unittest con Python y compara su
//   salida con la que aparece en las diapositivas.
// - Cada bloque <pre data-archivo> debe ser un fragmento literal de su archivo.
// - detector_101.py no usa búsquedas de subcadenas («"101"», find, index, count, re…).
// - La tabla TRANSICIONES de Python es idéntica a la del diagrama (automata.js) y
//   acepta() coincide con el autómata en todas las cadenas de longitud ≤ 10.
// - Afirmaciones data-claim (afn.js) y estructura de la presentación.
import { readFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const RX = req(join(here, 'motor-regex.js')), A = req(join(here, 'afn.js'));
req(join(here, 'automata.js'));
const html = readFileSync(join(here, 'index.html'), 'utf8');
const errors = [];
const decode = (s) => s.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
const leer = (f) => readFileSync(join(here, f), 'utf8').replace(/\r\n/g, '\n');

// 0. Python: programa, pruebas y comparación con el autómata
let py = null;
for (const cmd of ['python', 'python3', 'py']) { try { execFileSync(cmd, ['--version'], { stdio: 'ignore' }); py = cmd; break; } catch { /* siguiente */ } }
if (!py) errors.push('no se encontró Python: no se pudieron ejecutar el programa ni las pruebas');
else {
	const env = { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONDONTWRITEBYTECODE: '1' };
	const run = (args) => { try { return execFileSync(py, args, { cwd: here, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { return (e.stdout || '') + (e.stderr || ''); } };
	const salidaHTML = (k) => decode((html.match(new RegExp('data-py-salida="' + k + '">([^]*?)</span></pre>')) || [])[1] || '').replace(/\s+$/, '');
	const prog = run(['detector_101.py']).replace(/\r\n/g, '\n').replace(/\s+$/, '');
	if (prog !== salidaHTML('programa')) errors.push('la salida de «python detector_101.py» no coincide con la diapositiva:\n' + prog);
	// unittest escribe su informe en stderr: se captura ese flujo y el código de salida
	const ut = spawnSync(py, ['-m', 'unittest', '-v', 'test_detector_101'], { cwd: here, env, encoding: 'utf8' });
	if (ut.status !== 0) errors.push('las pruebas de unittest FALLAN (código de salida ' + ut.status + ')');
	const r = ut.stderr || '';
	const norm = (s) => s.replace(/\r\n/g, '\n').replace(/Ran (\d+) tests in [\d.]+s/, 'Ran $1 tests in Xs').replace(/\s+$/, '');
	if (norm(r) !== norm(salidaHTML('pruebas'))) errors.push('la salida de las pruebas no coincide con la diapositiva:\n' + r);
	if (!/\nOK\s*$/.test(r.replace(/\r\n/g, '\n'))) errors.push('las pruebas no terminan en OK');
	// Tabla de Python = tabla del diagrama; acepta() = autómata en todas las cadenas ≤ 10
	const dump = run(['-c', [
		'import itertools, json, detector_101 as d',
		'cad = ["".join(t) for n in range(11) for t in itertools.product("01", repeat=n)]',
		'print(json.dumps({"t": sorted([k[0], k[1], v] for k, v in d.TRANSICIONES.items()), "ini": d.ESTADO_INICIAL, "fin": d.ESTADO_ACEPTACION, "a": [c for c in cad if d.acepta(c)]}))'
	].join('\n')]);
	try {
		const D = JSON.parse(dump), def = A.AUTOMATAS.det101;
		const tJS = def.trans.map((t) => t.join('|')).sort().join(';'), tPY = D.t.map((t) => t.join('|')).sort().join(';');
		if (tJS !== tPY) errors.push('TRANSICIONES de Python ≠ tabla del diagrama');
		if (D.ini !== def.start || D.fin !== def.finals.join()) errors.push('estado inicial o de aceptación distintos entre Python y el diagrama');
		const aJS = A.lenguaje(def, 10).join(','), aPY = D.a.join(',');
		if (aJS !== aPY) errors.push('acepta() de Python y el autómata del diagrama difieren en alguna cadena de longitud ≤ 10');
	} catch (e) { errors.push('no se pudo leer la tabla de Python: ' + dump.slice(0, 200)); }
}

// 1. Código de las diapositivas = fragmentos literales de los archivos
let nCod = 0;
for (const m of html.matchAll(/<pre data-archivo="([^"]+)"><code>([^]*?)<\/code><\/pre>/g)) {
	nCod++;
	if (!leer(m[1]).includes(decode(m[2]))) errors.push(`el bloque de ${m[1]} que empieza con «${decode(m[2]).split('\n')[0]}» no es un fragmento literal del archivo`);
}
// Las líneas indicadas en las barras («líneas 7–20») corresponden al fragmento
for (const m of html.matchAll(/<span class="lin">líneas (\d+)–(\d+)<\/span><\/div>\s*<div class="src">\s*<pre data-archivo="([^"]+)"><code>([^]*?)<\/code>/g)) {
	const lineas = leer(m[3]).split('\n').slice(+m[1] - 1, +m[2]).join('\n');
	if (lineas !== decode(m[4])) errors.push(`${m[3]}: las líneas ${m[1]}–${m[2]} no son las que muestra la diapositiva`);
}

// 2. Sin búsquedas de subcadenas en el detector
const det = leer('detector_101.py');
for (const [patron, desc] of [[/["']101["']\s+(not\s+)?in\b|\bin\s+["']101["']/, 'una búsqueda «"101" in …»'], [/\.find\(|\.rfind\(|\.index\(|\.count\(/, 'find/index/count'], [/\bimport re\b|\bre\./, 'expresiones regulares'],
	[/__contains__|startswith|endswith|\.split\(/, '__contains__/startswith/split'], [/\bif\b[^\n]*\bin\b/, 'un «in» usado como condición']]) {
	if (patron.test(det)) errors.push(`detector_101.py usa ${desc}`);
}

// 3. Afirmaciones
let n = 0, nSec = 0;
for (const sec of html.split(/<section/).slice(1)) {
	nSec++;
	const body = sec.split('</section>')[0];
	for (const m of body.matchAll(/<[a-z]+\s((?:[^>"]|"[^"]*")*\bdata-claim="[^"]*"(?:[^>"]|"[^"]*")*)>/g)) {
		const a = {};
		for (const x of m[1].matchAll(/data-(claim|acc|rej|w|sets|delta|tipo|re|q0|q|f)(?![\w-])="([^"]*)"/g)) a[x[1]] = decode(x[2]);
		n++;
		errors.push(...A.comprobar(a, `diapositiva ${nSec}`, RX));
	}
	const idx = [...new Set([...body.matchAll(/data-fragment-index="(\d+)"/g)].map((x) => +x[1]))].sort((p, q) => p - q);
	if (idx.length && idx.some((v, i) => v !== i + 1)) errors.push(`diapositiva ${nSec}: índices de fragmento no consecutivos (${idx.join(',')})`);
	for (const m of body.matchAll(/data-(?:diagrama|tabla|afn)="([^"]+)"/g)) if (!A.AUTOMATAS[m[1]]) errors.push(`diapositiva ${nSec}: autómata inexistente «${m[1]}»`);
}

// 4. Estructura
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
ids.filter((x, i) => ids.indexOf(x) !== i).forEach((x) => errors.push(`id duplicado: ${x}`));
const open = (html.match(/<section[\s>]/g) || []).length, close = (html.match(/<\/section>/g) || []).length;
if (open !== close) errors.push(`<section> desbalanceadas: ${open} / ${close}`);
for (const m of html.matchAll(/<(?:link rel="stylesheet"|script) (?:href|src)="(?!https)([^"]+)"|<a class="dl" href="([^"]+)"/g)) {
	const f = m[1] || m[2];
	if (f.startsWith('..')) errors.push(`dependencia fuera de la carpeta: ${f}`);
	try { readFileSync(join(here, f)); } catch { errors.push(`archivo inexistente: ${f}`); }
}
for (const f of ['index.html', 'presentacion.js', 'automata.js', 'detector.css', 'detector_101.py', 'test_detector_101.py']) {
	const c = (readFileSync(join(here, f), 'utf8').match(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g) || []).length;
	if (c) errors.push(`${f}: ${c} caracteres de control (¿una barra invertida perdida?)`);
}
const mo = (html.match(/\\\(/g) || []).length, mc = (html.match(/\\\)/g) || []).length;
if (mo !== mc) errors.push(`delimitadores \\( \\) desbalanceados: ${mo} / ${mc}`);

console.log(`Secciones: ${open} · bloques de código: ${nCod} · afirmaciones: ${n} · Python: ${py || 'no disponible'}`);
if (errors.length) { console.error('\nERRORES:\n- ' + errors.join('\n- ')); process.exit(1); }
console.log('\nOK: todas las comprobaciones estáticas pasaron (incluidos el programa y las pruebas en Python).');
