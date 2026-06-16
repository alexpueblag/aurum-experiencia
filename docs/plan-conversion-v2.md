# Plan de Acción Aurum — Más Sesiones de Diseño Agendadas

> Documento de ejecución basado en el consenso verificado del panel de 8 expertos + 6 entrevistas a clientes. Meta única: que más leads **AGENDEN la Sesión de Diseño**. Todo lo marcado **[DECISIÓN DE ALEJANDRO]** NO se ejecuta sin su OK explícito. La mayoría de cambios de copy se hacen **editando el Google Sheet "TEXTOS WEB" sin desplegar código**.

## Resumen ejecutivo del consenso

- **La promesa rota es el problema #1, por unanimidad.** El hero y el gate prometen "ve tu rango de inversión AL INSTANTE / VER MI RANGO" y el cierre (p8) no muestra ningún número. Es un bait-and-switch en el milisegundo de mayor intención de compra. Arreglarlo es el cambio de mayor impacto y, en su versión segura, es solo editar el Sheet. (Consenso 14/14 expertos; severidad crítica.)
- **El correo en 24h canibaliza la cita.** En el cierre compiten dos caminos y gana el cómodo (esperar un correo gratis sin hablar con nadie). El correo debe subordinarse a la cita como *confirmación de lo que se afina en la sesión*, no como entregable alternativo. (Consenso 11.)
- **Cero prueba real para un ticket de millones.** Sin rostro del arquitecto, sin obra construida con nombre, sin testimonios. El público frío de lujo no agenda una videollamada con un desconocido. La mejor "prueba", de todos modos, es cumplir lo prometido. (Consenso 12.)
- **La fricción operativa de p5/p6 y el salto a Google Calendar en móvil sangran leads**, pero su magnitud real es hipótesis: NO hay analítica de embudo instalada. La livebar fixed tapa tarjetas (verificado en snapshots). (Consenso 12 y 9.)
- **Falta instrumentación.** Sin Meta Pixel/analítica no se puede saber dónde abandona la gente; es el único hallazgo 100% factual y el prerequisito para priorizar lo dudoso. Aun así, los fixes de alta confianza (promesa rota, doble-CTA) se ejecutan ya, en paralelo, porque no dependen de datos.
- **Dos riesgos de integridad bloquean parte del plan:** (1) la rutina del correo "<24h" NO está desplegada — si hoy no sale ese correo, el bait-and-switch es total; (2) higiene básica rota (favicon 404, sin meta OG, el preview del anuncio se ve como cuadro roto).

---

## Plan priorizado

### P0 (esta semana)

