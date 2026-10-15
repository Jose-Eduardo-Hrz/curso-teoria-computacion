# Guía de estilo · Tema "Redes" para reveal.js

Estilo visual de la presentación de DHCP, listo para reutilizar en otras presentaciones de redes, protocolos o sistemas.

| Archivo | Para qué sirve |
|---|---|
| `tema-redes.css` | Hoja de estilos con todos los componentes. |
| `mate.css` | Complemento para presentaciones de matemáticas y programación (se carga **después** de `tema-redes.css`): pregunta inicial `.q`, definiciones `.def`, pasos numerados `.steps` (`.concl` = conclusión «∴», `.fail` = paso erróneo), veredictos `.verdict`, paneles `.panel`, retos con respuesta `.reto` + `.ans-btn`/`.ans`, cinta de ruta `.route`, tablas y diagramas SVG. Trae también los estilos de los modos de revisión `?verificar` y `?mostrar` (el comportamiento lo aporta el `presentacion.js` de cada presentación). Ajusta el texto base de las diapositivas a 22 px. |
| `plantilla.html` | Presentación de ejemplo con cada componente funcionando. Cópiala y edítala. |
| `GUIA-ESTILO.md` | Este documento: reglas de diseño y cómo usar cada pieza. |

---

## 1. Arranque rápido

1. Copia `tema-redes.css` y `plantilla.html` a la carpeta de la nueva presentación.
2. Cambia el nombre de `plantilla.html` (p. ej. `tcp.html`) y reemplaza el contenido de cada `<section>`.
3. Ábrelo en el navegador. Se necesita internet para los CDN.

Cabecera mínima (el orden importa: `tema-redes.css` va al final):

```html
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/5.1.0/reveal.min.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&family=Source+Serif+4:opsz,wght@8..60,500;8..60,600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="tema-redes.css">
```

> No cargues ningún tema de reveal (`white.css`, `black.css`…): el tema es `tema-redes.css`.

Configuración de reveal:

```js
Reveal.initialize({
  hash: true, width: 1280, height: 720, margin: 0.04, center: false,
  controls: true, progress: true, slideNumber: 'c/t',
  transition: 'slide', backgroundTransition: 'fade',
  autoAnimateDuration: 1.1, autoAnimateEasing: 'cubic-bezier(.6,.05,.3,1)'
});
```

`center: false` y el lienzo fijo de **1280 × 720** son obligatorios: todos los dispositivos se colocan con coordenadas en píxeles.

---

## 2. Identidad visual

### Paleta (variables CSS)

| Variable | Valor | Uso |
|---|---|---|
| `--bg` / `--grid` | `#eef1ee` / `#dfe5df` | Fondo gris claro con cuadrícula de 40 px |
| `--navy` | `#1f2b38` | Texto de títulos, contornos y sombras |
| `--ink` | `#26313c` | Texto normal |
| `--muted` | `#6a7580` | Texto secundario, etiquetas |
| `--accent` / `--accent-d` / `--accent-l` | `#2a4a86` / `#1b3366` / `#dbe4f5` | **Acento azul marino**: servidor, letras de pasos, resaltados |
| `--blue` / `--blue-l` | `#2f7fd6` / `#dcebfb` | Respuestas (mensajes servidor → cliente), unicast |
| `--red` / `--red-l` | `#e5484d` / `#fde3e3` | Errores, conflictos, expiración |
| `--amber` / `--amber-l` | `#e89a12` / `#fdf0d5` | Notas, advertencias, "pensando…" |

Para cambiar el color de acento en toda la presentación, edita solo las tres variables `--accent*` en `:root`.

### Tipografía

| Rol | Fuente | Dónde |
|---|---|---|
| Títulos | **Source Serif 4** (serif) | `h1`, `h2`, `h3`, frases citadas |
| Etiquetas técnicas | **IBM Plex Mono** | kicker, IPs, puertos, nombres de mensajes, terminal |
| Texto | **IBM Plex Sans** | Párrafos y explicaciones |

### Reglas de diseño

