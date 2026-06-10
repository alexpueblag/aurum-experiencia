/**
 * Apps Script central — Aurum Experiencia
 * Un solo Web App con las DOS conexiones a los archivos raíz de Alejandro:
 *
 *  ENTRADA (catálogo → app):
 *    GET ?recurso=catalogo → devuelve el catálogo vigente leído de las
 *    pestañas CATALOGO_APP y PRECIOS_APP del Sheet "Au : Residencia Nueva".
 *    index.html lo carga en cada visita: si Alejandro mueve un m² o un
 *    precio ahí, la web lo refleja sin tocar código.
 *
 *  SALIDA (leads → CRM):
 *    POST (JSON de revelar()) → UPSERT por email en la pestaña "LEADS - WEB"
 *    del Sheet "CRM - YOD". Si el cliente ya existe se ACTUALIZA su mismo
 *    renglón (jamás se duplica); si no, se crea con Estado=NUEVO.
 *
 *  SINCRONÍA (catálogo → Drive JSON):
 *    actualizarCatalogoDriveJson() regenera el archivo aurum-catalogo.json
 *    de Drive desde las mismas pestañas, para que la tarea diaria de las
 *    8 AM siga leyendo de donde mismo. instalarTriggers() lo agenda a las 7 AM.
 *
 * CÓMO DESPLEGAR (una sola vez, ~5 minutos):
 * 1. Abre el Sheet "CRM - YOD" → Extensiones → Apps Script.
 * 2. Borra Code.gs, pega este archivo completo y guarda.
 * 3. Ejecuta la función inicializarCatalogo() (botón ▶). Autoriza permisos.
 *    → Crea las pestañas CATALOGO_APP y PRECIOS_APP en "Au : Residencia
 *      Nueva" sembradas con el catálogo v11 actual. Desde ese momento esas
 *      dos pestañas son EL lugar donde se editan medidas y precios.
 * 4. Ejecuta instalarTriggers() → regenera el JSON de Drive a diario, 7 AM.
 * 5. Implementar → Nueva implementación → "Aplicación web":
 *      Ejecutar como: Tú · Acceso: Cualquier usuario.
 * 6. Copia la URL /exec y pégala en const WEBHOOK_URL de index.html.
 *
 * Pruebas sin la web: testCatalogo() y testInsertarLead().
 */

const CRM_ID = "1z1ZtvcUKnx4MUfxLICo8x5bTihlDY8tBC3j2sYwNvg8";          // CRM - YOD
const CATALOGO_SHEET_ID = "10gsWRjGg9r9gvyl15VRBfeBKcUaafqNtiuGC0kUbEsg"; // Au : Residencia Nueva
const CATALOGO_JSON_DRIVE_ID = "1SeLYpWQl6KwCqSrY6wsB41eltRkKXbNk";      // aurum-catalogo.json

const TAB_LEADS = "LEADS - WEB";
const TAB_CATALOGO = "CATALOGO_APP";
const TAB_PRECIOS = "PRECIOS_APP";

// La heurística es lógica de negocio (no medidas/precios); vive aquí y se
// inyecta al regenerar el JSON. Cambiarla = editar el script, a propósito.
const HEURISTICA = {
  tamano_default_por_terreno: { "< 300": "chico", "300 - 500": "chico", "500 - 800": "mediano", "> 800": "grande" },
  tamano_override_por_lujo: {
    Modesta: "chico", Acogedora: "chico", Casual: "chico",
    Elegante: "mediano", Premium: "mediano", Alto: "mediano", Vanguardista: "mediano",
    Monumental: "grande", Lujo: "grande", Luxury: "grande", Glamoroso: "grande"
  },
  recamaras_por_personas: {
    "1": ["recamara_principal"], "2": ["recamara_principal"],
    "3": ["recamara_principal", "recamara_2"],
    "4": ["recamara_principal", "recamara_2", "recamara_3"],
    "5": ["recamara_principal", "recamara_2", "recamara_3", "recamara_4"],
    "6": ["recamara_principal", "recamara_2", "recamara_3", "recamara_4"],
    "7+": ["recamara_principal", "recamara_2", "recamara_3", "recamara_4", "recamara_5"]
  },
  espacios_base_siempre: ["acceso_escalera", "sala", "comedor", "cocina", "medio_bano", "lavanderia"],
  espacios_opcionales_preguntar: [
    "sala_tv", "estudio", "biblioteca", "bar", "cuarto_juegos", "butlers_pantry",
    "cuarto_blancos", "bodega", "cuarto_servicio", "depto_extra", "taller",
    "terraza", "balcon", "asador", "alberca", "espejo_agua", "huerto", "cochera"
  ]
};

