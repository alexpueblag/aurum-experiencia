---
name: aurum-qaa-diario
description: Cada mañana (8 AM) detecta respuestas QAA nuevas en el Sheet CRM-YOD y genera borradores de brief + cotización en Gmail para que Alejandro los revise.
---

Eres el asistente de Alejandro, director de Aurum Arquitectos (Hermosillo, Sonora). Esta tarea corre AUTOMÁTICAMENTE cada mañana sin que Alejandro esté presente. NUNCA pauses ni hagas preguntas: usa defaults y placeholders. JAMÁS envíes correos a clientes — solo crea BORRADORES en Gmail. Avisa a Alejandro SOLO cuando haya algo nuevo.

OBJETIVO: Detectar respuestas nuevas del formulario QAA en el Google Sheet "CRM - YOD" y, por cada una, generar el brief arquitectónico + borrador de cotización en Gmail.

## PASO 0 — DESCARGAR ARCHIVOS DEL SKILL DESDE DRIVE (CRÍTICO)
El catálogo y la plantilla NO están en la carpeta del skill; viven en Google Drive. Descárgalos primero (carga la herramienta con ToolSearch query "select:mcp__6742e7de-90e6-4d43-b383-8e88233c5e6b__download_file_content"):
- Catálogo: download_file_content(fileId="1SeLYpWQl6KwCqSrY6wsB41eltRkKXbNk", exportMimeType="text/plain") → es JSON en base64 (campo "content"). 
- Plantilla: download_file_content(fileId="1FzWWk-uJvypeSjqggdoZIy0OMowM3SWd", exportMimeType="text/plain") → es HTML en base64.
Decodifica cada base64 y escribe los archivos a la carpeta de trabajo: aurum-catalogo.json y brief-template.html. Técnica fiable: en bash, escribe el string base64 a un .b64 con un heredoc y luego `base64 -d archivo.b64 > destino`. Verifica: `python3 -c "import json;json.load(open('aurum-catalogo.json'));print('OK')"` y que brief-template.html contenga {{TABLA_HAB_ROWS}}. Si la descarga o validación falla, avisa el error a Alejandro con send_user_message y termina.

## PASO 1 — LEER QAA
download_file_content(fileId="1z1ZtvcUKnx4MUfxLICo8x5bTihlDY8tBC3j2sYwNvg8", exportMimeType="text/csv"). Decodifica el blob base64, UTF-8, parsea con csv. Col A=timestamp, B=nombre, D=email, E=proyecto, F=terreno m², H=personas, L=niveles, N=lujo, S=vehículos, X=cocina. NOTA: el export a CSV puede traer solo la primera hoja; si la hoja QAA no es la primera o el CSV no trae las columnas esperadas, usa como alternativa read_file_content del mismo fileId y parsea la sección de la hoja "FORM - QAA". Si todo falla, avisa con send_user_message y termina.

## PASO 2 — RESPUESTAS NUEVAS
Las recibidas en las últimas 30 horas (timestamp > ahora − 30h). Si la app estuvo cerrada varios días, considera también las de los últimos 5 días.

## PASO 3 — DEDUPE
Por cada candidata, busca en Gmail (search_threads y list_drafts) si ya existe borrador/hilo con el nombre del cliente o un folio "AUR-" en el subject. Si existe, sáltala.

## PASO 4 — SI NO HAY NADA NUEVO
Termina EN SILENCIO: no mandes mensaje, correo, borrador ni notificación.

## PASO 5 — PROCESAR CADA RESPUESTA NUEVA (modo automático)
Sigue la lógica del skill aurum-brief (lee /sessions/admiring-dazzling-mccarthy/mnt/.claude/skills/aurum-brief/SKILL.md). Carga el catálogo y la plantilla descargados en el PASO 0.
- SALTA los checkpoints interactivos (no confirmes registro, no pidas datos del molde, no propongas/iteres programa).
- Programa DEFAULT del catálogo: tamaño por terreno/lujo (heuristica_pre_seleccion), recámaras por personas, espacios_base_siempre + cochera (CHICO). No agregues opcionales.
- Recámara principal incluye Baño + Walk-in Closet; demás recámaras incluyen Baño (extras del catálogo, se suman al m²).
- Cotiza SOLO sobre m² habitables, con precios_mxn_por_m2 y multiplicador_lujo del catálogo. Triple assert obligatorio.
- Datos que el QAA no captura (frentes, orientación, colonia, topografía, calidad de acabados, domótica, casas referente, teléfono, nombres/edades de ocupantes): placeholders "[POR DEFINIR]".
- Email faltante → direccion@aurumarquitectos.com + "[FALTA EMAIL CLIENTE]" en subject. Terreno faltante → 500.
- Renderiza brief-template.html (quita comentarios, reemplaza {{...}}, genera filas de TABLA_HAB_ROWS y TABLA_NOHAB_ROWS). Verifica que NO queden placeholders huérfanos {{...}}; si quedan o un assert falla, NO crees ese borrador y anótalo como error.
- FOLIO AUR-YYYYMMDD-XX (iniciales). Crea el BORRADOR con create_draft (to=email cliente o default; cc=comercial@yodesarrollo.mx; htmlBody=email cover 3 párrafos + brief). NUNCA enviar.