- **Sombra dura, sin desenfoque**: `box-shadow: 5px 5px 0 var(--navy)`. Nada de sombras difusas.
- **Contorno de 2–2.5 px** en todo lo que sea "objeto" (tarjetas, íconos, píldoras).
- **Elemento protagonista** = contorno de acento + halo claro (`.card.hl`, `.ico.srv`).
- **Kicker en mayúsculas y espaciado** arriba de cada título, centrado.
- Todos los dibujos son **íconos de Font Awesome 6 (free, `fa-solid`)**; no uses imágenes.
- Una idea por diapositiva y como máximo ~5 elementos que aparecen por clic.

### Íconos sugeridos

| Concepto | Ícono |
|---|---|
| PC / laptop / impresora | `fa-desktop` · `fa-laptop` · `fa-print` |
| Servidor / router | `fa-server` (+ `fa-wifi wifi` como adorno) · `fa-shuffle` (relay) |
| Switch / red | `fa-network-wired` · `fa-ethernet` |
| Mensaje / respuesta / confirmación | `fa-envelope` · `fa-envelope-open-text` · `fa-circle-check` |
| Archivo / configuración | `fa-file-lines` · `fa-user-gear` |
| Error / rechazo / aviso | `fa-triangle-exclamation` · `fa-ban` · `fa-circle-xmark` |
| Tiempo / renovar / broadcast | `fa-clock` · `fa-rotate` · `fa-tower-broadcast` |
| Nota / pregunta | `fa-lightbulb` · `fa-circle-question` |

Busca más en <https://fontawesome.com/search?o=r&s=solid&f=classic> (filtro *Free*).

---

## 3. Estructura de una diapositiva

```html
<section data-transition="convex">
  <div class="kicker">Paso 1 de 4 · Descubrir</div>
  <h2>Título de la diapositiva</h2>
  <!-- contenido: .stage, .two, .split, .keys, .list ... -->
</section>
```

Layouts disponibles:

| Clase | Descripción |
|---|---|
| `.stage` | Lienzo de 1168 px de ancho, posición relativa. Dale `style="height:…px"`. Dentro se coloca todo en px. |
| `.two` | Dos columnas iguales. |
| `.split` | Columna izquierda de 500 px (animación) + derecha (tarjeta de datos). |
| `.keys` | Tres tarjetas de "dato clave" en fila. |
| `.list` | Columna de `.item` con ícono. |

---

## 4. Componentes

### Dispositivo

```html
<div class="dev" style="left:140px; top:150px">
  <div class="ico srv"><i class="fa-solid fa-server"></i><i class="fa-solid fa-wifi wifi"></i></div>
  <span class="lbl">Router · DHCP</span>
  <span class="chip ac">192.168.1.1</span>
</div>
```

- `left`/`top` son el **centro** del dispositivo dentro de `.stage`.
- Variantes de `.ico`: (normal 104 px) · `.sm` (78) · `.xs` (64) · `.srv` (resaltado) · `.muted` (gris, equipos secundarios).
- Chips: `.chip` · `.chip.ac` (acento) · `.chip.r` (error).
- Insignia de "listo": `<span class="badge-ok"><i class="fa-solid fa-check"></i></span>` dentro de `.ico`.

### Cables

Un `<svg class="wires">` con `viewBox` igual al tamaño del `.stage`, usando **las mismas coordenadas que los dispositivos**:

```html
<svg class="wires" viewBox="0 0 1168 440">
  <line x1="140" y1="150" x2="1028" y2="150"/>          <!-- sólido -->
  <line class="flow" x1="584" y1="150" x2="380" y2="360"/> <!-- punteado animado -->
  <path class="dashed" d="M150 60 L380 120"/>           <!-- punteado gris -->
</svg>
```

### Paquete en movimiento

El recorrido se define con variables: `--x1 --y1` (origen) y `--x2 --y2` (destino). Opcionales: `--dur`, `--delay`.

```html
<!-- Se repite en bucle mientras la diapositiva está visible -->
<div class="pkt loop" style="--x1:150px;--y1:160px;--x2:350px;--y2:160px">
  <i class="fa-solid fa-envelope"></i><span class="tag">DISCOVER</span>
</div>

<!-- Viaja UNA vez al hacer clic (fragmento) -->
<div class="pkt resp fragment custom" data-fragment-index="2"
     style="--x1:1028px;--y1:150px;--x2:140px;--y2:150px;--delay:.4s">
  <i class="fa-solid fa-envelope-open-text"></i><span class="tag">OFFER</span>
</div>
```

