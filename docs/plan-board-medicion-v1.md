# Sistema de medición y BOARD de Aurum / Yo Desarrollo

*Documento definitivo · español de México · stack gratis (GA4 + Looker Studio + el Google Sheet que ya existe) · pensado para un dueño no técnico que abre el board 5 minutos desde el celular.*

> **Cómo leer los números de este documento.** Todos los benchmarks marcados como *(referencia)* son rangos de industria para **frío de alto ticket**, NO metas de Aurum. Son un punto de partida para no arrancar a ciegas; se reemplazan por **tu propio baseline** en cuanto acumules 2-4 semanas de datos reales. Con tu volumen actual (≈129 seguidores, leads de uno a dos dígitos por semana), **el conteo absoluto manda y el porcentaje es secundario** hasta llegar a ~30-50 leads. A n=10, "11% vs 9%" es una sola cita de diferencia: ruido, no señal.

---

## Resumen ejecutivo

**Métrica estrella (North Star):** **Sesiones de Diseño confirmadas por semana** — cita real agendada en Google Calendar / marcada en el CRM, **no el clic en "Schedule"**. Es el punto exacto donde el lead magnet se vuelve negocio: el primer momento de intención alta, verificable, y el mejor predictor de un cliente de millones de pesos.

**Métrica de dinero que la gobierna (la que ves cada lunes):** **Costo por cita confirmada** = gasto Meta del periodo ÷ citas reales del Calendar/CRM.

**Regla anti-vanidad de todo el sistema:** el "Lead" (envío de formulario) es **micro-conversión, no la meta**. Optimizar a Lead hace que Meta compre formularios baratos que nunca agendan. El board cuenta **citas reales**, no clics.

**Las 7 cosas que el board responde:**

1. **¿Esta semana gané o perdí con la pauta?** Un solo semáforo arriba (verde / amarillo / rojo) + una frase en español claro. Sin que calcules nada.
2. **¿Cuánto gasté y cuántas CITAS REALES saqué?** Cuatro numerotes: GASTO · LEADS · CITAS · COSTO POR CITA, cada uno con flecha vs. semana pasada.
3. **¿Qué campaña/anuncio me trae citas baratas y cuál solo curiosos?** Tabla rankeada por **costo por cita** (no por costo por lead) → cuál apago y cuál le subo HOY.
4. **¿Dónde se cae la gente en el cuestionario (de los 9 pasos) y a qué horas entran?** Embudo de 9 pantallas con el peor escalón en rojo. En **segundo plano**, no arriba.
5. **¿Cuántas citas se volvieron CLIENTE?** Embudo de dinero cerrado: Gasto → Lead → Cita → Cliente, con el costo en cada salto.
6. **¿Hay algo roto que me cueste dinero callado?** Alerta roja si el correo del estimado <24h no salió, o si un botón de agenda quedó sin liga.
7. **¿Por qué agendan o no?** Capa cualitativa: motivo de cierre + motivo de descarte, para mejorar copy y oferta.

**Estado honesto de hoy (verificado en el código):** el Meta Pixel ya dispara PageView, `PasoEmbudo{paso}` (0→8), Lead y Schedule. **Pero** la landing **no captura nada de origen** (no lee UTMs, `fbclid` ni referrer — verificado en `index.html`, cero coincidencias), el CRM **no tiene columnas de fuente**, el Pixel es **solo navegador** (pierde 20-40% por iOS/ATT), las citas/clientes viven **fuera del Pixel** (Calendar + Sheet manual), **no hay GA4 ni dashboard**, y **no hay aviso de privacidad ni consentimiento** (LFPDPPP). Este documento ordena cómo cerrar esos huecos por fases, empezando esta semana con lo que ya existe.

---

## El árbol de métricas

Por etapa, con definición y semáforo *(referencia a validar contra tu propio baseline)*. **Semáforo:** Verde = bien · Amarillo = vigilar · Rojo = actuar.

### 1) Adquisición — *¿la pauta trae gente y a qué costo?*

| Métrica | Definición | Verde | Amarillo | Rojo |
|---|---|---|---|---|
| **Gasto Meta del periodo (MXN)** | Lo invertido en pauta esta semana | (es input, no semáforo) | — | — |
| **Costo por Lead (CPL) por campaña/creativo** | Gasto ÷ leads, cortado por `utm_content` | Dentro de tu techo | Cerca del techo | Gasto>0 y 0 leads |
| **Costo por cita confirmada por creativo** ⭐ KPI rector de pauta | Gasto ÷ citas reales, por creativo | < $1,500 *(ref.)* | $1,500-3,000 | > $3,000-4,000 |
| **CTR de enlace** | Clics de enlace ÷ impresiones | > 1.5% *(ref.)* | 0.6-1.5% | < 0.6% |
| **Hook rate** | Reproducciones 3s ÷ impresiones | > 25-30% *(ref.)* | 15-25% | < 15% |
| **Frecuencia 7d + tendencia CPM** | Veces que la misma persona ve el anuncio | < 2.5 | 2.5-3.5 | > 3.5 con CTR cayendo (fatiga) |
| **% de leads con `utm_source` poblado** | Cobertura de atribución | ≥ 90% | 70-90% | < 70% o > 20% como (direct) = etiquetado roto |
| **Leads por hora × día** | Heatmap para dayparting | (vista, sin semáforo) | — | — |

