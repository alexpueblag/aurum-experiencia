# Plan de conversión v3 — Experiencia Aurum

> Generado por un panel multi-experto (69 agentes, 12 lentes: Hormozi ×2, Chris Do,
> Cardone, CRO, móvil/webview, copywriting, match anuncio→landing, Cialdini, confianza
> ticket-alto-MX, agendado+WhatsApp, experimentos/retargeting). 114 propuestas crudas →
> 50 únicas → 45 verificadas contra el archivo real y las reglas inviolables.
> KPI = **Sesión de Diseño agendada**. Fecha: 2026-06-18.

## 1. Diagnóstico en 4 líneas

1. **El primer segundo no coincide con el anuncio.** El reel vende "atemporal vence a tendencia / anti elefante blanco", pero la portada dice "Cuestionario de Arquitectura de Autor". Quien llega caliente del reel siente que cambió de tema y rebota antes de tocar nada. Es la fuga más grande y la más barata de tapar.
2. **El tramo final pierde gente por fricción y por incoherencias.** El contador decía "Paso X de 8" mientras la barra dibuja 9 casillas, el muro de datos llegaba sin que el premio se sienta cercano, y en celular —de donde viene casi todo el tráfico de Instagram— el botón de agenda desaparece al hacer scroll.
3. **El KPI se mide hasta "hizo clic en agendar" y ahí se acaba la vista.** No sabemos si la cita realmente quedó, por qué canal, si se presentó, ni si cerró. Puedes estar comprando citas fantasma baratas y creer que vas bien.
4. **Idea fuerza:** sostener el mensaje "atemporal / sin elefante blanco" desde el preview hasta el correo de seguimiento, quitar fricción del cierre en celular, y cerrar el lazo después del clic (confirmación real, recordatorio, no-show, contacto rápido). El dinero del ticket alto se gana DESPUÉS del clic, y hoy ahí estamos casi ciegos.

---

## 2. "Hazlo ya" (quick wins) — riesgo cero, reversibles

Todos viven en `index.html`, vanilla.

| # | Cambio | Por qué | Estado |
|---|---|---|---|
| **R31** | Contador honesto: "Paso X de 6" (las 6 preguntas reales); en el muro de datos "Casi listo — solo tus datos"; en el cierre "Último paso: elige tu sesión". | El número y la barra se contradecían — se ve descuidado en marca premium. Bajar el denominador empuja a terminar (goal-gradient). | ✅ HECHO |
| **R48** | Alinear `<title>` / Open Graph / Twitter con "atemporal". | El "olor" del anuncio empieza antes de cargar: el preview en feed/WhatsApp. | ⏸ Va con R01 (decisión de voz) |
| **R23** | Aplazar el Meta Pixel a `requestIdleCallback`. | El tráfico llega por el navegador lento de Instagram. Sacar la descarga de Facebook de la ruta crítica pinta el hero antes, sin perder eventos. | ✅ HECHO |
| **R32** | Subir el respiro del auto-avance de 350 → 520 ms (`AUTO_AVANCE_MS`). | El ✓ de "te registré el tap" se tapaba al instante; el usuario dudaba. Medio segundo confirma sin añadir taps. | ✅ HECHO |
| **R19** | Mensaje de WhatsApp pre-llenado con nombre, ≈m², carácter, estilo, recámaras y proyecto (sin precio; editable en `wa_agenda_msg_tpl`). | WhatsApp es la vía alterna al KPI. El mensaje con el resumen te da contexto inmediato y respondes más rápido. | ✅ HECHO |
| **R49** | Línea de esfuerzo invertido sobre el botón del muro de datos: "Ya hiciste tus elecciones — verlas toma 10 segundos." | Justo donde más se duda (pedir correo/teléfono), recuerda que ya invirtió 90s. | ✅ HECHO |

---

## 3. Apuestas grandes (tocan el KPI directo)