/* ===================== WEB APP ===================== */

function doGet(e) {
  try {
    if (e && e.parameter && e.parameter.recurso === "catalogo") {
      return respuesta_(construirCatalogo_());
    }
    return respuesta_({ ok: true, servicio: "aurum-experiencia", recursos: ["GET ?recurso=catalogo", "POST lead JSON"] });
  } catch (err) {
    return respuesta_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const lead = JSON.parse(e.postData.contents);
    const resultado = upsertLead_(lead, e.postData.contents);
    return respuesta_({ ok: true, accion: resultado });
  } catch (err) {
    return respuesta_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/* ===================== LEADS: UPSERT POR EMAIL ===================== */

const HEADERS_LEADS = [
  "Primer contacto", "Última actualización", "Folio", "Nombre", "Email",
  "WhatsApp", "Proyecto", "Estilo", "Sensaciones", "Momentos", "Nivel",
  "Terreno m2", "Personas", "Plantas", "Autos", "Extras",
  "M2 habitables", "M2 totales", "Rango bajo MXN", "Rango alto MXN",
  "Estado", "Brief", "Sesión agendada", "QAA completo", "Notas", "JSON"
];

function upsertLead_(lead, rawJson) {
  const hoja = obtenerHojaLeads_();
  const headers = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];
  const col = function (nombre) {
    const i = headers.indexOf(nombre);
    if (i < 0) throw new Error("Falta columna en LEADS - WEB: " + nombre);
    return i + 1;
  };

  const ahora = new Date();
  const email = String(lead.email || "").trim().toLowerCase();
  const c = lead.calculo || {};
  const datos = {
    "Nombre": lead.nombre || "", "Email": lead.email || "", "WhatsApp": lead.tel || "",
    "Proyecto": lead.proyecto || "", "Estilo": lead.estilo || "",
    "Sensaciones": (lead.sensaciones || []).join(", "),
    "Momentos": (lead.momentos || []).join(", "),
    "Nivel": lead.nivel || "", "Terreno m2": lead.terreno || "",
    "Personas": lead.personas || "", "Plantas": lead.plantas || "", "Autos": lead.autos || "",
    "Extras": (lead.extras || []).join(", "),
    "M2 habitables": c.m2hab || "", "M2 totales": c.total || "",
    "Rango bajo MXN": c.rango ? c.rango[0] : "", "Rango alto MXN": c.rango ? c.rango[1] : "",
    "JSON": rawJson
  };

  // buscar renglón existente por email (insensible a mayúsculas/espacios)
  let fila = 0;
  if (email) {
    const emails = hoja.getRange(2, col("Email"), Math.max(hoja.getLastRow() - 1, 1), 1).getValues();
    for (let i = 0; i < emails.length; i++) {
      if (String(emails[i][0]).trim().toLowerCase() === email) { fila = i + 2; break; }
    }
  }

  if (fila) {
    // MISMO RENGLÓN: actualizar datos sin pisar el seguimiento
    Object.keys(datos).forEach(function (k) { hoja.getRange(fila, col(k)).setValue(datos[k]); });
    hoja.getRange(fila, col("Última actualización")).setValue(ahora);
    const celdaEstado = hoja.getRange(fila, col("Estado"));
    if (!celdaEstado.getValue()) celdaEstado.setValue("NUEVO");
    const celdaFolio = hoja.getRange(fila, col("Folio"));
    if (!celdaFolio.getValue()) {
      celdaFolio.setValue(lead.folio || "");
    } else if (lead.folio && celdaFolio.getValue() !== lead.folio) {
      const celdaNotas = hoja.getRange(fila, col("Notas"));
      const previa = celdaNotas.getValue();
      celdaNotas.setValue((previa ? previa + " | " : "") +
        "Re-envío web " + Utilities.formatDate(ahora, Session.getScriptTimeZone(), "yyyy-MM-dd") +
        " (folio " + lead.folio + ")");
    }
    return "actualizado renglón " + fila;
  }

  // cliente nuevo
  const filaNueva = headers.map(function (h) {
    if (h === "Primer contacto" || h === "Última actualización") return ahora;
    if (h === "Folio") return lead.folio || "";
    if (h === "Estado") return "NUEVO";
    return (h in datos) ? datos[h] : "";
  });
  hoja.appendRow(filaNueva);
  return "creado renglón " + hoja.getLastRow();
}

function obtenerHojaLeads_() {
  const ss = SpreadsheetApp.openById(CRM_ID);
  let hoja = ss.getSheetByName(TAB_LEADS);
  if (!hoja) {
    hoja = ss.insertSheet(TAB_LEADS);
    hoja.appendRow(HEADERS_LEADS);
    hoja.setFrozenRows(1);
  }
  return hoja;
}

/* ===================== CATÁLOGO: SHEET → JSON ===================== */

function construirCatalogo_() {
  const ss = SpreadsheetApp.openById(CATALOGO_SHEET_ID);
  if (!ss.getSheetByName(TAB_CATALOGO) || !ss.getSheetByName(TAB_PRECIOS)) inicializarCatalogo();

  // --- espacios ---
  const hojaCat = ss.getSheetByName(TAB_CATALOGO);
  const filas = hojaCat.getDataRange().getValues();
  const hd = filas[0];
  const ix = function (n) { return hd.indexOf(n); };
  const espacios = {};
  for (let r = 1; r < filas.length; r++) {
    const f = filas[r];
    const clave = String(f[ix("clave")] || "").trim();
    if (!clave) continue;
    const esp = {
      nombre_display: String(f[ix("nombre")] || clave),
      habitable: f[ix("habitable")] === true || String(f[ix("habitable")]).toUpperCase() === "TRUE"
    };
    const unidad = String(f[ix("unidad")] || "").trim();
    if (unidad) esp.unidad = unidad;
    ["chico", "mediano", "grande"].forEach(function (t) {
      const m2 = Number(f[ix("m2_" + t)]);
      if (isNaN(m2)) throw new Error("m2_" + t + " inválido en " + clave);
      const tam = { dim: String(f[ix("dim_" + t)] || ""), m2: m2 };
      const extras = parseExtras_(f[ix("extras_" + t)]);
      if (extras) tam.extras = extras;
      esp[t] = tam;
    });
    espacios[clave] = esp;
  }

  // --- precios ---
  const hojaPre = ss.getSheetByName(TAB_PRECIOS);
  const precios = {};
  hojaPre.getDataRange().getValues().slice(1).forEach(function (f) {
    const k = String(f[0] || "").trim();
    if (k) precios[k] = Number(f[1]);
  });
  ["llave_en_mano", "proyecto_ejecutivo", "diseno_arquitectonico",
   "banda_estimacion_baja", "banda_estimacion_alta", "cochera_m2_por_auto"].forEach(function (k) {
    if (!(k in precios) || isNaN(precios[k])) throw new Error("Falta o es inválido el concepto '" + k + "' en " + TAB_PRECIOS);
  });
  const mult = {};
  Object.keys(precios).forEach(function (k) {
    if (k.indexOf("mult_") === 0) mult[k.slice(5)] = precios[k];
  });

  return {
    _meta: {
      version: "sheet-live",
      fecha: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"),
      fuente: "Au : Residencia Nueva → pestañas " + TAB_CATALOGO + " / " + TAB_PRECIOS,
      descripcion: "Catálogo oficial Aurum. Los m² de cada espacio vienen de esta tabla, NUNCA se inventan. Los sub-espacios 'extra' se suman automáticamente al m² del espacio padre cuando éste se selecciona.",
      notas: {
        factor_circulacion: "NO aplicar multiplicador - la circulación ya está embebida en los m² del catálogo",
        cotizacion: "Solo espacios con habitable=true entran en la base de cotización. Los no-habitables se muestran en el brief como referencia informativa."
      }
    },
    espacios: espacios,
    heuristica_pre_seleccion: HEURISTICA,
    cotizacion_2026: {
      precios_mxn_por_m2: {
        llave_en_mano: precios.llave_en_mano,
        proyecto_ejecutivo: precios.proyecto_ejecutivo,
        diseno_arquitectonico: precios.diseno_arquitectonico
      },
      multiplicador_lujo: mult,
      base_de_cotizacion: "Solo m² habitables. Los espacios con habitable=false se muestran en el brief pero NO entran en la multiplicación."
    },
    app: {
      banda_estimacion_baja: precios.banda_estimacion_baja,
      banda_estimacion_alta: precios.banda_estimacion_alta,
      cochera_m2_por_auto: precios.cochera_m2_por_auto
    }
  };
}

function parseExtras_(celda) {
  const s = String(celda || "").trim();
  if (!s) return null;
  const out = {};
  s.split(";").forEach(function (par) {
    const partes = par.split(":");
    if (partes.length !== 2) throw new Error("Extra mal formado (usa 'Nombre:m2; Nombre:m2'): " + s);
    const m2 = Number(partes[1]);
    if (isNaN(m2)) throw new Error("m² de extra inválido: " + par);
    out[partes[0].trim()] = m2;
  });
  return out;
}

/* Regenera aurum-catalogo.json en Drive desde las pestañas (lo que lee la
   tarea diaria de las 8 AM). Se agenda con instalarTriggers(). */
function actualizarCatalogoDriveJson() {
  const cat = construirCatalogo_();
  DriveApp.getFileById(CATALOGO_JSON_DRIVE_ID).setContent(JSON.stringify(cat, null, 2));
}

function instalarTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "actualizarCatalogoDriveJson") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("actualizarCatalogoDriveJson").timeBased().everyDays(1).atHour(7).create();
}