| Cambio | Tipo | Dónde | Antes → Después | Por qué (consenso) | Esfuerzo | Impacto |
|---|---|---|---|---|---|---|
| Desprometer la cifra en el GATE (punto de máximo daño) | copy | Sheet: `gate_btn3`, `gate_sub3` | `gate_btn3`: "VER MI RANGO Y AGENDAR" → "Ver mi residencia y agendar". `gate_sub3`: quitar "ve tu rango de inversión al instante" → "Mira tu residencia tomar forma y agenda tu Sesión de Diseño." | Donde el lead "paga" con su correo, la coherencia importa más que el volumen. Bait-and-switch crítico (14). | XS | Muy alto |
| Re-encuadrar la promesa del HERO (no borrar el gancho a ciegas) | copy | Sheet: `p0_sub3` | Quitar "descubre el rango de inversión de tu residencia" → "...recibe tu rango de inversión por correo en menos de 24h, preparado por un arquitecto" (diferido y honesto) | Conserva el atractivo económico del anuncio sin prometer cifra-en-pantalla (14) | XS | Alto |
| Subordinar el correo a la cita (copy) | copy | Sheet: `r3_correo_promesa`, `sesion_titulo` | `r3_correo_promesa`: reposicionar correo como confirmación/respaldo de lo que se afina en la sesión (no premio pasivo). `sesion_titulo` → "Tu siguiente paso de verdad: agenda tu Sesión de Diseño" (NO "único", choca con que el paso ① sigue siendo el correo) | El correo es la salida fácil que mata la cita (11) | S | Alto |
| Subir la sesion-box por encima del bloque de 2 pasos | código (HTML estático) | `index.html` (reordenar bloques del reveal p8) | Pasos correo/cita equiparados → sesion-box arriba con jerarquía visual 1; bloque correo a texto de apoyo gris/pequeño | 80% del valor del hallazgo doble-CTA, bajo riesgo (11) | S | Alto |
| Línea de autoría del arquitecto (sin foto) | copy | Sheet: nueva clave en sesion-box (p8) | (nada) → "Tu Sesión de Diseño es con un arquitecto Aurum, no con un vendedor." | Baja el "agendar con un desconocido" sin requerir foto verificada (12, Fase 1) | XS | Medio-alto |
| Reaseguro PRE-CLIC de agenda (quita el miedo a Google login) | copy | Sheet: `agenda_p1`, `agenda_p2` | Añadir: "Se abre la página de citas de Google; NO necesitas crear cuenta ni iniciar sesión, solo escribir tu correo." | El salto a pestaña externa + miedo a login sangra leads 55+ en tráfico 90% móvil (4) | XS | Medio-alto |
| Arreglar overlap de la livebar sobre tarjetas (p5/p6) | código (CSS) | `index.html` (padding-bottom ~90px a `.pantalla` activa / body con livebar p4-p7) | Livebar `z-index:60` tapa la 2ª fila de integrantes y tarjetas → reservar espacio | Verificado en snapshots; fix de 1 línea, cero riesgo (9, 12) | XS | Medio |
| Eliminar colisión semántica de p4 (Serena descrita como "Cálida") | copy | Sheet: `caracter_1_desc` (revisar 2/3/4) | "Cálida y envolvente. Pocos materiales, mucha intimidad." → "Íntima y envolvente. Pocos materiales, mucha calma." | Colisión verificada; confunde la elección (11) | XS | Medio |
| Favicon + meta OG/Twitter | código (HTML estático) | `index.html` `<head>` (favicon, `og:image` con fachada, `og:title/description/url`) | 404 + preview roto del anuncio → favicon válido + preview con residencia | Arregla 404 y el preview roto de FB/IG; cero riesgo (10) | S | Medio (sube CTR del anuncio) |
| Recorte quirúrgico de sobre-tranquilización en p8 | copy | Sheet: `r2_reaseguro`, `r3_correo_nota` | `r2_reaseguro`: quitar "sin compromiso ·" → "Videollamada de 45 min · puedes reagendar. Recibirás la invitación con el enlace en tu correo." `r3_correo_nota`: borrar "Sin compromiso, siempre." | "Sin compromiso" x5-6 abarata el ticket; dejar UNA promesa de costo en `sesion_gratis` (7) | XS | Bajo-medio |

### P1 (2-3 semanas)

| Cambio | Tipo | Dónde | Antes → Después | Por qué (consenso) | Esfuerzo | Impacto |
|---|---|---|---|---|---|---|
| Instalar Meta Pixel + Conversions API (eventos custom por paso) | código (HTML estático) | `index.html`: `ir(n)` → ViewStep p0-p6; `revelar()` (l.289) → Lead; enlace agenda (l.820/832) → Schedule | Sin analítica → <20 líneas `fbq('trackCustom',...)` inline | Único hallazgo 100% factual; prerequisito para optimizar ad-spend a "Agenda" y validar lo dudoso (3) | S | Alto (habilitador) |
| Fallback "Agendar por WhatsApp" como CTA secundario | código (HTML estático) | `index.html` p8: `<a href="wa.me/...">` + nueva clave `agenda_wa_btn`. **[DECISIÓN DE ALEJANDRO: número WhatsApp destino]** | Solo botón oro a Google → botón oro = agendar; enlace gris fino = "¿Prefieres que te escribamos por WhatsApp?" (wa.me prellenado con folio) | Salida premium para quien no quiere pelear con Google Calendar (4) | S | Medio-alto |
| H1 que lidere con el sueño, no el mecanismo | copy | Sheet: `p0_titulo` (mantener `doc_titulo` para SEO) | "El Cuestionario de Arquitectura de Autor en 90 segundos." → "Diseña tu residencia de autor —en 90 segundos, sin formularios." | Vender el sueño, no el mecanismo; conservar el ancla anti-formulario (4) | XS | Medio |
| p6: mostrar 6-8 sueños estrella + "Ver más", thumbnails, sub más aspiracional | código (HTML/CSS) + copy | `index.html` (orden de `EXTRAS_UI`, "Ver más", patrón `.card .visual`) + Sheet `p6_sub` | 20 opciones áridas sin imagen → 6-8 con miniatura, resto colapsado. `p6_sub` → "Los espacios que harían única tu residencia. Elige los que ya imaginas." | Sobrecarga/parálisis en la pantalla más aspiracional (12) | M | Medio |
| p5: terreno con chips tap-eables + "No lo sé aún"; integrantes más compactos | código (HTML/JS) + copy | `index.html` (chips Chico/Mediano/Grande + "No lo sé aún"; reducir alto `.intg`) + Sheet `p5_terreno_sub` | Slider de m2 que muchos no saben → chips; sub → "Aproximado — lo afinamos en tu sesión" | Pantalla más pesada; muchos no saben su superficie (9). NO colapsar integrantes tras enlace | M | Medio |
| Foto del arquitecto en sesion-box p8 | imagen + código | `index.html` p8 + Sheet `arquitecto_foto_url` (degrada limpio si vacía). **[DECISIÓN/INSUMO DE ALEJANDRO: foto real]** | Sin rostro → 1 foto en el momento de máxima intención (NO en el gate) | Prueba en el punto de decisión (12, Fase 2) | S | Medio |
| Scroll/sticky inteligente al botón de agenda en móvil | código (JS) | `index.html`: `revelar()` hace scroll de la tarjeta de agenda al viewport; sticky SOLO si `#btnAgenda` sale de pantalla (IntersectionObserver, l.821-827) | Sticky no aparece en móvil → garantizar visibilidad sin duplicar botón | El botón queda tras 4 bullets + ancla en p8 largos (4) | S | Medio |

