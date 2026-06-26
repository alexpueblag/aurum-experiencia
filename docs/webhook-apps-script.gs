/**
 * Apps Script central \u2014 Aurum Experiencia
 * Un solo Web App con las DOS conexiones a los archivos ra\u00edz de Alejandro.
 * El cat\u00e1logo se lee DIRECTO de las hojas de Alejandro tal como ya est\u00e1n:
 * NO se crean pesta\u00f1as nuevas, no hay que cambiar de lugar nada.
 *
 *  TEXTOS (contenido editable \u2192 app):
 *    GET ?recurso=textos \u2192 todos los textos de la web, le\u00eddos de la
 *    pesta\u00f1a "TEXTOS WEB" (clave / valor) del CRM. Alejandro edita ah\u00ed
 *    cualquier t\u00edtulo, bot\u00f3n, nombre de estilo, el logo y el link de
 *    agenda, SIN tocar c\u00f3digo. sembrarTextos() crea y rellena la pesta\u00f1a.
 *
 *  ENTRADA (cat\u00e1logo \u2192 app):
 *    GET ?recurso=catalogo \u2192 cat\u00e1logo vigente le\u00eddo de "Au : Residencia
 *    Nueva":
 *      \u00b7 m\u00b2 de cada espacio \u2192 pesta\u00f1a VIVIENDA NUEVA (los bloques de
 *        4 renglones: etiqueta / medidas / m\u00b2 / checkboxes).
 *      \u00b7 $/m\u00b2 de obra \u2192 pesta\u00f1a AN\u00c1LISIS OBRA NUEVA, el valor que tenga
 *        el selector "COSTO POR M2 DE OBRA" (los checkboxes).
 *      \u00b7 $/m\u00b2 de proyecto \u2192 la tabla PROYECTO ARQUITECT\u00d3NICO por etapas:
 *        dise\u00f1o = suma etapa 1 (A-E con palomita), ejecutivo = etapa 1+2.
 *    Lo que Alejandro mueva ah\u00ed se refleja en la web y en el JSON.
 *
 *  SALIDA (leads \u2192 CRM):
 *    POST (JSON de revelar()) \u2192 UPSERT por email en la pesta\u00f1a "LEADS - WEB"
 *    del Sheet "CRM - YOD". Si el cliente ya existe se ACTUALIZA su mismo
 *    rengl\u00f3n (jam\u00e1s se duplica); si no, se crea con Estado=NUEVO.
 *
 *  SEGUIMIENTO (tarea diaria \u2192 CRM):
 *    POST {tipo:"estado", token, email, estado, brief, sesion, qaa, nota}
 *    \u2192 la tarea programada de las 8 AM marca el avance del cliente en su
 *    MISMO rengl\u00f3n (Estado=BRIEF CREADO / SESI\u00d3N AGENDADA / QAA COMPLETO,
 *    fechas de Brief/Sesi\u00f3n/QAA y notas). Protegido con TOKEN_TAREA, solo
 *    toca columnas de seguimiento, nunca degrada un estado y JAM\u00c1S pisa
 *    CLIENTE / DESCARTADO (esos los pone Alejandro a mano).
 *
 *  SINCRON\u00cdA (cat\u00e1logo \u2192 Drive JSON):
 *    actualizarCatalogoDriveJson() regenera aurum-catalogo.json en Drive
 *    desde las mismas hojas (lo que lee la tarea diaria de las 8 AM).
 *    instalarTriggers() lo agenda a diario en la franja 5-6 AM.
 *
 * C\u00d3MO ACTUALIZAR EL C\u00d3DIGO YA DESPLEGADO (~2 minutos, EN ESTE ORDEN):
 * 1. Abre el proyecto de Apps Script (CRM - YOD \u2192 Extensiones \u2192 Apps
 *    Script), borra todo y pega este archivo. Guarda.
 * 2. Implementar \u2192 Administrar implementaciones \u2192 \u270f\ufe0f Editar \u2192
 *    Versi\u00f3n: "Nueva versi\u00f3n" \u2192 Implementar.
 *    LA URL /exec NO CAMBIA; no hay que tocar index.html.
 * 3. HASTA DESPU\u00c9S del paso 2: ejecuta una vez borrarPestanasApp()
 *    para eliminar las pesta\u00f1as CATALOGO_APP y PRECIOS_APP de la
 *    versi\u00f3n anterior. (Si las borras antes, la versi\u00f3n vieja a\u00fan
 *    publicada las vuelve a crear en la siguiente visita a la web.)
 * 4. Ejecuta una vez sembrarTextos() para crear la pesta\u00f1a
 *    "TEXTOS WEB" con todos los textos por defecto. Es idempotente:
 *    repetirla solo rellena las claves que falten (no pisa tus ediciones).
 *    OJO REDISE\u00d1O v2 (2026-06): si sembraste la pesta\u00f1a ANTES del
 *    redise\u00f1o (car\u00e1cter sin niveles, estimado por correo, agenda
 *    embebida), lo m\u00e1s limpio es BORRAR la pesta\u00f1a TEXTOS WEB y volver
 *    a correr sembrarTextos() \u2014 las claves viejas (nivel_*, gate_sub,
 *    p4_titulo, r_*, sesion_b*...) ya no se usan y quedar\u00edan de adorno.
 *    Despu\u00e9s vuelve a pegar tu cta_agenda_url si la hab\u00edas puesto.
 *
 * Pruebas sin la web: testCatalogo(), testTextos(), testInsertarLead()
 * y testMarcarEstado().
 *
 * NOTA DE FORMATO: ninguna l\u00ednea rebasa ~84 columnas para que el
 * copy-paste no parta strings a la mitad.
 */

// CRM - YOD
const CRM_ID = "1z1ZtvcUKnx4MUfxLICo8x5bTihlDY8tBC3j2sYwNvg8";
// Au : Residencia Nueva
const CATALOGO_SHEET_ID = "10gsWRjGg9r9gvyl15VRBfeBKcUaafqNtiuGC0kUbEsg";
// aurum-catalogo.json
const CATALOGO_JSON_DRIVE_ID = "1SeLYpWQl6KwCqSrY6wsB41eltRkKXbNk";

const TAB_LEADS = "LEADS - WEB";
// pesta\u00f1a (clave / valor) con TODOS los textos editables de la web
const TAB_TEXTOS = "TEXTOS WEB";
// pesta\u00f1a (clave / espacios) con el mapeo momento -> espacios que agrega
const TAB_MOMENTOS = "MOMENTOS WEB";
// pesta\u00f1a (clave / valor) con config de calculo editable (amplitud -> tamano)
const TAB_CONFIG = "CONFIG WEB";
const HOJA_ESPACIOS = "VIVIENDA NUEVA";
const HOJA_ANALISIS = "AN\u00c1LISIS OBRA NUEVA";

// token compartido con la tarea diaria (docs/tarea-programada-qaa.md):
// solo quien lo conozca puede marcar seguimiento. Si lo cambias aqu\u00ed,
// c\u00e1mbialo tambi\u00e9n en el prompt de la tarea.
const TOKEN_TAREA = "AURUM-TAREA-7g4k9w2m";

/* ============== REGLAS DE NEGOCIO QUE LA HOJA NO CODIFICA ==============
   (vienen del cat\u00e1logo v11 acordado; cambiarlas = editar aqu\u00ed) */

// etiqueta tal como aparece en VIVIENDA NUEVA (col A) \u2192 clave del cat\u00e1logo
const ETIQUETAS = {
  "ACCESO Y ESCALERA": "acceso_escalera",
  "COCINA": "cocina",
  "COMEDOR": "comedor",
  "SALA": "sala",
  "1/2 BA\u00d1O": "medio_bano",
  "R. PRINCIPAL": "recamara_principal",
  "REC\u00c1MARA 2": "recamara_2",
  "REC\u00c1MARA 3": "recamara_3",
  "REC\u00c1MARA 4": "recamara_4",
  "REC\u00c1MARA 5": "recamara_5",
  "BA\u00d1O COMP.": "bano_completo",
  "SALA TV": "sala_tv",
  "BA\u00d1O EXTRA": "bano_extra",
  "LAVANDER\u00cdA": "lavanderia",
  "C. SERVICIO": "cuarto_servicio",
  "ESTUDIO": "estudio",
  "ASADOR": "asador",
  "TERRAZA": "terraza",
  "BALC\u00d3N": "balcon",
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
  "REC\u00c1MARA VISITAS": "recamara_visita",
  "RECIBIDOR": "recibidor",
  "EST. MASCOTAS": "estacion_mascotas",
  "JARD\u00cdN": "jardin"
};

// nombre bonito por clave (la hoja usa abreviaturas)
const NOMBRES = {
  acceso_escalera: "Acceso y Escalera", cocina: "Cocina",
  comedor: "Comedor", sala: "Sala", medio_bano: "1/2 Ba\u00f1o",
  recamara_principal: "Rec\u00e1mara Principal", recamara_2: "Rec\u00e1mara 2",
  recamara_3: "Rec\u00e1mara 3", recamara_4: "Rec\u00e1mara 4",
  recamara_5: "Rec\u00e1mara 5", bano_completo: "Ba\u00f1o Completo",
  sala_tv: "Sala TV", bano_extra: "Ba\u00f1o Extra",
  lavanderia: "Lavander\u00eda", cuarto_servicio: "Cuarto de Servicio",
  estudio: "Estudio", asador: "Asador", terraza: "Terraza",
  balcon: "Balc\u00f3n", biblioteca: "Biblioteca", cochera: "Cochera",
  espejo_agua: "Espejo de Agua", huerto: "Huerto",
  butlers_pantry: "Butler's Pantry", cuarto_juegos: "Cuarto de Juegos",
  bar: "Bar", depto_extra: "Depto. Extra", alberca: "Alberca",
  cuarto_blancos: "Cuarto de Blancos", bodega: "Bodega", taller: "Taller",
  recamara_visita: "Rec\u00e1mara de Visitas", recibidor: "Recibidor",
  estacion_mascotas: "Estaci\u00f3n de Mascotas", jardin: "Jard\u00edn"
};

