// Verificación estática de la presentación (sin navegador).
// Uso:  node verificar.mjs
// 1. Comprueba CADA derivación del HTML dos veces: con el motor glc.js y con un
//    comprobador independiente escrito aquí (reemplazo de una variable por paso).
// 2. Comprueba los árboles (las hojas forman la cadena) y la lectura en posfija de id+id*id.
// 3. Comprueba la pertenencia de cada cadena mostrada con el motor y con una
//    descripción independiente del lenguaje (aⁿb, aⁿbⁿ, palíndromos, paréntesis…).
// 4. Compara L(G) con su descripción para todas las cadenas de longitud ≤ 10.
// 5. Revisa la estructura (31 diapositivas, ids, recursos locales, fórmulas,
//    caracteres de control, fragmentos indexados todos o ninguno).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const G = createRequire(import.meta.url)(join(here, 'glc.js'));
const html = readFileSync(join(here, 'index.html'), 'utf8');
const errors = [];
let ok = 0;
const check = (cond, msg) => { if (cond) ok++; else errors.push(msg); };
const decode = (s) => s.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const attr = (tag, name) => { const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`)); return m === null ? null : decode(m[1]); };
const has = (tag, name) => new RegExp(`\\s${name}(?:[\\s=>]|$)`).test(tag);

// ---------- Comprobador independiente ----------
const tok = (s) => (s === 'ε' ? [] : s.match(/id|./g) || []);
const isVar = (x) => /^[A-Z]$/.test(x);
function reglas(texto) {
	const P = [];
	for (const linea of texto.split(';')) {
		const [izq, der] = linea.split('→');
		for (const alt of der.split('|')) P.push([izq, tok(alt)]);
	}
	return P;
}
function pasoValido(P, a, b) {
	for (let i = 0; i < a.length; i++) {
		if (!isVar(a[i])) continue;
		for (const [A, rhs] of P) {
			if (A !== a[i]) continue;
			const c = [...a.slice(0, i), ...rhs, ...a.slice(i + 1)];
			if (c.join(' ') === b.join(' ')) return true;
		}
	}
	return false;
}
function derivacionValida(gram, formas) {
	const P = reglas(gram), fs = formas.split(';').map(tok);
	if (fs[0].join('') !== P[0][0]) return 'no empieza con el símbolo inicial';
	for (let i = 1; i < fs.length; i++) if (!pasoValido(P, fs[i - 1], fs[i])) return `paso ${i} inválido: ${fs[i - 1].join('') || 'ε'} ⇒ ${fs[i].join('') || 'ε'}`;
	if (fs[fs.length - 1].some(isVar)) return 'la última forma todavía tiene variables';
	return null;
}

// Descripciones independientes de cada lenguaje usado en las diapositivas.
const nA = (w) => (w.match(/a/g) || []).length, nB = (w) => (w.match(/b/g) || []).length;
const DESCRIPCION = {
	'S→aS|b': (w) => /^a*b$/.test(w),
	'S→Ab;A→aA|ε': (w) => /^a*b$/.test(w),
	'S→aSb|ε': (w) => /^a*b*$/.test(w) && nA(w) === nB(w),
	'S→aSb|b': (w) => /^a*b+$/.test(w) && nB(w) === nA(w) + 1,
	'S→aSa|bSb|a|b|ε': (w) => /^[ab]*$/.test(w) && [...w].reverse().join('') === w,
	'S→(S)S|ε': (w) => { let n = 0; for (const c of w) { n += c === '(' ? 1 : c === ')' ? -1 : 99; if (n < 0 || n > 50) return false; } return n === 0; }
};

// 1. Derivaciones del HTML (también las del enunciado que DEBEN fallar).
check(derivacionValida('S→aS|b', 'S;aS;aS;aab') !== null, 'el comprobador debería rechazar S ⇒ aS ⇒ aS ⇒ aab');
let nDer = 0;
for (const [tag] of html.matchAll(/<[a-z]+\s[^>]*data-(?:deriv|arbol|arcos)="[^"]*"[^>]*>/g)) {
	const g = attr(tag, 'data-g'), formas = attr(tag, 'data-deriv') ?? attr(tag, 'data-arbol') ?? attr(tag, 'data-arcos');
	const fallo = derivacionValida(g, formas);
	check(fallo === null, `${g} · ${formas}: ${fallo}`);
	let d;
	try { d = G.derivacion(G.gramatica(g), formas); } catch (e) { errors.push(`motor: ${e.message} (${formas})`); continue; }
	check(d.completa, `${formas}: no termina en terminales`);
	const cad = attr(tag, 'data-cadena');
	if (cad !== null) check(d.cadena === cad, `${formas}: termina en ${d.cadena}, la diapositiva dice ${cad}`);
	if (DESCRIPCION[g]) check(DESCRIPCION[g](d.cadena === 'ε' ? '' : d.cadena), `${d.cadena} no cumple la descripción de L(${g})`);
	if (has(tag, 'data-arbol')) {
		const t = G.arbol(G.gramatica(g), formas);
		check(G.lectura(t.raiz) === d.cadena, `árbol de ${formas}: las hojas dicen ${G.lectura(t.raiz)}`);
		// Cada nodo interno: sus hijos son exactamente el lado derecho de una regla de su variable.
		const P = reglas(g);
		(function rec(n) {
			if (!n.hijos) return;
			const der = n.hijos.filter((h) => !h.eps).map((h) => h.s).join(' ');
			check(P.some(([A, rhs]) => A === n.s && rhs.join(' ') === der), `árbol de ${formas}: ${n.s} → ${der || 'ε'} no es una regla`);
			n.hijos.forEach(rec);
		})(t.raiz);
	}
	nDer++;
}

// 2. Lectura en posfija del árbol de id+id*id (diapositiva 18).
{
	const t = G.arbol(G.gramatica('E→E+T|T;T→T*F|F;F→(E)|id'), 'E;E+T;T+T;F+T;id+T;id+T*F;id+F*F;id+id*F;id+id*id');
	const post = (n) => {
		if (!n.hijos) return n.s === 'id' ? ['id'] : [];
		if (n.hijos.length === 3 && (n.hijos[1].s === '+' || n.hijos[1].s === '*')) return [...post(n.hijos[0]), ...post(n.hijos[2]), n.hijos[1].s];
		return n.hijos.flatMap(post);
	};
	check(post(t.raiz).join(' ') === 'id id id * +', 'el recorrido del árbol de id+id*id no da id id id * +');
	check(/id id id \* \+/.test(decode(html)), 'la diapositiva 18 debería decir id id id * +');
}
check(G.contarArboles(G.gramatica('E→E+E|E*E|id'), 'id+id*id') === 2, 'E→E+E|E*E|id debería dar 2 árboles para id+id*id');
check(G.contarArboles(G.gramatica('E→E+T|T;T→T*F|F;F→(E)|id'), 'id+id*id') === 1, 'la gramática E, T, F debería dar 1 árbol para id+id*id');
check(G.contarArboles(G.gramatica('E→E+T|T;T→T*F|F;F→(E)|id'), '(id+id)*id') === 1, 'la gramática E, T, F debería generar (id+id)*id con un solo árbol');

// 3. Pertenencia de cada cadena mostrada.
let nCad = 0;
const secciones = html.split(/<section[\s>]/).slice(1);
const cuerpoHTML = html.indexOf('<div class="reveal">');
for (const m of html.matchAll(/data-pertenece="([^"]*)"/g)) {
	if (m.index < cuerpoHTML) continue; // el comentario de la cabecera
	// Recorta el contenedor: desde la etiqueta que lleva data-pertenece hasta que se cierra.
	const g = decode(m[1]), inicio = html.lastIndexOf('<', m.index), resto = html.slice(inicio);
	const tagName = resto.match(/^<([a-z]+)/)[1];
	let prof = 0, fin = 0;
	for (const t of resto.matchAll(new RegExp(`<(/?)${tagName}[\\s>]`, 'g'))) { if (t[1]) { if (--prof === 0) { fin = t.index; break; } } else prof++; }
	const bloque = resto.slice(0, fin || undefined);
	const casos = [];
	for (const f of bloque.matchAll(/data-cad="([^"]*)" data-res="(si|no)"/g)) casos.push([decode(f[1]), f[2] === 'si']);
	const sinFilas = bloque.replace(/<tr data-cad[^]*?<\/tr>/g, '');
	for (const c of sinFilas.matchAll(/<span class="cad( fuera| muted-c)?">([^<]*)<\/span>/g)) if (c[1] !== ' muted-c') casos.push([decode(c[2]), c[1] !== ' fuera']);
	const gram = G.gramatica(g);
	for (const [w, esperado] of casos) {
		check(!!G.genera(gram, w) === esperado, `${w} ${esperado ? 'debería' : 'NO debería'} generarse con ${g}`);
		if (DESCRIPCION[g]) check(DESCRIPCION[g](w === 'ε' ? '' : w) === esperado, `${w}: la descripción de L(${g}) no coincide con la diapositiva`);
		nCad++;
	}
}
check(secciones.length >= 31, 'faltan secciones');

// 4. Lenguajes descritos con palabras.
let nLen = 0;
for (const [tag] of html.matchAll(/<[a-z]+\s[^>]*data-lenguaje="[^"]*"[^>]*>/g)) {
	const g = attr(tag, 'data-g'), patron = attr(tag, 'data-lenguaje');
	const dif = G.comparaLenguaje(G.gramatica(g), patron, 10);
	check(!dif, `L(${g}) ≠ ${patron}${dif ? ` (en ${dif.cadena})` : ''}`);
	if (DESCRIPCION[g]) for (const w of G.cadenasHasta(G.gramatica(g).T, 8)) check(G.PATRONES[patron](w === 'ε' ? '' : w) === DESCRIPCION[g](w === 'ε' ? '' : w), `el patrón ${patron} no coincide con la descripción independiente en ${w}`);
	nLen++;
}

// 5. Estructura.
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
ids.filter((v, i) => ids.indexOf(v) !== i).forEach((v) => errors.push(`id duplicado: ${v}`));
const js = readFileSync(join(here, 'presentacion.js'), 'utf8');
for (const m of js.matchAll(/\$\('([\w-]+)'\)/g)) if (!ids.includes(m[1])) errors.push(`presentacion.js usa #${m[1]}, que no existe en index.html`);
const open = (html.match(/<section[\s>]/g) || []).length, close = (html.match(/<\/section>/g) || []).length;
check(open === close, `<section> desbalanceadas: ${open} / ${close}`);
check(open === 31, `deberían ser 31 diapositivas (hay ${open})`);
for (const m of html.matchAll(/<(?:link[^>]*href|script[^>]*src)="([^"]+)"/g)) {
	check(!/^https?:/.test(m[1]), `recurso externo: ${m[1]}`);
	try { readFileSync(join(here, m[1])); } catch { errors.push(`archivo inexistente: ${m[1]}`); }
}
const mOpen = (html.match(/\\\(/g) || []).length, mClose = (html.match(/\\\)/g) || []).length;
check(mOpen === mClose, `delimitadores \\( \\) desbalanceados: ${mOpen} / ${mClose}`);
for (const f of ['index.html', 'presentacion.js', 'glc.js', 'glc.css']) {
	const t = readFileSync(join(here, f), 'utf8');
	const cc = t.match(/[\x00-\x08\x0b\x0c\x0e-\x1f]/);
	check(!cc, `${f}: carácter de control U+${cc && cc[0].charCodeAt(0).toString(16).padStart(4, '0')}`);
}
// reveal pone los fragmentos sin índice DESPUÉS de los indexados: en cada diapositiva, todos o ninguno.
secciones.forEach((s, i) => {
	const cuerpo = s.split('</section>')[0];
	const frags = [...cuerpo.matchAll(/<[a-z]+\s[^>]*class="[^"]*\bfragment\b[^"]*"[^>]*>/g)].map((m) => m[0]);
	const generados = /data-(?:deriv|arbol|arcos)="[^"]*"(?![^>]*data-sin-fragmentos)[^>]*data-(?:indice|crece)|data-(?:indice|crece)[^>]*data-(?:deriv|arbol)/.test(cuerpo);
	const con = frags.filter((t) => /data-fragment-index/.test(t)).length, sin = frags.length - con;
	check(!(sin && (con || generados)), `diapositiva ${i + 1}: mezcla fragmentos con y sin data-fragment-index`);
});

console.log(`Derivaciones y árboles: ${nDer} · cadenas comprobadas: ${nCad} · lenguajes comparados: ${nLen}`);
console.log(`Secciones: ${open} · fórmulas en línea: ${mOpen} · comprobaciones superadas: ${ok}`);
if (errors.length) { console.error('\nERRORES:\n- ' + errors.join('\n- ')); process.exit(1); }
console.log('\nOK: todas las derivaciones, árboles, cadenas y lenguajes son correctos.');
