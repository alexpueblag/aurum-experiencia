/**
 * Apps Script central — Aurum Experiencia
 * Un solo Web App con las DOS conexiones a los archivos raíz de Alejandro.
 * El catálogo se lee DIRECTO de las hojas de Alejandro tal como ya están:
 * NO se crean pestañas nuevas, no hay que cambiar de lugar nada.
 *
 *  TEXTOS (contenido editable → app):
 *    GET ?recurso=textos → todos los textos de la web, leídos de la
 *    pestaña "TEXTOS WEB" (clave / valor) del CRM. Alejandro edita ahí
 *    cualquier título, botón, nombre de estilo, el logo y el link de
 *    agenda, SIN tocar código. sembrarTextos() crea y rellena la pestaña.
 *
 *  ENTRADA (catálogo → app):
 *    GET ?recurso=catalogo → catálogo vigente leído de "Au : Residencia
 *    Nueva":
 *      · m² de cada espacio → pestaña VIVIENDA NUEVA (los bloques de
 *        4 renglones: etiqueta / medidas / m² / checkboxes).
 *      · $/m² de obra → pestaña ANÁLISIS OBRA NUEVA, el valor que tenga
 *        el selector "COSTO POR M2 DE OBRA" (los checkboxes).
 *      · $/m² de proyecto → la tabla PROYECTO ARQUITECTÓNICO por etapas:
 *        diseño = suma etapa 1 (A-E con palomita), ejecutivo = etapa 1+2.
 *    Lo que Alejandro mueva ahí se refleja en la web y en el JSON.
 *
 *  SALIDA (leads → CRM):
 *    POST (JSON de revelar()) → UPSERT por email en la pestaña "LEADS - WEB"
 *    del Sheet "CRM - YOD". Si el cliente ya existe se ACTUALIZA su mismo
 *    renglón (jamás se duplica); si no, se crea con Estado=NUEVO.
 *
 *  SEGUIMIENTO (tarea diaria → CRM):
 *    POST {tipo:"estado", token, email, estado, brief, sesion, qaa, nota}
 *    → la tarea programada de las 8 AM marca el avance del cliente en su
 *    MISMO renglón (Estado=BRIEF CREADO / SESIÓN AGENDADA / QAA COMPLETO,
 *    fechas de Brief/Sesión/QAA y notas). Protegido con TOKEN_TAREA, solo
 *    toca columnas de seguimiento, nunca degrada un estado y JAMÁS pisa
 *    CLIENTE / DESCARTADO (esos los pone Alejandro a mano).
 *
 *  SINCRONÍA (catálogo → Drive JSON):
 *    actualizarCatalogoDriveJson() regenera aurum-catalogo.json en Drive
 *    desde las mismas hojas (lo que lee la tarea diaria de las 8 AM).
 *    instalarTriggers() lo agenda a diario en la franja 5-6 AM.
 *
 * CÓMO ACTUALIZAR EL CÓDIGO YA DESPLEGADO (~2 minutos, EN ESTE ORDEN):
 * 1. Abre el proyecto de Apps Script (CRM - YOD → Extensiones → Apps
 *    Script), borra todo y pega este archivo. Guarda.
 * 2. Implementar → Administrar implementaciones → ✏️ Editar →
 *    Versión: "Nueva versión" → Implementar.
 *    LA URL /exec NO CAMBIA; no hay que tocar index.html.
 * 3. HASTA DESPUÉS del paso 2: ejecuta una vez borrarPestanasApp()
 *    para eliminar las pestañas CATALOGO_APP y PRECIOS_APP de la
 *    versión anterior. (Si las borras antes, la versión vieja aún
 *    publicada las vuelve a crear en la siguiente visita a la web.)
 * 4. Ejecuta una vez sembrarTextos() para crear la pestaña
 *    "TEXTOS WEB" con todos los textos por defecto. Es idempotente:
 *    repetirla solo rellena las claves que falten (no pisa tus ediciones).
 *    OJO REDISEÑO v2 (2026-06): si sembraste la pestaña ANTES del
 *    rediseño (carácter sin niveles, estimado por correo, agenda
 *    embebida), lo más limpio es BORRAR la pestaña TEXTOS WEB y volver
 *    a correr sembrarTextos() — las claves viejas (nivel_*, gate_sub,
 *    p4_titulo, r_*, sesion_b*...) ya no se usan y quedarían de adorno.
 *    Después vuelve a pegar tu cta_agenda_url si la habías puesto.
 *
 * Pruebas sin la web: testCatalogo(), testTextos(), testInsertarLead()
 * y testMarcarEstado().
 *
 * NOTA DE FORMATO: ninguna línea rebasa ~84 columnas para que el
 * copy-paste no parta strings a la mitad.
 */

// CRM - YOD
const CRM_ID = "1z1ZtvcUKnx4MUfxLICo8x5bTihlDY8tBC3j2sYwNvg8";
// Au : Residencia Nueva
const CATALOGO_SHEET_ID = "10gsWRjGg9r9gvyl15VRBfeBKcUaafqNtiuGC0kUbEsg";
// aurum-catalogo.json
const CATALOGO_JSON_DRIVE_ID = "1SeLYpWQl6KwCqSrY6wsB41eltRkKXbNk";

const TAB_LEADS = "LEADS - WEB";
// pestaña (clave / valor) con TODOS los textos editables de la web
const TAB_TEXTOS = "TEXTOS WEB";
const HOJA_ESPACIOS = "VIVIENDA NUEVA";
const HOJA_ANALISIS = "ANÁLISIS OBRA NUEVA";

// token compartido con la tarea diaria (docs/tarea-programada-qaa.md):
// solo quien lo conozca puede marcar seguimiento. Si lo cambias aquí,
// cámbialo también en el prompt de la tarea.
const TOKEN_TAREA = "AURUM-TAREA-7g4k9w2m";

/* ============== REGLAS DE NEGOCIO QUE LA HOJA NO CODIFICA ==============
   (vienen del catálogo v11 acordado; cambiarlas = editar aquí) */

// etiqueta tal como aparece en VIVIENDA NUEVA (col A) → clave del catálogo
const ETIQUETAS = {
  "ACCESO Y ESCALERA": "acceso_escalera",
  "COCINA": "cocina",
  "COMEDOR": "comedor",
  "SALA": "sala",
  "1/2 BAÑO": "medio_bano",
  "R. PRINCIPAL": "recamara_principal",
  "RECÁMARA 2": "recamara_2",
  "RECÁMARA 3": "recamara_3",
  "RECÁMARA 4": "recamara_4",
  "RECÁMARA 5": "recamara_5",
  "BAÑO COMP.": "bano_completo",
  "SALA TV": "sala_tv",
  "BAÑO EXTRA": "bano_extra",
  "LAVANDERÍA": "lavanderia",
  "C. SERVICIO": "cuarto_servicio",
  "ESTUDIO": "estudio",
  "ASADOR": "asador",
  "TERRAZA": "terraza",
  "BALCÓN": "balcon",
  "BIBLIOTECA": "biblioteca",
  "COCHERA": "cochera",
  "ESPEJO AGUA": "espejo_agua",
  "HUERTO": "huerto",
  "BUTLERS PANTRY": "butlers_pantry",
  "CUARTO JUEGOS": "cuarto_juegos",
  "BAR": "bar",
  "DEPTO. EXTRA": "depto_extra",
  "ALBERCA": "alberca",
  "CUARTO BLANCOS": "cuarto_blancos",
  "BODEGA": "bodega",
  "TALLER": "taller",
  // nuevos extras 2026-06-11 (aprobados Alejandro/Sayri): agregar estos
  // bloques en VIVIENDA NUEVA con ESTA etiqueta exacta en col A
  "RECÁMARA VISITAS": "recamara_visita",
  "RECIBIDOR": "recibidor",
  "EST. MASCOTAS": "estacion_mascotas",
  "JARDÍN": "jardin"
};

// nombre bonito por clave (la hoja usa abreviaturas)
const NOMBRES = {
  acceso_escalera: "Acceso y Escalera", cocina: "Cocina",
  comedor: "Comedor", sala: "Sala", medio_bano: "1/2 Baño",
  recamara_principal: "Recámara Principal", recamara_2: "Recámara 2",
  recamara_3: "Recámara 3", recamara_4: "Recámara 4",
  recamara_5: "Recámara 5", bano_completo: "Baño Completo",
  sala_tv: "Sala TV", bano_extra: "Baño Extra",
  lavanderia: "Lavandería", cuarto_servicio: "Cuarto de Servicio",
  estudio: "Estudio", asador: "Asador", terraza: "Terraza",
  balcon: "Balcón", biblioteca: "Biblioteca", cochera: "Cochera",
  espejo_agua: "Espejo de Agua", huerto: "Huerto",
  butlers_pantry: "Butler's Pantry", cuarto_juegos: "Cuarto de Juegos",
  bar: "Bar", depto_extra: "Depto. Extra", alberca: "Alberca",
  cuarto_blancos: "Cuarto de Blancos", bodega: "Bodega", taller: "Taller",
  recamara_visita: "Recámara de Visitas", recibidor: "Recibidor",
  estacion_mascotas: "Estación de Mascotas", jardin: "Jardín"
};