// qu\u00e9 espacios cotizan (la hoja no lo marca): los NO habitables se
// muestran en brief/web pero no entran a la multiplicaci\u00f3n
const NO_HABITABLES = {
  asador: 1, terraza: 1, balcon: 1, cochera: 1,
  espejo_agua: 1, huerto: 1, alberca: 1, taller: 1, jardin: 1
};

// sub-espacios que se SUMAN al m\u00b2 del padre (Ba\u00f1o / Walk-in Closet);
// la hoja los marca con etiqueta pero no trae sus m\u00b2, estos son los
// acordados en el cat\u00e1logo v11
const EXTRAS_M2 = {
  recamara_principal: {
    chico: { "Ba\u00f1o": 6, "Walk-in Closet": 4 },
    mediano: { "Ba\u00f1o": 6, "Walk-in Closet": 6 },
    grande: { "Ba\u00f1o": 6, "Walk-in Closet": 8 }
  },
  recamara_2: { chico: { "Ba\u00f1o": 6 }, mediano: { "Ba\u00f1o": 6 },
                grande: { "Ba\u00f1o": 6 } },
  recamara_3: { chico: { "Ba\u00f1o": 6 }, mediano: { "Ba\u00f1o": 6 },
                grande: { "Ba\u00f1o": 6 } },
  recamara_4: { chico: { "Ba\u00f1o": 6 }, mediano: { "Ba\u00f1o": 6 },
                grande: { "Ba\u00f1o": 6 } },
  recamara_5: { chico: { "Ba\u00f1o": 6 }, mediano: { "Ba\u00f1o": 6 },
                grande: { "Ba\u00f1o": 6 } },
  cuarto_servicio: { chico: { "Ba\u00f1o": 4 }, mediano: { "Ba\u00f1o": 4 },
                     grande: { "Ba\u00f1o": 4 } },
  // rec\u00e1mara de visitas: mismos valores que una rec\u00e1mara secundaria (+6 ba\u00f1o)
  recamara_visita: { chico: { "Ba\u00f1o": 6 }, mediano: { "Ba\u00f1o": 6 },
                     grande: { "Ba\u00f1o": 6 } }
};

// banda del rango mostrado en la web (x cotizaci\u00f3n base)
const BANDA = { baja: 0.95, alta: 1.12 };

// Circulaciones y grosor de muros: +12% sobre el subtotal de m\u00b2 HABITABLES
// (regla 2026-06-11, sustituye a "NO aplicar circulaci\u00f3n"). ENTRA a la base
// de cotizaci\u00f3n de los 3 servicios. EDITAR SOLO AQU\u00cd en esta capa; el espejo
// est\u00e1 en index.html (CAT.circulacion) y en docs/tarea-programada-qaa.md.
// Pendiente % final de Mariana (rango 0.10-0.15), default 0.12.
const CIRCULACION = 0.12;

// multiplicador por nivel de lujo (no est\u00e1 en la hoja)
const MULTIPLICADOR_LUJO = {
  Modesta: 0.85, Acogedora: 0.85, Casual: 1.00, sin_datos: 1.00,
  Elegante: 1.20, Premium: 1.20, Alto: 1.20, Vanguardista: 1.20,
  Monumental: 1.40, Lujo: 1.40, Luxury: 1.40, Glamoroso: 1.40
};