### P2 (después)

| Cambio | Tipo | Dónde | Antes → Después | Por qué (consenso) | Esfuerzo | Impacto |
|---|---|---|---|---|---|---|
| **[DECISIÓN DE ALEJANDRO]** Mostrar m² habitables como número estrella en p8 | estratégico + código | `index.html`: pintar `c.hab` (l.604, ya viaja al CRM l.854) en `.rango-hero` (l.136, ya existe sin usar) | p8 sin cifra → m² como gratificación instantánea + único botón = Agendar | Cierra el bucle de la promesa con dato derivado de SUS clicks (debate central). **Choca con la decisión documentada de Alejandro 2026-06-11; no ejecutar sin su OK** | S (1 línea JS) | Potencialmente muy alto |
| Hero visual: banda/imagen contenida bajo el texto | código (HTML/CSS) + imagen | `index.html` p0. **[DECISIÓN DE ALEJANDRO: selección de render]** | Media pantalla vacía en móvil → render aspiracional (interior/atardecer, NO las 6 fachadas de p1) sin texto encima | Llena el vacío y da message-match al anuncio; A/B cuando haya analítica (10) | M | Medio |
| Mini-imágenes/texturas por carácter en p4 | código (HTML/CSS) + imagen | `index.html` p4 (micro-texturas: madera/concreto/mármol/vidrio, lazy-load, tamaño fijo) | 4 tarjetas solo texto → elegir con los ojos | Solo como experimento medido; el texto claro puede ganarle a la imagen (11, Paso 2) | M | Medio (incierto) |
| Portafolio con 1 frase de autoría + testimonio (si hay assets reales) | copy + código | Sheet `testimonio_1`, `r2_prueba`/`p0_prueba`. **[INSUMO DE ALEJANDRO: nombre/colonia/año reales]** | Claim anónimo "+75 familias" → "Las residencias que viste al inicio son obra Aurum" + máx 1 testimonio con nombre autorizado | Prueba sin inventar; testimonio falso resta más de lo que suma (12, Fase 2) | M | Medio |
| **[DECISIÓN DE ALEJANDRO]** WhatsApp obligatorio en el gate | estratégico | `index.html` gate (l.286/410) | Opcional → required con justificación | Cardone: regalas la persecución (~80% del cierre en MX). PERO clientes de alta intención lo dejaron en blanco a propósito; podría subir abandono. Condicionar a inyectar prueba antes (debate) | XS | Incierto (riesgo) |
| **[DECISIÓN DE ALEJANDRO]** Revisar el ancla "$4,800 tachado → sin costo" | estratégico | `index.html` p8 / Sheet `sesion_*` | Precio tachado tipo cupón → ancla de exclusividad/hospitalidad O justificar el número | Chris Do: el cupón abarata el lujo; Roberto/Ana lo leyeron como infoproducto. Hormozi: conservarlo pero exponerlo antes (debate abierto) | S | Incierto |

---

## Copy reescrita lista para pegar

> Todo esto se pega en el Google Sheet "TEXTOS WEB" en la clave indicada. **No requiere desplegar código.** Donde se promete plazo de 24h, ver el riesgo del correo no desplegado en la última sección.

