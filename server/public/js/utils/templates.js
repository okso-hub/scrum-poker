/**
 * HTML Template Utility for Web Components
 */

const templateCache = new Map();

export async function loadTemplate(templatePath) {
  // Check cache for template first
  if (templateCache.has(templatePath)) {
    return templateCache.get(templatePath);
  }
  
  // otherwise fetch template
  try {
    const response = await fetch(templatePath);
    if (!response.ok) {
      throw new Error(`Failed to load template: ${response.status}`);
    }
    
    const htmlText = await response.text();
    
    // The following Template improves performance
    const template = document.createElement('template');
    template.innerHTML = htmlText;
    
    // Save to cache
    templateCache.set(templatePath, template);
    
    return template;
  } catch (error) {
    console.warn(`Could not load template ${templatePath}:`, error);
    // Fallback: empty template
    const fallback = document.createElement('template');
    templateCache.set(templatePath, fallback);
    return fallback;
  }
}

export function interpolateTemplate(template, data = {}) {
  // Clone template in order to manipulate it to the needs of a page
  const clone = template.content.cloneNode(true);
  const container = document.createElement('div');
  container.appendChild(clone);
  
  let html = container.innerHTML;
  
  // Template-Interpolations should look like this: ${variableName}
  Object.entries(data).forEach(([key, value]) => {
    const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
    html = html.replace(regex, String(value));
  });
  
  return html;
}
