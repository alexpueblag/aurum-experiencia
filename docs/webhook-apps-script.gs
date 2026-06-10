/**
 * Webhook de leads — Aurum Experiencia
 * Recibe el payload JSON que envía revelar() en index.html y lo inserta
 * como fila nueva en la pestaña "LEADS - WEB" del Sheet "CRM - YOD",
 * para que la automatización diaria (docs/tarea-programada-qaa.md)
 * genere el borrador de brief + cotización igual que hoy.
 *
 * CÓMO DESPLEGAR (una sola vez, ~3 minutos):
 * 1. Abre el Sheet "CRM - YOD" → Extensiones → Apps Script.
 * 2. Borra el contenido de Code.gs y pega este archivo completo. Guarda.
 * 3. Implementar → Nueva implementación → tipo "Aplicación web":
 *      - Ejecutar como: Tú (direccion@aurumarquitectos.com)
 *      - Quién tiene acceso: Cualquier usuario
 * 4. Autoriza los permisos cuando lo pida y copia la URL que termina en /exec.
 * 5. Pega esa URL en const WEBHOOK_URL al inicio del <script> de index.html.
 *
 * Para probar sin la app: pestaña de funciones → ejecuta testInsertarLead()
 * y verifica que aparezca una fila de prueba en "LEADS - WEB".
 */

const SPREADSHEET_ID = "1z1ZtvcUKnx4MUfxLICo8x5bTihlDY8tBC3j2sYwNvg8"; // CRM - YOD
const TAB_LEADS = "LEADS - WEB";

const HEADERS = [
  "Timestamp", "Folio", "Nombre", "Email", "WhatsApp", "Proyecto",
  "Estilo", "Sensaciones", "Momentos", "Nivel",
  "Terreno m2", "Personas", "Plantas", "Autos", "Extras",
  "M2 habitables", "M2 totales", "Rango bajo MXN", "Rango alto MXN",
  "Estado", "JSON"
];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const lead = JSON.parse(e.postData.contents);
    const hoja = obtenerHoja_();
    hoja.appendRow([
      new Date(),
      lead.folio || "",
      lead.nombre || "",
      lead.email || "",
      lead.tel || "",
      lead.proyecto || "",
      lead.estilo || "",
      (lead.sensaciones || []).join(", "),
      (lead.momentos || []).join(", "),
      lead.nivel || "",
      lead.terreno || "",
      lead.personas || "",
      lead.plantas || "",
      lead.autos || "",
      (lead.extras || []).join(", "),
      lead.calculo ? lead.calculo.m2hab : "",
      lead.calculo ? lead.calculo.total : "",
      lead.calculo && lead.calculo.rango ? lead.calculo.rango[0] : "",
      lead.calculo && lead.calculo.rango ? lead.calculo.rango[1] : "",
      "NUEVO",
      e.postData.contents
    ]);
    return respuesta_({ ok: true });
  } catch (err) {
    return respuesta_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Health check: abrir la URL /exec en el navegador debe mostrar {"ok":true,...}
function doGet() {
  return respuesta_({ ok: true, servicio: "aurum-experiencia-leads" });
}

function obtenerHoja_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let hoja = ss.getSheetByName(TAB_LEADS);
  if (!hoja) {
    hoja = ss.insertSheet(TAB_LEADS);
    hoja.appendRow(HEADERS);
    hoja.setFrozenRows(1);
  }
  return hoja;
}

function respuesta_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function testInsertarLead() {
  const fake = {
    postData: {
      contents: JSON.stringify({
        folio: "AUR-TEST-XX", nombre: "Lead de Prueba", email: "test@test.com",
        tel: "6620000000", proyecto: "Prueba webhook", estilo: "moderno_calido",
        sensaciones: ["Paz", "Calidez"], momentos: [0, 3], nivel: "Elegante",
        terreno: 500, personas: 4, plantas: 2, autos: 2,
        extras: ["terraza", "estudio"],
        calculo: { m2hab: 180, total: 240, rango: [3500000, 4200000] }
      })
    }
  };
  Logger.log(doPost(fake).getContent());
}