## PASO 6 — AVISO (solo si se creó ≥1 borrador)
Usa send_user_message con: cuántos cuestionarios nuevos y de quién; por cliente proyecto, m² habitables, cotización (Llave/Ejecutivo/Diseño) y FOLIO; PENDIENTES "[POR DEFINIR]" / "[FALTA EMAIL CLIENTE]" / terreno default; clientes con error; cierre "Los borradores están en tu Gmail; revísalos y complétalos antes de enviar." Si no se creó ninguno, no mandes nada.

REGLAS: a clientes solo BORRADORES jamás enviar · m² siempre del catálogo · dedupe por Gmail.

---

## ADDENDUM — LEADS - WEB (PENDIENTE de integrar a la tarea en Cowork)

La web app (github.com/alexpueblag/aurum-experiencia) escribe cada lead vía Apps Script en la pestaña **"LEADS - WEB"** del mismo Sheet "CRM - YOD" (UPSERT por email: un cliente = un renglón, siempre el mismo). Cuando se integre esta sección a la tarea de Cowork, el flujo diario debe extenderse así:

### PASO 1-BIS — LEER LEADS - WEB
Además del QAA, leer la pestaña "LEADS - WEB". Columnas (por nombre de encabezado, no por posición): Primer contacto, Última actualización, Folio, Nombre, Email, WhatsApp, Proyecto, Estilo, Sensaciones, Momentos, Nivel, Terreno m2, Personas, Plantas, Autos, Extras, M2 habitables, M2 totales, Rango bajo MXN, Rango alto MXN, Estado, Brief, Sesión agendada, QAA completo, Notas, JSON.

### PASO 5-BIS — PROCESAR LEADS CON Estado=NUEVO
- Por cada renglón con Estado=NUEVO: generar brief + borrador de cotización IGUAL que con el QAA, usando el FOLIO que ya trae el renglón (no generar uno nuevo). La columna JSON trae el payload completo de la web por si hace falta detalle.
- El lead web trae MENOS datos que el QAA (no hay nombres de integrantes, orientación, acabados, etc.): usar "[POR DEFINIR]" como en el flujo normal.
- Al crear el borrador: actualizar EL MISMO RENGLÓN → Estado=BRIEF CREADO y columna Brief=fecha del borrador. JAMÁS crear renglones nuevos: todo el seguimiento del cliente vive en su renglón.

### CRUCE WEB ↔ QAA (mismo cliente, sin trabajo doble)
- Antes de procesar una respuesta QAA nueva (PASO 5), buscar su email en "LEADS - WEB". Si existe: es el MISMO cliente que ya pasó por la web → actualizar su renglón (QAA completo=fecha, Estado=QAA COMPLETO si ya tenía brief) y usar el folio del renglón en el nuevo brief detallado. Los datos del QAA (más completos) mandan sobre los de la web.
- Dedupe de borradores en Gmail: igual que hoy (buscar folio "AUR-" o nombre en subject).

### CICLO DE VIDA DE Estado
NUEVO → BRIEF CREADO → SESIÓN AGENDADA → QAA COMPLETO → CLIENTE / DESCARTADO

Quién escribe cada transición (los estados se pueden saltar; la cadena no es estricta):
- **La web**: solo NUEVO al crear el renglón (o si la celda Estado quedó vacía).
- **Esta tarea**: BRIEF CREADO (PASO 5-BIS) y QAA COMPLETO (cruce web↔QAA).
- **Alejandro a mano**: SESIÓN AGENDADA (hoy no hay integración Calendly→Sheet), CLIENTE y DESCARTADO.

Nota de formato: las columnas Estilo, Extras y Momentos traen nombres display ("Moderno cálido", "Terraza, Estudio / Oficina"), no claves internas; la columna JSON conserva el payload crudo de la web por si se necesita el detalle exacto.

### CATÁLOGO (sin cambios para esta tarea)
El archivo aurum-catalogo.json de Drive (fileId 1SeLYpWQl6KwCqSrY6wsB41eltRkKXbNk) se sigue leyendo igual en el PASO 0: ahora lo regenera a diario (franja 5-6 AM, antes de esta tarea) el Apps Script, parseando directo las hojas de Alejandro en "Au : Residencia Nueva" (VIVIENDA NUEVA para m² de espacios; ANÁLISIS OBRA NUEVA para $/m² de obra y proyecto). Alejandro edita sus hojas como siempre y todo se propaga solo. OJO: los precios vigentes son los de su hoja (hoy llave 18,900 · ejecutivo 1,000 · diseño 550), ya NO los 18,500/1,350/850 del v11.