**H1 del hero** — clave `p0_titulo`
> `Diseña tu residencia de autor —en 90 segundos, sin formularios.`

**Sub del hero** — clave `p0_sub3`
> `Elige lo que te gusta con un click y mira tu residencia tomar forma al instante. Recibe tu rango de inversión por correo en menos de 24h, preparado por un arquitecto. Gratis y sin compromiso.`

**Sub del gate** — clave `gate_sub3`
> `Dinos a dónde te enviamos tu estimado y mira tu residencia tomar forma al instante. Tus metros, revisados por un arquitecto, llegan a tu correo.`
> *(Se elimina "VE TU RANGO DE INVERSIÓN AL INSTANTE": esa cifra no aparece en pantalla. Mantener el "<24h" solo si el correo está garantizado — ver Riesgos.)*

**Botón del gate** — clave `gate_btn3`
> `Ver mi residencia y agendar`

**Las 4 descripciones de carácter (sin solaparse)** — palabra-ancla distinta al inicio para que se discriminen de un vistazo. *Mantener intactos los IDs internos Acogedora/Casual/Elegante/Lujo.*
- `caracter_1_desc` (Serena): `Íntima y envolvente. Pocos materiales, mucha calma.`
- `caracter_2_desc` (Sobria): `Noble y medida. Materiales con presencia, luz contenida.`
- `caracter_3_desc` (Cálida): `Clara y sin excesos. Lo necesario, muy bien resuelto.`
- `caracter_4_desc` (De autor): `Única. Cada vista, una postal; una pieza irrepetible.`

**Cierre / oferta** — el correo se subordina a la cita:
- `sesion_titulo`: `Tu siguiente paso de verdad: agenda tu Sesión de Diseño`
- `r3_correo_promesa`: `Tu estimado es tu punto de partida; el rango exacto de TU residencia lo afinamos juntos, en vivo, en tu Sesión de Diseño.`
- Nueva clave de autoría en sesion-box (p.ej. `sesion_autoria`): `Tu Sesión de Diseño es con un arquitecto Aurum, no con un vendedor.`
- `r2_reaseguro`: `Videollamada de 45 min · puedes reagendar. Recibirás la invitación con el enlace en tu correo.`
- `agenda_p1` / `agenda_p2` (reaseguro pre-clic): `Se abre la página de citas de Google en otra pestaña. No necesitas crear cuenta ni iniciar sesión: solo escribir tu correo.`

> Conservar sin tocar: `sesion_gratis` ("Sin costo y sin compromiso" — la única promesa de costo que queda) y `gate_candado` ("Cero spam / tus datos solo se usan para enviarte tu estimación" — reaseguro de privacidad de alto ROI en captura fría).

---

## La decisión estratégica de Alejandro

**El debate: ¿mostrar un NÚMERO propio del cliente en p8, o mantener cero cifras?**

Hay que separar dos cosas que la restricción mezcla:

- **PRECIO** → restricción inviolable y razonada (no hay datos suficientes para comprometer un monto; se quiere medir interés antes de dar cifras). **No se toca.** Punto.
- **m² HABITABLES** → son **derivados de las propias elecciones del cliente**, no un monto comprometido. `c.hab` ya está calculado (`index.html` l.604), ya viaja al CRM (l.854 `m2hab:c.hab`), y la clase `.rango-hero` (l.136) ya existe sin usar. Mostrarlos honra literalmente la promesa "ve tus metros" y es ~1 línea de JS + CSS existente, cero riesgo de catálogo.

**Recomendación clara:** Plantéale a Alejandro mostrar **solo los m² habitables** (no precio, no rango) como número-premio en p8, con el único botón de la pantalla = Agendar. Es la jugada de mayor upside de todo el plan según los 8 expertos y los clientes Roberto/Jorge ("con mi número en pantalla agendaría sin pensarlo").

**Trade-offs honestos:**
- **A favor:** cierra el bucle de la promesa con un dato real e inmediato; convierte la victoria del lead en empuje hacia la cita; respeta la regla del precio.
- **En contra / lo que pesa:** la decisión vigente y documentada de Alejandro (2026-06-10/11) extiende el "cero cifras" también a los m² *a propósito* — el comentario en `revelar()` (l.788) lo cablea deliberadamente. Su lógica de negocio (medir interés antes de dar números) es legítima.
- **Veredicto operativo:** esto **NO se implementa sin su OK explícito**. Marcar como **[DECISIÓN DE ALEJANDRO]**. Si él mantiene cero cifras, **el plan funciona igual**: el fix unánime y seguro (desprometer la cifra en gate/hero vía Sheet) iguala promesa y entrega sin depender de él. Mostrar m² es el upside, no el requisito.

