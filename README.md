# Curso de Teoría de la Computación · Presentaciones

Presentaciones interactivas hechas con [reveal.js](https://revealjs.com/) para el curso de Teoría de la Computación. Se sirven con **nginx** dentro de un contenedor **Docker**, así que se pueden abrir desde esta computadora o desde cualquier dispositivo de la misma red (celular, tableta, otra laptop, proyector).

Cada presentación es **autocontenida**: trae dentro de su carpeta `lib/` todo lo que necesita (reveal.js, KaTeX para las fórmulas, Font Awesome para los íconos y las tipografías). **No necesita internet**: basta con que el dispositivo llegue al servidor nginx.

## Presentaciones

| Carpeta | Tema | Diapositivas |
|---|---|---|
| `funciones-relaciones` | Funciones y relaciones matemáticas | 56 |
| `recursividad` | Recursividad | 20 |
| `expresiones-regulares` | Expresiones regulares y lenguajes formales | 34 |
| `automatas-finitos` | Autómatas finitos deterministas (AFD) | 27 |
| `automatas-no-deterministas` | Autómatas finitos no deterministas (AFN y AFN-ε) | 28 |
| `metodo-thompson` | Método de Thompson: expresión regular → AFN-ε | 31 |
| `detector-101` | Ejercicio resuelto en Python: detector de la secuencia 101 | 23 |
| `validador-identificadores` | Ejercicio resuelto en Python: validador de identificadores | 23 |

Cada presentación se abre en `http://<servidor>:<puerto>/<carpeta>/`, por ejemplo `http://localhost:3070/automatas-finitos/`.

## Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y **abierto** (el ícono de la ballena debe estar activo).
- Para construir la imagen por primera vez, Docker necesita internet una sola vez para descargar `nginx:alpine`. Después ya no.

## 1. Construir la imagen

Abre una terminal (PowerShell, CMD o Git Bash) **en la carpeta del proyecto** (donde está este `README.md`) y ejecuta:

```bash
docker build -f dockerfile -t curso-teoria-computacion .
```

- `-f dockerfile` indica el archivo de construcción (en este proyecto se llama `dockerfile`, en minúsculas).
- `-t curso-teoria-computacion` le pone nombre a la imagen.
- El punto `.` final es la carpeta del proyecto: no lo olvides.

El `dockerfile` copia la carpeta `html/` dentro de nginx:

```dockerfile
FROM nginx:alpine
COPY ./html /usr/share/nginx/html
EXPOSE 80
```

Por eso las presentaciones quedan en la raíz del servidor: `html/automatas-finitos/` se abre como `/automatas-finitos/`.

## 2. Levantar el contenedor

```bash
docker run -d --name curso-teoria-computacion -p 3070:80 --restart unless-stopped curso-teoria-computacion
```

- `-d` lo deja funcionando en segundo plano.
- `--name curso-teoria-computacion` le pone nombre al contenedor (para detenerlo después).
- `-p 3070:80` publica el puerto 80 de nginx en el puerto **3070** de tu computadora. Si el 3070 está ocupado, usa otro, por ejemplo `-p 3080:80`.
- `--restart unless-stopped` lo vuelve a encender solo cuando reinicias la computadora o Docker.

Comprueba que está funcionando:

```bash
docker ps
```

Debe aparecer `curso-teoria-computacion` con `0.0.0.0:3070->80/tcp`.

## 3. Abrir las presentaciones

### En esta computadora

```
http://localhost:3070/automatas-finitos/
```

### Desde otros dispositivos de la red

1. Averigua la dirección IP de esta computadora:
   - **Windows:** ejecuta `ipconfig` y busca «Dirección IPv4» del adaptador Wi-Fi o Ethernet (por ejemplo `192.168.100.24`).
   - **macOS / Linux:** ejecuta `ip addr` o `ifconfig`.
2. En el otro dispositivo (conectado a la **misma red**), abre:

   ```
   http://192.168.100.24:3070/automatas-finitos/
   ```

3. Si no carga, revisa el **firewall de Windows**: la primera vez Windows puede preguntar si permites que Docker reciba conexiones; acepta para redes privadas. Si no lo preguntó, permite el puerto 3070 en *Firewall de Windows Defender → Configuración avanzada → Reglas de entrada*.

> La dirección IP puede cambiar si te conectas a otra red o reinicias el router: vuelve a consultarla con `ipconfig`.

## 4. Después de modificar una presentación

nginx sirve la copia que se hizo al **construir** la imagen. Para ver los cambios hay que reconstruirla y reemplazar el contenedor:

```bash
docker build -f dockerfile -t curso-teoria-computacion .
docker rm -f curso-teoria-computacion
docker run -d --name curso-teoria-computacion -p 3070:80 --restart unless-stopped curso-teoria-computacion
```

Si el navegador sigue mostrando la versión anterior, recarga sin caché con **Ctrl + F5** (o **Cmd + Shift + R** en macOS).

## 5. Detener o eliminar

```bash
docker stop curso-teoria-computacion       # detenerlo (se puede volver a iniciar con: docker start curso-teoria-computacion)
docker rm -f curso-teoria-computacion      # eliminar el contenedor
docker rmi curso-teoria-computacion        # eliminar la imagen
```

## Usar las presentaciones

| Tecla | Acción |
|---|---|
| `→` / `←` o barra espaciadora | Siguiente / anterior |
| `F` | Pantalla completa |
| `S` | Notas del docente (abre una ventana aparte) |
| `Esc` | Vista general de todas las diapositivas |

Parámetros útiles en la dirección:

- `?mostrar` muestra todos los pasos de cada diapositiva a la vez (para revisar o imprimir), por ejemplo `/recursividad/?mostrar`.
- `?verificar` ejecuta las comprobaciones automáticas de la presentación y muestra un informe en la parte superior.

## Estructura del proyecto

```
.
├── README.md
├── dockerfile               # imagen nginx con las presentaciones
├── .dockerignore
└── html/
    ├── Estilos/             # fuente original del tema visual y de los motores reutilizables
    │   ├── tema-redes.css   # tema visual del curso
    │   ├── mate.css         # componentes para matemáticas y programación
    │   ├── GUIA-ESTILO.md   # guía de diseño
    │   ├── plantilla.html   # plantilla de ejemplo (también funciona sin internet)
    │   ├── lib/             # las mismas dependencias locales que usan las presentaciones
    │   └── afd.js, afn.js, motor-regex.js, thompson.js   # motores de autómatas y expresiones regulares
    └── <presentación>/      # una carpeta por presentación, autocontenida
        ├── index.html       # las diapositivas
        ├── presentacion.js  # configuración de reveal.js e interacciones
        ├── *.css            # copia del tema + estilos propios
        ├── verificar.mjs    # comprobaciones automáticas (node verificar.mjs)
        └── lib/             # dependencias locales (sin internet)
            ├── reveal/      # reveal.js 5.1.0 con los plugins de matemáticas y notas
            ├── katex/       # KaTeX 0.16.11 para las fórmulas
            ├── fontawesome/ # Font Awesome Free 6.5.1 para los íconos
            └── fuentes/     # IBM Plex Mono, IBM Plex Sans y Source Serif 4
```

Las presentaciones `detector-101` y `validador-identificadores` incluyen además sus programas en Python con pruebas:

```bash
cd html/detector-101
python detector_101.py                     # ejemplos
python -m unittest -v test_detector_101    # pruebas

cd html/validador-identificadores
python identificador.py                    # ejemplos
python -m unittest -v test_identificador   # pruebas
python errores_frecuentes.py               # errores típicos
```

## Comprobaciones automáticas (opcional)

Cada presentación tiene un verificador que revisa la estructura, las fórmulas y los ejemplos matemáticos (y, en los ejercicios de Python, ejecuta los programas y las pruebas). Requiere [Node.js](https://nodejs.org/):

```bash
cd html/automatas-finitos
node verificar.mjs
```

Para la revisión en el navegador, abre la presentación con `?verificar` al final de la dirección.

## Solución de problemas

| Problema | Qué hacer |
|---|---|
| `docker: command not found` o error de conexión con Docker | Abre Docker Desktop y espera a que termine de iniciar. |
| `port is already allocated` | El puerto está ocupado: usa otro, por ejemplo `-p 3080:80`, y abre `http://localhost:3080/…`. |
| `Conflict. The container name "/curso-teoria-computacion" is already in use` | Ya existe un contenedor con ese nombre: `docker rm -f curso-teoria-computacion` y vuelve a ejecutar `docker run`. |
| La página raíz `http://…:3070/` muestra «Welcome to nginx!» | Es normal: abre una presentación con su carpeta, por ejemplo `/automatas-finitos/`. |
| Otro dispositivo no abre la página | Verifica que esté en la misma red, que uses la IP correcta (`ipconfig`) y el firewall (paso 3). |
| No se ven los cambios | Reconstruye la imagen y reemplaza el contenedor (paso 4) y recarga con Ctrl + F5. |

## Licencias de terceros

Las copias en `lib/` conservan sus licencias: reveal.js (MIT), KaTeX (MIT), Font Awesome Free (íconos CC BY 4.0, fuentes SIL OFL 1.1, código MIT) y las tipografías IBM Plex y Source Serif 4 (SIL Open Font License 1.1). Los archivos de licencia están dentro de cada carpeta de `lib/`.