// qué espacios cotizan (la hoja no lo marca): los NO habitables se
// muestran en brief/web pero no entran a la multiplicación
const NO_HABITABLES = {
  asador: 1, terraza: 1, balcon: 1, cochera: 1,
  espejo_agua: 1, huerto: 1, alberca: 1, taller: 1, jardin: 1
};

// sub-espacios que se SUMAN al m² del padre (Baño / Walk-in Closet);
// la hoja los marca con etiqueta pero no trae sus m², estos son los
// acordados en el catálogo v11
const EXTRAS_M2 = {
  recamara_principal: {
    chico: { "Baño": 6, "Walk-in Closet": 4 },
    mediano: { "Baño": 6, "Walk-in Closet": 6 },
    grande: { "Baño": 6, "Walk-in Closet": 8 }
  },
  recamara_2: { chico: { "Baño": 6 }, mediano: { "Baño": 6 },
                grande: { "Baño": 6 } },
  recamara_3: { chico: { "Baño": 6 }, mediano: { "Baño": 6 },
                grande: { "Baño": 6 } },
  recamara_4: { chico: { "Baño": 6 }, mediano: { "Baño": 6 },
                grande: { "Baño": 6 } },
  recamara_5: { chico: { "Baño": 6 }, mediano: { "Baño": 6 },
                grande: { "Baño": 6 } },
  cuarto_servicio: { chico: { "Baño": 4 }, mediano: { "Baño": 4 },
                     grande: { "Baño": 4 } },
  // recámara de visitas: mismos valores que una recámara secundaria (+6 baño)
  recamara_visita: { chico: { "Baño": 6 }, mediano: { "Baño": 6 },
                     grande: { "Baño": 6 } }
};

// banda del rango mostrado en la web (x cotización base)
const BANDA = { baja: 0.95, alta: 1.12 };

// Circulaciones y grosor de muros: +12% sobre el subtotal de m² HABITABLES
// (regla 2026-06-11, sustituye a "NO aplicar circulación"). ENTRA a la base
// de cotización de los 3 servicios. EDITAR SOLO AQUÍ en esta capa; el espejo
// está en index.html (CAT.circulacion) y en docs/tarea-programada-qaa.md.
// Pendiente % final de Mariana (rango 0.10-0.15), default 0.12.
const CIRCULACION = 0.12;

// multiplicador por nivel de lujo (no está en la hoja)
const MULTIPLICADOR_LUJO = {
  Modesta: 0.85, Acogedora: 0.85, Casual: 1.00, sin_datos: 1.00,
  Elegante: 1.20, Premium: 1.20, Alto: 1.20, Vanguardista: 1.20,
  Monumental: 1.40, Lujo: 1.40, Luxury: 1.40, Glamoroso: 1.40
};

// heurística de pre-selección (lógica de negocio, no medidas)
const HEURISTICA = {
  tamano_default_por_terreno: {
    "< 300": "chico", "300 - 500": "chico",
    "500 - 800": "mediano", "> 800": "grande"
  },
  tamano_override_por_lujo: {
    Modesta: "chico", Acogedora: "chico", Casual: "chico",
    Elegante: "mediano", Premium: "mediano", Alto: "mediano",
    Vanguardista: "mediano",
    Monumental: "grande", Lujo: "grande", Luxury: "grande",
    Glamoroso: "grande"
  },
  recamaras_por_personas: {
    "1": ["recamara_principal"], "2": ["recamara_principal"],
    "3": ["recamara_principal", "recamara_2"],
    "4": ["recamara_principal", "recamara_2", "recamara_3"],
    "5": ["recamara_principal", "recamara_2", "recamara_3", "recamara_4"],
    "6": ["recamara_principal", "recamara_2", "recamara_3", "recamara_4"],
    "7+": ["recamara_principal", "recamara_2", "recamara_3", "recamara_4",
           "recamara_5"]
  },
  espacios_base_siempre: [
    "acceso_escalera", "sala", "comedor", "cocina",
    "medio_bano", "lavanderia"
  ],
  espacios_opcionales_preguntar: [
    "sala_tv", "estudio", "biblioteca", "bar", "cuarto_juegos",
    "butlers_pantry", "cuarto_blancos", "bodega", "cuarto_servicio",
    "depto_extra", "taller", "terraza", "balcon", "asador", "alberca",
    "espejo_agua", "huerto", "cochera"
  ]
};

/* ===================== WEB APP ===================== */

