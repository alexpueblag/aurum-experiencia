# Aurum Experiencia — *Cuestionario de Arquitectura de Autor*

Contexto para Claude Code. Lee este archivo completo antes de tocar nada.

## Qué es esto
Web app de captación de leads para **Aurum Arquitectos** (Hermosillo, Sonora; director: Alejandro, direccion@aurumarquitectos.com). De cara al público se llama **"Cuestionario de Arquitectura de Autor"** (nombre en `<title>` y portada). Sustituye como PRIMER contacto al Google Form largo ("Cuestionario Arquitectónico", 40+ preguntas) que la gente abandonaba desde la publicidad.

**Contenido 100% editable desde el Sheet:** TODA la copy (títulos, botones, nombres de estilos/sensaciones/momentos/niveles, lema, logo y link de agenda) vive en la pestaña `TEXTOS WEB` del CRM. La web la carga al abrir (`GET ?recurso=textos`) sobre un respaldo embebido. Nadie necesita tocar el HTML para cambiar texto. Ver sección "Textos editables".

**Estrategia (lógica Hormozi — ecuación de valor):**
- Esfuerzo mínimo: todo por clicks sobre tarjetas visuales, 90 segundos, gustos antes que datos.
- Gratificación inmediata: barra inferior en vivo con ≈m² habitables y rango de inversión que se actualiza con cada click (cálculo REAL del catálogo Aurum, no inventado).
- Gate de datos (nombre/correo/WhatsApp) justo antes del reveal final.
- Reveal: m², rango de inversión llave en mano, programa de áreas, folio AUR-YYYYMMDD-INICIALES.
- Cierre: "Sesión de Diseño" en videollamada (45 min, valor $4,800 MXN, gratis, sin compromiso, agenda limitada) → ahí se completa el resto del cuestionario y se cierra. CTA a Calendly.

## Archivos
- `index.html` — la app completa (un solo archivo, sin dependencias). Catálogo embebido en `const CAT`; textos embebidos (respaldo) en `const TEXTOS`. Los nodos con `data-txt`/`data-ph` y las listas se repintan desde el Sheet en `aplicarTextos()`.
- `data/aurum-catalogo.json` — catálogo oficial v11 (fuente de verdad de CAT; si difieren, manda el JSON).
- `templates/brief-template.html` — molde HTML email-safe del brief de 9 secciones (placeholders `{{...}}`).
- `docs/tarea-programada-qaa.md` — la tarea automatizada diaria que hoy procesa el Google Form viejo.
- `docs/webhook-apps-script.gs` — Apps Script central (Web App único): GET ?recurso=catalogo sirve el catálogo vivo parseado directo de las hojas de Alejandro (VIVIENDA NUEVA + ANÁLISIS OBRA NUEVA); GET ?recurso=textos sirve los textos de la pestaña "TEXTOS WEB" (clave/valor); POST hace UPSERT por email del lead en "LEADS - WEB" del "CRM - YOD"; además regenera a diario el aurum-catalogo.json de Drive. `sembrarTextos()` crea/rellena la pestaña de textos. Instrucciones de despliegue en el propio archivo.

## Reglas de negocio INVIOLABLES (del catálogo v11)
- Los m² de cada espacio salen del catálogo, NUNCA se inventan. Tamaños: chico/mediano/grande.
- Tamaño default por terreno: <500 chico · 500–800 mediano · >800 grande. Override por nivel de lujo: Acogedora/Casual→chico, Elegante→mediano, Lujo→grande.
- Recámaras por personas: 1-2→1, 3→2, 4→3, 5-6→4, 7+→5. Principal incluye Baño+Walk-in (extras se SUMAN al m²); las demás incluyen Baño (+6 m²).
- Espacios base siempre: acceso_escalera, sala, comedor, cocina, medio_bano, lavanderia.
- Cotización SOLO sobre m² habitables (habitable=true). Cochera/terraza/alberca etc. se muestran pero NO cotizan.
- Precios MXN/m²: salen de la hoja de Alejandro (ANÁLISIS OBRA NUEVA) — llave en mano = su selector "COSTO POR M2 DE OBRA" (hoy 18,900); diseño = suma etapa 1 del PROYECTO ARQUITECTÓNICO (hoy 550); ejecutivo = etapas 1+2 (hoy 1,000). DECISIÓN DE ALEJANDRO (2026-06-10): lo que diga su hoja ES lo correcto; los 18,500/1,350/850 del v11 quedaron obsoletos. Multiplicador lujo (constante del script): Acogedora 0.85 · Casual 1.00 · Elegante 1.20 · Lujo 1.40.
- NO aplicar factor de circulación (ya embebido en el catálogo).
- Rango mostrado en la app: banda de estimación preliminar ×0.95 a ×1.12 (const BANDA del Apps Script).
- En index.html la cochera usa m² lineales por vehículo, derivados de su hoja: m² chico / vehículos chico (hoy 36/2 = 18) en vez de los escalones 36/54/72 — decisión de UX para el stepper.

