/* Minimale CSS-Utility für Web Components */

let globalStyles = null;

async function loadGlobalStyles() {
  if (globalStyles) return globalStyles;
  
  try {
    const response = await fetch('/css/global.css');
    const cssText = await response.text();
    
    globalStyles = new CSSStyleSheet();
    globalStyles.replaceSync(cssText);
    
    return globalStyles;
  } catch (error) {
    console.warn('Could not load global.css:', error);
    throw error;
  } 
}

export async function loadStylesheet(cssPath) {
  try {
    const response = await fetch(cssPath);
    const cssText = await response.text();
    
    const stylesheet = new CSSStyleSheet();
    stylesheet.replaceSync(cssText);
    
    return stylesheet;
  } catch (error) {
    console.warn(`Could not load ${cssPath}:`, error);
    /* Leeres Stylesheet als Fallback */
    return new CSSStyleSheet();
  }
}

export async function combineStylesheets(...stylesheets) {
  const global = await loadGlobalStyles();
  return [global, ...stylesheets];
} 