function doGet(e) {
  try {
    if (e && e.parameter && e.parameter.recurso === "catalogo") {
      return respuesta_(construirCatalogo_());
    }
    if (e && e.parameter && e.parameter.recurso === "textos") {
      return respuesta_({ ok: true, textos: leerTextos_() });
    }
    if (e && e.parameter && e.parameter.recurso === "board") {
      return respuesta_(construirBoard_());   // métricas agregadas (sin PII) para board.html
    }
    return respuesta_({
      ok: true,
      servicio: "aurum-experiencia",
      recursos: [
        "GET ?recurso=catalogo", "GET ?recurso=textos", "GET ?recurso=board",
        "POST lead JSON", "POST {tipo:'gasto', semana, monto, campanas, secret}"
      ]
    });
  } catch (err) {
    return respuesta_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const datos = JSON.parse(e.postData.contents);
    if (datos && datos.tipo === "estado") {
      return respuesta_(marcarEstado_(datos));
    }
    if (datos && datos.tipo === "gasto") {
      return respuesta_(guardarGasto_(datos));   // board: registro manual de gasto semanal
    }
    const resultado = upsertLead_(datos, e.postData.contents);
    return respuesta_({ ok: true, accion: resultado });
  } catch (err) {
    return respuesta_({ ok: false, error: String(err) });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

/* ===================== BOARD DE MEDICIÓN (recurso=board / tipo:gasto) =====================
   Sirve métricas AGREGADAS (sin PII) leídas de "LEADS - WEB" + la pestaña "GASTO".
   board.html (GitHub Pages) las consume con el mismo patrón que los demás boards.
   Convención de celda densa en GASTO: las campañas van en UNA sola celda,
   "nombre::monto" por línea (para no explotar en filas). */
const BOARD_SECRET = "aurum-board-2026";   // clave para escribir GASTO (cámbiala aquí y en board.html)
const TAB_GASTO = "GASTO";
const HEADERS_GASTO = ["Semana", "Gasto MXN", "Campañas (nombre::monto por línea)", "Actualizado"];

function obtenerHojaGasto_() {
  const ss = SpreadsheetApp.openById(CRM_ID);
  let hoja = ss.getSheetByName(TAB_GASTO);
  if (!hoja) { hoja = ss.insertSheet(TAB_GASTO); hoja.appendRow(HEADERS_GASTO); hoja.setFrozenRows(1); }
  return hoja;
}
function inicioSemana_(d) {                 // lunes 00:00 local de la semana de d
  const x = new Date(d.getTime());
  const day = (x.getDay() + 6) % 7;         // 0 = lunes
  x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - day);
  return x;
}
function etiquetaSemana_(d) {
  return Utilities.formatDate(d, "America/Hermosillo", "Y-'W'ww");
}
function esCita_(estado, sesion) {
  const e = String(estado || "").toUpperCase();
  return String(sesion || "").trim() !== "" ||
    e.indexOf("SESIÓN AGENDADA") >= 0 || e.indexOf("SESION AGENDADA") >= 0 ||
    e.indexOf("QAA") >= 0 || e === "CLIENTE";
}

function construirBoard_() {
  const hoja = obtenerHojaLeads_();
  const headers = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];
  const idx = function (n) { return headers.indexOf(n); };
  const ult = hoja.getLastRow();
  const rows = ult > 1 ? hoja.getRange(2, 1, ult - 1, hoja.getLastColumn()).getValues() : [];
  const get = function (r, n) { const i = idx(n); return i >= 0 ? r[i] : ""; };

  const ahora = new Date();
  const iniAct = inicioSemana_(ahora);
  const iniPrev = new Date(iniAct.getTime() - 7 * 24 * 3600 * 1000);
  const hace24 = new Date(ahora.getTime() - 24 * 3600 * 1000);

  const kpis = { leads: 0, citas: 0, clientes: 0, nuevos_sin_tocar_24h: 0 };
  const prev = { leads: 0, citas: 0, clientes: 0 };
  const tot = { citas: 0, clientes: 0 };
  const porEstado = {}, porFuente = {}, porDia = {}, recientes = [];

  rows.forEach(function (r) {
    const estado = String(get(r, "Estado") || "").trim();
    const sesion = get(r, "Sesión agendada");
    const pcRaw = get(r, "Primer contacto");
    const fpc = (pcRaw instanceof Date) ? pcRaw : (pcRaw ? new Date(pcRaw) : null);
    const fuente = String(get(r, "UTM source") || "").trim() || "(directo)";
    const dia = String(get(r, "Día") || "").trim();
    const cita = esCita_(estado, sesion), cliente = (estado.toUpperCase() === "CLIENTE");

    porEstado[estado || "(sin estado)"] = (porEstado[estado || "(sin estado)"] || 0) + 1;
    if (!porFuente[fuente]) porFuente[fuente] = { leads: 0, citas: 0 };
    porFuente[fuente].leads++; if (cita) porFuente[fuente].citas++;
    if (dia) { if (!porDia[dia]) porDia[dia] = { leads: 0, citas: 0 }; porDia[dia].leads++; if (cita) porDia[dia].citas++; }
    if (cita) tot.citas++; if (cliente) tot.clientes++;

    if (fpc && !isNaN(fpc.getTime())) {
      if (fpc >= iniAct) { kpis.leads++; if (cita) kpis.citas++; if (cliente) kpis.clientes++; }
      else if (fpc >= iniPrev) { prev.leads++; if (cita) prev.citas++; if (cliente) prev.clientes++; }
    }
    if (estado.toUpperCase() === "NUEVO" && fpc && !isNaN(fpc.getTime()) && fpc < hace24) kpis.nuevos_sin_tocar_24h++;
  });

  for (let i = rows.length - 1; i >= Math.max(0, rows.length - 12); i--) {
    const r = rows[i];
    recientes.push({
      folio: String(get(r, "Folio") || ""), estado: String(get(r, "Estado") || ""),
      fuente: String(get(r, "UTM source") || "") || "(directo)",
      dia: String(get(r, "Día") || ""), hora: String(get(r, "Hora") || "")
    });
  }

  // GASTO (pestaña aparte; celda densa de campañas)
  const hg = obtenerHojaGasto_(); const gult = hg.getLastRow();
  const grows = gult > 1 ? hg.getRange(2, 1, gult - 1, Math.max(hg.getLastColumn(), 4)).getValues() : [];
  const etqAct = etiquetaSemana_(ahora);
  let gastoAct = 0, gastoTotal = 0, porCampana = [];
  grows.forEach(function (g) {
    const sem = String(g[0] || "").trim(), monto = Number(g[1]) || 0; gastoTotal += monto;
    if (sem === etqAct) {
      gastoAct = monto;
      porCampana = String(g[2] || "").split("\n").map(function (l) {
        l = l.trim(); if (!l) return null; const p = l.split("::");
        return { campana: (p[0] || "").trim(), monto: Number(p[1]) || 0 };
      }).filter(Boolean);
    }
  });

  const fuenteArr = Object.keys(porFuente).map(function (k) { return { fuente: k, leads: porFuente[k].leads, citas: porFuente[k].citas }; }).sort(function (a, b) { return b.leads - a.leads; });
  const estadoArr = Object.keys(porEstado).map(function (k) { return { estado: k, n: porEstado[k] }; }).sort(function (a, b) { return b.n - a.n; });
  const diaArr = Object.keys(porDia).map(function (k) { return { dia: k, leads: porDia[k].leads, citas: porDia[k].citas }; });

  const alertas = [];
  if (kpis.nuevos_sin_tocar_24h > 0) alertas.push({ tipo: "rojo", texto: kpis.nuevos_sin_tocar_24h + " lead(s) NUEVO sin tocar en +24h (prometiste estimado en <24h)." });
  if (gastoAct === 0) alertas.push({ tipo: "amar", texto: "No hay gasto registrado para la semana " + etqAct + " — el costo por cita no se puede calcular." });
  const totalLeads = rows.length;
  if (totalLeads > 0) {
    const sinUtm = porFuente["(directo)"] ? porFuente["(directo)"].leads : 0;
    if (sinUtm / totalLeads > 0.5) alertas.push({ tipo: "amar", texto: "Más de la mitad de los leads llegan sin etiqueta UTM — pon la plantilla de UTMs en los anuncios de Meta." });
  }
  if (!alertas.length) alertas.push({ tipo: "verde", texto: "Sin focos rojos operativos." });

  return {
    ok: true,
    meta: { actualizado: ahora.toISOString(), periodo: "Semana " + etqAct, semana: etqAct },
    kpis: kpis, prev: prev,
    gasto: { semana_actual: gastoAct, total: gastoTotal, por_campana: porCampana },
    funnel: [{ etapa: "Leads", n: totalLeads }, { etapa: "Citas", n: tot.citas }, { etapa: "Clientes", n: tot.clientes }],
    por_estado: estadoArr, por_fuente: fuenteArr, por_dia: diaArr,
    alertas: alertas, recientes: recientes
  };
}

function guardarGasto_(d) {
  if (String(d.secret || "") !== BOARD_SECRET) return { ok: false, error: "clave incorrecta" };
  const sem = String(d.semana || "").trim();
  if (!sem) return { ok: false, error: "falta la semana" };
  const hoja = obtenerHojaGasto_();
  const ult = hoja.getLastRow();
  let fila = 0;
  if (ult > 1) {
    const sems = hoja.getRange(2, 1, ult - 1, 1).getValues();
    for (let i = 0; i < sems.length; i++) { if (String(sems[i][0] || "").trim() === sem) { fila = i + 2; break; } }
  }
  const valores = [sem, Number(d.monto) || 0, String(d.campanas || ""), new Date()];
  if (fila) { hoja.getRange(fila, 1, 1, valores.length).setValues([valores]); return { ok: true, accion: "actualizado", semana: sem }; }
  hoja.appendRow(valores); return { ok: true, accion: "agregado", semana: sem };
}

/* ===================== LEADS: UPSERT POR EMAIL ===================== */

const HEADERS_LEADS = [
  "Primer contacto", "Última actualización", "Folio", "Nombre", "Email",
  "WhatsApp", "Proyecto", "Estilo", "Sensaciones", "Momentos", "Nivel",
  "Terreno m2", "Personas", "Plantas", "Autos", "Extras",
  "M2 habitables", "M2 totales", "Rango bajo MXN", "Rango alto MXN",
  "Estado", "Brief", "Sesión agendada", "QAA completo",
  "UTM source", "UTM medium", "UTM campaign", "UTM content", "UTM term",
  "fbclid", "Referrer", "Dispositivo", "Hora", "Día",
  "Consentimiento", "Consentimiento fecha", "Versión aviso",
  "Notas", "JSON"
];

