# ig-carousel-agent

Agente/skill de Claude Code para generar carruseles de Instagram (portada,
slides de contenido y CTA) con texto renderizado por **Nano Banana Pro**, vía
la API de [Kie AI](https://kie.ai), manteniendo un estilo visual coherente:
ilustración animada, paleta roja y blanca, para un canal de Instagram de
Inteligencia Artificial.

## Cómo funciona

Le pides al skill, en lenguaje natural, algo como:

> "Crea un carrusel sobre las noticias de hoy"
> "Hazme un carrusel sobre este guion: ..."

El skill (`.claude/skills/ig-carousel/SKILL.md`) escribe el copy de cada slide
(portada → contenido → CTA), arma un prompt detallado por slide combinando ese
copy con el estilo de marca fijo, y ejecuta `scripts/generate-carousel.mjs`
para generar y descargar las imágenes.

## Requisitos

- Node.js >= 18 (usa `fetch` nativo, sin dependencias externas).
- Una API key de Kie AI con acceso a `nano-banana-pro`.

## Uso manual del script

La API key **no se guarda en ningún archivo**; se pasa como variable de
entorno solo para el comando puntual:

```bash
KIE_AI_API_KEY="tu_api_key" node scripts/generate-carousel.mjs \
  --input input/ejemplo.json \
  --out output/ejemplo
```

Esto genera las imágenes en `output/ejemplo/01_cover.png`,
`02_content.png`, ..., `0N_cta.png`, junto con un `manifest.json` con el
detalle de cada slide (prompt usado, taskId, estado).

## Estructura del proyecto

```
.claude/skills/ig-carousel/SKILL.md   # definición del skill (flujo completo)
scripts/generate-carousel.mjs         # orquestador: crea tareas, hace polling, descarga
scripts/lib/kieClient.mjs             # cliente HTTP de Kie AI (createTask/queryTask/pollTask)
scripts/lib/styleGuide.mjs            # estilo de marca fijo + construcción de prompts
input/ejemplo.json                    # ejemplo de archivo de entrada para el script
output/                               # imágenes generadas (ignorado en git)
```

## Notas de diseño

- **Consistencia visual**: cada slide puede usar la imagen de la slide
  anterior como referencia (`image_input`) para mantener el mismo
  personaje/mascota y estilo de principio a fin.
- **Sin timeouts prematuros**: el polling de cada tarea espera hasta 8
  minutos por slide con reintentos automáticos, evitando que una generación
  lenta corte el proceso.
- **API key efímera**: nunca se escribe en disco ni se commitea; se pide en
  el momento de ejecutar el skill.