Decisiones adicionales que también son suyas (no ejecutar sin OK): WhatsApp obligatorio en el gate, y el destino del ancla "$4,800 tachado" (ver tabla P2 y A/B).

---

## Pruebas A/B sugeridas

> Requieren analítica instalada primero (P1). Orden por impacto esperado:

1. **Promesa alineada vs. control** — gate/hero desprometido (variante) vs. copy actual. Métrica: % que llega a p8 y % que hace clic en Agendar. *Es el cambio de mayor impacto teórico; medir su efecto real.*
2. **[DECISIÓN DE ALEJANDRO] m² en p8 vs. sin cifra** — si aprueba mostrar m². Métrica: clic en Agendar (Schedule). Roberto/Jorge sugieren lift fuerte.
3. **Correo subordinado + sesion-box arriba vs. layout actual** — aislar el efecto de la jerarquía del doble-CTA.
4. **Fallback WhatsApp presente vs. ausente** — % de agendados totales (Google + WhatsApp) sin canibalizar el botón oro.
5. **H1 sueño vs. mecanismo** — "Diseña tu residencia de autor..." vs. "El Cuestionario... en 90 segundos." Métrica: arranque (clic en CTA hero) y avance del embudo.
6. **p6 con 6-8 estrella + "Ver más" vs. 20 opciones** — abandono en p6 y avance a p7.
7. **Ancla $4,800 (cupón) vs. exclusividad/hospitalidad** — si Alejandro abre ese debate. Métrica: clic en Agendar.
8. **Carácter con micro-texturas vs. solo texto en p4** — abandono en p4 (el texto claro podría ganar).

---

## Riesgos y dependencias

- **CRÍTICO — Correo "<24h" NO desplegado.** La rutina que envía el correo de estimado aún no está viva. Si hoy no sale ese correo, el bait-and-switch es **total** (ni cifra en pantalla ni correo). Esto hace el fix de copy más urgente, **y a la vez prohíbe prometer "24h"** hasta que la tarea esté desplegada/garantizada. **Dependencia bloqueante:** antes de pegar cualquier copy que diga "en menos de 24h" (hero, gate), confirmar con Cowork que el envío está vivo. Si no lo está, usar una promesa de plazo más blanda ("a tu correo, preparado por un arquitecto") sin comprometer horas.
- **CRÍTICO — Sin analítica de embudo.** Todos los puntos de abandono (p5, p6, p7, p8) son **hipótesis sólidas** (snapshots + 6 entrevistas), **no datos**. Riesgo: invertir esfuerzo de código en p5/p6 sin saber si mueven la aguja. **Mitigación:** desplegar los fixes de alta confianza ya (no dependen de datos) e instalar Meta Pixel (P1) **antes** de rediseñar p5/p6. Definir el evento de conversión de la pauta como el clic a agenda (Schedule), reconociendo que es intención, no cita confirmada; cerrar el loop cruzando manualmente contra el Google Calendar de Alejandro al inicio.
- **Insumos que dependen de Alejandro (no inventar nada):** número real de "+75 familias" y año; nombre/foto del arquitecto; nombres/colonias de obra entregada y permisos; testimonio verificable; número de WhatsApp destino; selección de render para hero/OG. Sin confirmación, las claves quedan **vacías** (degradan limpio, como `logo_url`/`cta_agenda_url` ya hacen).
- **Decisiones bloqueadas por Alejandro:** mostrar m² en p8; WhatsApp obligatorio; destino del ancla $4,800. Ninguna se ejecuta sin OK explícito.
- **Descuadres del panel a validar contra la versión viva, no contra el resumen:** algunos hallazgos citan copy que ya no es exacta y nombres de entrevistados que no cuadran (p.ej. "Doña Carmen" no aparece en los entrevistados; los 4 del doble-CTA no coinciden). **Regla:** validar cada clave y número de línea contra `index.html` en vivo y contra el Sheet antes de editar.
- **Restricciones inviolables que todo lo anterior respeta:** HTML estático sin build; nunca enviar correos automáticos (solo borradores que revisa Alejandro); no cambiar precios ni m² del catálogo sin confirmación; no mostrar precio en pantalla.