function upsertLead_(lead, rawJson) {
  const email = String(lead.email || "").trim().toLowerCase();
  // el endpoint es público: sin email válido no se escribe nada
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return "descartado: email inválido";
  }

  const hoja = obtenerHojaLeads_();
  const headers = hoja.getRange(1, 1, 1, hoja.getLastColumn())
    .getValues()[0];
  const col = function (nombre) {
    const i = headers.indexOf(nombre);
    if (i < 0) throw new Error("Falta columna en LEADS - WEB: " + nombre);
    return i + 1;
  };

  const ahora = new Date();
  const c = lead.calculo || {};
  const datos = {
    "Nombre": lead.nombre || "",
    "Email": email,
    "WhatsApp": lead.tel || "",
    "Proyecto": lead.proyecto || "",
    "Estilo": lead.estilo || "",
    "Sensaciones": (lead.sensaciones || []).join(", "),
    "Momentos": (lead.momentos || []).join(", "),
    "Nivel": lead.nivel || "",
    "Terreno m2": lead.terreno || "",
    "Personas": lead.personas || "",
    "Plantas": lead.plantas || "",
    "Autos": lead.autos || "",
    "Extras": (lead.extras || []).join(", "),
    "M2 habitables": c.m2hab || "",
    "M2 totales": c.total || "",
    "Rango bajo MXN": c.rango ? c.rango[0] : "",
    "Rango alto MXN": c.rango ? c.rango[1] : "",
    "UTM source": lead.utm_source || "",
    "UTM medium": lead.utm_medium || "",
    "UTM campaign": lead.utm_campaign || "",
    "UTM content": lead.utm_content || "",
    "UTM term": lead.utm_term || "",
    "fbclid": lead.fbclid || "",
    "Referrer": lead.referrer || "",
    "Dispositivo": lead.device || "",
    "Hora": lead.hora_local || "",
    "Día": lead.dia_semana_local || "",
    "Consentimiento": lead.consent === true ? "SI" : "",
    "Consentimiento fecha": lead.consent_ts || "",
    "Versión aviso": lead.version_aviso || "",
    "JSON": rawJson
  };

  // buscar renglón existente por email (insensible a mayúsculas/espacios)
  let fila = 0;
  const numFilas = Math.max(hoja.getLastRow() - 1, 1);
  const emails = hoja.getRange(2, col("Email"), numFilas, 1).getValues();
  for (let i = 0; i < emails.length; i++) {
    if (String(emails[i][0]).trim().toLowerCase() === email) {
      fila = i + 2;
      break;
    }
  }

  if (fila) {
    // MISMO RENGLÓN: actualizar datos sin pisar el seguimiento.
    // Una sola lectura + una sola escritura (menos tiempo con el lock).
    const rango = hoja.getRange(fila, 1, 1, headers.length);
    const valores = rango.getValues()[0];
    const set = function (h, v) { valores[col(h) - 1] = v; };
    Object.keys(datos).forEach(function (k) { set(k, safe_(datos[k])); });
    set("Última actualización", ahora);
    if (!valores[col("Estado") - 1]) set("Estado", "NUEVO");
    const folioActual = valores[col("Folio") - 1];
    if (!folioActual) {
      set("Folio", safe_(lead.folio || ""));
    } else if (lead.folio && folioActual !== lead.folio) {
      const previa = valores[col("Notas") - 1];
      const fecha = Utilities.formatDate(
        ahora, Session.getScriptTimeZone(), "yyyy-MM-dd");
      set("Notas", safe_((previa ? previa + " | " : "") +
        "Re-envío web " + fecha + " (folio " + lead.folio + ")"));
    }
    rango.setValues([valores]);
    return "actualizado renglón " + fila;
  }

  // cliente nuevo
  const filaNueva = headers.map(function (h) {
    if (h === "Primer contacto" || h === "Última actualización") {
      return ahora;
    }
    if (h === "Folio") return safe_(lead.folio || "");
    if (h === "Estado") return "NUEVO";
    return (h in datos) ? safe_(datos[h]) : "";
  });
  hoja.appendRow(filaNueva);
  return "creado renglón " + hoja.getLastRow();
}

/* ============ SEGUIMIENTO DESDE LA TAREA DIARIA (tipo:"estado") ============
   La tarea de las 8 AM marca el avance del cliente en su renglón. Reglas:
   · token obligatorio (TOKEN_TAREA) — el endpoint es público.
   · El Estado solo AVANZA en el ciclo de vida; nunca retrocede.
   · CLIENTE y DESCARTADO son intocables (los gestiona Alejandro a mano).
   · Las fechas (Brief / Sesión agendada / QAA completo) solo se escriben
     si la celda está vacía: la primera fecha real se conserva.
   · La nota se AGREGA al final de Notas, nunca la sustituye. */
const RANGO_ESTADO = {
  "NUEVO": 1, "BRIEF CREADO": 2, "SESIÓN AGENDADA": 3,
  "QAA COMPLETO": 4, "CLIENTE": 5, "DESCARTADO": 5
};