/* ===================== SIEMBRA INICIAL ===================== */

/* Crea CATALOGO_APP y PRECIOS_APP en "Au : Residencia Nueva" sembradas con
   el catálogo v11 vigente (leído del JSON de Drive). NO toca pestañas
   existentes: si ya están creadas, no hace nada. */
function inicializarCatalogo() {
  const ss = SpreadsheetApp.openById(CATALOGO_SHEET_ID);
  const v11 = JSON.parse(DriveApp.getFileById(CATALOGO_JSON_DRIVE_ID).getBlob().getDataAsString());

  if (!ss.getSheetByName(TAB_CATALOGO)) {
    const hoja = ss.insertSheet(TAB_CATALOGO);
    const hd = ["clave", "nombre", "habitable",
                "dim_chico", "m2_chico", "dim_mediano", "m2_mediano", "dim_grande", "m2_grande",
                "extras_chico", "extras_mediano", "extras_grande", "unidad"];
    const filas = [hd];
    Object.keys(v11.espacios).forEach(function (clave) {
      const e = v11.espacios[clave];
      const ex = function (t) {
        if (!e[t].extras) return "";
        return Object.keys(e[t].extras).map(function (n) { return n + ":" + e[t].extras[n]; }).join("; ");
      };
      filas.push([clave, e.nombre_display, e.habitable,
                  e.chico.dim, e.chico.m2, e.mediano.dim, e.mediano.m2, e.grande.dim, e.grande.m2,
                  ex("chico"), ex("mediano"), ex("grande"), e.unidad || ""]);
    });
    hoja.getRange(1, 1, filas.length, hd.length).setValues(filas);
    hoja.setFrozenRows(1);
    hoja.getRange(1, 1, 1, hd.length).setFontWeight("bold");
  }

  if (!ss.getSheetByName(TAB_PRECIOS)) {
    const hoja = ss.insertSheet(TAB_PRECIOS);
    const p = v11.cotizacion_2026.precios_mxn_por_m2;
    const filas = [
      ["concepto", "valor", "descripcion"],
      ["llave_en_mano", p.llave_en_mano, "Precio obra llave en mano, MXN por m² habitable"],
      ["proyecto_ejecutivo", p.proyecto_ejecutivo, "Proyecto ejecutivo, MXN por m² habitable"],
      ["diseno_arquitectonico", p.diseno_arquitectonico, "Diseño arquitectónico, MXN por m² habitable"]
    ];
    const mult = v11.cotizacion_2026.multiplicador_lujo;
    Object.keys(mult).forEach(function (n) {
      filas.push(["mult_" + n, mult[n], "Multiplicador de lujo: " + n]);
    });
    filas.push(["banda_estimacion_baja", 0.95, "Límite inferior del rango mostrado en la web (× cotización base)"]);
    filas.push(["banda_estimacion_alta", 1.12, "Límite superior del rango mostrado en la web (× cotización base)"]);
    filas.push(["cochera_m2_por_auto", 18, "m² por vehículo que usa la web (lineal); los escalones 36/54/72 del catálogo siguen en la fila 'cochera'"]);
    hoja.getRange(1, 1, filas.length, 3).setValues(filas);
    hoja.setFrozenRows(1);
    hoja.getRange(1, 1, 1, 3).setFontWeight("bold");
  }
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

function testInsertarLead() {
  const fake = {
    postData: {
      contents: JSON.stringify({
        folio: "AUR-TEST-XX", nombre: "Lead de Prueba", email: "test@test.com",
        tel: "6620000000", proyecto: "Prueba webhook", estilo: "moderno_calido",
        sensaciones: ["Paz", "Calidez"], momentos: ["Tardes en la terraza"], nivel: "Elegante",
        terreno: 500, personas: 4, plantas: 2, autos: 2,
        extras: ["terraza", "estudio"],
        calculo: { m2hab: 180, total: 240, rango: [3500000, 4200000] }
      })
    }
  };
  Logger.log(doPost(fake).getContent());
}