- **R01 — Anclar la portada (p0) en "atemporal / anti-elefante-blanco".** La palanca de mayor alcance y la más barata (copy desde TEXTOS WEB). Repara el desajuste de mensaje del primer segundo. *Decisión de voz de marca pendiente (ver §5).*
  - `p0_kicker` → "Arquitectura atemporal · Hermosillo, Sonora"
  - `p0_titulo` → "Diseña la casa que *no pasa de moda*. En 90 segundos."
  - `p0_sub3` → "No es seguir la moda: es la casa que seguirá siendo tuya en 30 años. Eliges con un click y ves tus metros aproximados al instante; tu rango de inversión llega a tu correo. Gratis, sin compromiso y sin formularios eternos."
  - `p0_btn` → "Empezar mi residencia atemporal →"
  - `p0_prueba` / `r2_prueba` → "+75 familias eligieron una residencia que no pasará de moda."
- **R04 — Prueba de autoridad real en p8:** ficha del arquitecto (foto, nombre, cédula, frase en 1ª persona) + 1 testimonio, justo encima del widget de agenda. El código se mergea con claves vacías (la ficha queda oculta) y se "enciende" al pegar el material. *Bloqueado por material tuyo.*
- **R44 — Sticky de agenda también en MÓVIL.** Hoy en celular el botón flotante se desactiva y el único refuerzo del CTA desaparece al hacer scroll — justo en el dispositivo que domina el tráfico de IG.
- **R40 — Pantalla de "gracias" condicionada por canal** tras el clic de agenda. Rescata el caso real del webview de IG que se traga el "abrir en otra pestaña" + genera público limpio para retargeting.
- **R50 — Galería de 2-3 obras CONSTRUIDAS + pie "Quiénes somos"** en p8. *Bloqueado por fotos tuyas.*
- **R03 — Quitar el "$4,800 MXN"** (única violación viva de "cero dinero en pantalla", en 3 capas). *Decisión tuya de ancla (ver §5).*

---

## 4. Experimentos a medir en el board (uno a la vez)

| Experimento | Hipótesis | Qué medir |
|---|---|---|
| **R37 Fase A** (hacer ANTES de todo) | El board no distingue WhatsApp de calendario (un solo flag `__schedule`). Separarlos da el cierre real por canal. | `agenda_metodo`, tiempo hasta el clic. |
| **R06/R45** | Sostener "atemporal" en p1, p4, título de sesión y CTA de agenda baja la disonancia "reel atemporal vs cuestionario de gustos". | Avance p1→p2, p4→p5; completación y agendas. A/B. |
| **R05** | Chips de terreno (Chico/Mediano/Grande/No lo sé aún) sobre el slider bajan el abandono en p5. | Avance p5→p6; % "No lo sé aún". |
| **R22** | Comprimir y precargar las 6 fachadas de p1 (fachada-mona pesa 388K). | Rebote p1→p2; tiempo a 1ª selección. |
| **R17** | Reflejar las sensaciones de p2 en el cierre (hoy se piden y NO se usan). | Avance p8→Schedule; tiempo en p8. |
| **R20** | WhatsApp como CTA primario en celular/webview (flag, no flip duro). | `agenda_metodo`; cierre real confirmado en Calendar por brazo. |
| **R09** | Typo-guard de email + atributos de teclado (protege el medio de entrega). | Tasa de correos rebotados. |
| **R27** | Contador "X de 3" en p2 + bajar la barra en vivo a p3. | Avance p2→p3; abandono en p2. |
| **R47** | "Clásico atemporal" como primera fachada (experimento vigilado: sesga la lectura de gustos). | Agendas vs distribución de estilos. |
| **R38** | "Continuar donde lo dejaste" (sin PII) en p5. | Reanudaciones y completación de reanudados. |

---

## 5. Lo que necesito de ti (Alejandro)