// heur\u00edstica de pre-selecci\u00f3n (l\u00f3gica de negocio, no medidas)
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
      return respuesta_(construirBoard_());   // m\u00e9tricas agregadas (sin PII) para board.html
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
    if (datos && datos.tipo === "actividad") {
      return respuesta_(registrarActividad_(datos));   // board: actividad del pixel (1 fila/d\u00eda, celdas densas)
    }
    const resultado = upsertLead_(datos, e.postData.contents);
    try { enviarConfirmacion_(datos); } catch (err) {}   // B: correo instantaneo (nunca rompe el POST)
    return respuesta_({ ok: true, accion: resultado });
  } catch (err) {
    return respuesta_({ ok: false, error: String(err) });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

/* ===================== B: CORREO DE CONFIRMACION INSTANTANEO =====================
   Speed-to-lead (consenso Cardone+Hormozi): primer toque en segundos, no en 24h.
   Se dispara al recibir un lead que dejo CORREO. SIN precio (regla). TODO editable
   desde TEXTOS WEB: correo_conf_activo (si|no), correo_conf_remitente,
   correo_conf_asunto, correo_conf_cuerpo (HTML con tokens {nombre}{estilo}
   {caracter}{rec}{extras}{m2}{folio}{agenda}). Sale desde la cuenta DUENA del
   script (el nombre visible es correo_conf_remitente). Nunca rompe el POST. */
function rellenarTpl_(s, o) {
  return String(s == null ? "" : s).replace(/\{(\w+)\}/g, function (m, k) {
    return o[k] != null ? o[k] : "";
  });
}
function enviarConfirmacion_(datos) {
  const t = leerTextos_() || {};
  if (String(t.correo_conf_activo || "si").trim().toLowerCase() === "no") return;
  const email = String((datos && datos.email) || "").trim();
  if (!email || email.indexOf("@") < 1) return;            // solo si dejo correo
  const asuntoTpl = t.correo_conf_asunto, cuerpoTpl = t.correo_conf_cuerpo;
  if (!asuntoTpl || !cuerpoTpl) return;                    // sin plantilla, no manda
  const rec = Number(datos.recamaras || 0);
  const exArr = Array.isArray(datos.extras) ? datos.extras : [];
  const extrasTxt = exArr.length ? (", con " + exArr.join(", ").toLowerCase()) : "";
  let m2 = datos.m2aprox;
  if (m2 == null && datos.calculo && datos.calculo.m2hab) m2 = Math.round(datos.calculo.m2hab / 10) * 10;
  const tok = {
    nombre: String(datos.nombre || "").split(" ")[0] || "",
    estilo: datos.estilo || "", caracter: datos.caracter_display || "",
    rec: rec, extras: extrasTxt,
    m2: (m2 == null ? "" : Number(m2).toLocaleString("es-MX")),
    folio: datos.folio || "", agenda: limpiarUrlAgenda_(t.cta_agenda_url || "")
  };
  MailApp.sendEmail({
    to: email,
    subject: rellenarTpl_(asuntoTpl, tok),
    htmlBody: rellenarTpl_(cuerpoTpl, tok),
    name: String(t.correo_conf_remitente || "Aurum Arquitectos").trim()
  });
}

/* ===================== BOARD DE MEDICI\u00d3N (recurso=board / tipo:gasto) =====================
   Sirve m\u00e9tricas AGREGADAS (sin PII) le\u00eddas de "LEADS - WEB" + la pesta\u00f1a "GASTO".
   board.html (GitHub Pages) las consume con el mismo patr\u00f3n que los dem\u00e1s boards.
   Convenci\u00f3n de celda densa en GASTO: las campa\u00f1as van en UNA sola celda,
   "nombre::monto" por l\u00ednea (para no explotar en filas). */
const BOARD_SECRET = "aurum-board-2026";   // clave para escribir GASTO (c\u00e1mbiala aqu\u00ed y en board.html)
const TAB_GASTO = "GASTO";
const HEADERS_GASTO = ["Semana", "Gasto MXN", "Campa\u00f1as (nombre::monto por l\u00ednea)", "Actualizado"];

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
    e.indexOf("SESI\u00d3N AGENDADA") >= 0 || e.indexOf("SESION AGENDADA") >= 0 ||
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
    const sesion = get(r, "Sesi\u00f3n agendada");
    const pcRaw = get(r, "Primer contacto");
    const fpc = (pcRaw instanceof Date) ? pcRaw : (pcRaw ? new Date(pcRaw) : null);
    const fuente = String(get(r, "UTM source") || "").trim() || "(directo)";
    const dia = String(get(r, "D\u00eda") || "").trim();
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
      dia: String(get(r, "D\u00eda") || ""), hora: String(get(r, "Hora") || "")
    });
  }

  // GASTO (pesta\u00f1a aparte; celda densa de campa\u00f1as)
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
  if (gastoAct === 0) alertas.push({ tipo: "amar", texto: "No hay gasto registrado para la semana " + etqAct + " \u2014 el costo por cita no se puede calcular." });
  const totalLeads = rows.length;
  if (totalLeads > 0) {
    const sinUtm = porFuente["(directo)"] ? porFuente["(directo)"].leads : 0;
    if (sinUtm / totalLeads > 0.5) alertas.push({ tipo: "amar", texto: "M\u00e1s de la mitad de los leads llegan sin etiqueta UTM \u2014 pon la plantilla de UTMs en los anuncios de Meta." });
  }
  if (!alertas.length) alertas.push({ tipo: "verde", texto: "Sin focos rojos operativos." });

  return {
    ok: true,
    meta: { actualizado: ahora.toISOString(), periodo: "Semana " + etqAct, semana: etqAct },
    kpis: kpis, prev: prev,
    gasto: { semana_actual: gastoAct, total: gastoTotal, por_campana: porCampana },
    funnel: [{ etapa: "Leads", n: totalLeads }, { etapa: "Citas", n: tot.citas }, { etapa: "Clientes", n: tot.clientes }],
    por_estado: estadoArr, por_fuente: fuenteArr, por_dia: diaArr,
    embudo_cuestionario: embudoCuestionario_(),   // 9 pantallas del Pixel, desde la pesta\u00f1a ACTIVIDAD
    alertas: alertas, recientes: recientes,
    actividad_por_dia: actividadPorDia_()   // serie por dia para "Comportamiento en el tiempo"
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

/* ---- ACTIVIDAD DEL PIXEL: 1 fila por D\u00cdA, embudo empaquetado en una celda densa ---- */
const TAB_ACTIVIDAD = "ACTIVIDAD";
const HEADERS_ACTIVIDAD = ["Fecha", "Visitas", "Embudo (p0..p8/lead/agenda :: n por l\u00ednea)", "Fuentes (fuente::n)", "Horas (HH::n)", "Actualizado"];

function obtenerHojaActividad_() {
  const ss = SpreadsheetApp.openById(CRM_ID);
  let hoja = ss.getSheetByName(TAB_ACTIVIDAD);
  if (!hoja) { hoja = ss.insertSheet(TAB_ACTIVIDAD); hoja.appendRow(HEADERS_ACTIVIDAD); hoja.setFrozenRows(1); }
  return hoja;
}
// suma contadores dentro de UNA celda densa "k::n" por l\u00ednea (convenci\u00f3n Aurum)
function incDense_(cell, incs) {
  const map = {};
  String(cell || "").split("\n").forEach(function (l) {
    l = l.trim(); if (!l) return; const p = l.split("::"); const k = (p[0] || "").trim();
    if (k) map[k] = Number(p[1]) || 0;
  });
  for (const k in incs) map[k] = (map[k] || 0) + incs[k];
  return Object.keys(map).map(function (k) { return k + "::" + map[k]; }).join("\n");
}
function registrarActividad_(d) {
  const paso = Math.max(0, Math.min(8, parseInt(d.paso, 10) || 0));
  const hoja = obtenerHojaActividad_();
  const hoy = Utilities.formatDate(new Date(), "America/Hermosillo", "yyyy-MM-dd");
  const ult = hoja.getLastRow();
  let fila = 0;
  if (ult > 1) {
    const fechas = hoja.getRange(2, 1, ult - 1, 1).getValues();
    for (let i = 0; i < fechas.length; i++) {
      const f = fechas[i][0];
      const fl = (f instanceof Date) ? Utilities.formatDate(f, "America/Hermosillo", "yyyy-MM-dd") : String(f).trim();
      if (fl === hoy) { fila = i + 2; break; }
    }
  }
  if (!fila) { hoja.appendRow([hoy, 0, "", "", "", new Date()]); fila = hoja.getLastRow(); }
  const rng = hoja.getRange(fila, 1, 1, 6);
  const v = rng.getValues()[0];
  // "alcanz\u00f3 al menos la pantalla k". paso=0 = s\u00f3lo carg\u00f3 (rebot\u00f3 en Estilo sin tocar
  // fachada) -> suma p0 pero NO p1; paso>=1 (toc\u00f3 la 1\u00aa fachada) ya suma p1. As\u00ed
  // p0=cargaron (l\u00ednea base) y p1=empezaron (activaci\u00f3n) divergen desde la MISMA se\u00f1al.
  const incsE = {}; for (let k = 0; k <= paso; k++) incsE["p" + k] = 1;
  if (d.lead === true) incsE["lead"] = 1;
  if (d.agenda === true) incsE["agenda"] = 1;
  /* R01 A/B + R37-A canal: se empaquetan en la MISMA celda densa del embudo
     (convenci\u00f3n Aurum) con claves prefijadas \u2014 sin columnas nuevas ni filas. */
  const variante = (d.variante === "B") ? "B" : "A";
  incsE[variante + ":visita"] = 1;
  if (d.lead === true) incsE[variante + ":lead"] = 1;
  if (d.agenda === true) incsE[variante + ":agenda"] = 1;
  const metodoAg = String(d.agenda_metodo || "").trim();
  if (d.agenda === true && (metodoAg === "whatsapp" || metodoAg === "calendario")) incsE["ag:" + metodoAg] = 1;
  const embudo = incDense_(v[2], incsE);
  const fuente = String(d.fuente || "(directo)").trim() || "(directo)";
  const incsF = {}; incsF[fuente] = 1; const fuentes = incDense_(v[3], incsF);
  let horas = v[4]; const hh = String(d.hora || "").split(":")[0];
  if (hh) { const incsH = {}; incsH[hh] = 1; horas = incDense_(v[4], incsH); }
  rng.setValues([[hoy, (Number(v[1]) || 0) + 1, embudo, fuentes, horas, new Date()]]);
  return { ok: true, accion: "actividad", fecha: hoy };
}
// serie por DIA para el board (comportamiento en el tiempo): lee ACTIVIDAD fila por fila
function actividadPorDia_() {
  function densa_(cell) {
    var map = {};
    String(cell || "").split("\n").forEach(function (l) {
      l = l.trim(); if (!l) return; var p = l.split("::"); var k = (p[0] || "").trim();
      if (k) map[k] = Number(p[1]) || 0;
    });
    return map;
  }
  var out = [];
  var hoja = obtenerHojaActividad_(); var ult = hoja.getLastRow();
  if (ult > 1) {
    var rows = hoja.getRange(2, 1, ult - 1, 6).getValues();
    rows.forEach(function (r) {
      var f = r[0];
      var fecha = (f instanceof Date) ? Utilities.formatDate(f, "America/Hermosillo", "yyyy-MM-dd") : String(f).trim();
      if (!fecha) return;
      var e = densa_(r[2]);
      out.push({
        fecha: fecha, visitas: Number(r[1]) || 0,
        cargaron: e.p0 || 0, empezaron: e.p1 || 0, formulario: e.p7 || 0,
        lead: e.lead || 0, agenda: e.agenda || 0, horas: densa_(r[4]),
        embudo: e   // embudo COMPLETO por dia (p0..p8/lead/agenda) -> segmentacion por dia/mes/hora en el board
      });
    });
  }
  out.sort(function (a, b) { return a.fecha < b.fecha ? -1 : 1; });
  return out;
}
// suma TODAS las filas de ACTIVIDAD en un embudo \u00fanico (para el board)
function embudoCuestionario_() {
  const et = { p0: "Inicio", p1: "Estilo", p2: "Sensaci\u00f3n", p3: "Momentos", p4: "Car\u00e1cter", p5: "Esencial", p6: "Sue\u00f1os", p7: "Formulario", p8: "Cierre", lead: "Dej\u00f3 datos", agenda: "Agend\u00f3" };
  const orden = ["p0", "p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "lead", "agenda"];
  const tot = {}; let visitas = 0;
  const hoja = obtenerHojaActividad_(); const ult = hoja.getLastRow();
  if (ult > 1) {
    const rows = hoja.getRange(2, 1, ult - 1, 6).getValues();
    rows.forEach(function (r) {
      visitas += Number(r[1]) || 0;
      String(r[2] || "").split("\n").forEach(function (l) {
        l = l.trim(); if (!l) return; const p = l.split("::"); const k = (p[0] || "").trim();
        if (k) tot[k] = (tot[k] || 0) + (Number(p[1]) || 0);
      });
    });
  }
  const ab = {
    A: { visita: tot["A:visita"] || 0, lead: tot["A:lead"] || 0, agenda: tot["A:agenda"] || 0 },
    B: { visita: tot["B:visita"] || 0, lead: tot["B:lead"] || 0, agenda: tot["B:agenda"] || 0 }
  };
  const canal = { whatsapp: tot["ag:whatsapp"] || 0, calendario: tot["ag:calendario"] || 0 };
  // cargaron=p0 (linea base, ~1 por visita/beacon) / empezaron=p1 (toco la 1a fachada).
  // El board los usa como titular + tasa de activacion y ARRANCA el embudo en p1 (Estilo):
  // "Inicio" NO es un escalon del embudo, es la base contra la que se mide la activacion.
  return { visitas: visitas, cargaron: tot["p0"] || 0, empezaron: tot["p1"] || 0,
    pasos: orden.map(function (k) { return { paso: k, etiqueta: et[k] || k, n: tot[k] || 0 }; }), ab: ab, canal: canal };
}

/* ===================== LEADS: UPSERT POR EMAIL ===================== */

const HEADERS_LEADS = [
  "Primer contacto", "\u00daltima actualizaci\u00f3n", "Folio", "Nombre", "Email",
  "WhatsApp", "Proyecto", "Estilo", "Sensaciones", "Momentos", "Nivel",
  "Terreno m2", "Personas", "Plantas", "Autos", "Extras",
  "M2 habitables", "M2 totales", "Rango bajo MXN", "Rango alto MXN",
  "Estado", "Brief", "Sesi\u00f3n agendada", "QAA completo",
  "UTM source", "UTM medium", "UTM campaign", "UTM content", "UTM term",
  "fbclid", "Referrer", "Dispositivo", "Hora", "D\u00eda",
  "Consentimiento", "Consentimiento fecha", "Versi\u00f3n aviso",
  "Notas", "JSON"
];

function upsertLead_(lead, rawJson) {
  const email = String(lead.email || "").trim().toLowerCase();
  const emailValido = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  const telDig = String(lead.tel || "").replace(/\D/g, "");
  // gate de 1 contacto: basta email O WhatsApp (>=10 digitos). Antes esto
  // descartaba los leads de solo-WhatsApp (default del gate) y se perdian.
  if (!emailValido && telDig.length < 10) {
    return "descartado: sin contacto valido (email o WhatsApp)";
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
    "Email": (emailValido ? email : ""),
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
    "D\u00eda": lead.dia_semana_local || "",
    "Consentimiento": lead.consent === true ? "SI" : "",
    "Consentimiento fecha": lead.consent_ts || "",
    "Versi\u00f3n aviso": lead.version_aviso || "",
    "JSON": rawJson
  };

  // buscar renglon existente: por EMAIL si lo hay; si no, por WhatsApp (digitos).
  // Asi un cliente recurrente cae en su mismo renglon sea cual sea su canal.
  let fila = 0;
  const numFilas = Math.max(hoja.getLastRow() - 1, 1);
  const claveCol = emailValido ? "Email" : "WhatsApp";
  const vals = hoja.getRange(2, col(claveCol), numFilas, 1).getValues();
  for (let i = 0; i < vals.length; i++) {
    const cell = emailValido
      ? String(vals[i][0]).trim().toLowerCase()
      : String(vals[i][0]).replace(/\D/g, "");
    const match = emailValido ? email : telDig;
    if (cell && cell === match) { fila = i + 2; break; }
  }

  if (fila) {
    // MISMO RENGL\u00d3N: actualizar datos sin pisar el seguimiento.
    // Una sola lectura + una sola escritura (menos tiempo con el lock).
    const rango = hoja.getRange(fila, 1, 1, headers.length);
    const valores = rango.getValues()[0];
    const set = function (h, v) { valores[col(h) - 1] = v; };
    Object.keys(datos).forEach(function (k) { set(k, safe_(datos[k])); });
    set("\u00daltima actualizaci\u00f3n", ahora);
    if (!valores[col("Estado") - 1]) set("Estado", "NUEVO");
    const folioActual = valores[col("Folio") - 1];
    if (!folioActual) {
      set("Folio", safe_(lead.folio || ""));
    } else if (lead.folio && folioActual !== lead.folio) {
      const previa = valores[col("Notas") - 1];
      const fecha = Utilities.formatDate(
        ahora, Session.getScriptTimeZone(), "yyyy-MM-dd");
      set("Notas", safe_((previa ? previa + " | " : "") +
        "Re-env\u00edo web " + fecha + " (folio " + lead.folio + ")"));
    }
    rango.setValues([valores]);
    return "actualizado rengl\u00f3n " + fila;
  }

  // cliente nuevo
  const filaNueva = headers.map(function (h) {
    if (h === "Primer contacto" || h === "\u00daltima actualizaci\u00f3n") {
      return ahora;
    }
    if (h === "Folio") return safe_(lead.folio || "");
    if (h === "Estado") return "NUEVO";
    return (h in datos) ? safe_(datos[h]) : "";
  });
  hoja.appendRow(filaNueva);
  return "creado rengl\u00f3n " + hoja.getLastRow();
}

/* ============ SEGUIMIENTO DESDE LA TAREA DIARIA (tipo:"estado") ============
   La tarea de las 8 AM marca el avance del cliente en su rengl\u00f3n. Reglas:
   \u00b7 token obligatorio (TOKEN_TAREA) \u2014 el endpoint es p\u00fablico.
   \u00b7 El Estado solo AVANZA en el ciclo de vida; nunca retrocede.
   \u00b7 CLIENTE y DESCARTADO son intocables (los gestiona Alejandro a mano).
   \u00b7 Las fechas (Brief / Sesi\u00f3n agendada / QAA completo) solo se escriben
     si la celda est\u00e1 vac\u00eda: la primera fecha real se conserva.
   \u00b7 La nota se AGREGA al final de Notas, nunca la sustituye. */
const RANGO_ESTADO = {
  "NUEVO": 1, "BRIEF CREADO": 2, "SESI\u00d3N AGENDADA": 3,
  "QAA COMPLETO": 4, "CLIENTE": 5, "DESCARTADO": 5
};

function marcarEstado_(d) {
  if (String(d.token || "") !== TOKEN_TAREA) {
    return { ok: false, error: "token inv\u00e1lido" };
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
      cambios.push("Estado\u2192" + nuevo);
    }
  }

  // fechas de hito: solo la primera vez (celda vac\u00eda)
  const hitos = [["Brief", d.brief], ["Sesi\u00f3n agendada", d.sesion],
                 ["QAA completo", d.qaa]];
  hitos.forEach(function (h) {
    const v = h[1] == null ? "" : String(h[1]).trim();
    if (v && !String(valores[col(h[0]) - 1] || "").trim()) {
      set(h[0], v);
      cambios.push(h[0] + "\u2192" + v);
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
    return { ok: true, accion: "sin cambios (rengl\u00f3n " + fila + ")" };
  }
  valores[col("\u00daltima actualizaci\u00f3n") - 1] = new Date();
  rango.setValues([valores]);
  return {
    ok: true,
    accion: "seguimiento rengl\u00f3n " + fila + ": " + cambios.join(", ")
  };
}

/* El endpoint es p\u00fablico: setValue/appendRow interpretan "=...", "+...",
   etc. como f\u00f3rmula (riesgo de exfiltraci\u00f3n del CRM). El ap\u00f3strofo
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
    // pesta\u00f1a de una versi\u00f3n anterior del webhook: se conserva renombrada
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
  // Auto-migraci\u00f3n idempotente (F1.2, Opci\u00f3n A): agrega al final las columnas
  // de HEADERS_LEADS que falten. As\u00ed, al publicar una versi\u00f3n nueva del webhook,
  // las columnas nuevas (UTM, fbclid, dispositivo, consentimiento\u2026) aparecen
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

/* ============== CAT\u00c1LOGO: LE\u00cdDO DE LAS HOJAS DE ALEJANDRO ============== */

function construirCatalogo_() {
  const ss = SpreadsheetApp.openById(CATALOGO_SHEET_ID);

  const hojaEsp = ss.getSheetByName(HOJA_ESPACIOS);
  if (!hojaEsp) throw new Error("No existe la pesta\u00f1a " + HOJA_ESPACIOS);
  const resEsp = parsearEspacios_(hojaEsp.getDataRange().getValues());

  const hojaAna = ss.getSheetByName(HOJA_ANALISIS);
  if (!hojaAna) throw new Error("No existe la pesta\u00f1a " + HOJA_ANALISIS);
  const precios = parsearPrecios_(hojaAna.getDataRange().getValues());

  const hoy = Utilities.formatDate(
    new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  const meta = {
    version: "sheet-live",
    fecha: hoy,
    fuente: "Au : Residencia Nueva \u2192 " + HOJA_ESPACIOS +
      " (espacios) + " + HOJA_ANALISIS + " (precios)",
    descripcion: "Cat\u00e1logo oficial Aurum. Los m\u00b2 de cada espacio " +
      "vienen de la hoja de Alejandro, NUNCA se inventan. Los " +
      "sub-espacios 'extra' se suman autom\u00e1ticamente al m\u00b2 del " +
      "espacio padre cuando \u00e9ste se selecciona.",
    notas: {
      circulacion: "Sumar +" + Math.round(CIRCULACION * 100) + "% de " +
        "Circulaciones y grosor de muros sobre el subtotal de m\u00b2 " +
        "habitables (regla 2026-06-11; sustituye a 'NO aplicar " +
        "circulaci\u00f3n'). L\u00ednea visible del programa y ENTRA a la base de " +
        "cotizaci\u00f3n de los 3 servicios. Pendiente % final de Mariana.",
      cotizacion: "Entran a la base de cotizaci\u00f3n los m\u00b2 habitables M\u00c1S " +
        "la circulaci\u00f3n. Los espacios con habitable=false se muestran en " +
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
      base_de_cotizacion: "m\u00b2 habitables + " +
        Math.round(CIRCULACION * 100) + "% de circulaci\u00f3n. Los espacios " +
        "con habitable=false se muestran en el brief pero NO entran en " +
        "la multiplicaci\u00f3n."
    },
    app: {
      banda_estimacion_baja: BANDA.baja,
      banda_estimacion_alta: BANDA.alta,
      circulacion: CIRCULACION,
      cochera_m2_por_auto: resEsp.cocheraM2PorAuto
    },
    // mapeo momento -> espacios que agrega (editable en la pestana MOMENTOS WEB).
    // null si la pestana no existe: la web usa entonces su mapeo embebido.
    momentos: leerMomentos_(),
    // mapeo amplitud -> tamano (editable en la pestana CONFIG WEB). null si no
    // existe: la web usa su mapeo embebido (optimizada=chico/comoda=mediano/holgada=grande).
    amplitud_tamano: leerAmplitudTamano_()
  };
}

/* Lee los bloques de VIVIENDA NUEVA tal como est\u00e1n:
     fila N   : col A = etiqueta, B/C/D = medidas (3X4...), G = extra
     fila N+1 : B/C/D = m\u00b2 (chico/mediano/grande)
     fila N+2 : checkboxes del proyecto en curso (se ignoran)
   Funci\u00f3n pura (recibe la matriz de valores) para poder probarla. */
function parsearEspacios_(vals) {
  const norm = function (s) {
    return String(s || "").replace(/\s+/g, " ").trim().toUpperCase();
  };

  // localizar el encabezado "TAMA\u00d1O (M2)" en col A
  let inicio = -1;
  for (let r = 0; r < vals.length; r++) {
    if (norm(vals[r][0]) === "TAMA\u00d1O (M2)") { inicio = r + 1; break; }
  }
  if (inicio < 0) {
    throw new Error('No encontr\u00e9 el encabezado "TAMA\u00d1O (M2)" en ' +
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
      advertencias.push("Bloque '" + etiqueta + "' sin m\u00b2 num\u00e9ricos " +
        "debajo (fila " + (r + 2) + "); se omiti\u00f3");
      continue;
    }
    let clave = ETIQUETAS[etiqueta];
    if (!clave) {
      clave = etiqueta.toLowerCase()
        .replace(/[\u00e1\u00e0\u00e4]/g, "a").replace(/[\u00e9\u00e8\u00eb]/g, "e")
        .replace(/[\u00ed\u00ec\u00ef]/g, "i").replace(/[\u00f3\u00f2\u00f6]/g, "o")
        .replace(/[\u00fa\u00f9\u00fc]/g, "u").replace(/\u00f1/g, "n")
        .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
      advertencias.push("Espacio nuevo en la hoja sin mapeo: '" +
        etiqueta + "' \u2192 clave '" + clave + "' (habitable=false por " +
        "default; avisar a Claude para mapearlo)");
    }
    const esp = {
      nombre_display: NOMBRES[clave] || String(vals[r][0]).trim(),
      habitable: !(clave in NO_HABITABLES) && (clave in NOMBRES)
    };
    if (clave === "cochera") esp.unidad = "veh\u00edculos";
    const tams = ["chico", "mediano", "grande"];
    for (let t = 0; t < 3; t++) {
      const tam = {
        dim: String(vals[r][1 + t] == null ? "" : vals[r][1 + t]).trim(),
        m2: numero_(m2[t], etiqueta + " \u2192 m2 " + tams[t])
      };
      const ex = (EXTRAS_M2[clave] || {})[tams[t]];
      if (ex) tam.extras = ex;
      esp[tams[t]] = tam;
    }
    espacios[clave] = esp;

    // m\u00b2 lineales por auto para la web: m\u00b2 chico / veh\u00edculos chico
    if (clave === "cochera" && esNum_(vals[r][1]) &&
        Number(vals[r][1]) > 0) {
      cocheraM2PorAuto = Number(m2[0]) / Number(vals[r][1]);
    }
    r += 2; // saltar la fila de m\u00b2 y la de checkboxes
  }

  if (Object.keys(espacios).length === 0) {
    throw new Error("No se encontr\u00f3 ning\u00fan bloque de espacio en " +
      HOJA_ESPACIOS);
  }
  if (!cocheraM2PorAuto) cocheraM2PorAuto = 18; // respaldo (36 m\u00b2/2 veh)
  return {
    espacios: espacios,
    advertencias: advertencias,
    cocheraM2PorAuto: cocheraM2PorAuto
  };
}

/* Lee los precios de AN\u00c1LISIS OBRA NUEVA tal como est\u00e1n:
     \u00b7 llave_en_mano: el n\u00famero a la IZQUIERDA de la celda
       "COSTO POR M2 DE OBRA" (tu selector con checkboxes ya resuelto).
     \u00b7 dise\u00f1o/ejecutivo: la tabla PROYECTO ARQUITECT\u00d3NICO por etapas
       (col B = letra, col C = trabajo, col D = $/m\u00b2, col E = palomita):
       dise\u00f1o = suma etapa 1 (letras A-E con palomita),
       ejecutivo = etapa 1 + etapa 2 (F-I con palomita).
   Funci\u00f3n pura para poder probarla. */
function parsearPrecios_(vals) {
  const norm = function (s) {
    return String(s || "").replace(/\s+/g, " ").trim().toUpperCase();
  };

  // --- costo por m\u00b2 de obra (selector) ---
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
    throw new Error('No encontr\u00e9 "COSTO POR M2 DE OBRA" en ' +
      HOJA_ANALISIS);
  }

  // --- etapas del proyecto arquitect\u00f3nico ---
  let filaProy = -1;
  for (let r = 0; r < vals.length; r++) {
    if (norm(vals[r][1]) === "PROYECTO ARQUITECT\u00d3NICO") {
      filaProy = r;
      break;
    }
  }
  if (filaProy < 0) {
    throw new Error('No encontr\u00e9 "PROYECTO ARQUITECT\u00d3NICO" en ' +
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
    // J, K (gestor\u00eda/interiores) no entran al $/m\u00b2 del proyecto
  }
  if (!vistas) {
    throw new Error("No encontr\u00e9 las etapas (letras A-I) del " +
      "PROYECTO ARQUITECT\u00d3NICO en " + HOJA_ANALISIS);
  }
  if (etapa1 <= 0) {
    throw new Error("La etapa 1 del PROYECTO ARQUITECT\u00d3NICO suma 0 " +
      "(\u00bfquitaste todas las palomitas?)");
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

/* N\u00famero estricto: rechaza vac\u00edo, no-num\u00e9rico y <=0. Una celda borrada
   en la hoja NUNCA debe volverse 0 en silencio en una cotizaci\u00f3n. */
function numero_(celda, contexto) {
  const s = String(celda == null ? "" : celda).trim();
  const n = Number(s);
  if (!s || isNaN(n) || n <= 0) {
    throw new Error("Valor num\u00e9rico inv\u00e1lido o vac\u00edo en " +
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
  // atHour(5) dispara en la franja 5:00-6:00 seg\u00fan la zona horaria del
  // proyecto: margen amplio antes de la tarea de las 8 AM.
  ScriptApp.newTrigger("actualizarCatalogoDriveJson")
    .timeBased().everyDays(1).atHour(5).create();
}

/* Borra las pesta\u00f1as CATALOGO_APP y PRECIOS_APP que sembr\u00f3 la versi\u00f3n
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

/* ============== TEXTOS DE LA WEB (pesta\u00f1a clave / valor) ==============
   Toda la copy de index.html vive aqu\u00ed para que Alejandro la edite sin
   tocar c\u00f3digo. La web pide GET ?recurso=textos al cargar y aplica lo que
   encuentre sobre su respaldo embebido. Claves con sufijo num\u00e9rico sirven
   a listas (estilo_1_nombre, sensacion_1, momento_1, nivel_1_nombre...).
   En t\u00edtulos se permite <em>...</em> (acento dorado) y <b>...</b>.
   Plantillas {nombre}/{nivel}/{diseno}: el texto entre llaves se sustituye
   en vivo, NO lo borres. */
const TEXTOS_SEMILLA = [
  ["doc_titulo", "Cuestionario de Arquitectura de Autor \u00b7 Aurum Arquitectos", "T\u00edtulo de la pesta\u00f1a del navegador"],
  ["marca_nombre", "AURUM", "Logo: l\u00ednea 1"],
  ["marca_sub", "ARQUITECTOS", "Logo: l\u00ednea 2"],
  ["marca_tagline", "Arquitectura con alma", "Logo: lema (d\u00e9jalo vac\u00edo para ocultarlo)"],
  ["logo_url", "https://drive.google.com/thumbnail?id=1gYNcDPQ8ByeS5X6qv0Qb7npCZ0IX9oQG&sz=w200", "URL del logo (\u00edcono Au de Aurum). C\u00e1mbialo por otro PNG/SVG o link Drive thumbnail?id=... cuando quieras"],
  ["cta_agenda_url", "https://calendar.google.com/calendar/appointments/schedules/AcZssZ1Ya91w0DLmmmNiykdwgq3KBlb_r1AvOQ8TThFxhjJSq44pbK43hRZQylYvS1LScMTKn0sJejdp?gv=true", "Tu p\u00e1gina de citas de Google Calendar. Puedes pegar el LINK o el c\u00f3digo <iframe> completo \u2014 el sistema extrae el link solo"],
  ["cta_agenda_label", "Agendar mi sesi\u00f3n \u2192", "Texto del bot\u00f3n de agenda"],

  ["p0_kicker", "Hermosillo, Sonora \u00b7 Residencias de autor", "Portada: antet\u00edtulo"],
  ["p0_titulo", "El <em>Cuestionario de Arquitectura de Autor</em> en 90 segundos.", "Portada: t\u00edtulo (admite <em>)"],
  ["p0_sub3", "Sin formularios eternos. Elige lo que te gusta con un click, descubre el rango de inversi\u00f3n de tu residencia y recibe en tu correo tus metros, preparados por un arquitecto. Gratis y sin compromiso.", "Portada: subt\u00edtulo (v3 \u2014 rango en pantalla, metros por correo)"],
  ["p0_btn", "Comenzar mi dise\u00f1o \u2192", "Portada: bot\u00f3n"],
  ["p0_prueba", "Decenas de familias ya dieron forma a su residencia con este proceso.", "Portada: prueba social"],

  ["p1_kicker", "01 \u00b7 Tu estilo", "Paso 1: antet\u00edtulo"],
  ["p1_titulo", "\u00bfCu\u00e1l de estas fachadas se siente m\u00e1s <em>tuya</em>?", "Paso 1: t\u00edtulo"],
  ["p1_sub", "No pienses, siente. Elige una.", "Paso 1: subt\u00edtulo"],
  ["p2_kicker", "02 \u00b7 La sensaci\u00f3n", "Paso 2: antet\u00edtulo"],
  ["p2_titulo", "Al llegar a casa, \u00bfc\u00f3mo quieres <em>sentirte</em>?", "Paso 2: t\u00edtulo"],
  ["p2_sub", "Elige hasta 3.", "Paso 2: subt\u00edtulo"],
  ["p2_btn", "Continuar \u2192", "Paso 2: bot\u00f3n"],
  ["p3_kicker", "03 \u00b7 Tu vida diaria", "Paso 3: antet\u00edtulo"],
  ["p3_titulo", "\u00bfD\u00f3nde transcurren tus mejores <em>momentos</em>?", "Paso 3: t\u00edtulo"],
  ["p3_sub", "Selecciona todos los que apliquen. Esto define los espacios de tu programa.", "Paso 3: subt\u00edtulo"],
  ["p3_btn", "Continuar \u2192", "Paso 3: bot\u00f3n"],
  ["p4_kicker", "04 \u00b7 El car\u00e1cter", "Paso 4: antet\u00edtulo"],
  ["car_titulo", "\u00bfCon cu\u00e1l de estos caracteres <em>conectas</em>?", "Paso 4 (v2): t\u00edtulo \u2014 sin jerarqu\u00eda"],
  ["car_sub", "No hay uno mejor que otro: elige el que se sienta tuyo, el que se parece a c\u00f3mo quieres vivir.", "Paso 4 (v2): subt\u00edtulo"],
  ["p5_kicker", "05 \u00b7 Lo esencial", "Paso 5: antet\u00edtulo"],
  ["p5_titulo", "Cuatro datos y tu residencia toma <em>forma</em>.", "Paso 5: t\u00edtulo"],
  ["p5_sub", "Observa la barra inferior: tu proyecto ya est\u00e1 construy\u00e9ndose.", "Paso 5: subt\u00edtulo"],
  ["p5_terreno_lab", "Terreno", "Paso 5: etiqueta terreno"],
  ["p5_terreno_sub", "Superficie aproximada", "Paso 5: ayuda terreno"],
  ["p5_hogar_lab", "Qui\u00e9nes vivir\u00e1n aqu\u00ed", "Paso 5 (v2): etiqueta del constructor de hogar"],
  ["p5_hogar_sub", "Cu\u00e9ntanos de cada integrante \u2014 solo a golpe de click", "Paso 5 (v2): ayuda del constructor"],
  ["atajo_solo", "Vivo solo", "Constructor: atajo 1"],
  ["atajo_pareja", "En pareja", "Constructor: atajo 2"],
  ["atajo_familia", "Familia con hijos", "Constructor: atajo 3"],
  ["et_adulto", "Adulto", "Constructor: etapa adulto"],
  ["et_adolescente", "Adolescente", "Constructor: etapa adolescente"],
  ["et_nino", "Ni\u00f1o", "Constructor: etapa ni\u00f1o"],
  ["tg_propia", "Rec\u00e1mara propia", "Constructor: opci\u00f3n rec\u00e1mara propia"],
  ["tg_comparte", "Comparte", "Constructor: opci\u00f3n comparte rec\u00e1mara"],
  ["hogar_resumen_tpl", "{p} personas \u00b7 {r} rec\u00e1maras", "Constructor: resumen en vivo. {p} y {r} se rellenan solos"],
  ["p5_plantas_lab", "Plantas", "Paso 5: etiqueta plantas"],
  ["p5_plantas_sub", "Niveles de la residencia", "Paso 5: ayuda plantas"],
  ["p5_autos_lab", "Veh\u00edculos", "Paso 5: etiqueta veh\u00edculos"],
  ["p5_autos_sub", "Cajones de cochera", "Paso 5: ayuda veh\u00edculos"],
  ["p5_btn", "Continuar \u2192", "Paso 5: bot\u00f3n"],
  ["p6_kicker", "06 \u00b7 Los sue\u00f1os", "Paso 6: antet\u00edtulo"],
  ["p6_titulo", "\u00bfQu\u00e9 espacios har\u00edan tu casa <em>inolvidable</em>?", "Paso 6: t\u00edtulo"],
  ["p6_sub", "Cada uno suma m\u00b2 reales de nuestro cat\u00e1logo. Agrega o quita y mira c\u00f3mo cambia tu proyecto abajo.", "Paso 6: subt\u00edtulo"],
  ["p6_btn", "Ver mi residencia \u2192", "Paso 6: bot\u00f3n"],
  ["btn_atras", "\u2190 Atr\u00e1s", "Bot\u00f3n Atr\u00e1s (todas las pantallas)"],

  ["gate_kicker", "Tu residencia est\u00e1 lista", "Captura de datos: antet\u00edtulo"],
  ["gate_titulo", "Hemos calculado tu proyecto con el <em>cat\u00e1logo oficial Aurum</em>.", "Captura: t\u00edtulo"],
  ["gate_sub3", "Dinos a d\u00f3nde enviamos tu estimado y ve tu rango de inversi\u00f3n al instante. Tus metros, revisados por un arquitecto, llegan a tu correo en menos de 24 horas.", "Captura (v3): subt\u00edtulo \u2014 rango al instante, metros por correo"],
  ["gate_ph_nombre", "Tu nombre", "Captura: placeholder nombre"],
  ["gate_ph_email", "Tu correo", "Captura: placeholder correo"],
  ["gate_ph_tel", "WhatsApp (opcional)", "Captura: placeholder WhatsApp"],
  ["gate_ph_proyecto", "\u00bfC\u00f3mo llamamos a tu proyecto? (opcional)", "Captura: placeholder proyecto"],
  ["gate_btn3", "Ver mi rango y agendar \u2192", "Captura (v3): bot\u00f3n"],
  ["gate_candado", "\ud83d\udd12 Tus datos solo se usan para enviarte tu estimaci\u00f3n. Cero spam.", "Captura: aviso de privacidad"],
  ["aviso_consentimiento", "Al continuar, aceptas nuestro <a href=\"aviso-privacidad.html\" target=\"_blank\" rel=\"noopener\">Aviso de Privacidad</a>.", "Captura: l\u00ednea de consentimiento (LFPDPPP)"],
  ["aviso_url", "aviso-privacidad.html", "Ruta del Aviso de Privacidad"],
  ["version_aviso", "2026-06-17", "Versi\u00f3n del aviso vigente (viaja al CRM con el lead)"],
  ["gate_msg_error", "Necesitamos tu nombre y un correo v\u00e1lido para enviarte tu estimado.", "Captura: mensaje de validaci\u00f3n"],

  ["r2_kicker", "Tu residencia tiene forma", "Cierre (v3): antet\u00edtulo de la franja negra"],
  ["r_lab_esp", "Espacios elegidos", "Cierre (v3): etiqueta stat 1"],
  ["r_lab_rec", "Rec\u00e1maras", "Cierre: etiqueta stat 2"],
  ["r_lab_caracter", "Car\u00e1cter", "Cierre: etiqueta stat 3"],
  ["r3_titulo_tpl", "{nombre}, tu residencia ya tiene un punto de partida.", "Cierre (v3): t\u00edtulo. SIN cifras \u2014 solo el nombre"],
  ["r2_resumen_tpl", "Tu residencia <em>{caracter}</em>, estilo {estilo}, {recamaras} rec\u00e1maras{extras}.", "Cierre: resumen cualitativo de lo que eligi\u00f3. NO borrar las llaves"],
  ["r2_resumen_extras_tpl", ", con {lista}", "Cierre: c\u00f3mo se agregan los extras al resumen"],
  ["r3_pasos_kicker", "Qu\u00e9 sigue", "Cierre (v3): antet\u00edtulo de los 2 pasos"],
  ["r3_correo_promesa", "En menos de 24 horas llega a tu correo tu estimado preparado por un arquitecto Aurum: <b>tus metros habitables y tu rango de inversi\u00f3n</b>, calculados sobre tus respuestas. Lo revisa una persona, no un algoritmo \u2014 por eso tarda horas y no segundos. Va a tu nombre, con tu folio.", "Cierre (v3): paso 1 \u2014 qu\u00e9 llega por correo (los n\u00fameros van AQU\u00cd, no en pantalla)"],
  ["r3_sesion_linea", "Y lo que no cabe en un correo lo aterrizamos contigo, en vivo, en tu <b>Sesi\u00f3n de Descubrimiento</b>: descubrimos las necesidades reales de tu vivienda y sales con los lineamientos claros de lo que tu pr\u00f3xima residencia deber\u00eda incluir.", "Cierre (v3): paso 2 \u2014 qu\u00e9 pasa en la sesi\u00f3n"],
  ["r3_correo_nota", "No publicamos precios gen\u00e9ricos porque ninguna residencia de autor lo es: tu rango naci\u00f3 de tus respuestas. Sin compromiso, siempre.", "Cierre (v3): nota anti-objeci\u00f3n"],

  ["sesion_titulo", "El siguiente paso: tu Sesi\u00f3n de Descubrimiento", "Cierre: t\u00edtulo de la sesi\u00f3n"],
  ["ses3_b1", "Descubrimos juntos las <b>necesidades reales</b> de tu vivienda \u2014 m\u00e1s all\u00e1 de los gustos, lo que tu d\u00eda a d\u00eda de verdad pide", "Cierre (v3): beneficio 1"],
  ["ses3_b2", "Los <b>lineamientos claros</b> de lo que tu pr\u00f3xima residencia deber\u00eda incluir, para avanzar con certeza", "Cierre (v3): beneficio 2"],
  ["ses3_b3", "Tu <b>Gu\u00eda Aurum de las Necesidades de tu Hogar</b>, completa y a tu nombre \u2014 te sirve incluso si construyes con alguien m\u00e1s", "Cierre (v3): beneficio 3"],
  ["ses3_b4", "20 minutos en videollamada con un arquitecto Aurum, con referencias reales del estilo que elegiste", "Cierre (v3): beneficio 4"],
  ["sesion_valor_tachado", "Valor $4,800 MXN", "Cierre: precio tachado"],
  ["sesion_gratis", "Sin costo y sin compromiso", "Cierre: 'gratis'"],
  ["r2_agenda_intro", "<b>\u00bfAvanzamos?</b> Si quieres, agenda tu Sesi\u00f3n de Descubrimiento gratis ahora mismo \u2014 la forma que prefieras. Pocas sesiones esta semana.", "Cierre: intro del calendario embebido"],
  ["r3_post_agenda", "\u00bfListo? Revisa tu correo: la invitaci\u00f3n con tu enlace de videollamada ya va en camino \u2014 y ma\u00f1ana te llega tu estimado revisado.", "Cierre (v3): cierre bajo el calendario"],
  ["r2_reaseguro", "Videollamada de 20 min \u00b7 sin compromiso \u00b7 puedes reagendar. Recibir\u00e1s la invitaci\u00f3n con el enlace de la videollamada en tu correo.", "Cierre: reaseguros bajo el calendario"],
  ["r2_fallback", "Abrir la agenda en otra pesta\u00f1a", "Cierre: link de respaldo (escritorio)"],
  ["agenda_btn_movil", "Elegir el d\u00eda y la hora de mi sesi\u00f3n \u2192", "Cierre (v3 m\u00f3vil): bot\u00f3n que abre la p\u00e1gina de citas de Google a pantalla completa (en celular el iframe se corta, por eso se usa bot\u00f3n)"],
  ["agenda_p1", "Toca el bot\u00f3n y elige el d\u00eda y la hora que te queden mejor.", "Cierre (v3 m\u00f3vil): paso 1"],
  ["agenda_p2", "Confirma con tu correo \u2014 toma 20 segundos.", "Cierre (v3 m\u00f3vil): paso 2"],
  ["agenda_p3", "Recibes al instante la invitaci\u00f3n con el enlace de tu videollamada.", "Cierre (v3 m\u00f3vil): paso 3"],
  ["sticky_btn", "Elegir mi horario \u2193", "Cierre (escritorio): bot\u00f3n fijo inferior que baja al calendario"],
  ["sesion_nota", "Agenda limitada: abrimos pocas sesiones por semana para darle a cada proyecto la atenci\u00f3n que merece.", "Cierre: nota de escasez"],
  ["r2_prueba", "Decenas de familias ya dieron forma a su residencia con este proceso.", "Cierre: prueba social"],

  ["lb_lab_residencia", "Tu residencia", "Barra inferior: etiqueta izquierda"],
  ["lb_lab_recamaras", "Rec\u00e1maras", "Barra inferior (v3): etiqueta derecha"],
  ["lb_esp_tpl", "{n} espacios", "Barra inferior (v3): texto izquierdo. {n} = n\u00ba de espacios, se rellena solo"],

  ["estilo_1_nombre", "Contempor\u00e1neo puro", "Estilo 1 (fachada Antonieta): nombre"],
  ["estilo_1_desc", "L\u00edneas limpias, vol\u00famenes francos, concreto y cristal.", "Estilo 1: descripci\u00f3n"],
  ["estilo_2_nombre", "Moderno c\u00e1lido", "Estilo 2 (fachada Alysa): nombre"],
  ["estilo_2_desc", "Madera, celos\u00edas y luz; modernidad que abraza.", "Estilo 2: descripci\u00f3n"],
  ["estilo_3_nombre", "Minimalista", "Estilo 3 (fachada Mar\u00eda): nombre"],
  ["estilo_3_desc", "Menos, pero perfecto. Silencio material.", "Estilo 3: descripci\u00f3n"],
  ["estilo_4_nombre", "Mediterr\u00e1neo contempor\u00e1neo", "Estilo 4 (fachada Zara): nombre"],
  ["estilo_4_desc", "Muros encalados, arcos suaves, vida al exterior.", "Estilo 4: descripci\u00f3n"],
  ["estilo_5_nombre", "Industrial sobrio", "Estilo 5 (fachada Barcelona): nombre"],
  ["estilo_5_desc", "Acero, piedra y car\u00e1cter sin disculpas.", "Estilo 5: descripci\u00f3n"],
  ["estilo_6_nombre", "Cl\u00e1sico atemporal", "Estilo 6 (fachada Rita): nombre"],
  ["estilo_6_desc", "Proporci\u00f3n, simetr\u00eda y elegancia que no caduca.", "Estilo 6: descripci\u00f3n"],

  ["sensacion_1", "Paz", "Sensaci\u00f3n 1"],
  ["sensacion_2", "Orgullo", "Sensaci\u00f3n 2"],
  ["sensacion_3", "Calidez", "Sensaci\u00f3n 3"],
  ["sensacion_4", "Asombro", "Sensaci\u00f3n 4"],
  ["sensacion_5", "Libertad", "Sensaci\u00f3n 5"],
  ["sensacion_6", "Intimidad", "Sensaci\u00f3n 6"],
  ["sensacion_7", "Grandeza", "Sensaci\u00f3n 7"],
  ["sensacion_8", "Frescura", "Sensaci\u00f3n 8"],

  ["momento_terraza", "Tardes en la terraza", "Momento (suma Terraza + Asador)"],
  ["momento_cocina", "Cocinar en familia", "Momento (cocina más amplia, no suma espacio)"],
  ["momento_recibir", "Recibir invitados", "Momento (suma Bar)"],
  ["momento_trabajo", "Trabajar desde casa", "Momento (suma Estudio)"],
  ["momento_entrenar", "Entrenar", "Momento (suma Cuarto de Juegos / Gym)"],
  ["momento_pelicula", "Noches de película", "Momento (suma Sala TV)"],
  ["momento_leer", "Leer en silencio", "Momento (suma Biblioteca)"],
  ["momento_nadar", "Nadar y asolearse", "Momento (suma Alberca)"],
  ["momento_jardin", "Disfrutar el jardín", "Momento (suma Jardín exterior)"],
  ["momento_visitas", "Que se queden las visitas", "Momento (suma Recámara de Visitas)"],
  ["momento_mascotas", "Convivir con mascotas", "Momento (suma Estación de Mascotas)"],
  ["momento_taller", "Un taller o hobby", "Momento (suma Taller)"],
  ["momento_huerto", "Cultivar mi huerto", "Momento (suma Huerto exterior)"],
  ["momento_ninguno", "Nada en particular por ahora", "Momento neutro: no suma nada"],

  ["caracter_1_nombre", "Serena", "Car\u00e1cter 1 (interno: Acogedora): nombre \u2014 son 4 caracteres LATERALES, ninguno es 'm\u00e1s' que otro"],
  ["caracter_1_desc", "C\u00e1lida y envolvente. Pocos materiales, mucha intimidad.", "Car\u00e1cter 1: descripci\u00f3n"],
  ["caracter_1_mood", "calma", "Car\u00e1cter 1: palabra-atm\u00f3sfera (en oro, arriba del nombre)"],
  ["caracter_2_nombre", "Sobria", "Car\u00e1cter 2 (interno: Elegante): nombre"],
  ["caracter_2_desc", "Materiales nobles y luz medida. Calma con presencia.", "Car\u00e1cter 2: descripci\u00f3n"],
  ["caracter_2_mood", "presencia", "Car\u00e1cter 2: palabra-atm\u00f3sfera"],
  ["caracter_3_nombre", "C\u00e1lida", "Car\u00e1cter 3 (interno: Casual): nombre"],
  ["caracter_3_desc", "Clara y sin excesos. Lo necesario, muy bien resuelto.", "Car\u00e1cter 3: descripci\u00f3n"],
  ["caracter_3_mood", "calidez", "Car\u00e1cter 3: palabra-atm\u00f3sfera"],
  ["caracter_4_nombre", "De autor", "Car\u00e1cter 4 (interno: Lujo): nombre"],
  ["caracter_4_desc", "Una pieza \u00fanica: cada vista, una postal.", "Car\u00e1cter 4: descripci\u00f3n"],
  ["caracter_4_mood", "distinci\u00f3n", "Car\u00e1cter 4: palabra-atm\u00f3sfera"],
  ["correo_conf_activo", "si", "Correo automatico de confirmacion al recibir un lead: si | no"],
  ["correo_conf_remitente", "Aurum Arquitectos", "Nombre visible del remitente del correo de confirmacion"],
  ["correo_conf_asunto", "Tu residencia Aurum est\u00e1 lista, {nombre}", "Asunto del correo de confirmacion. Tokens: {nombre}"],
  ["correo_conf_cuerpo", "Hola {nombre},<br><br>Gracias por dise\u00f1ar tu residencia con Aurum. Esto fue lo que elegiste:<br><br><b>Estilo {estilo} \u00b7 car\u00e1cter {caracter} \u00b7 {rec} rec\u00e1maras{extras} \u00b7 \u2248{m2} m\u00b2</b><br><br>Tu estimado detallado \u2014tus metros y tu rango de inversi\u00f3n\u2014 te llega en menos de 24 horas, revisado por un arquitecto, no un algoritmo.<br><br>Si quieres avanzar ya, agenda tu Sesi\u00f3n de Descubrimiento gratis aqu\u00ed:<br><a href=\"{agenda}\">{agenda}</a><br><br>Folio: {folio}<br><br>\u2014 Aurum Arquitectos", "Cuerpo HTML. Tokens: {nombre}{estilo}{caracter}{rec}{extras}{m2}{folio}{agenda}. SIN precio."]
];

const HEADERS_TEXTOS = ["clave", "valor", "nota (no se usa en la web)"];

/* Lee TEXTOS WEB y devuelve { clave: valor }. Si la pesta\u00f1a no existe o
   est\u00e1 vac\u00eda, devuelve {} y la web se queda con su respaldo embebido. */
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
  // a prueba de pegados: si Alejandro pega el c\u00f3digo <iframe> completo de
  // Google Calendar en cta_agenda_url, aqu\u00ed se extrae el link limpio
  if (out.cta_agenda_url) {
    out.cta_agenda_url = limpiarUrlAgenda_(out.cta_agenda_url);
  }
  return out;
}

/* Acepta el LINK de la p\u00e1gina de citas O el snippet <iframe ...> completo
   que da Google Calendar; devuelve siempre la URL limpia con ?gv=true
   (sin gv=true, Calendar rechaza cargar embebido en otra p\u00e1gina). */
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

/* Crea la pesta\u00f1a TEXTOS WEB (si no existe) y la rellena con los textos
   por defecto. NO pisa lo que Alejandro ya haya editado: solo agrega las
   claves que falten. Ejec\u00fatala una vez tras desplegar; repetirla es seguro
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
    Object.keys(existentes).length + " ya exist\u00edan";
}

/* Reescribe (force-update) en TEXTOS WEB las claves del reframe "Sesion de
   Descubrimiento" + el 45->20, tomando el valor de TEXTOS_SEMILLA (la lista
   canonica ya sincronizada en este archivo). A diferencia de sembrarTextos(),
   SI pisa el valor existente (columna B), porque la intencion es reemplazar la
   copy vieja. Ademas hace un reemplazo global 'Sesion de Diseno' -> 'Sesion de
   Descubrimiento' en TODA la columna B (atrapa textos editados a mano, p.ej. el
   paso 1 / r3_correo_promesa, sin pisar el resto de su redaccion). Solo toca la
   columna B (valor); respeta la C (nota). Si una clave no existe aun en la hoja,
   la agrega con su nota. Correr UNA sola vez tras desplegar; idempotente. */
function actualizarSesion() {
  var CLAVES = ["sesion_titulo", "ses3_b1", "ses3_b2", "ses3_b4",
    "r3_sesion_linea", "r2_agenda_intro", "r2_reaseguro", "correo_conf_cuerpo",
    "r_lab_esp", "p0_prueba", "r2_prueba"];
  var ss = SpreadsheetApp.openById(CRM_ID);
  var hoja = ss.getSheetByName(TAB_TEXTOS);
  if (!hoja) return "ERROR: falta la pestana " + TAB_TEXTOS + "; corre sembrarTextos() primero.";
  var fila = {}, renombradas = 0;
  var n = hoja.getLastRow() - 1;
  if (n >= 1) {
    var rango = hoja.getRange(2, 1, n, 2);          // A:B desde la fila 2
    var vals = rango.getValues();
    var viejo = "Sesi\u00f3n de Dise\u00f1o", nuevo = "Sesi\u00f3n de Descubrimiento";
    for (var i = 0; i < vals.length; i++) {
      var k = String(vals[i][0] == null ? "" : vals[i][0]).trim();
      if (k) fila[k] = i + 2;
      var v = String(vals[i][1] == null ? "" : vals[i][1]);
      if (v.indexOf(viejo) !== -1) { vals[i][1] = v.split(viejo).join(nuevo); renombradas++; }
    }
    rango.setValues(vals);                          // reescribe A:B (A igual; B con el rename global)
  }
  var semilla = {};
  TEXTOS_SEMILLA.forEach(function (r) { semilla[r[0]] = r; });
  var actualizadas = [], agregadas = [], faltan = [];
  CLAVES.forEach(function (k) {
    var r = semilla[k];
    if (!r) { faltan.push(k); return; }
    if (fila[k]) {
      hoja.getRange(fila[k], 2).setValue(r[1]);
      actualizadas.push(k);
    } else {
      hoja.appendRow(r);
      agregadas.push(k);
    }
  });
  return "actualizarSesion OK | rename Diseno->Descubrimiento en " + renombradas + " celda(s)" +
    " | actualizadas: " + actualizadas.join(", ") +
    " | agregadas: " + (agregadas.join(", ") || "ninguna") +
    (faltan.length ? " | FALTAN en TEXTOS_SEMILLA: " + faltan.join(", ") : "");
}

/* Lee MOMENTOS WEB (clave / espacios) y devuelve
   { momento_1:["terraza","asador"], momento_2:[], ... }.
   Si la pestana no existe o falla, devuelve null y la web usa su mapeo
   embebido (const MOMENTOS en index.html). La columna "espacios" es una
   lista de CLAVES de espacio separadas por coma (terraza,asador). La web
   ignora claves que no existan en el catalogo. */
function leerMomentos_() {
  try {
    const ss = SpreadsheetApp.openById(CRM_ID);
    const hoja = ss.getSheetByName(TAB_MOMENTOS);
    if (!hoja || hoja.getLastRow() < 2) return null;
    const vals = hoja.getRange(2, 1, hoja.getLastRow() - 1, 2).getValues();
    const out = {};
    vals.forEach(function (f) {
      const k = String(f[0] == null ? "" : f[0]).trim();
      if (!/^momento_\d+$/.test(k)) return;
      const raw = String(f[1] == null ? "" : f[1]).trim();
      out[k] = raw ? raw.split(",").map(function (s) { return s.trim(); })
        .filter(function (s) { return s; }) : [];
    });
    return Object.keys(out).length ? out : null;
  } catch (err) {
    return null;
  }
}

/* Crea la pestana MOMENTOS WEB (si no existe) y la rellena con el mapeo
   actual. Idempotente: solo agrega las claves que falten, nunca pisa lo que
   ya editaste. Ejecutala una vez tras desplegar. */
const MOMENTOS_SEMILLA = [
  ["momento_1", "terraza,asador", "Tardes en la terraza"],
  ["momento_2", "", "Cocinar en familia (la cocina es base, no suma espacio)"],
  ["momento_3", "bar", "Recibir invitados"],
  ["momento_4", "estudio", "Trabajar desde casa"],
  ["momento_5", "cuarto_juegos", "Entrenar"],
  ["momento_6", "sala_tv", "Noches de pelicula"],
  ["momento_7", "biblioteca", "Leer en silencio"],
  ["momento_8", "alberca", "Nadar y asolearse"]
];
function sembrarMomentos() {
  const ss = SpreadsheetApp.openById(CRM_ID);
  let hoja = ss.getSheetByName(TAB_MOMENTOS);
  if (!hoja) {
    hoja = ss.insertSheet(TAB_MOMENTOS);
    hoja.appendRow(["clave", "espacios", "nota"]);
    hoja.setFrozenRows(1);
    hoja.getRange(1, 1, 1, 3).setFontWeight("bold");
    hoja.setColumnWidth(1, 140);
    hoja.setColumnWidth(2, 240);
    hoja.setColumnWidth(3, 360);
  }
  const existentes = {};
  if (hoja.getLastRow() >= 2) {
    hoja.getRange(2, 1, hoja.getLastRow() - 1, 1).getValues().forEach(function (f) {
      const k = String(f[0] == null ? "" : f[0]).trim();
      if (k) existentes[k] = true;
    });
  }
  const nuevas = MOMENTOS_SEMILLA.filter(function (r) { return !existentes[r[0]]; });
  if (nuevas.length) {
    hoja.getRange(hoja.getLastRow() + 1, 1, nuevas.length, 3).setValues(nuevas);
  }
  return "MOMENTOS WEB listo: " + nuevas.length + " filas agregadas, " +
    Object.keys(existentes).length + " ya existian";
}

function testMomentos() {
  Logger.log(JSON.stringify(leerMomentos_(), null, 2));
}

/* Lee CONFIG WEB (clave / valor) y devuelve el mapeo amplitud -> tamano
   { optimizada:"chico", comoda:"mediano", holgada:"grande" } a partir de las
   claves amplitud_optimizada / amplitud_comoda / amplitud_holgada. Solo acepta
   valores chico|mediano|grande. null si la pestana no existe o no trae nada
   valido: la web usa entonces su mapeo embebido. Es lo UNICO del calculo que
   estaba en codigo; con esto Alejandro lo controla desde el Sheet sin tocar nada. */
function leerAmplitudTamano_() {
  try {
    const ss = SpreadsheetApp.openById(CRM_ID);
    const hoja = ss.getSheetByName(TAB_CONFIG);
    if (!hoja || hoja.getLastRow() < 2) return null;
    const vals = hoja.getRange(2, 1, hoja.getLastRow() - 1, 2).getValues();
    const CLAVES = { amplitud_optimizada: "optimizada", amplitud_comoda: "comoda", amplitud_holgada: "holgada" };
    const out = {};
    let ok = false;
    vals.forEach(function (f) {
      const k = String(f[0] == null ? "" : f[0]).trim();
      const v = String(f[1] == null ? "" : f[1]).trim().toLowerCase();
      if (CLAVES[k] && (v === "chico" || v === "mediano" || v === "grande")) { out[CLAVES[k]] = v; ok = true; }
    });
    return ok ? out : null;
  } catch (err) {
    return null;
  }
}

/* Crea la pestana CONFIG WEB (si no existe) con el mapeo amplitud -> tamano.
   Idempotente. Ejecutala una vez tras desplegar. Asi Alejandro mueve el calculo
   del tamano desde el Sheet sin depender de nadie. */
const CONFIG_SEMILLA = [
  ["amplitud_optimizada", "chico", "Tamano que usa 'Optimizada' (chico | mediano | grande)"],
  ["amplitud_comoda", "mediano", "Tamano que usa 'Comoda' (chico | mediano | grande)"],
  ["amplitud_holgada", "grande", "Tamano que usa 'Holgada' (chico | mediano | grande)"]
];
function sembrarConfig() {
  const ss = SpreadsheetApp.openById(CRM_ID);
  let hoja = ss.getSheetByName(TAB_CONFIG);
  if (!hoja) {
    hoja = ss.insertSheet(TAB_CONFIG);
    hoja.appendRow(["clave", "valor", "nota"]);
    hoja.setFrozenRows(1);
    hoja.getRange(1, 1, 1, 3).setFontWeight("bold");
    hoja.setColumnWidth(1, 200);
    hoja.setColumnWidth(2, 130);
    hoja.setColumnWidth(3, 420);
  }
  const existentes = {};
  if (hoja.getLastRow() >= 2) {
    hoja.getRange(2, 1, hoja.getLastRow() - 1, 1).getValues().forEach(function (f) {
      const k = String(f[0] == null ? "" : f[0]).trim();
      if (k) existentes[k] = true;
    });
  }
  const nuevas = CONFIG_SEMILLA.filter(function (r) { return !existentes[r[0]]; });
  if (nuevas.length) hoja.getRange(hoja.getLastRow() + 1, 1, nuevas.length, 3).setValues(nuevas);
  return "CONFIG WEB listo: " + nuevas.length + " filas agregadas, " +
    Object.keys(existentes).length + " ya existian";
}

function testConfig() {
  Logger.log(JSON.stringify(leerAmplitudTamano_(), null, 2));
}

function testTextos() {
  Logger.log(JSON.stringify(leerTextos_(), null, 2));
}

/* ===================== UTILER\u00cdAS Y PRUEBAS ===================== */

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
        estilo: "Moderno c\u00e1lido",
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
