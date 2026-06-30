export const BRAND = {
  colors:
    'estrictamente negro premium y dorado/ámbar metálico; el negro domina como fondo, el dorado se usa para acentos, íconos, líneas y tipografía destacada; usar blanco solo si es indispensable para la legibilidad del texto, sin introducir ningún otro color',
  style:
    'ilustración 2D animada, estilo flat/vector moderno con toques de gradiente metálico dorado, formas limpias y geométricas, leves líneas de movimiento, brillos o destellos que sugieren crecimiento y solidez financiera, estética premium tipo fintech/cripto de autoridad',
  mascot:
    'mantener un motivo visual recurrente relacionado a cripto/inversión (ej. un ícono de gráfico ascendente, una moneda estilizada o un toro minimalista en dorado) presente en todas las slides para reforzar la identidad de marca',
  typography:
    'tipografía bold sans-serif integrada en la ilustración, texto grande y perfectamente legible, sin errores ortográficos, con margen de seguridad respecto a los bordes de la imagen',
  channel:
    'marca personal de Camilo Mondragón (Principia) sobre criptomonedas, inversión digital y educación financiera para Latinoamérica',
};

function roleInstructions(role, slideNumber, totalSlides) {
  switch (role) {
    case 'cover':
      return `Esta es la PORTADA (slide 1 de ${totalSlides}) del carrusel. Debe ser un gancho visual fuerte que detenga el scroll, con un titular grande y llamativo. Incluir un pequeño indicador visual de "desliza" (flecha o ícono de swipe) en una esquina.`;
    case 'cta':
      return `Esta es la slide FINAL (CTA, ${slideNumber} de ${totalSlides}) del carrusel. Debe mostrar un llamado a la acción claro (ej. "Síguenos para más contenido de cripto e inversión", "Comenta tu opinión", "Guarda este post"), con un diseño tipo botón o banner destacado, manteniendo exactamente el mismo estilo visual que las slides anteriores.`;
    default:
      return `Esta es una slide de CONTENIDO (${slideNumber} de ${totalSlides}) del carrusel. Debe desarrollar UNA sola idea o punto clave de forma clara, con un ícono o ilustración que represente el concepto, manteniendo coherencia visual exacta con el resto del carrusel (mismos colores, mismo estilo, mismo motivo de marca).`;
  }
}

/**
 * Builds a single detailed nano-banana prompt for one slide, folding in the
 * fixed brand style so every slide stays visually consistent without the
 * caller having to repeat the style boilerplate each time.
 */
export function buildPrompt({ role, headline, body, slideNumber, totalSlides }) {
  const parts = [
    roleInstructions(role, slideNumber, totalSlides),
    `Texto a renderizar EXACTAMENTE en la imagen (sin errores ortográficos, tipografía bold legible): titular: "${headline}".`,
    body ? `Texto secundario/de apoyo (más pequeño que el titular): "${body}".` : null,
    `Paleta de color: ${BRAND.colors}.`,
    `Estilo visual: ${BRAND.style}.`,
    `Identidad de marca: ${BRAND.mascot}.`,
    `Tipografía: ${BRAND.typography}.`,
    `Contexto: imagen para un post de Instagram en formato carrusel de un ${BRAND.channel}.`,
    'Composición: diseño vertical centrado, jerarquía visual clara, fondo no saturado de elementos para no competir con el texto, alta legibilidad incluso en miniatura.',
  ].filter(Boolean);

  return parts.join(' ');
}