## Identidad visual Aurum
Negro #1a1a1a · Oro #b8975a · Crema #faf7f2 · Arena #ece6da · Piedra #8a7d65 · Carbón #6b6055. Serif Georgia para títulos/números, Helvetica/Arial para texto. Logo: por defecto marca tipográfica (caja con borde oro "Au" + AURUM ARQUITECTOS + lema "Arquitectura con alma"); editable a imagen real con la clave `logo_url` de TEXTOS WEB (el sitio aurumarquitectos.com.mx estaba inaccesible al construir esto, por eso quedó como celda editable). Tono: elegante, sobrio, segunda persona, español de México.

## Textos editables — pestaña `TEXTOS WEB` (CRM - YOD)
Toda la copy visible de la web es editable desde el Sheet, sin tocar código.

- **Dónde:** pestaña `TEXTOS WEB` del Sheet "CRM - YOD" (el mismo de los leads). Dos columnas que importan: **A `clave`**, **B `valor`** (la C `nota` es solo ayuda para Alejandro, la web la ignora).
- **Cómo se crea/llena:** ejecutar una vez `sembrarTextos()` en el Apps Script. Es idempotente: agrega solo las claves que falten, nunca pisa lo que Alejandro ya editó. La lista canónica de claves+valores por defecto está en `const TEXTOS_SEMILLA` del .gs (debe coincidir con `const TEXTOS` de index.html).
- **Cómo llega a la web:** al cargar, `GET ?recurso=textos` → `aplicarTextos()` sobreescribe el respaldo embebido. Si el Sheet no responde, la web se ve igual con los defaults embebidos.
- **Convenciones de claves:** nodos sueltos = clave directa (`p0_titulo`, `gate_btn`...). Listas con sufijo numérico: `estilo_1..6_nombre/_desc`, `sensacion_1..8`, `momento_1..8`, `nivel_1..4_nombre/_desc`. La LÓGICA de cada lista (id de estilo, imagen de fachada, qué extras suma cada momento, multiplicador de cada nivel) vive en el código, NO en el Sheet — el Sheet solo controla el texto visible.
- **HTML permitido en valores:** títulos admiten `<em>...</em>` (acento dorado) y algunos `<b>...</b>`. La fuente es de confianza (solo Alejandro edita el Sheet), por eso se aplica con innerHTML.
- **Plantillas con tokens:** `r_titulo_tpl`, `r_proyecto_tpl`, `r_nota_precio_tpl` usan `{nombre}`/`{nivel}`/`{diseno}` que se rellenan en vivo. No borrar las llaves.
- **Logo:** clave `logo_url`. Vacía = marca tipográfica "Au + AURUM ARQUITECTOS + lema". Con URL (imagen o link Drive `thumbnail?id=...`) = se muestra esa imagen.
- **Agenda:** clave `cta_agenda_url` = link de la "Página de citas" de Google Calendar. Mientras esté vacía el botón no abre nada.

## Arquitectura de datos — los archivos de Google son la raíz
Alejandro edita SUS archivos de Google y todo lo demás se deriva de ahí. Nunca invertir esta dirección.

```
"Au : Residencia Nueva" (Sheet 10gsWRjGg9r9gvyl15VRBfeBKcUaafqNtiuGC0kUbEsg)
  · VIVIENDA NUEVA → m² de espacios (bloques: etiqueta / medidas / m² / checkboxes)
  · ANÁLISIS OBRA NUEVA → $/m² de obra (selector "COSTO POR M2 DE OBRA") y
    $/m² de proyecto (tabla PROYECTO ARQUITECTÓNICO: diseño=etapa 1, ejecutivo=1+2)
        │   Alejandro edita SUS hojas tal como siempre; el script las parsea tal cual
        ├─ GET ?recurso=catalogo ──→ index.html (carga en vivo al abrir; fallback: CAT embebido)
        └─ trigger diario 5-6 AM ──→ aurum-catalogo.json en Drive ──→ tarea diaria 8 AM (briefs QAA)

index.html (lead) ── POST ──→ Apps Script ── UPSERT por email ──→ "CRM - YOD", pestaña "LEADS - WEB"
                                                                   (un cliente = un renglón, SIEMPRE el mismo;
                                                                    la tarea diaria y el QAA completo van
                                                                    llenando ese mismo renglón)

"CRM - YOD", pestaña "TEXTOS WEB" (clave/valor) ── GET ?recurso=textos ──→ index.html (toda la copy; fallback: TEXTOS embebido)
```