function marcarEstado_(d) {
  if (String(d.token || "") !== TOKEN_TAREA) {
    return { ok: false, error: "token inválido" };
  }
  const email = String(d.email || "").trim().toLowerCase();
  if (!email) return { ok: false, error: "falta email" };

  const hoja = obtenerHojaLeads_();
  const headers = hoja.getRange(1, 1, 1, hoja.getLastColumn())
    .getValues()[0];
  const col = function (nombre) {
    const i = headers.indexOf(nombre);
    if (i < 0) throw new Error("Falta columna en LEADS - WEB: " + nombre);
    return i + 1;
  };

  let fila = 0;
  const numFilas = Math.max(hoja.getLastRow() - 1, 1);
  const emails = hoja.getRange(2, col("Email"), numFilas, 1).getValues();
  for (let i = 0; i < emails.length; i++) {
    if (String(emails[i][0]).trim().toLowerCase() === email) {
      fila = i + 2;
      break;
    }
  }
  if (!fila) {
    return { ok: false, error: "email no encontrado en " + TAB_LEADS };
  }

  const rango = hoja.getRange(fila, 1, 1, headers.length);
  const valores = rango.getValues()[0];
  const set = function (h, v) { valores[col(h) - 1] = safe_(v); };
  const cambios = [];

  const actual = String(valores[col("Estado") - 1] || "")
    .trim().toUpperCase();
  const nuevo = String(d.estado || "").trim().toUpperCase();
  if (nuevo) {
    if (!(nuevo in RANGO_ESTADO)) {
      return { ok: false, error: "estado desconocido: " + nuevo };
    }
    const intocable = actual === "CLIENTE" || actual === "DESCARTADO";
    if (!intocable && (RANGO_ESTADO[nuevo] > (RANGO_ESTADO[actual] || 0))) {
      set("Estado", nuevo);
      cambios.push("Estado→" + nuevo);
    }
  }

  // fechas de hito: solo la primera vez (celda vacía)
  const hitos = [["Brief", d.brief], ["Sesión agendada", d.sesion],
                 ["QAA completo", d.qaa]];
  hitos.forEach(function (h) {
    const v = h[1] == null ? "" : String(h[1]).trim();
    if (v && !String(valores[col(h[0]) - 1] || "").trim()) {
      set(h[0], v);
      cambios.push(h[0] + "→" + v);
    }
  });

  const nota = d.nota == null ? "" : String(d.nota).trim();
  if (nota) {
    const previa = String(valores[col("Notas") - 1] || "").trim()
      .replace(/^'/, "");
    set("Notas", (previa ? previa + " | " : "") + nota);
    cambios.push("nota agregada");
  }

  if (!cambios.length) {
    return { ok: true, accion: "sin cambios (renglón " + fila + ")" };
  }
  valores[col("Última actualización") - 1] = new Date();
  rango.setValues([valores]);
  return {
    ok: true,
    accion: "seguimiento renglón " + fila + ": " + cambios.join(", ")
  };
}

/* El endpoint es público: setValue/appendRow interpretan "=...", "+...",
   etc. como fórmula (riesgo de exfiltración del CRM). El apóstrofo
   fuerza texto. */
function safe_(v) {
  if (v instanceof Date || typeof v === "number" || typeof v === "boolean") {
    return v;
  }
  const s = String(v);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

function obtenerHojaLeads_() {
  const ss = SpreadsheetApp.openById(CRM_ID);
  let hoja = ss.getSheetByName(TAB_LEADS);
  if (hoja) {
    // pestaña de una versión anterior del webhook: se conserva renombrada
    const nCols = Math.max(hoja.getLastColumn(), 1);
    const hd = hoja.getRange(1, 1, 1, nCols).getValues()[0];
    if (hd.indexOf("Primer contacto") < 0) {
      let nombre = TAB_LEADS + " (anterior)", i = 2;
      while (ss.getSheetByName(nombre)) {
        nombre = TAB_LEADS + " (anterior " + i + ")";
        i++;
      }
      hoja.setName(nombre);
      hoja = null;
    }
  }
  if (!hoja) {
    hoja = ss.insertSheet(TAB_LEADS);
    hoja.appendRow(HEADERS_LEADS);
    hoja.setFrozenRows(1);
  }
  // Auto-migración idempotente (F1.2, Opción A): agrega al final las columnas
  // de HEADERS_LEADS que falten. Así, al publicar una versión nueva del webhook,
  // las columnas nuevas (UTM, fbclid, dispositivo, consentimiento…) aparecen
  // solas y col() nunca falla ni tira leads. No reordena ni borra nada.
  try {
    const ncol = Math.max(hoja.getLastColumn(), 1);
    const hdr = hoja.getRange(1, 1, 1, ncol).getValues()[0];
    const faltan = HEADERS_LEADS.filter(function (h) { return hdr.indexOf(h) < 0; });
    if (faltan.length) {
      hoja.getRange(1, ncol + 1, 1, faltan.length).setValues([faltan]);
    }
  } catch (e) {}
  return hoja;
}

/* ============== CATÁLOGO: LEÍDO DE LAS HOJAS DE ALEJANDRO ============== */

function construirCatalogo_() {
  const ss = SpreadsheetApp.openById(CATALOGO_SHEET_ID);

  const hojaEsp = ss.getSheetByName(HOJA_ESPACIOS);
  if (!hojaEsp) throw new Error("No existe la pestaña " + HOJA_ESPACIOS);
  const resEsp = parsearEspacios_(hojaEsp.getDataRange().getValues());

  const hojaAna = ss.getSheetByName(HOJA_ANALISIS);
  if (!hojaAna) throw new Error("No existe la pestaña " + HOJA_ANALISIS);
  const precios = parsearPrecios_(hojaAna.getDataRange().getValues());

  const hoy = Utilities.formatDate(
    new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  const meta = {
    version: "sheet-live",
    fecha: hoy,
    fuente: "Au : Residencia Nueva → " + HOJA_ESPACIOS +
      " (espacios) + " + HOJA_ANALISIS + " (precios)",
    descripcion: "Catálogo oficial Aurum. Los m² de cada espacio " +
      "vienen de la hoja de Alejandro, NUNCA se inventan. Los " +
      "sub-espacios 'extra' se suman automáticamente al m² del " +
      "espacio padre cuando éste se selecciona.",
    notas: {
      circulacion: "Sumar +" + Math.round(CIRCULACION * 100) + "% de " +
        "Circulaciones y grosor de muros sobre el subtotal de m² " +
        "habitables (regla 2026-06-11; sustituye a 'NO aplicar " +
        "circulación'). Línea visible del programa y ENTRA a la base de " +
        "cotización de los 3 servicios. Pendiente % final de Mariana.",
      cotizacion: "Entran a la base de cotización los m² habitables MÁS " +
        "la circulación. Los espacios con habitable=false se muestran en " +
        "el brief como referencia informativa pero no cotizan."
    }
  };
  if (resEsp.advertencias.length) meta.advertencias = resEsp.advertencias;

  return {
    _meta: meta,
    espacios: resEsp.espacios,
    heuristica_pre_seleccion: HEURISTICA,
    cotizacion_2026: {
      precios_mxn_por_m2: {
        llave_en_mano: precios.llave_en_mano,
        proyecto_ejecutivo: precios.proyecto_ejecutivo,
        diseno_arquitectonico: precios.diseno_arquitectonico
      },
      multiplicador_lujo: MULTIPLICADOR_LUJO,
      circulacion: CIRCULACION,
      base_de_cotizacion: "m² habitables + " +
        Math.round(CIRCULACION * 100) + "% de circulación. Los espacios " +
        "con habitable=false se muestran en el brief pero NO entran en " +
        "la multiplicación."
    },
    app: {
      banda_estimacion_baja: BANDA.baja,
      banda_estimacion_alta: BANDA.alta,
      circulacion: CIRCULACION,
      cochera_m2_por_auto: resEsp.cocheraM2PorAuto
    }
  };
}

/* Lee los bloques de VIVIENDA NUEVA tal como están:
     fila N   : col A = etiqueta, B/C/D = medidas (3X4...), G = extra
     fila N+1 : B/C/D = m² (chico/mediano/grande)
     fila N+2 : checkboxes del proyecto en curso (se ignoran)
   Función pura (recibe la matriz de valores) para poder probarla. */
function parsearEspacios_(vals) {
  const norm = function (s) {
    return String(s || "").replace(/\s+/g, " ").trim().toUpperCase();
  };

  // localizar el encabezado "TAMAÑO (M2)" en col A
  let inicio = -1;
  for (let r = 0; r < vals.length; r++) {
    if (norm(vals[r][0]) === "TAMAÑO (M2)") { inicio = r + 1; break; }
  }
  if (inicio < 0) {
    throw new Error('No encontré el encabezado "TAMAÑO (M2)" en ' +
      HOJA_ESPACIOS);
  }

  const espacios = {};
  const advertencias = [];
  let cocheraM2PorAuto = 0;

  for (let r = inicio; r < vals.length - 1; r++) {
    const etiqueta = norm(vals[r][0]);
    if (!etiqueta) continue;
    const fm2 = vals[r + 1];
    const m2 = [fm2[1], fm2[2], fm2[3]];
    if (!esNum_(m2[0]) || !esNum_(m2[1]) || !esNum_(m2[2])) {
      advertencias.push("Bloque '" + etiqueta + "' sin m² numéricos " +
        "debajo (fila " + (r + 2) + "); se omitió");
      continue;
    }
    let clave = ETIQUETAS[etiqueta];
    if (!clave) {
      clave = etiqueta.toLowerCase()
        .replace(/[áàä]/g, "a").replace(/[éèë]/g, "e")
        .replace(/[íìï]/g, "i").replace(/[óòö]/g, "o")
        .replace(/[úùü]/g, "u").replace(/ñ/g, "n")
        .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
      advertencias.push("Espacio nuevo en la hoja sin mapeo: '" +
        etiqueta + "' → clave '" + clave + "' (habitable=false por " +
        "default; avisar a Claude para mapearlo)");
    }
    const esp = {
      nombre_display: NOMBRES[clave] || String(vals[r][0]).trim(),
      habitable: !(clave in NO_HABITABLES) && (clave in NOMBRES)
    };
    if (clave === "cochera") esp.unidad = "vehículos";
    const tams = ["chico", "mediano", "grande"];
    for (let t = 0; t < 3; t++) {
      const tam = {
        dim: String(vals[r][1 + t] == null ? "" : vals[r][1 + t]).trim(),
        m2: numero_(m2[t], etiqueta + " → m2 " + tams[t])
      };
      const ex = (EXTRAS_M2[clave] || {})[tams[t]];
      if (ex) tam.extras = ex;
      esp[tams[t]] = tam;
    }
    espacios[clave] = esp;

    // m² lineales por auto para la web: m² chico / vehículos chico
    if (clave === "cochera" && esNum_(vals[r][1]) &&
        Number(vals[r][1]) > 0) {
      cocheraM2PorAuto = Number(m2[0]) / Number(vals[r][1]);
    }
    r += 2; // saltar la fila de m² y la de checkboxes
  }

  if (Object.keys(espacios).length === 0) {
    throw new Error("No se encontró ningún bloque de espacio en " +
      HOJA_ESPACIOS);
  }
  if (!cocheraM2PorAuto) cocheraM2PorAuto = 18; // respaldo (36 m²/2 veh)
  return {
    espacios: espacios,
    advertencias: advertencias,
    cocheraM2PorAuto: cocheraM2PorAuto
  };
}

/* Lee los precios de ANÁLISIS OBRA NUEVA tal como están:
     · llave_en_mano: el número a la IZQUIERDA de la celda
       "COSTO POR M2 DE OBRA" (tu selector con checkboxes ya resuelto).
     · diseño/ejecutivo: la tabla PROYECTO ARQUITECTÓNICO por etapas
       (col B = letra, col C = trabajo, col D = $/m², col E = palomita):
       diseño = suma etapa 1 (letras A-E con palomita),
       ejecutivo = etapa 1 + etapa 2 (F-I con palomita).
   Función pura para poder probarla. */
function parsearPrecios_(vals) {
  const norm = function (s) {
    return String(s || "").replace(/\s+/g, " ").trim().toUpperCase();
  };

  // --- costo por m² de obra (selector) ---
  let llave = 0;
  for (let r = 0; r < vals.length; r++) {
    for (let c = 1; c < vals[r].length; c++) {
      if (norm(vals[r][c]) === "COSTO POR M2 DE OBRA") {
        llave = numero_(vals[r][c - 1],
          'celda a la izquierda de "COSTO POR M2 DE OBRA"');
      }
    }
  }
  if (!llave) {
    throw new Error('No encontré "COSTO POR M2 DE OBRA" en ' +
      HOJA_ANALISIS);
  }

  // --- etapas del proyecto arquitectónico ---
  let filaProy = -1;
  for (let r = 0; r < vals.length; r++) {
    if (norm(vals[r][1]) === "PROYECTO ARQUITECTÓNICO") {
      filaProy = r;
      break;
    }
  }
  if (filaProy < 0) {
    throw new Error('No encontré "PROYECTO ARQUITECTÓNICO" en ' +
      HOJA_ANALISIS);
  }
  let etapa1 = 0, etapa2 = 0, vistas = 0;
  const tope = Math.min(filaProy + 30, vals.length);
  for (let r = filaProy + 1; r < tope; r++) {
    const letra = norm(vals[r][1]);
    if (!/^[A-K]$/.test(letra)) continue;
    const monto = vals[r][3];
    const activo = vals[r][4] === true || norm(vals[r][4]) === "TRUE";
    if (!esNum_(monto)) continue;
    vistas++;
    if (!activo) continue;
    if (letra >= "A" && letra <= "E") etapa1 += Number(monto);
    else if (letra >= "F" && letra <= "I") etapa2 += Number(monto);
    // J, K (gestoría/interiores) no entran al $/m² del proyecto
  }
  if (!vistas) {
    throw new Error("No encontré las etapas (letras A-I) del " +
      "PROYECTO ARQUITECTÓNICO en " + HOJA_ANALISIS);
  }
  if (etapa1 <= 0) {
    throw new Error("La etapa 1 del PROYECTO ARQUITECTÓNICO suma 0 " +
      "(¿quitaste todas las palomitas?)");
  }

  return {
    llave_en_mano: llave,
    diseno_arquitectonico: etapa1,
    proyecto_ejecutivo: etapa1 + etapa2
  };
}

function esNum_(v) {
  const s = String(v == null ? "" : v).trim();
  return s !== "" && !isNaN(Number(s));
}

/* Número estricto: rechaza vacío, no-numérico y <=0. Una celda borrada
   en la hoja NUNCA debe volverse 0 en silencio en una cotización. */
function numero_(celda, contexto) {
  const s = String(celda == null ? "" : celda).trim();
  const n = Number(s);
  if (!s || isNaN(n) || n <= 0) {
    throw new Error("Valor numérico inválido o vacío en " +
      contexto + ": '" + celda + "'");
  }
  return n;
}

/* Regenera aurum-catalogo.json en Drive desde las hojas (lo que lee
   la tarea diaria de las 8 AM). Se agenda con instalarTriggers(). */
function actualizarCatalogoDriveJson() {
  const cat = construirCatalogo_();
  DriveApp.getFileById(CATALOGO_JSON_DRIVE_ID)
    .setContent(JSON.stringify(cat, null, 2));
}

function instalarTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "actualizarCatalogoDriveJson") {
      ScriptApp.deleteTrigger(t);
    }
  });
  // atHour(5) dispara en la franja 5:00-6:00 según la zona horaria del
  // proyecto: margen amplio antes de la tarea de las 8 AM.
  ScriptApp.newTrigger("actualizarCatalogoDriveJson")
    .timeBased().everyDays(1).atHour(5).create();
}

