/**
 * HTML Template Utility für Web Components
 */

const templateCache = new Map();

export async function loadTemplate(templatePath) {
  // Cache prüfen
  if (templateCache.has(templatePath)) {
    return templateCache.get(templatePath);
  }
  
  try {
    const response = await fetch(templatePath);
    if (!response.ok) {
      throw new Error(`Failed to load template: ${response.status}`);
    }
    
    const htmlText = await response.text();
    
    // Template-Element erstellen für bessere Performance
    const template = document.createElement('template');
    template.innerHTML = htmlText;
    
    // In Cache speichern
    templateCache.set(templatePath, template);
    
    return template;
  } catch (error) {
    console.warn(`Could not load template ${templatePath}:`, error);
    // Fallback: leeres Template
    const fallback = document.createElement('template');
    templateCache.set(templatePath, fallback);
    return fallback;
  }
}

export function interpolateTemplate(template, data = {}) {
  // Template klonen für Manipulation
  const clone = template.content.cloneNode(true);
  const container = document.createElement('div');
  container.appendChild(clone);
  
  let html = container.innerHTML;
  
  // Einfache Template-Interpolation: ${variableName}
  Object.entries(data).forEach(([key, value]) => {
    const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
    html = html.replace(regex, String(value));
  });
  
  return html;
}