- El Apps Script (docs/webhook-apps-script.gs) es el único puente; un solo Web App para GET catálogo y POST lead. NO crea pestañas: lee las hojas de Alejandro tal como están (las etiquetas de espacios se mapean en la const ETIQUETAS del script; si Alejandro agrega un espacio nuevo, sale en _meta.advertencias hasta mapearlo).
- Lo que la hoja NO codifica vive como constantes del script (acordadas en v11): habitable por espacio, m² de extras Baño/Walk-in, multiplicadores de lujo, banda 0.95–1.12 y heurística. La cochera de la web usa m² lineales = m²chico/vehículos (hoy 36/2=18).
- `data/aurum-catalogo.json` del repo y `const CAT` de index.html son SNAPSHOTS para desarrollo/fallback; no son fuente. Si se detecta divergencia con el Sheet, manda el Sheet.
- La web nunca pisa el seguimiento del CRM: en re-envíos actualiza datos y deja nota, pero no toca Brief/Sesión/QAA ni el Estado de ese renglón (única excepción defensiva: rellena Estado=NUEVO si la celda quedó vacía).

## Ecosistema existente (Google Workspace de Alejandro)
- Google Sheet "CRM - YOD", fileId `1z1ZtvcUKnx4MUfxLICo8x5bTihlDY8tBC3j2sYwNvg8` — respuestas del form viejo (hoja "FORM - QAA"). Cols: A timestamp, B nombre, D email, E proyecto, F terreno, H personas, L niveles, N lujo, S vehículos, X cocina.
- Catálogo en Drive: fileId `1SeLYpWQl6KwCqSrY6wsB41eltRkKXbNk` · Plantilla brief: fileId `1FzWWk-uJvypeSjqggdoZIy0OMowM3SWd`.
- Google Form viejo: fileId `1GhQhGTxiV5fcbi5dtytGljsERfpfGRKIQavfshbbtlo` (sigue activo, 76 respuestas).
- Tarea diaria (Cowork): detecta respuestas nuevas, genera brief HTML + cotización y crea BORRADOR en Gmail (jamás envía; cc comercial@yodesarrollo.mx; folio AUR-YYYYMMDD-INICIALES). Ver docs/tarea-programada-qaa.md.

## TODOs (en orden)
1. HECHO — Los 6 estilos usan renders reales de residencias Aurum sacados de yodesarrollo.mx (img/fachada-*.jpg): Contemporáneo=Antonieta, Moderno cálido=Alysa, Minimalista=María, Mediterráneo=Zara, Industrial=Barcelona, Clásico=Rita. Las originales en alta viven en el Drive de Yodesarrollo (Sheet 1FyBkFmdLO8BeNdmDohYRvAh_nJP1jsdsEZ_rPYm8m1s alimenta el sitio; imágenes vía drive.google.com/thumbnail?id=...). Si Alejandro prefiere otra asignación, solo se cambian los url() de .v1–.v6.
2. HECHO (parcial) — El agendado ya NO está cableado en el HTML: el botón "Agendar mi sesión" lee la clave `cta_agenda_url` de la pestaña TEXTOS WEB. PENDIENTE DE ALEJANDRO: pegar ahí el link de su "Página de citas" de Google Calendar (Calendar → Crear → Programación de citas → publicar → copiar enlace). Mientras esté vacío, el botón no abre nada.
3. Conexión a archivos raíz — DESPLEGADA y conectada (WEBHOOK_URL ya apunta al /exec). Tras cualquier cambio al .gs: pegar el archivo en Apps Script y publicar "Nueva versión" en Administrar implementaciones (la URL no cambia). Pendiente: ejecutar `borrarPestanasApp()` una vez (limpia CATALOGO_APP/PRECIOS_APP de la versión vieja) e integrar el ADDENDUM de docs/tarea-programada-qaa.md a la tarea de Cowork.
4. Deploy: GitHub Pages sirve index.html tal cual (Settings → Pages → main). Después dominio propio.
5. Correo gancho post-lead: cover narrativo + estimación + CTA a la Sesión de Diseño (reusar lógica de la tarea programada).
6. Analytics de embudo (dónde abandonan) — algo ligero tipo Plausible.

## Qué NO hacer
- No enviar correos a clientes automáticamente: siempre borradores que Alejandro revisa.
- No cambiar precios/m² sin confirmación de Alejandro.
- No agregar frameworks pesados: la app debe seguir siendo un HTML estático sin build.
