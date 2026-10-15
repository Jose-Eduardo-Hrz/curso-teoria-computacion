// Verificación estática de la presentación (sin navegador).
// Uso:  node verificar.mjs
// - Ejecuta identificador.py, las pruebas de unittest y errores_frecuentes.py con
//   Python y compara su salida con la que aparece en las diapositivas.
// - Evalúa en Python cada afirmación data-py-eval / data-py-val.
// - Comprueba los ejemplos data-ej-val / data-ej-inv con Python y con el autómata.
// - El autómata (automata.js) y es_identificador coinciden en miles de cadenas, y
//   clase() de JavaScript clasifica igual que es_letra / es_digito de Python.
// - identificador.py no usa expresiones regulares ni isalpha/isdigit/isalnum.
// - Cada bloque <pre data-archivo> es un fragmento literal de su archivo.
import { readFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const A = req(join(here, 'afn.js')), I = req(join(here, 'automata.js'));
const html = readFileSync(join(here, 'index.html'), 'utf8');
const errors = [];
const decode = (s) => s.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const leer = (f) => readFileSync(join(here, f), 'utf8').replace(/\r\n/g, '\n');

// Ejemplos y afirmaciones escritos en el HTML
const ejemplos = { val: [], inv: [] };
for (const m of html.matchAll(/data-ej-(val|inv)='([^']*)'/g)) ejemplos[m[1]].push(...JSON.parse(decode(m[2])));
const evals = [...html.matchAll(/data-py-eval="([^"]*)" data-py-val="([^"]*)"/g)].map((m) => [decode(m[1]), decode(m[2])]);

// 0. Python
let py = null;
for (const cmd of ['python', 'python3', 'py']) { try { execFileSync(cmd, ['--version'], { stdio: 'ignore' }); py = cmd; break; } catch { /* siguiente */ } }
if (!py) errors.push('no se encontró Python');
else {
	const env = { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONDONTWRITEBYTECODE: '1' };
	const run = (args) => spawnSync(py, args, { cwd: here, env, encoding: 'utf8' });
	const salidaHTML = (k) => decode((html.match(new RegExp('data-py-salida="' + k + '">([^]*?)</span></pre>')) || [])[1] || '').replace(/\s+$/, '');
	const norm = (s) => s.replace(/\r\n/g, '\n').replace(/Ran (\d+) tests in [\d.]+s/, 'Ran $1 tests in Xs').replace(/\s+$/, '');
	const prog = run(['identificador.py']);
	if (norm(prog.stdout) !== norm(salidaHTML('programa'))) errors.push('la salida de «python identificador.py» no coincide con la diapositiva:\n' + prog.stdout + prog.stderr);
	const err = run(['errores_frecuentes.py']);
	if (norm(err.stdout) !== norm(salidaHTML('errores'))) errors.push('la salida de «python errores_frecuentes.py» no coincide con la diapositiva:\n' + err.stdout + err.stderr);
	const ut = run(['-m', 'unittest', '-v', 'test_identificador']);
	if (ut.status !== 0) errors.push('las pruebas de unittest FALLAN:\n' + ut.stderr);
	if (norm(ut.stderr) !== norm(salidaHTML('pruebas'))) errors.push('la salida de las pruebas no coincide con la diapositiva:\n' + ut.stderr);
	// Afirmaciones, ejemplos y comparación con el autómata, en una sola ejecución de Python
	const muestra = "aZm09_- .ñ²\n$Ωé١".split('');
	const cadenas = [''];
	for (let n = 1; n <= 3; n++) for (const prev of cadenas.filter((c) => [...c].length === n - 1)) for (const c of muestra) cadenas.push(prev + c);
	const datos = JSON.stringify({ evals, val: ejemplos.val, inv: ejemplos.inv, cadenas, chars: muestra.concat(['A', 'z', '@', '[', '`', '{', '/', ':', '0', '9']) });
	const r = spawnSync(py, ['-c', [
		'import json, sys',
		'from identificador import *',
		'd = json.loads(sys.stdin.read())',
		'print(json.dumps({',
		'  "evals": [repr(eval(e)) for e, _ in d["evals"]],',
		'  "val": [es_identificador(s) for s in d["val"]],',
		'  "inv": [es_identificador(s) for s in d["inv"]],',
		'  "cad": [es_identificador(s) for s in d["cadenas"]],',
		'  "cls": ["L" if es_letra(c) else "D" if es_digito(c) else "_" if c == "_" else "O" for c in d["chars"]]',
		'}))'
	].join('\n')], { cwd: here, env, encoding: 'utf8', input: datos });
	try {
		const R = JSON.parse(r.stdout), D = JSON.parse(datos);
		D.evals.forEach(([e, v], i) => { if (R.evals[i] !== v) errors.push(`afirmación de Python: ${e} da ${R.evals[i]}, no ${v}`); });
		D.val.forEach((s, i) => { if (!R.val[i]) errors.push(`Python dice que ${JSON.stringify(s)} NO es válido`); if (!I.acepta(s)) errors.push(`el autómata dice que ${JSON.stringify(s)} NO es válido`); });
		D.inv.forEach((s, i) => { if (R.inv[i]) errors.push(`Python dice que ${JSON.stringify(s)} SÍ es válido`); if (I.acepta(s)) errors.push(`el autómata dice que ${JSON.stringify(s)} SÍ es válido`); });
		const dif = D.cadenas.filter((s, i) => R.cad[i] !== I.acepta(s));
		if (dif.length) errors.push(`el autómata y es_identificador difieren en ${dif.length} cadenas, p. ej. ${JSON.stringify(dif.slice(0, 3))}`);
		D.chars.forEach((c, i) => { if (I.clase(c) !== R.cls[i]) errors.push(`clase(${JSON.stringify(c)}) en JavaScript = ${I.clase(c)}, en Python = ${R.cls[i]}`); });
		console.log(`Comparación Python ↔ autómata: ${D.cadenas.length} cadenas · ${D.chars.length} caracteres clasificados`);
	} catch (e) { errors.push('no se pudo leer la respuesta de Python: ' + (r.stdout || r.stderr).slice(0, 300)); }
}

// 1. Código de las diapositivas = fragmentos literales de los archivos
let nCod = 0;
for (const m of html.matchAll(/<pre data-archivo="([^"]+)"><code>([^]*?)<\/code><\/pre>/g)) {
	nCod++;
	if (!leer(m[1]).includes(decode(m[2]))) errors.push(`el bloque de ${m[1]} que empieza con «${decode(m[2]).split('\n')[0]}» no es un fragmento literal del archivo`);
}
for (const m of html.matchAll(/<span class="lin">líneas (\d+)–(\d+)<\/span><\/div>\s*<div class="src">\s*<pre data-archivo="([^"]+)"><code>([^]*?)<\/code>/g)) {
	if (leer(m[3]).split('\n').slice(+m[1] - 1, +m[2]).join('\n') !== decode(m[4])) errors.push(`${m[3]}: las líneas ${m[1]}–${m[2]} no son las que muestra la diapositiva`);
}

