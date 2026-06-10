# Aurum Experiencia — Pre-formulario web de captación

Contexto para Claude Code. Lee este archivo completo antes de tocar nada.

## Qué es esto
Web app de captación de leads para **Aurum Arquitectos** (Hermosillo, Sonora; director: Alejandro, direccion@aurumarquitectos.com). Sustituye como PRIMER contacto al Google Form largo ("Cuestionario Arquitectónico", 40+ preguntas) que la gente abandonaba desde la publicidad.

**Estrategia (lógica Hormozi — ecuación de valor):**
- Esfuerzo mínimo: todo por clicks sobre tarjetas visuales, 90 segundos, gustos antes que datos.
- Gratificación inmediata: barra inferior en vivo con ≈m² habitables y rango de inversión que se actualiza con cada click (cálculo REAL del catálogo Aurum, no inventado).
- Gate de datos (nombre/correo/WhatsApp) justo antes del reveal final.
- Reveal: m², rango de inversión llave en mano, programa de áreas, folio AUR-YYYYMMDD-INICIALES.
- Cierre: "Sesión de Diseño" en videollamada (45 min, valor $4,800 MXN, gratis, sin compromiso, agenda limitada) → ahí se completa el resto del cuestionario y se cierra. CTA a Calendly.

## Archivos
- `index.html` — la app completa (un solo archivo, sin dependencias). Catálogo embebido en `const CAT`.
- `data/aurum-catalogo.json` — catálogo oficial v11 (fuente de verdad de CAT; si difieren, manda el JSON).
- `templates/brief-template.html` — molde HTML email-safe del brief de 9 secciones (placeholders `{{...}}`).
- `docs/tarea-programada-qaa.md` — la tarea automatizada diaria que hoy procesa el Google Form viejo.

## Reglas de negocio INVIOLABLES (del catálogo v11)
- Los m² de cada espacio salen del catálogo, NUNCA se inventan. Tamaños: chico/mediano/grande.
- Tamaño default por terreno: <500 chico · 500–800 mediano · >800 grande. Override por nivel de lujo: Acogedora/Casual→chico, Elegante→mediano, Lujo→grande.
- Recámaras por personas: 1-2→1, 3→2, 4→3, 5-6→4, 7+→5. Principal incluye Baño+Walk-in (extras se SUMAN al m²); las demás incluyen Baño (+6 m²).
- Espacios base siempre: acceso_escalera, sala, comedor, cocina, medio_bano, lavanderia.
- Cotización SOLO sobre m² habitables (habitable=true). Cochera/terraza/alberca etc. se muestran pero NO cotizan.
- Precios 2026 MXN/m²: llave en mano 18,500 · proyecto ejecutivo 1,350 · diseño arquitectónico 850. Multiplicador lujo: Acogedora 0.85 · Casual 1.00 · Elegante 1.20 · Lujo 1.40.
- NO aplicar factor de circulación (ya embebido en el catálogo).
- Rango mostrado en la app: base×0.95 a base×1.12 (banda de estimación preliminar).
- En index.html la cochera usa 18 m²/vehículo (lineal) en vez de los escalones 36/54/72 del catálogo — decisión de UX para el stepper; revisar con Alejandro si debe alinearse.

## Identidad visual Aurum
Negro #1a1a1a · Oro #b8975a · Crema #faf7f2 · Arena #ece6da · Piedra #8a7d65 · Carbón #6b6055. Serif Georgia para títulos/números, Helvetica/Arial para texto. Logo: caja con borde oro y "Au". Tono: elegante, sobrio, segunda persona, español de México.

## Ecosistema existente (Google Workspace de Alejandro)
- Google Sheet "CRM - YOD", fileId `1z1ZtvcUKnx4MUfxLICo8x5bTihlDY8tBC3j2sYwNvg8` — respuestas del form viejo (hoja "FORM - QAA"). Cols: A timestamp, B nombre, D email, E proyecto, F terreno, H personas, L niveles, N lujo, S vehículos, X cocina.
- Catálogo en Drive: fileId `1SeLYpWQl6KwCqSrY6wsB41eltRkKXbNk` · Plantilla brief: fileId `1FzWWk-uJvypeSjqggdoZIy0OMowM3SWd`.
- Google Form viejo: fileId `1GhQhGTxiV5fcbi5dtytGljsERfpfGRKIQavfshbbtlo` (sigue activo, 76 respuestas).
- Tarea diaria (Cowork): detecta respuestas nuevas, genera brief HTML + cotización y crea BORRADOR en Gmail (jamás envía; cc comercial@yodesarrollo.mx; folio AUR-YYYYMMDD-INICIALES). Ver docs/tarea-programada-qaa.md.

## TODOs (en orden)
1. Reemplazar los 6 placeholders de fachada (.v1–.v6) por renders reales de Aurum.
2. Poner la liga real de Calendly (buscar `REEMPLAZAR-AURUM` en index.html).
3. Backend de leads: en `revelar()` hay un `console.log("LEAD AURum →"...)` y un comentario `AQUÍ`. Enviar el payload a un webhook (Apps Script → fila nueva en una hoja del "CRM - YOD") para que la automatización existente genere el borrador de correo igual que hoy.
4. Deploy: GitHub Pages sirve index.html tal cual (Settings → Pages → main). Después dominio propio.
5. Correo gancho post-lead: cover narrativo + estimación + CTA a la Sesión de Diseño (reusar lógica de la tarea programada).
6. Analytics de embudo (dónde abandonan) — algo ligero tipo Plausible.

## Qué NO hacer
- No enviar correos a clientes automáticamente: siempre borradores que Alejandro revisa.
- No cambiar precios/m² sin confirmación de Alejandro.
- No agregar frameworks pesados: la app debe seguir siendo un HTML estático sin build.