> **Nota de volumen:** CTR/Hook/Frecuencia son diagnóstico **secundario** al inicio; con pocos leads no decidas presupuesto solo con ellos.

### 2) Activación — *¿el lead magnet engancha y completa?*

| Métrica | Definición | Verde | Amarillo | Rojo |
|---|---|---|---|---|
| **% que avanza pantalla a pantalla (PasoEmbudo 0→8)** | Retención `paso_n / paso_anterior` | Caída < 15% por paso | 15-25% | > 25-35% (pantalla a reescribir) |
| **Mayor punto de fuga** | El peor escalón, resaltado en rojo | — | — | Es la pantalla candidata #1 a A/B |
| **Caída del gate (paso 6→7)** | Del último paso visual al formulario | Perder < 40-50% | 50-60% | > 60-70% (el formulario pide demasiado/muy pronto) |
| **Cierre (paso 7→8)** | Del formulario al reveal | < 15% de caída | 15-25% | > 25% |
| **Tasa de completado (PageView → Lead / 0→8)** | Llegan vs. terminan | Define tu baseline en 2 semanas | — | — |
| **Drop-off por dispositivo** | Móvil vs. escritorio | Diferencia pequeña | — | Una pantalla rompe mucho más en móvil |

> **Lee tasas relativas, no volúmenes absolutos.** El Pixel es solo navegador: iOS/ATT y bloqueadores **subestiman el conteo** (sobre todo en móvil frío). La **caída entre pasos consecutivos** sí es válida para decidir qué pantalla reescribir; el conteo absoluto no será confiable hasta cerrar CAPI. El `>25% completado` genérico es **optimista** para frío de alto ticket en móvil (un cuestionario de 9 pantallas que pide datos para una residencia millonaria rara vez completa >15-20% en frío). **Mide tu mejora contra ti mismo.**

### 3) Conversión — *¿el lead se vuelve cita?*

| Métrica | Definición | Verde | Amarillo | Rojo |
|---|---|---|---|---|
| **Leads** | Envíos de formulario (micro-conversión) | (conteo) | — | — |
| **Tasa Lead → Cita confirmada** | Citas reales ÷ leads | 25%+ *(ref.)* | 8-15% | < 5% (lead magnet o correo fallan) |
| **Citas en Calendar vs. clics-Schedule** | Brecha = fricción de agendado | — | — | Solo se mira si Lead→Cita cae (diagnóstico, NO KPI de portada) |
| **Tasa de show-up** | Citas presentadas ÷ agendadas | (fase 2) | — | — |
| **Costo por cita confirmada** ⭐ | Gasto ÷ citas reales | Ver tabla de Adquisición | — | — |

> **Empieza por cita AGENDADA-confirmada** (la columna "Sesión agendada" del CRM, que ya existe y se llena desde el Calendar). El **show-up** (¿se presentó?) agrega un paso manual; se incorpora en fase 2 cuando la operación lo sostenga.

### 4) Seguimiento — *¿el puente Lead → Cita funciona?*

| Métrica | Definición | Verde | Amarillo | Rojo |
|---|---|---|---|---|
| **% de leads en NUEVO con >24h sin tocar** | Prometiste estimado <24h | < 5% | 5-15% | > 15% |
| **Tiempo medio Lead → correo enviado** | Velocidad de respuesta | < 1h ideal, < 24h aceptable | 24-48h | > 48h |
| **Semáforo "Cowork corrió hoy"** | ¿La rutina generó borradores hoy? | Sí (verde) | — | No (rojo) |
| **Alerta de rebote** | ¿Llegó mailer-daemon? | 0 rebotes | — | Rebote → marcar lead (dato de contacto erróneo) |
| **Tasa de reactivación de fríos** | BRIEF CREADO sin cita >7/14d → AGENDADA | (fase 2) | — | — |

> **Realidad operativa:** el correo del estimado (Cowork) **no está desplegado con certeza** — es un riesgo vivo. La regla del repo es que **Cowork solo crea borradores; el envío es manual**. Por eso: chequeo **único** de SPF/DKIM (no score recurrente de mail-tester, eso es overkill para envío uno-a-uno), y la secuencia de reactivación 3/7/14d se mueve a fase 2 como **borradores que apruebas**, no automatización ciega.

### 5) Ingreso — *¿la cita se vuelve dinero?*

| Métrica | Definición | Verde | Amarillo | Rojo |
|---|---|---|---|---|
| **Tasa Cita → CLIENTE** | Clientes ÷ citas, por fuente/creativo | 20-35% *(ref.)* | 10-20% | < 8-10% (revisar oferta/precio) |
| **Clientes nuevos + valor del proyecto (MXN)** | Estado=CLIENTE + Valor_proyecto | (conteo + monto) | — | — |
| **Costo por cliente (CAC) vs. valor del proyecto** | Gasto acumulado ÷ clientes | CAC < ~1-3% del valor *(ref.; honorarios históricos $155k-$593k MXN)* | — | — |
| **Embudo de dinero cerrado** | Gasto → Lead → Cita → Cliente con costo en cada salto | — | — | — |
| **Días de ciclo Lead → Cliente** | Velocidad de cierre | (mide tu baseline) | — | — |

