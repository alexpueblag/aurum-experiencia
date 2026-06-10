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
- `docs/webhook-apps-script.gs` — Apps Script central (Web App único): GET ?recurso=catalogo sirve el catálogo vivo desde CATALOGO_APP/PRECIOS_APP y POST hace UPSERT por email del lead en "LEADS - WEB" del "CRM - YOD"; además regenera a diario el aurum-catalogo.json de Drive. Instrucciones de despliegue en el propio archivo.

## Reglas de negocio INVIOLABLES (del catálogo v11)
- Los m² de cada espacio salen del catálogo, NUNCA se inventan. Tamaños: chico/mediano/grande.
- Tamaño default por terreno: <500 chico · 500–800 mediano · >800 grande. Override por nivel de lujo: Acogedora/Casual→chico, Elegante→mediano, Lujo→grande.
- Recámaras por personas: 1-2→1, 3→2, 4→3, 5-6→4, 7+→5. Principal incluye Baño+Walk-in (extras se SUMAN al m²); las demás incluyen Baño (+6 m²).
- Espacios base siempre: acceso_escalera, sala, comedor, cocina, medio_bano, lavanderia.
- Cotización SOLO sobre m² habitables (habitable=true). Cochera/terraza/alberca etc. se muestran pero NO cotizan.
- Precios 2026 MXN/m²: llave en mano 18,500 · proyecto ejecutivo 1,350 · diseño arquitectónico 850. Multiplicador lujo: Acogedora 0.85 · Casual 1.00 · Elegante 1.20 · Lujo 1.40.
- NO aplicar factor de circulación (ya embebido en el catálogo).
- Rango mostrado en la app: banda de estimación preliminar (default ×0.95 a ×1.12; editable en PRECIOS_APP como banda_estimacion_baja/alta).
- En index.html la cochera usa m² lineales por vehículo (default 18, editable en PRECIOS_APP como cochera_m2_por_auto) en vez de los escalones 36/54/72 del catálogo — decisión de UX para el stepper; revisar con Alejandro si debe alinearse.
- OJO precios: la calculadora libre de "Au : Residencia Nueva" marca $18,900/m² de obra (checkbox) y $1,000/m² de proyecto, pero el catálogo v11 (y la app) usan 18,500/1,350/850. NO adoptar los de la calculadora sin confirmación de Alejandro; si decide cambiarlos, se editan en PRECIOS_APP y se propagan solos.

## Identidad visual Aurum
Negro #1a1a1a · Oro #b8975a · Crema #faf7f2 · Arena #ece6da · Piedra #8a7d65 · Carbón #6b6055. Serif Georgia para títulos/números, Helvetica/Arial para texto. Logo: caja con borde oro y "Au". Tono: elegante, sobrio, segunda persona, español de México.

## Arquitectura de datos — los archivos de Google son la raíz
Alejandro edita SUS archivos de Google y todo lo demás se deriva de ahí. Nunca invertir esta dirección.

```
"Au : Residencia Nueva" (Sheet 10gsWRjGg9r9gvyl15VRBfeBKcUaafqNtiuGC0kUbEsg)
  pestañas CATALOGO_APP + PRECIOS_APP  ←── AQUÍ se editan medidas y precios
        │
        ├─ GET ?recurso=catalogo ──→ index.html (carga en vivo al abrir; fallback: CAT embebido)
        └─ trigger diario 7 AM ───→ aurum-catalogo.json en Drive ──→ tarea diaria 8 AM (briefs QAA)

index.html (lead) ── POST ──→ Apps Script ── UPSERT por email ──→ "CRM - YOD", pestaña "LEADS - WEB"
                                                                   (un cliente = un renglón, SIEMPRE el mismo;
                                                                    la tarea diaria y el QAA completo van
                                                                    llenando ese mismo renglón)
```

- El Apps Script (docs/webhook-apps-script.gs) es el único puente; un solo Web App para GET catálogo y POST lead.
- `inicializarCatalogo()` siembra CATALOGO_APP/PRECIOS_APP una sola vez con los valores v11; desde entonces esas pestañas son LA fuente. El resto de "Au : Residencia Nueva" (la calculadora libre de Alejandro) no se parsea: tiene formato libre y valores en conflicto.
- `data/aurum-catalogo.json` del repo y `const CAT` de index.html son SNAPSHOTS para desarrollo/fallback; no son fuente. Si se detecta divergencia con el Sheet, manda el Sheet.
- La web nunca pisa el seguimiento del CRM: en re-envíos actualiza datos y deja nota, pero no toca Brief/Sesión/QAA ni el Estado de ese renglón (única excepción defensiva: rellena Estado=NUEVO si la celda quedó vacía).

## Ecosistema existente (Google Workspace de Alejandro)
- Google Sheet "CRM - YOD", fileId `1z1ZtvcUKnx4MUfxLICo8x5bTihlDY8tBC3j2sYwNvg8` — respuestas del form viejo (hoja "FORM - QAA"). Cols: A timestamp, B nombre, D email, E proyecto, F terreno, H personas, L niveles, N lujo, S vehículos, X cocina.
- Catálogo en Drive: fileId `1SeLYpWQl6KwCqSrY6wsB41eltRkKXbNk` · Plantilla brief: fileId `1FzWWk-uJvypeSjqggdoZIy0OMowM3SWd`.
- Google Form viejo: fileId `1GhQhGTxiV5fcbi5dtytGljsERfpfGRKIQavfshbbtlo` (sigue activo, 76 respuestas).
- Tarea diaria (Cowork): detecta respuestas nuevas, genera brief HTML + cotización y crea BORRADOR en Gmail (jamás envía; cc comercial@yodesarrollo.mx; folio AUR-YYYYMMDD-INICIALES). Ver docs/tarea-programada-qaa.md.

## TODOs (en orden)
1. Reemplazar los 6 placeholders de fachada (.v1–.v6) por renders reales de Aurum.
2. Poner la liga real de Calendly (buscar `REEMPLAZAR-AURUM` en index.html).
3. Conexión a archivos raíz — código LISTO: `revelar()` envía el lead a `WEBHOOK_URL` (POST, upsert por email en "LEADS - WEB") y la app carga el catálogo en vivo (GET ?recurso=catalogo). FALTA (manual, Alejandro, ~5 min): en Apps Script pegar docs/webhook-apps-script.gs, ejecutar `inicializarCatalogo()` y `instalarTriggers()`, desplegar como Web App y pegar la URL `/exec` en `WEBHOOK_URL`. Después: integrar el ADDENDUM de docs/tarea-programada-qaa.md a la tarea de Cowork.
4. Deploy: GitHub Pages sirve index.html tal cual (Settings → Pages → main). Después dominio propio.
5. Correo gancho post-lead: cover narrativo + estimación + CTA a la Sesión de Diseño (reusar lógica de la tarea programada).
6. Analytics de embudo (dónde abandonan) — algo ligero tipo Plausible.

## Qué NO hacer
- No enviar correos a clientes automáticamente: siempre borradores que Alejandro revisa.
- No cambiar precios/m² sin confirmación de Alejandro.
- No agregar frameworks pesados: la app debe seguir siendo un HTML estático sin build.