Variantes: (normal, acento) · `.resp` (azul, respuestas) · `.small` (gris, copias de broadcast).

**Recorrido con escala** (p. ej. PC → switch → laptop): usa dos paquetes, el segundo con `--delay` igual a lo que tarda el primero en llegar al switch (≈ 45 % de `--dur`).

### Ondas de broadcast

```html
<div class="ripple loop" style="left:140px;top:150px"><span></span><span></span><span></span></div>
<div class="ripple fragment custom" data-fragment-index="1" style="left:140px;top:150px"><span></span><span></span><span></span></div>
```

`.ripple.sm` para escenas pequeñas.

### Avisos flotantes

```html
<div class="ignore" style="left:380px;top:290px"><i class="fa-solid fa-ban"></i> no es para mí</div>
<div class="think"  style="left:1028px;top:40px"><i class="fa-solid fa-magnifying-glass"></i> buscando IP…</div>
<div class="bubble" style="left:250px;top:30px">¿Hay algún servidor?</div>
```

### Tarjetas

```html
<div class="card hl">                         <!-- .hl = resaltada -->
  <div class="head"><i class="fa-solid fa-file-lines"></i> ARCHIVO.TXT
    <span class="badge bc" style="margin-left:auto">BROADCAST</span></div>
  <div class="body">
    <div class="row fragment fade-right"><span class="k">IP origen</span><span class="v">0.0.0.0 : 68</span></div>
  </div>
</div>
```

Otros:

```html
<div class="item"><div class="sq"><i class="fa-solid fa-clock"></i></div>
  <div><div class="t">Título</div><div class="v">valor</div></div></div>

<div class="key"><div class="k">Puerto</div><div class="v">67 / UDP</div><div class="d">Detalle</div></div>

<span class="pill">Normal</span>  <span class="pill r">Error</span>
<div class="note"><i class="fa-solid fa-lightbulb"></i><span>Aclaración.</span></div>
<span class="badge bc">broadcast</span>  <span class="badge uc">unicast</span>
<span class="cmd">Router(config)# comando</span>
```

### Diagrama de secuencia

Flechas que se dibujan con cada clic. `.bc` = punteada (broadcast), `.rtl` = de derecha a izquierda.

```html
<div class="stage ladder">
  <div class="lifeline" style="left:120px"></div>
  <div class="lifeline" style="left:1048px"></div>
  <!-- dispositivos arriba en top:56px -->
  <div class="arrow bc fragment" style="top:200px">
    <div class="al"><span class="L">D</span><span class="N">DHCPDISCOVER</span><span class="E">Descubrir</span></div>
  </div>
  <div class="arrow rtl fragment" style="top:290px"> … </div>
</div>
```

Separa las flechas 90 px (`top: 200, 290, 380, 470`).

### Subtítulos por paso (debajo de una simulación)

Todos ocupan el mismo lugar; cada clic muestra uno:

```html
<div class="captions">
  <div class="cap fragment fade-out"          data-fragment-index="1"><span class="n">0</span><span>Estado inicial</span></div>
  <div class="cap fragment fade-in-then-out"  data-fragment-index="1"><span class="n">1</span><span>Paso 1</span></div>
  <div class="cap done fragment fade-in"      data-fragment-index="2"><span class="n">2</span><span>Último paso</span></div>
</div>
```

### Terminal

```html
<div class="term">
  <div class="bar"><b></b><b></b><b></b>&nbsp; Windows · cmd</div>
<pre><span class="p">C:\&gt;</span> ipconfig /renew <span class="c">:: comentario</span>
<span class="fragment">   Dirección IPv4 . . : <span class="h">192.168.1.10</span></span>
<span class="p">C:\&gt;</span> <span class="cursor"></span></pre>
</div>
```

`.p` prompt · `.c` comentario · `.h` valor resaltado. El `<pre>` debe empezar en la columna 0 para que no se cuelen espacios.

---

## 5. Animaciones y transiciones

### Tres formas de animar