/* Borra las pestañas CATALOGO_APP y PRECIOS_APP que sembró la versión
   anterior del script (ya no se usan: ahora se lee directo de las
   hojas de Alejandro). Ejecutar una sola vez; si no existen, no pasa
   nada. */
function borrarPestanasApp() {
  const ss = SpreadsheetApp.openById(CATALOGO_SHEET_ID);
  ["CATALOGO_APP", "PRECIOS_APP"].forEach(function (n) {
    const hoja = ss.getSheetByName(n);
    if (hoja) ss.deleteSheet(hoja);
  });
}

/* ============== TEXTOS DE LA WEB (pestaña clave / valor) ==============
   Toda la copy de index.html vive aquí para que Alejandro la edite sin
   tocar código. La web pide GET ?recurso=textos al cargar y aplica lo que
   encuentre sobre su respaldo embebido. Claves con sufijo numérico sirven
   a listas (estilo_1_nombre, sensacion_1, momento_1, nivel_1_nombre...).
   En títulos se permite <em>...</em> (acento dorado) y <b>...</b>.
   Plantillas {nombre}/{nivel}/{diseno}: el texto entre llaves se sustituye
   en vivo, NO lo borres. */
const TEXTOS_SEMILLA = [
  ["doc_titulo", "Cuestionario de Arquitectura de Autor · Aurum Arquitectos", "Título de la pestaña del navegador"],
  ["marca_nombre", "AURUM", "Logo: línea 1"],
  ["marca_sub", "ARQUITECTOS", "Logo: línea 2"],
  ["marca_tagline", "Arquitectura con alma", "Logo: lema (déjalo vacío para ocultarlo)"],
  ["logo_url", "https://drive.google.com/thumbnail?id=1gYNcDPQ8ByeS5X6qv0Qb7npCZ0IX9oQG&sz=w200", "URL del logo (ícono Au de Aurum). Cámbialo por otro PNG/SVG o link Drive thumbnail?id=... cuando quieras"],
  ["cta_agenda_url", "https://calendar.google.com/calendar/appointments/schedules/AcZssZ1Ya91w0DLmmmNiykdwgq3KBlb_r1AvOQ8TThFxhjJSq44pbK43hRZQylYvS1LScMTKn0sJejdp?gv=true", "Tu página de citas de Google Calendar. Puedes pegar el LINK o el código <iframe> completo — el sistema extrae el link solo"],
  ["cta_agenda_label", "Agendar mi sesión →", "Texto del botón de agenda"],

  ["p0_kicker", "Hermosillo, Sonora · Residencias de autor", "Portada: antetítulo"],
  ["p0_titulo", "El <em>Cuestionario de Arquitectura de Autor</em> en 90 segundos.", "Portada: título (admite <em>)"],
  ["p0_sub3", "Sin formularios eternos. Elige lo que te gusta con un click, descubre el rango de inversión de tu residencia y recibe en tu correo tus metros, preparados por un arquitecto. Gratis y sin compromiso.", "Portada: subtítulo (v3 — rango en pantalla, metros por correo)"],
  ["p0_btn", "Comenzar mi diseño →", "Portada: botón"],
  ["p0_prueba", "+75 familias ya diseñaron su residencia con este proceso.", "Portada: prueba social"],

  ["p1_kicker", "01 · Tu estilo", "Paso 1: antetítulo"],
  ["p1_titulo", "¿Cuál de estas fachadas se siente más <em>tuya</em>?", "Paso 1: título"],
  ["p1_sub", "No pienses, siente. Elige una.", "Paso 1: subtítulo"],
  ["p2_kicker", "02 · La sensación", "Paso 2: antetítulo"],
  ["p2_titulo", "Al llegar a casa, ¿cómo quieres <em>sentirte</em>?", "Paso 2: título"],
  ["p2_sub", "Elige hasta 3.", "Paso 2: subtítulo"],
  ["p2_btn", "Continuar →", "Paso 2: botón"],
  ["p3_kicker", "03 · Tu vida diaria", "Paso 3: antetítulo"],
  ["p3_titulo", "¿Dónde transcurren tus mejores <em>momentos</em>?", "Paso 3: título"],
  ["p3_sub", "Selecciona todos los que apliquen. Esto define los espacios de tu programa.", "Paso 3: subtítulo"],
  ["p3_btn", "Continuar →", "Paso 3: botón"],
  ["p4_kicker", "04 · El carácter", "Paso 4: antetítulo"],
  ["car_titulo", "¿Con cuál de estos caracteres <em>conectas</em>?", "Paso 4 (v2): título — sin jerarquía"],
  ["car_sub", "No hay uno mejor que otro: elige el que se sienta tuyo, el que se parece a cómo quieres vivir.", "Paso 4 (v2): subtítulo"],
  ["p5_kicker", "05 · Lo esencial", "Paso 5: antetítulo"],
  ["p5_titulo", "Cuatro datos y tu residencia toma <em>forma</em>.", "Paso 5: título"],
  ["p5_sub", "Observa la barra inferior: tu proyecto ya está construyéndose.", "Paso 5: subtítulo"],
  ["p5_terreno_lab", "Terreno", "Paso 5: etiqueta terreno"],
  ["p5_terreno_sub", "Superficie aproximada", "Paso 5: ayuda terreno"],
  ["p5_hogar_lab", "Quiénes vivirán aquí", "Paso 5 (v2): etiqueta del constructor de hogar"],
  ["p5_hogar_sub", "Cuéntanos de cada integrante — solo a golpe de click", "Paso 5 (v2): ayuda del constructor"],
  ["atajo_solo", "Vivo solo", "Constructor: atajo 1"],
  ["atajo_pareja", "En pareja", "Constructor: atajo 2"],
  ["atajo_familia", "Familia con hijos", "Constructor: atajo 3"],
  ["et_adulto", "Adulto", "Constructor: etapa adulto"],
  ["et_adolescente", "Adolescente", "Constructor: etapa adolescente"],
  ["et_nino", "Niño", "Constructor: etapa niño"],
  ["tg_propia", "Recámara propia", "Constructor: opción recámara propia"],
  ["tg_comparte", "Comparte", "Constructor: opción comparte recámara"],
  ["hogar_resumen_tpl", "{p} personas · {r} recámaras", "Constructor: resumen en vivo. {p} y {r} se rellenan solos"],
  ["p5_plantas_lab", "Plantas", "Paso 5: etiqueta plantas"],
  ["p5_plantas_sub", "Niveles de la residencia", "Paso 5: ayuda plantas"],
  ["p5_autos_lab", "Vehículos", "Paso 5: etiqueta vehículos"],
  ["p5_autos_sub", "Cajones de cochera", "Paso 5: ayuda vehículos"],
  ["p5_btn", "Continuar →", "Paso 5: botón"],
  ["p6_kicker", "06 · Los sueños", "Paso 6: antetítulo"],
  ["p6_titulo", "¿Qué espacios harían tu casa <em>inolvidable</em>?", "Paso 6: título"],
  ["p6_sub", "Cada uno suma m² reales de nuestro catálogo. Agrega o quita y mira cómo cambia tu proyecto abajo.", "Paso 6: subtítulo"],
  ["p6_btn", "Ver mi residencia →", "Paso 6: botón"],
  ["btn_atras", "← Atrás", "Botón Atrás (todas las pantallas)"],

  ["gate_kicker", "Tu residencia está lista", "Captura de datos: antetítulo"],
  ["gate_titulo", "Hemos calculado tu proyecto con el <em>catálogo oficial Aurum</em>.", "Captura: título"],
  ["gate_sub3", "Dinos a dónde enviamos tu estimado y ve tu rango de inversión al instante. Tus metros, revisados por un arquitecto, llegan a tu correo en menos de 24 horas.", "Captura (v3): subtítulo — rango al instante, metros por correo"],
  ["gate_ph_nombre", "Tu nombre", "Captura: placeholder nombre"],
  ["gate_ph_email", "Tu correo", "Captura: placeholder correo"],
  ["gate_ph_tel", "WhatsApp (opcional)", "Captura: placeholder WhatsApp"],
  ["gate_ph_proyecto", "¿Cómo llamamos a tu proyecto? (opcional)", "Captura: placeholder proyecto"],
  ["gate_btn3", "Ver mi rango y agendar →", "Captura (v3): botón"],
  ["gate_candado", "🔒 Tus datos solo se usan para enviarte tu estimación. Cero spam.", "Captura: aviso de privacidad"],
  ["aviso_consentimiento", "Al continuar, aceptas nuestro <a href=\"aviso-privacidad.html\" target=\"_blank\" rel=\"noopener\">Aviso de Privacidad</a>.", "Captura: línea de consentimiento (LFPDPPP)"],
  ["aviso_url", "aviso-privacidad.html", "Ruta del Aviso de Privacidad"],
  ["version_aviso", "2026-06-17", "Versión del aviso vigente (viaja al CRM con el lead)"],
  ["gate_msg_error", "Necesitamos tu nombre y un correo válido para enviarte tu estimado.", "Captura: mensaje de validación"],

  ["r2_kicker", "Tu residencia tiene forma", "Cierre (v3): antetítulo de la franja negra"],
  ["r_lab_esp", "Espacios diseñados", "Cierre (v3): etiqueta stat 1"],
  ["r_lab_rec", "Recámaras", "Cierre: etiqueta stat 2"],
  ["r_lab_caracter", "Carácter", "Cierre: etiqueta stat 3"],
  ["r3_titulo_tpl", "{nombre}, tu residencia ya tiene un punto de partida.", "Cierre (v3): título. SIN cifras — solo el nombre"],
  ["r2_resumen_tpl", "Tu residencia <em>{caracter}</em>, estilo {estilo}, {recamaras} recámaras{extras}.", "Cierre: resumen cualitativo de lo que eligió. NO borrar las llaves"],
  ["r2_resumen_extras_tpl", ", con {lista}", "Cierre: cómo se agregan los extras al resumen"],
  ["r3_pasos_kicker", "Qué sigue", "Cierre (v3): antetítulo de los 2 pasos"],
  ["r3_correo_promesa", "En menos de 24 horas llega a tu correo tu estimado preparado por un arquitecto Aurum: <b>tus metros habitables y tu rango de inversión</b>, calculados sobre tus respuestas. Lo revisa una persona, no un algoritmo — por eso tarda horas y no segundos. Va a tu nombre, con tu folio.", "Cierre (v3): paso 1 — qué llega por correo (los números van AQUÍ, no en pantalla)"],
  ["r3_sesion_linea", "Y lo que no cabe en un correo se construye contigo, en vivo, en tu <b>Sesión de Diseño</b>: tu presupuesto afinado, las cantidades de tu proyecto y la Guía Aurum de las Necesidades de tu Hogar.", "Cierre (v3): paso 2 — qué pasa en la sesión"],
  ["r3_correo_nota", "No publicamos precios genéricos porque ninguna residencia de autor lo es: tu rango nació de tus respuestas. Sin compromiso, siempre.", "Cierre (v3): nota anti-objeción"],

  ["sesion_titulo", "El siguiente paso: tu Sesión de Diseño", "Cierre: título de la sesión"],
  ["ses3_b1", "Sales con tu <b>estimado de presupuesto</b>, afinado en vivo: en qué punto de tu rango cae tu residencia y por qué", "Cierre (v3): beneficio 1"],
  ["ses3_b2", "Las <b>cantidades de tu proyecto</b>: cada espacio de tu programa, con sus medidas", "Cierre (v3): beneficio 2"],
  ["ses3_b3", "Tu <b>Guía Aurum de las Necesidades de tu Hogar</b>, completa y a tu nombre — te sirve incluso si construyes con alguien más", "Cierre (v3): beneficio 3"],
  ["ses3_b4", "45 minutos en videollamada con un arquitecto Aurum, con referencias reales del estilo que elegiste", "Cierre (v3): beneficio 4"],
  ["sesion_valor_tachado", "Valor $4,800 MXN", "Cierre: precio tachado"],
  ["sesion_gratis", "Sin costo y sin compromiso", "Cierre: 'gratis'"],
  ["r2_agenda_intro", "<b>Reserva tu Sesión de Diseño aquí mismo</b> — elige el día y la hora que te queden mejor. Confirmación inmediata.", "Cierre: intro del calendario embebido"],
  ["r3_post_agenda", "¿Listo? Revisa tu correo: la invitación con tu enlace de videollamada ya va en camino — y mañana te llega tu estimado revisado.", "Cierre (v3): cierre bajo el calendario"],
  ["r2_reaseguro", "Videollamada de 45 min · sin compromiso · puedes reagendar. Recibirás la invitación con el enlace de la videollamada en tu correo.", "Cierre: reaseguros bajo el calendario"],
  ["r2_fallback", "Abrir la agenda en otra pestaña", "Cierre: link de respaldo (escritorio)"],
  ["agenda_btn_movil", "Elegir el día y la hora de mi sesión →", "Cierre (v3 móvil): botón que abre la página de citas de Google a pantalla completa (en celular el iframe se corta, por eso se usa botón)"],
  ["agenda_p1", "Toca el botón y elige el día y la hora que te queden mejor.", "Cierre (v3 móvil): paso 1"],
  ["agenda_p2", "Confirma con tu correo — toma 20 segundos.", "Cierre (v3 móvil): paso 2"],
  ["agenda_p3", "Recibes al instante la invitación con el enlace de tu videollamada.", "Cierre (v3 móvil): paso 3"],
  ["sticky_btn", "Elegir mi horario ↓", "Cierre (escritorio): botón fijo inferior que baja al calendario"],
  ["sesion_nota", "Agenda limitada: abrimos pocas sesiones por semana para darle a cada proyecto la atención que merece.", "Cierre: nota de escasez"],
  ["r2_prueba", "+75 familias ya diseñaron su residencia con este proceso.", "Cierre: prueba social"],

  ["lb_lab_residencia", "Tu residencia", "Barra inferior: etiqueta izquierda"],
  ["lb_lab_recamaras", "Recámaras", "Barra inferior (v3): etiqueta derecha"],
  ["lb_esp_tpl", "{n} espacios", "Barra inferior (v3): texto izquierdo. {n} = nº de espacios, se rellena solo"],

  ["estilo_1_nombre", "Contemporáneo puro", "Estilo 1 (fachada Antonieta): nombre"],
  ["estilo_1_desc", "Líneas limpias, volúmenes francos, concreto y cristal.", "Estilo 1: descripción"],
  ["estilo_2_nombre", "Moderno cálido", "Estilo 2 (fachada Alysa): nombre"],
  ["estilo_2_desc", "Madera, celosías y luz; modernidad que abraza.", "Estilo 2: descripción"],
  ["estilo_3_nombre", "Minimalista", "Estilo 3 (fachada María): nombre"],
  ["estilo_3_desc", "Menos, pero perfecto. Silencio material.", "Estilo 3: descripción"],
  ["estilo_4_nombre", "Mediterráneo contemporáneo", "Estilo 4 (fachada Zara): nombre"],
  ["estilo_4_desc", "Muros encalados, arcos suaves, vida al exterior.", "Estilo 4: descripción"],
  ["estilo_5_nombre", "Industrial sobrio", "Estilo 5 (fachada Barcelona): nombre"],
  ["estilo_5_desc", "Acero, piedra y carácter sin disculpas.", "Estilo 5: descripción"],
  ["estilo_6_nombre", "Clásico atemporal", "Estilo 6 (fachada Rita): nombre"],
  ["estilo_6_desc", "Proporción, simetría y elegancia que no caduca.", "Estilo 6: descripción"],

  ["sensacion_1", "Paz", "Sensación 1"],
  ["sensacion_2", "Orgullo", "Sensación 2"],
  ["sensacion_3", "Calidez", "Sensación 3"],
  ["sensacion_4", "Asombro", "Sensación 4"],
  ["sensacion_5", "Libertad", "Sensación 5"],
  ["sensacion_6", "Intimidad", "Sensación 6"],
  ["sensacion_7", "Grandeza", "Sensación 7"],
  ["sensacion_8", "Frescura", "Sensación 8"],

  ["momento_1", "Tardes en la terraza", "Momento 1 (suma Terraza + Asador)"],
  ["momento_2", "Cocinar en familia", "Momento 2"],
  ["momento_3", "Recibir invitados", "Momento 3 (suma Bar)"],
  ["momento_4", "Trabajar desde casa", "Momento 4 (suma Estudio)"],
  ["momento_5", "Entrenar", "Momento 5 (suma Cuarto de Juegos / Gym)"],
  ["momento_6", "Noches de película", "Momento 6 (suma Sala TV)"],
  ["momento_7", "Leer en silencio", "Momento 7 (suma Biblioteca)"],
  ["momento_8", "Nadar y asolearse", "Momento 8 (suma Alberca)"],

  ["caracter_1_nombre", "Serena", "Carácter 1 (interno: Acogedora): nombre — son 4 caracteres LATERALES, ninguno es 'más' que otro"],
  ["caracter_1_desc", "Cálida y envolvente. Pocos materiales, mucha intimidad.", "Carácter 1: descripción"],
  ["caracter_1_mood", "calma", "Carácter 1: palabra-atmósfera (en oro, arriba del nombre)"],
  ["caracter_2_nombre", "Sobria", "Carácter 2 (interno: Elegante): nombre"],
  ["caracter_2_desc", "Materiales nobles y luz medida. Calma con presencia.", "Carácter 2: descripción"],
  ["caracter_2_mood", "presencia", "Carácter 2: palabra-atmósfera"],
  ["caracter_3_nombre", "Cálida", "Carácter 3 (interno: Casual): nombre"],
  ["caracter_3_desc", "Clara y sin excesos. Lo necesario, muy bien resuelto.", "Carácter 3: descripción"],
  ["caracter_3_mood", "calidez", "Carácter 3: palabra-atmósfera"],
  ["caracter_4_nombre", "De autor", "Carácter 4 (interno: Lujo): nombre"],
  ["caracter_4_desc", "Una pieza única: cada vista, una postal.", "Carácter 4: descripción"],
  ["caracter_4_mood", "distinción", "Carácter 4: palabra-atmósfera"]
];