1. **R01 — voz de la portada:** ¿adoptamos el eje "atemporal / no pasa de moda" (coherente con el reel) o lo dejamos como A/B medido?
2. **R03 — el "$4,800 MXN":** ¿lo quitamos (es la única violación viva de "cero dinero en pantalla") o lo conservas como ancla de valor de la sesión?
3. **R04 — autoridad:** foto del/los arquitecto(s), nombre, número de cédula profesional, una frase en 1ª persona, ≥1 testimonio con nombre y zona, y el año de fundación.
4. **R50 — obra:** 2-3 fotos de obra TERMINADA (no renders, o etiquetadas), con nombre/zona/año, años de trayectoria y URL de Instagram/sitio.
5. **R02 — verificación:** confirmar que la página de citas de Google NO exige login/crear cuenta al invitado.
6. **Garantía / inmediatez (R11/R34):** ¿puedes sostener honestamente "sin venta dura" y un corte diario real?
7. **Pauta (R41/R42):** público "Lead sin Schedule" (excluir agendados del frío) y secuencia de recuperación para "dejó datos pero no agendó" — siempre borradores que tú revisas.

---

## 6. Orden recomendado de ejecución

1. **Fase 0 — quick wins** (R31, R23, R32, R19, R49). ✅ **HECHO Y VERIFICADO.**
2. **Fase 1 — match del reel:** R01 (+R48) como primer experimento del board (PageView→Paso1).
3. **Fase 2 — instrumentación:** R37 Fase A (separar canal de agenda). Sin esto, R20/R05/R06 se miden a ciegas.
4. **Fase 3 — limpiar la regla violada:** R03 (quitar $4,800), tras tu decisión.
5. **Fase 4 — apuestas en el cierre:** R04 (cara+cédula+testimonio) y R44 (sticky móvil), luego R50 (galería) y R40 (gracias + retargeting).
6. **Fase 5 — pauta en paralelo:** R41 (audiencias por profundidad) y R42 (recuperación en la tarea diaria).
7. **Fase 6 — cola de experimentos:** R06/R45 → R05 → R22 → R17 → R20 → R09 → R27 → R47 → R38.

---

## 7. El punto ciego más caro: lo que pasa DESPUÉS del clic

Todo lo de arriba optimiza el **clic de agenda dentro de la página**. El dinero del ticket alto se gana o se pierde después. Estos huecos no rompen ninguna regla y son de altísimo retorno:

1. **No-shows.** El KPI real no es la cita, es la cita que se cumple. Recordatorio 24h y 2h antes (borrador), botón "añadir a mi calendario" (.ics) en la pantalla de gracias, y métrica de no-show en el board (agendados vs asistidos).
2. **Intención vs. confirmación real.** El evento Schedule se dispara con el CLIC, antes de elegir día/hora en el iframe. Hoy cuentas como "agenda" un clic que puede no terminar en cita. El board debe distinguir "intentó" de "cita confirmada".
3. **Cita → contrato.** Falta un estado en el CRM (AGENDÓ → ASISTIÓ → PROPUESTA → GANADO/PERDIDO) para optimizar pauta hacia leads que cierran, no que agendan y desaparecen.
4. **Speed-to-lead REAL (minutos, no horas).** Alerta instantánea a ti (WhatsApp/push/correo) en cuanto entra un lead con datos, disparada desde el Apps Script en el mismo POST.
5. **Fallo silencioso del POST al CRM.** Si el `fetch` falla por mala red en el webview, el lead cree que quedó registrado, agenda… y nunca recibes sus datos. Falta reintento + rescate (beacon o guardado local) y empujar a WhatsApp como captura redundante.

**Bonus de coherencia:** el correo de seguimiento (donde va el rango de inversión) debe repetir el mensaje del reel ("no construyas un elefante blanco") y llevar CTA de agenda con UTM propia, para atribuir agendas "vía correo" vs "vía web".

---

### Nota técnica para quien implemente
Localizar por texto/función, **no por número de línea** (el archivo creció a ~1124 líneas). Disciplina de siempre: toda clave nueva va en `const TEXTOS` de `index.html` **y** en `TEXTOS_SEMILLA` del `.gs`; si solo se edita una capa, la otra la pisa. Tras editar el `.gs`, correr `sembrarTextos()` y publicar Nueva versión.
