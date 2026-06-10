/**
 * Apps Script central — Aurum Experiencia
 * Un solo Web App con las DOS conexiones a los archivos raíz de Alejandro.
 * El catálogo se lee DIRECTO de las hojas de Alejandro tal como ya están:
 * NO se crean pestañas nuevas, no hay que cambiar de lugar nada.
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
 *
 * Pruebas sin la web: testCatalogo() y testInsertarLead().
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
const HOJA_ESPACIOS = "VIVIENDA NUEVA";
const HOJA_ANALISIS = "ANÁLISIS OBRA NUEVA";

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
  "TALLER": "taller"
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
  cuarto_blancos: "Cuarto de Blancos", bodega: "Bodega", taller: "Taller"
};

// qué espacios cotizan (la hoja no lo marca): los NO habitables se
// muestran en brief/web pero no entran a la multiplicación
const NO_HABITABLES = {
  asador: 1, terraza: 1, balcon: 1, cochera: 1,
  espejo_agua: 1, huerto: 1, alberca: 1, taller: 1
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
                     grande: { "Baño": 4 } }
};

// banda del rango mostrado en la web (x cotización base)
const BANDA = { baja: 0.95, alta: 1.12 };

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
    return respuesta_({
      ok: true,
      servicio: "aurum-experiencia",
      recursos: ["GET ?recurso=catalogo", "POST lead JSON"]
    });
  } catch (err) {
    return respuesta_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const lead = JSON.parse(e.postData.contents);
    const resultado = upsertLead_(lead, e.postData.contents);
    return respuesta_({ ok: true, accion: resultado });
  } catch (err) {
    return respuesta_({ ok: false, error: String(err) });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
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
    "Email": lead.email || "",
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
      factor_circulacion: "NO aplicar multiplicador - la circulación " +
        "ya está embebida en los m² del catálogo",
      cotizacion: "Solo espacios con habitable=true entran en la base " +
        "de cotización. Los no-habitables se muestran en el brief " +
        "como referencia informativa."
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
      base_de_cotizacion: "Solo m² habitables. Los espacios con " +
        "habitable=false se muestran en el brief pero NO entran en " +
        "la multiplicación."
    },
    app: {
      banda_estimacion_baja: BANDA.baja,
      banda_estimacion_alta: BANDA.alta,
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