> **Separa cantidad de calidad:** si Lead→Cita es alto pero Cita→Cliente bajo, el problema es **calidad de lead / precio / oferta**, no el embudo web. Con 1-2 clientes por trimestre, el CAC y el costo/cliente son **termómetros trimestrales, no gatillos semanales**.

### 6) Referencia — *¿qué dice el cliente real?*

| Métrica | Definición | Verde | Amarillo | Rojo |
|---|---|---|---|---|
| **NPS post-Sesión (0-10)** | Vía Google Form (gratis) | (fase 2) | — | — |
| **Frase textual "qué te llevó a agendar"** | Copy real comprable | — | — | Oro para anuncios y landing |
| **% de leads con consentimiento LFPDPPP** | Gobierno del dato; habilita CAPI | 100% (es requisito, no meta) | — | < 100% |

---

## Diseño del BOARD

**Principio de layout (consenso resuelto):** **vista del dueño = dinero arriba; vista del operador = embudo arriba.** Dos páginas/pestañas en el mismo Looker Studio, no un solo tablero para todos.

**Convención de fuentes en TODO el board (regla anti-mentira):**
- **GA4** → SOLO el tramo **pre-Lead** (PageView, PasoEmbudo 0→7, dispositivo, hora/día). Donde abandonan **antes** de dejar datos.
- **Google Sheet "LEADS - WEB"** → el tramo **Lead → Cita → Cliente** (columna `Estado` + `Sesión agendada`), leído **directo** por Looker sin ETL.
- **Pixel "Schedule"** → SOLO para optimizar la campaña dentro de Meta (necesita volumen de señal). **Nunca** se cuenta como cita en el reporte de negocio.

### PÁGINA 1 — Vista del Dueño ("el café de los lunes")