| Cuándo ocurre | Cómo |
|---|---|
| **Al entrar a la diapositiva** (bucle) | Clases `.loop`, `.pop-in`, `.bob`, `.fade-in-on-enter`, o reglas CSS bajo `.present …` |
| **Con cada clic** (aparecer) | Fragmentos de reveal: `class="fragment fade-up"`, `fade-left`, `fade-right`, `zoom-in`, `fade-in-then-out`, `fade-out` |
| **Con cada clic** (movimiento propio) | `class="fragment custom"` + `data-fragment-index` → el CSS anima cuando reveal añade `.visible` |

### Sincronizar varios elementos en un mismo clic

Pon el **mismo `data-fragment-index`** a todo lo que debe ocurrir junto (paquete, ondas, subtítulo, cambios de estado). Para que algo cambie **cuando el paquete llega**, usa `.later-in` / `.later-out` con `--delay`:

```html
<span class="chip r  later-out fragment custom" data-fragment-index="4" style="--delay:3.1s">IP: 0.0.0.0</span>
<span class="chip ac later-in  fragment custom" data-fragment-index="4" style="--delay:3.2s">IP: 192.168.1.10</span>
```

Cálculo: llegada ≈ `--delay` del paquete + 0.9 × `--dur` (por defecto 2.8 s).

### Transiciones entre diapositivas

Usa `data-transition` en cada `<section>` y alterna para dar ritmo:

| Valor | Uso recomendado |
|---|---|
| `zoom` | Portada, cambios de bloque, práctica |
| `convex` / `concave` | Temas nuevos dentro de la exposición |
| `slide` | Secuencia continua (pasos 1, 2, 3…) |
| `fade` | Antes de un *auto-animate* |

**Auto-animate**: pon `data-auto-animate` en dos diapositivas seguidas y el mismo `data-id` a los dispositivos que deben "viajar" de una a otra (p. ej. del diagrama de secuencia a la simulación).

### Precauciones

- **No pongas animaciones con `transform` directamente en `.dev`, `.pkt`, `.ripple`, `.ignore` o `.think`**: usan `translate(-50%,-50%)` para centrarse y la animación lo anularía. Anima el `.ico` interior o un contenedor.
- reveal **renumera los fragmentos** desde 0: en la URL `#/5/0/2`, el `2` es el tercer clic, no el `data-fragment-index="2"`.
- Mantén todo dentro de 720 px de alto (kicker + título ≈ 110 px; deja ~30 px abajo para los controles).

---

## 6. Esquema recomendado para explicar un protocolo

1. **Portada**: título grande + cliente y servidor intercambiando un paquete en bucle.
2. **El problema / antes de**: escena que muestra por qué hace falta el protocolo.
3. **¿Qué es?**: definición (`.two`) + lista de lo que aporta (`.list` con fragmentos).
4. **Punto de partida**: estado inicial, puertos y direcciones (`.keys`).
5. **Diagrama de secuencia**: todos los mensajes (`.ladder`).
6. **Simulación por clics**: la red completa con paquetes y `.captions` (auto-animate desde la anterior).
7. **Un detalle por mensaje**: `.split` con mini animación + tarjeta de campos + `.note`.
8. **Casos especiales / errores**: tarjetas en cuadrícula.
9. **Práctica**: `.term` con comandos reales.
10. **Resumen y preguntas.**

---

## 7. Instrucción para pedírselo a Claude

Copia esto al pedir una nueva presentación y adjunta `tema-redes.css` y `plantilla.html`:

> Crea una presentación en reveal.js 5.1 sobre **[TEMA]**, en español, usando el tema `tema-redes.css` y los componentes de `plantilla.html` (sigue `GUIA-ESTILO.md`). Lienzo 1280×720, `center:false`, dispositivos colocados en px dentro de `.stage`, íconos de Font Awesome 6 free, acento azul marino. Incluye: portada animada, diagrama de secuencia con flechas que se dibujan, una simulación por clics con paquetes (`.pkt` con `--x1/--y1/--x2/--y2`) y subtítulos `.captions`, una diapositiva de detalle por mensaje, una terminal con comandos reales y un resumen. Alterna transiciones (zoom, convex, concave, slide, fade) y usa auto-animate entre el diagrama y la simulación.