const HEADERS_TEXTOS = ["clave", "valor", "nota (no se usa en la web)"];

/* Lee TEXTOS WEB y devuelve { clave: valor }. Si la pestaña no existe o
   está vacía, devuelve {} y la web se queda con su respaldo embebido. */
function leerTextos_() {
  const ss = SpreadsheetApp.openById(CRM_ID);
  const hoja = ss.getSheetByName(TAB_TEXTOS);
  if (!hoja || hoja.getLastRow() < 2) return {};
  const vals = hoja.getRange(2, 1, hoja.getLastRow() - 1, 2).getValues();
  const out = {};
  vals.forEach(function (fila) {
    const clave = String(fila[0] == null ? "" : fila[0]).trim();
    if (!clave || clave.charAt(0) === "#") return; // # = comentario
    const valor = fila[1] == null ? "" : String(fila[1]);
    out[clave] = valor;
  });
  // a prueba de pegados: si Alejandro pega el código <iframe> completo de
  // Google Calendar en cta_agenda_url, aquí se extrae el link limpio
  if (out.cta_agenda_url) {
    out.cta_agenda_url = limpiarUrlAgenda_(out.cta_agenda_url);
  }
  return out;
}

/* Acepta el LINK de la página de citas O el snippet <iframe ...> completo
   que da Google Calendar; devuelve siempre la URL limpia con ?gv=true
   (sin gv=true, Calendar rechaza cargar embebido en otra página). */