#### Panel 1.1 · Semáforo + veredicto de la semana
- **Qué mide:** Verde = la pauta rinde (costo por cita dentro de meta) · Amarillo = vigilar · Rojo = quemando dinero.
- **Gráfica:** banda de color a todo lo ancho, arriba de todo, + una frase en español: *"Esta semana: 3 citas a $X c/u. Vas bien"* o *"Gastaste $X y 0 citas. Para o cambia el anuncio."*
- **Qué responde:** ¿gano o pierdo esta semana? (pregunta #1 del dueño).
- **Regla del semáforo (sobre datos confiables HOY):** encender con **GASTO + LEADS + CPL** (todos automáticos). **Bloquear** el ojo de CITAS/COSTO-POR-CITA en el semáforo **hasta** que el loop Calendar→CRM esté desplegado. Numerote roto > numerote ausente.
- **Gatillo por umbral absoluto (no % semanal):** "rojo si gasto > X y 0 leads en 7 días" o "rojo si CPL > techo definido tras 20+ leads". Con tu volumen, los deltas porcentuales sobre n diminutos disparan falsas alarmas.
- ✅ **HOY** con Pixel/Meta export (CPL/Gasto/Leads) · ⏳ El componente de CITAS necesita el loop Calendar→CRM.

#### Panel 1.2 · Los 4 numerotes con flecha
- **Qué mide:** GASTO · LEADS · CITAS AGENDADAS · COSTO POR CITA, cada uno gigante, con flecha ↑/↓ vs. semana pasada.
- **Gráfica:** 4 scorecards de Looker con comparativa de periodo nativa.
- **Estado por numerote:** GASTO (export manual semanal de Meta) ✅ · LEADS (100% automático, UPSERT por email) ✅ · CITAS (de la columna "Sesión agendada") ⏳ necesita el loop · COSTO POR CITA (= GASTO/CITAS) ⏳ hereda la dependencia.
- **Mientras el loop no esté:** mostrar **"Clic-a-agendar (proxy)"** en **gris**, claramente etiquetado como intención, no como cita. Y rotular si las citas están "confirmadas a mano" vs "auto", para que nadie confunda 0-por-pendiente con 0-real.

#### Panel 1.3 · La recomendación del socio
- **Qué mide:** UNA acción escrita en lenguaje natural: *"Sube presupuesto al anuncio A, apaga el B (te cuesta 4x), llama a los 2 leads que no agendaron."*
- **Gráfica:** texto, no gráfica. **Es la decisión ya tomada.**
- **Quién la genera:** la rutina de Cowork/Claude, lunes 8am Hermosillo: lee CRM + export Meta, calcula deltas, marca anomalías, redacta 5-7 líneas + 1 acción, **borrador a Gmail (nunca envía)**.
- ⏳ Necesita la rutina de Cowork desplegada.

#### Panel 1.4 · Embudo de dinero cerrado
- **Qué mide:** Gasto → Leads → Citas → Clientes, en una sola tira horizontal, con el **costo en cada salto** (CPL, costo/cita, costo/cliente).
- **Gráfica:** embudo horizontal con conteos absolutos como protagonista; las tasas atenuadas hasta tener ≥20-30 leads.
- **Qué responde:** ¿dónde se rompe la cadena? Cantidad (marketing) vs. calidad (cierre).
- ✅ La mitad superior (Gasto→Lead) hoy · ⏳ Cita→Cliente depende de la disciplina de captura del `Estado` del CRM (hoy las 7 filas están en NUEVO; sin marcar el Estado, el embudo nace mostrando ceros).

#### Panel 1.5 · Alertas de "algo roto"
- **Qué mide:** banderas rojas operativas: correo del estimado <24h no desplegado / no corrió hoy; botón de agenda sin liga; gasto>0 sin leads.
- **Gráfica:** lista de focos rojos/verdes.
- **Qué responde:** ¿estoy prometiendo algo que no llega? ¿pago clics que no pueden agendar?
- ✅ Semáforo "Cowork corrió hoy" (cuenta borradores por etiqueta en Gmail) y "% NUEVO >24h" (del Sheet) hoy.

### PÁGINA 2 — Vista del Operador ("antes de tocar pauta")

#### Panel 2.1 · KPIs gigantes de HOY con tendencia
- **Qué mide:** Entraron · Leads · Citas · Gasto, del día, con sparkline corto.
- **Gráfica:** scorecards con micro-tendencia.
- **Qué responde:** ¿escalo o pauso hoy?

#### Panel 2.2 · Embudo de las 9 pantallas (PasoEmbudo 0→8)
- **Qué mide:** retención pantalla a pantalla; el **peor escalón en ROJO y rotulado**.
- **Gráfica:** barras horizontales, mayor caída en rojo, segmentable **móvil/escritorio**.
- **Qué responde:** ¿en cuál pantalla se va la gente? → qué A/B correr. (Pregunta textual del dueño y del operador.)
- **Mapeo fijo de pasos (para que el board no mienta):** paso 0=hero, 1=estilo, 2=sensación, 3=momentos, 4=carácter, 5=esencial, 6=sueños, **7=formulario/gate**, 8=cierre/reveal. **El gate es el paso 7.**
- ✅ **HOY MISMO** en Meta Events Manager (desglosa `PasoEmbudo` por valor de `{paso}`) — quick win de mayor valor/esfuerzo, dato existente · 🟡 Mejora con GA4 (Exploración de embudo nativa de 9 pasos + dispositivo/hora).

#### Panel 2.3 · Tabla de creativos rankeada por costo por CITA
- **Qué mide:** Creativo | Gasto | Leads | CPL | Citas | **Costo/cita** | Clientes | Costo/cliente, ordenada por **costo/cita ascendente**.
- **Gráfica:** tabla sobria (sin sparklines/semáforo por celda al inicio — eso es de analista).
- **Qué responde:** cuál apago y cuál escalo HOY. En frío, el creativo es ~80% del resultado; ordenar por costo/cita evita premiar leads baratos que nunca agendan.
- **Regla de decisión con guardrail de volumen:** **NO apagar nada por debajo de ~8-10 leads acumulados** por creativo. Recién con N razonable, pausar el peor cuartil por costo/cita y subir presupuesto al mejor. **Costo/cliente se mira pero NO se decide con él** (N muy bajo) — sirve a fin de trimestre.
- **Llave del join:** `utm_content = nombre del anuncio`. ⏳ **No existe hoy** — requiere UTMs en los anuncios + captura en `index.html` + columnas en el Sheet (ver Plan de instrumentación). Sin esto, esta tabla es imposible.

#### Panel 2.4 · Costo por lead / por cita vs. meta
- **Qué mide:** CPL y costo/cita contra el techo definido, verde/amarillo/rojo.
- ✅ CPL hoy (export Meta + Sheet) · ⏳ costo/cita necesita el loop.

#### Panel 2.5 · Heatmap hora × día (segundo plano)
- **Qué mide:** visitas, leads (y citas en fase 2) por franja horaria × día de semana.
- **Gráfica:** **matriz 7×4** (mañana/tarde/noche/madrugada × día), NO 7×24 (168 celdas = ruido a tu volumen). Ventana móvil 90 días. **Siempre mostrar el n absoluto en cada celda;** si n total < 30, mostrar "muestra insuficiente".
- **Qué responde:** en qué ventana programar el correo de Cowork y, si crece el volumen, dónde concentrar presupuesto (dayparting).
- **Fuente robusta primero:** el timestamp **"Primer contacto"** del Sheet (server-written, inmune a ATT) para leads; GA4 solo para visitas. La hora del **slot real** de Calendar es fase 2.
- **Insight de mayor valor que el heatmap:** en alto ticket, **velocidad de respuesta** > dayparting. Emparejar con una **alerta speed-to-lead** (responder en minutos a cualquier hora).
- ⚠️ Va **abajo, en segundo plano** (el dueño fue explícito).

### Qué se arma HOY vs. qué necesita instrumentación

| Pieza del board | HOY con Pixel + Meta + Sheet | Necesita GA4 | Necesita UTMs | Necesita CAPI | Necesita loop Calendar→CRM |
|---|---|---|---|---|---|
| Embudo 9 pantallas (silueta) | ✅ Meta Events Manager | 🟡 mejora | — | (mejora conteo) | — |
| Numerotes GASTO/LEADS/CPL | ✅ | — | (atribución por creativo) | — | — |
| Numerote CITAS / costo-por-cita | — | — | — | — | ✅ requerido |
| Tabla por creativo (costo/cita) | — | — | ✅ requerido | — | ✅ requerido |
| Heatmap hora×día (leads) | ✅ desde "Primer contacto" | 🟡 visitas | — | — | (citas: fase 2) |
| Embudo de dinero cerrado | parcial (Gasto→Lead) | — | (por fuente) | — | ✅ (Cita→Cliente) |
| Semáforo + veredicto | ✅ con CPL | — | — | — | ✅ para incluir citas |

---

## Qué más hay que medir en la publicidad de YOD (los huecos)

1. **UTMs estructurados (el arreglo raíz).** *Por qué:* hoy es imposible saber qué campaña/creativo/público trae cada lead, cita o cliente — bloquea casi todo el board de pauta. *Cómo:* plantilla de URL fija en TODOS los anuncios de Meta con macros dinámicos (costo $0): `utm_source=meta&utm_medium=paid&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&utm_term={{adset.name}}`. Nombrar los anuncios con convención legible (`CREATIVO_PUBLICO_GANCHO`).

2. **`fbclid` (el puente a CAPI).** *Por qué:* es la llave real de deduplicación/atribución server-side, más valioso que los UTMs para curar el gap de iOS/ATT. *Cómo:* capturarlo junto a los UTMs en el paso 0 (en variable de sesión / `sessionStorage`, **no localStorage** — minimiza superficie de PII bajo LFPDPPP) e incluirlo en el payload del lead.

3. **Hook rate y Hold rate.** *Por qué:* en frío, si el creativo engancha (hook alto) pero no agenda, el problema es oferta/landing, no creativo. *Cómo:* del conector Meta Ads → Looker: hook = reproducciones 3s ÷ impresiones; hold = ThruPlay ÷ impresiones. Diagnóstico secundario.

4. **Frecuencia y fatiga de creativo.** *Por qué:* la misma persona viendo el anuncio muchas veces sube el CPM y mata el CTR. *Cómo:* alerta si frecuencia 7d > 3.5 con CTR cayendo → rotar creativo.

5. **Atribución gasto → cita → cliente.** *Por qué:* es la única forma de saber qué peso de pauta produjo negocio real. *Cómo:* cruzar gasto Meta por `utm_campaign`/`utm_content` contra el `Estado` del CRM.

6. **Orgánico de YOD por pieza.** *Por qué:* tu orgánico es casi gratis pero invisible; el audit mostró que **nunca tuvo CTA al cuestionario** (link_clicks ≈ 0). *Cómo:* UTMs por pieza (`utm_source=instagram&utm_medium=organic&utm_content=slug`) en cada link de bio/post; el extractor por Graph API vuelca reach/ER/saved/clicks a una pestaña CONTENIDO-ORG; cruzar por `utm_content`. *Realidad:* con ~129 seguidores, "post que funcionó = ≥1 lead atribuido" será 0 o 1 la mayor parte del tiempo — sirve para **aprender ganchos**, no para un dashboard semanal.

7. **Nurture / email del estimado.** *Por qué:* es el puente Lead→Cita y hoy no está desplegado con certeza. *Cómo:* semáforo "corrió hoy" + tiempo Lead→correo + detección de rebotes.

8. **Cualitativa (el POR QUÉ).** *Por qué:* los números dicen QUÉ pasa, nunca POR QUÉ; Aurum tomó decisiones grandes (ocultar precio, subordinar el correo) **sin una palabra de cliente real**. *Cómo:* chips de motivo en el cierre + dropdown de motivo de descarte (ver Capa cualitativa).

---

## Plan de instrumentación (pasos ordenados)

> Todo lo de abajo es **gratis end-to-end** salvo donde diga "(de pago)". El orden importa: cada paso desbloquea al siguiente.

**Paso 0 — Privacidad primero (habilita legalmente todo lo demás).** *Gratis.*
- Aviso de privacidad como página estática en el mismo GitHub Pages, enlazado en el gate (paso 7) y footer.
- Checkbox NO premarcado que **bloquee `revelar()`** hasta marcarse; guardar `consent + timestamp + versión` en el payload/CRM.
- Mover `initPixel()` para que `PageView` NO dispare antes del consentimiento (hoy dispara incondicional en `index.html` línea 404).

**Paso 1 — Capturar origen en el payload (el arreglo raíz).** *Gratis, ~20 líneas en dos archivos.*
- En `index.html` (paso 0): leer `URLSearchParams(location.search)` + `document.referrer` + `fbclid`; derivar `device` (móvil/escritorio, de `tactil` que ya se calcula en línea 881) y `hora_local`/`dia_semana_local`. Incluir todo en el objeto `payload` del `fetch` (el POST ya es `no-cors` + `text/plain`, línea 932 — agregar campos es trivial, no rompe CORS).
- En `webhook-apps-script.gs`: agregar a `HEADERS_LEADS` (línea 273) las columnas `utm_source, utm_medium, utm_campaign, utm_content, utm_term, fbclid, device, hora_local, dia_semana_local, consent, version_aviso` y mapearlas en el UPSERT.
- *KPI de salud:* ≥90% de leads con `utm_source` poblado en 7 días; >20% como (direct)/(none) = la plantilla de URL no se aplicó a todos los anuncios.
- **Sin este paso, toda la Página 2 del board (atribución por creativo) es imposible.**

**Paso 2 — Plantilla de URL en Meta.** *Gratis.* Pegar los macros dinámicos en el campo "Parámetros de URL" de TODOS los anuncios.

**Paso 3 — Higiene de email + dedupe.** *Gratis.* En el gate, regex algo más estricta + `toLowerCase()` + `trim()` (hoy es solo `/.+@.+\..+/` con `.trim()`, línea 839 → fragmenta el UPSERT por mayúsculas/typos). En el Sheet, `REGEXMATCH` marca `email_valido`.

**Paso 4 — GA4 (capa de visualización pre-Lead).** *Gratis.* Crear propiedad GA4 (zona `America/Hermosillo`), con IP anonimizada + Consent Mode. Espejar los eventos del Pixel con un `gtag` al lado de cada `pix()`: `page_view`, `paso_embudo{paso}` (+ `device_category` y hora), `generate_lead`. **No mandar email/nombre a GA4** (PII prohibida). Marcar `generate_lead` como conversión. *Salud (nota de mantenimiento, no en la portada):* discrepancia Pixel vs GA4 <15% normal; >30-40% = evento mal cableado.

**Paso 5 — Looker Studio (el board que el dueño VE).** *Gratis.* Fuente 1 = GA4 (pre-Lead, embudo, hora, dispositivo). Fuente 2 = Sheet "LEADS - WEB" directo (pipeline + atribución por UTM). Una página móvil para el dueño (5 numerotes), una para el operador. **Vista compartida SIN PII** (solo folio + Estado + UTM).

**Paso 6 — Cerrar el loop offline (cita real + cliente).** *Gratis.*
- **Fuente de verdad = una sola columna del CRM**, la que YA existe: **"Sesión agendada"** (con fecha) = cita real. **No crear columnas nuevas** (regla del dueño: sus hojas se leen tal como están). El board cuenta filas donde "Sesión agendada" no está vacía.
- La rutina Cowork hace match del invitado del evento "Video Llamada Aurum" contra LEADS-WEB y escribe el Estado. **Match por email es frágil** (Calendar puede usar otro correo; WhatsApp no tiene email) → fallback por nombre/teléfono + columna de revisión.
- **Bloqueante:** la rutina solo escribe si el `.gs` nuevo está desplegado y el cruce diario corre fiable varios días seguidos. Hasta entonces, **marcar a mano** (el dueño lo aceptó) y rotular "confirmado a mano".
- Convertir `Estado` en **lista desplegable con validación** (los 6 valores fijos) y agregar al pasar a CLIENTE: `Valor_proyecto_MXN`, `Fecha_cierre`. Marcar/filtrar filas de prueba (`es_prueba` o folio `TEST-`).

**Paso 7 — CAPI server-side desde Apps Script.** *Gratis.* Recupera 20-40% de eventos que iOS/ATT borra y alimenta Schedule/Cliente **reales** a Meta.
- **Precondición:** consentimiento del Paso 0 (hashear email/teléfono **no es anonimizar** bajo LFPDPPP; es transferencia transfronteriza — solo enviar `user_data` si hubo consentimiento).
- **Arreglar el folio (bug de dedup):** `AUR-YYYYMMDD-INICIALES` (línea 848) **no es único** (dos "Juan Pérez" el mismo día colisionan). Agregar entropía (`Date.now()`/sufijo aleatorio) antes de usarlo como `event_id`.
- Pasar el mismo `event_id` en `fbq('track','Lead',{},{eventID:folio})` **y** en el payload (hoy Lead línea 937 y Schedule línea 989 van **sin** eventID).
- En `doPost`: `UrlFetchApp.fetch` a `graph.facebook.com/v21.0/{dataset}/events` con token en `PropertiesService`, `user_data` hasheada `SHA-256` (`Utilities.computeDigest`), `fbc`/`fbp`. `Lead` con `action_source=website`; **`Schedule`/`Cliente` SOLO cuando exista cita real en Calendar / Estado=CLIENTE** (`action_source=system_generated`) — esa conversión offline es el oro.
- *Salud:* EMQ en Meta >6 bueno; dedup ~95-100%. Medir éxito por **baja de CPL / mejor calidad de lead a 2-4 semanas**, no por EMQ a secas.

**De pago (opcional, solo si crece):** conector nativo Meta Ads → Looker para gasto/creativos en vivo (al inicio basta un **pegado manual semanal** del gasto en una pestaña GASTO, 5 min/sem).

---

## Scorecard de salud

Tabla de "esto va bien / regular / mal" con **metas iniciales realistas para arrancar**. *Los números son referencia de industria a validar; el conteo absoluto manda sobre el % hasta tener ~30-50 leads.*

| Indicador | 🟢 Bien | 🟡 Regular | 🔴 Mal | Fuente | ¿Medible hoy? |
|---|---|---|---|---|---|
| **Cobertura de atribución** (% leads con `utm_source`) | ≥ 90% | 70-90% | < 70% / >20% direct | Sheet | Tras Paso 1-2 |
| **Costo por cita confirmada** ⭐ | < $1,500 | $1,500-3,000 | > $3,000-4,000 o 0 citas con gasto | Meta + CRM | Tras loop |
| **Costo por Lead (CPL)** | Dentro del techo | Cerca | Gasto>0, 0 leads | Meta + Sheet | ✅ Hoy |
| **Lead → Cita confirmada** | 25%+ | 8-15% | < 5% | CRM | Tras loop |
| **Cita → Cliente** | 20-35% | 10-20% | < 8-10% | CRM | Manual hoy |
| **Completado cuestionario (0→8)** | Tu baseline +X | = baseline | < baseline | Pixel/GA4 | ✅ Hoy (relativo) |
| **Caída en el peor paso** | < 25% | 25-35% | > 35% | Pixel/GA4 | ✅ Hoy |
| **Leads en NUEVO >24h** | < 5% | 5-15% | > 15% | CRM | ✅ Hoy |
| **"Cowork corrió hoy"** | Sí | — | No | Gmail | ✅ Hoy |
| **Emails inválidos** | < 2-3% | 3-5% | > 5% | Sheet | Tras Paso 3 |
| **Consentimiento registrado** | 100% (requisito) | — | < 100% | CRM | Tras Paso 0 |
| **EMQ (calidad de match Meta)** | > 6 | 4-6 | < 4 | Events Mgr | Tras CAPI |

---

## Plan de construcción por fases

### FASE 1 — Esta semana, gratis, con lo que ya hay
*Objetivo: ver la silueta del embudo y dejar la base de captura lista. Esfuerzo: bajo. Impacto: ALTO (desbloquea todo).*

1. **Embudo de 9 pantallas en Meta Events Manager** (desglose de `PasoEmbudo` por `{paso}`) — 0 código, dato existente. *Esfuerzo: mínimo · Impacto: alto.*
2. **Privacidad (Paso 0):** aviso + checkbox + mover `initPixel()`. *Esfuerzo: bajo · Impacto: alto (legal + habilita CAPI).*
3. **Captura de origen (Paso 1) + plantilla de URL en Meta (Paso 2) + higiene de email (Paso 3).** *Esfuerzo: bajo (~20 líneas) · Impacto: el más alto del plan.*
4. **Disciplina del CRM:** `Estado` como lista desplegable, marcar "Sesión agendada" a mano al ver el evento en Calendar, filtrar filas de prueba. *Esfuerzo: bajo (hábito) · Impacto: alto (sin esto el embudo nace en ceros).*
5. **Board v1 en Looker:** Página dueño con 5 numerotes (entran → gate p7 → Lead → Sesión agendada → Cliente) + el peor punto de fuga en rojo, leyendo el Sheet directo. *Esfuerzo: medio · Impacto: alto.*

### FASE 2 — Las próximas 2-4 semanas
*Objetivo: atribución real y la vista del dueño completa. Esfuerzo: medio. Impacto: alto.*

1. **GA4 + gtag** (Paso 4) → embudo nativo, hora/día/dispositivo, Consent Mode.
2. **Loop Calendar → CRM** automatizado vía Cowork (Paso 6) → activar el numerote CITAS y el componente de citas del semáforo.
3. **Tabla de creativos por costo/cita** (Panel 2.3) — ya con UTMs poblados.
4. **Rutina del lunes 8am** (Panel 1.3): semáforo + veredicto + 1 acción, borrador a Gmail.
5. **Lead scoring por regla dura:** columna `CALIFICADO = rango_min supera el piso de proyecto Aurum` (el payload ya manda `calculo.rango`, 0 código en HTML). *Esfuerzo: bajo · Impacto: medio-alto (prioriza a quién llamar).*
6. **Capa cualitativa mínima:** chips de motivo en p8 + dropdown `motivo_descarte`.

### FASE 3 — Cuando haya volumen / madurez
*Esfuerzo: medio-alto. Impacto: medio (afina, no desbloquea).*

1. **CAPI server-side** (Paso 7) — recuperar eventos iOS/ATT + Schedule/Cliente reales a Meta.
2. **Heatmap 7×4 + alerta speed-to-lead** (Panel 2.5).
3. **Atribución del orgánico por pieza** (UTMs en bio/posts + Graph API).
4. **NPS post-Sesión** (Google Form) + secuencia de reactivación de fríos como borradores.
5. **Show-up** (columna "Se presentó" Sí/No) y costo por cita presentada.
6. **Conector nativo Meta → Looker** (de pago/avanzado) si el pegado manual ya no escala.

---

## Privacidad y calidad de datos

La página EN VIVO recaba **nombre + correo + WhatsApp + composición del hogar** (incluye etapas de vida de menores: Niño/Adolescente) con **cero aviso de privacidad, cero casilla**, y un Pixel que dispara `PageView` **antes** de cualquier consentimiento. Es riesgo legal LFPDPPP (arts. 15-16, INAI) **y** la raíz de un board sesgado.

**Obligatorio (Fase 1, costo casi cero):**
- **Aviso de privacidad** (página estática en GitHub Pages), enlazado en el gate (p7) y footer.
- **Consentimiento:** checkbox NO premarcado que bloquee `revelar()`; guardar `consent + timestamp + versión` en el CRM. Es el **gobierno del dato que habilita CAPI** lícitamente.
- **Pixel/GA4 tras consentimiento:** no disparar `PageView` ni enviar `user_data` hasheada sin consent. IP anonimizada en GA4.
- **Minimización de datos de menores:** etiquetar las etapas niño/adolescente como "programa del hogar / recámaras", no como datos identificables del menor atados al lead.
- **Exactitud:** `toLowerCase()` + `trim()` + regex en el gate; `REGEXMATCH` (`email_valido`) en el Sheet → protege el UPSERT, el match de CAPI y evita correos a direcciones erróneas. Detección de rebotes (mailer-daemon) para marcar leads con dato malo.
- **Tablero compartido SIN PII:** solo folio + Estado + UTM. La PII vive en el CRM interno de Alejandro (Sheets/Calendar), no se exporta a terceros.

**NO hacer todavía (overkill para una PYME sin equipo técnico):** Consent Mode v2 / Klaro **antes** de instalar GA4 (gatear un tag inexistente es trabajo muerto); perseguir métricas de "% de aceptación de banner" (vanidosa a este tamaño). El único KPI que importa aquí: **100% de leads nuevos con consentimiento** (requisito, no meta) y emails inválidos <2-3%.

---

## Capa cualitativa e IA

Los números dicen QUÉ; nunca POR QUÉ. Hoy hay **cero** medición cualitativa. Versión mínima accionable, gratis y sin riesgo de privacidad:

**1) Chips de motivo en el cierre (p8) — el POR QUÉ del que no agenda.**
- 1 pregunta opcional de 1 tap con 3-4 chips: *"Quiero pensarlo" / "Ver más proyectos" / "Hablar por WhatsApp" / "Tema de inversión".*
- **Mecanismo correcto (arregla un bug):** el payload del lead se POSTea fire-and-forget **antes** de llegar a p8, así que el chip **no puede viajar en el payload**. Usar el patrón de delegación que ya existe para Schedule (línea 988): `pix('trackCustom','MotivoCierre',{motivo})` → se lee en GA4/Eventos del Pixel, **sin PII, cero columnas nuevas**.
- *Señal:* concentración, no %. Si "tema de inversión" domina → problema de valor/precio; si "ver más proyectos" → falta prueba (renders/testimonios). Con n chico, "3 de 8" se lee como "mira el precio", no como "37%".

