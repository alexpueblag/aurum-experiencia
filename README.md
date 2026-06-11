# Aurum Experiencia — Cuestionario de Arquitectura de Autor

Pre-formulario web interactivo de Aurum Arquitectos: el cliente diseña su residencia a base de clicks (estilo, sensaciones, vida diaria, nivel, esenciales, extras) y recibe al instante m² habitables estimados + rango de inversión calculados con el catálogo oficial Aurum, con cierre hacia una Sesión de Diseño por videollamada (agenda de Google Calendar).

**Todo el texto, el logo y el link de agenda se editan desde Google Sheets** (pestaña `TEXTOS WEB` del CRM - YOD), sin tocar el código. La web los carga al abrir y cae a un respaldo embebido si el Sheet no responde.

- **App:** `index.html` (estático, sin dependencias — listo para GitHub Pages)
- **Contexto completo para retomar el trabajo:** `CLAUDE.md`
- **Catálogo oficial:** `data/aurum-catalogo.json`
- **Textos editables:** pestaña `TEXTOS WEB` (se crea con `sembrarTextos_()` en el Apps Script)
- **Molde del brief:** `templates/brief-template.html`

## Deploy rápido
Settings → Pages → Deploy from branch → `main` → raíz. La app queda en `https://<usuario>.github.io/<repo>/`.