function limpiarUrlAgenda_(v) {
  let u = String(v == null ? "" : v).trim();
  const m = u.match(/src\s*=\s*["']([^"']+)["']/i);
  if (m) u = m[1];
  u = u.replace(/&amp;/g, "&").trim();
  if (u && u.indexOf("calendar.google.com") >= 0 &&
      u.indexOf("gv=true") < 0) {
    u += (u.indexOf("?") >= 0 ? "&" : "?") + "gv=true";
  }
  return u;
}

/* Crea la pestaña TEXTOS WEB (si no existe) y la rellena con los textos
   por defecto. NO pisa lo que Alejandro ya haya editado: solo agrega las
   claves que falten. Ejecútala una vez tras desplegar; repetirla es seguro
   (rellena huecos y restaura la columna de notas). */
function sembrarTextos() {
  const ss = SpreadsheetApp.openById(CRM_ID);
  let hoja = ss.getSheetByName(TAB_TEXTOS);
  if (!hoja) {
    hoja = ss.insertSheet(TAB_TEXTOS);
    hoja.appendRow(HEADERS_TEXTOS);
    hoja.setFrozenRows(1);
    hoja.getRange(1, 1, 1, 3).setFontWeight("bold");
    hoja.setColumnWidth(1, 200);
    hoja.setColumnWidth(2, 460);
    hoja.setColumnWidth(3, 360);
  }
  // claves ya presentes (para no pisar ediciones)
  const existentes = {};
  if (hoja.getLastRow() >= 2) {
    const claves = hoja.getRange(2, 1, hoja.getLastRow() - 1, 1).getValues();
    claves.forEach(function (f) {
      const k = String(f[0] == null ? "" : f[0]).trim();
      if (k) existentes[k] = true;
    });
  }
  const nuevas = TEXTOS_SEMILLA.filter(function (r) {
    return !existentes[r[0]];
  });
  if (nuevas.length) {
    hoja.getRange(hoja.getLastRow() + 1, 1, nuevas.length, 3)
      .setValues(nuevas);
  }
  return "TEXTOS WEB listo: " + nuevas.length + " claves agregadas, " +
    Object.keys(existentes).length + " ya existían";
}

function testTextos() {
  Logger.log(JSON.stringify(leerTextos_(), null, 2));
}

/* ===================== UTILERÍAS Y PRUEBAS ===================== */

function respuesta_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function testCatalogo() {
  Logger.log(JSON.stringify(construirCatalogo_(), null, 2));
}

function testMarcarEstado() {
  const fake = {
    postData: {
      contents: JSON.stringify({
        tipo: "estado", token: TOKEN_TAREA, email: "test@test.com",
        estado: "BRIEF CREADO", brief: "2026-06-11",
        nota: "prueba de seguimiento (borrar)"
      })
    }
  };
  Logger.log(doPost(fake).getContent());
}

function testInsertarLead() {
  const fake = {
    postData: {
      contents: JSON.stringify({
        folio: "AUR-TEST-XX",
        nombre: "Lead de Prueba",
        email: "test@test.com",
        tel: "6620000000",
        proyecto: "Prueba webhook",
        estilo: "Moderno cálido",
        sensaciones: ["Paz", "Calidez"],
        momentos: ["Tardes en la terraza"],
        nivel: "Elegante",
        terreno: 500, personas: 4, plantas: 2, autos: 2,
        extras: ["Terraza", "Estudio / Oficina"],
        calculo: { m2hab: 180, total: 240, rango: [3500000, 4200000] }
      })
    }
  };
  Logger.log(doPost(fake).getContent());
}