**2) Dropdown `motivo_descarte` en el CRM — la pieza de mayor señal y menor costo.**
- Lista cerrada que el operador llena al marcar DESCARTADO. Trabajo de Sheet puro, ya legible por Looker. *Bandera: descartes por "fuera de presupuesto" >50% = la pauta atrae al público equivocado.*

**3) NPS + frase post-Sesión (fase 2, condicionado).** Google Form (gratis) enviado por el borrador de Cowork — solo cuando la rutina de correo esté desplegada.

**Cómo usar la IA (Cowork/Claude):**
- **Resumen del lunes:** lee CRM + export Meta, calcula deltas vs. semana pasada, redacta el veredicto en español + 1 acción de socio. **Borrador a Gmail, nunca envía.**
- **Detección de anomalías:** marcar movimientos por **umbral absoluto** apropiado al volumen (ej. "gasto>X y 0 leads en 7d"), no deltas porcentuales sobre n diminutos.
- **Lead scoring por regla dura:** etiqueta CALIFICADO (rango supera el piso de proyecto Aurum) + 2 banderas suaves (carácter De autor/Elegante; email no-gratuito). Vive **solo en el CRM interno** (es PII sobre personas reales), nunca de cara al lead ni en un Looker compartible. **No** un score 0-100 multivariable hasta tener >150 leads con desenlace conocido — antes de eso es teatro de precisión.
- **Síntesis cualitativa:** agrupar los `MotivoCierre` y `motivo_descarte` en una nube de motivos que se LEE, no un KPI con benchmark.

**Lo que NO entra ahora:** Microsoft Clarity (grabaciones/heatmaps) — procesa PII de terceros con un tercero fuera de México sin base legal clara; overkill y exposición innecesaria a tu tamaño. Condicionarlo a aviso + consentimiento + enmascarado de inputs del gate, si algún día se quiere.

---

*Archivos load-bearing verificados para este documento:* `/Users/a./aurum-experiencia/index.html` (PageView L404 incondicional, PasoEmbudo L807, Lead L937 y Schedule L989 sin eventID, payload L920-926 sin campos de origen, fetch no-cors L932, folio no-único L848, email regex trivial `/.+@.+\..+/` L839, sin aviso/consentimiento — único texto "Cero spam" L314) y `/Users/a./aurum-experiencia/docs/webhook-apps-script.gs` (HEADERS_LEADS L273-278 con Estado/Brief/"Sesión agendada"/"QAA completo" pero cero columnas de fuente). El grep de `URLSearchParams|location.search|fbclid|utm_|document.referrer` en `index.html` devolvió **cero coincidencias**, confirmando que la captura de origen no existe hoy.