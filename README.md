# Cascaron · aurum-experiencia

Este repo **no tiene codigo**. Es una direccion vieja que sigue viva.

El tablero real vive en `yodesarrollomx/aurum-experiencia` y se sirve en:
<https://yodesarrollomx.github.io/aurum-experiencia/>

Cuando el repo se transfirio a la organizacion, GitHub dejo de redirigir su
GitHub Pages (lo dice su documentacion: *"we don't redirect GitHub Pages
associated with the repository"*). Sin este cascaron,
`https://alexpueblag.github.io/aurum-experiencia/` daria 404 para siempre.

El `404.html` recibe cualquier ruta que no exista y reenvia conservando la
ruta, el query string y el fragmento.

## Ademas de la redireccion, este cascaron SIRVE ARCHIVOS DE VERDAD

- `img/fachada-mona.jpg`

Esos archivos los cargan otros tableros con `<script src>` / `<link href>`
apuntando todavia a esta direccion vieja. Un `script src` que cae en el
404.html recibe HTML, no JavaScript: el tablero se queda sin Portero.
Por eso aqui hay copias reales. **No los borres aunque parezcan duplicados.**

## NO BORRAR · NO ARCHIVAR · NO RENOMBRAR

De esta direccion cuelgan:

- QRs **ya impresos**, que no se pueden reimprimir
- captions de publicaciones de Facebook e Instagram **ya publicadas**
- ligas mandadas por WhatsApp a clientes e inversionistas

Nada de eso se puede corregir. Si alguien borra este repo, o lo archiva, o
apaga su GitHub Pages, esas ligas mueren y no hay forma de recuperarlas.

Este cascaron es **permanente**. No es un puente de una semana.