// 2. La solución no usa expresiones regulares ni clasificadores de Unicode
const sol = leer('identificador.py');
for (const [patron, desc] of [[/\bimport\s+re\b|\bfrom\s+re\b|\bre\.\w+\(/, 'la biblioteca re'], [/\.(isalpha|isdigit|isalnum|isdecimal|isnumeric|isidentifier)\(/, 'isalpha/isdigit/isalnum/isidentifier'], [/\bregex\b/, 'regex']]) {
	if (patron.test(sol)) errors.push(`identificador.py usa ${desc}`);
}

// 3. Autómata: AFD completo y afirmaciones data-claim
if (A.clasificar(I.def).tipo !== 'AFD') errors.push('el autómata no es un AFD completo');
let n = 0, nSec = 0;
for (const sec of html.split(/<section/).slice(1)) {
	nSec++;
	const body = sec.split('</section>')[0];
	for (const m of body.matchAll(/<[a-z]+\s((?:[^>"']|"[^"]*"|'[^']*')*\bdata-claim="[^"]*"(?:[^>"']|"[^"]*"|'[^']*')*)>/g)) {
		const a = {};
		for (const x of m[1].matchAll(/data-(claim|tipo|q0|q|f)(?![\w-])="([^"]*)"/g)) a[x[1]] = decode(x[2]);
		n++;
		errors.push(...A.comprobar(a, `diapositiva ${nSec}`));
	}
	const idx = [...new Set([...body.matchAll(/data-fragment-index="(\d+)"/g)].map((x) => +x[1]))].sort((p, q) => p - q);
	if (idx.length && idx.some((v, i) => v !== i + 1)) errors.push(`diapositiva ${nSec}: índices de fragmento no consecutivos (${idx.join(',')})`);
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
for (const f of ['index.html', 'presentacion.js', 'automata.js', 'identificador.css', 'identificador.py', 'test_identificador.py', 'errores_frecuentes.py']) {
	const c = (readFileSync(join(here, f), 'utf8').match(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g) || []).length;
	if (c) errors.push(`${f}: ${c} caracteres de control (¿una barra invertida perdida?)`);
}
const mo = (html.match(/\\\(/g) || []).length, mc = (html.match(/\\\)/g) || []).length;
if (mo !== mc) errors.push(`delimitadores \\( \\) desbalanceados: ${mo} / ${mc}`);

console.log(`Secciones: ${open} · bloques de código: ${nCod} · ejemplos: ${ejemplos.val.length + ejemplos.inv.length} · afirmaciones de Python: ${evals.length} · Python: ${py || 'no disponible'}`);
if (errors.length) { console.error('\nERRORES:\n- ' + errors.join('\n- ')); process.exit(1); }
console.log('\nOK: todas las comprobaciones estáticas pasaron (incluidos el programa, las pruebas y los errores en Python).');
