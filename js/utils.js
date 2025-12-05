/**
 * Zwraca sformatowaną datę w formacie DD.MM.RRRR
 */
export function getFormattedDate() {
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
}

export function darkenColor(hex, percent) {
  let num = parseInt(hex.slice(1), 16);
  let r = (num >> 16) - Math.round(255 * (percent / 100));
  let g = ((num >> 8) & 0x00FF) - Math.round(255 * (percent / 100));
  let b = (num & 0x0000FF) - Math.round(255 * (percent / 100));

  r = Math.max(0, r);
  g = Math.max(0, g);
  b = Math.max(0, b);

  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

/**
 * ULTRA-ROBUST iOS CLIPBOARD FALLBACK
 */
export function fallbackCopyToClipboard(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  
  // Style, które oszukują iOS, że to normalne pole edycyjne
  textArea.contentEditable = true;
  textArea.readOnly = false;
  textArea.style.position = "fixed";
  textArea.style.bottom = "0";
  textArea.style.left = "0";
  textArea.style.width = "2em";
  textArea.style.height = "2em";
  textArea.style.padding = "0";
  textArea.style.border = "none";
  textArea.style.outline = "none";
  textArea.style.boxShadow = "none";
  textArea.style.background = "transparent";
  textArea.style.opacity = "0.01"; // Musi być minimalnie widoczne
  
  document.body.appendChild(textArea);

  // Kluczowe dla iOS: najpierw focus, potem range
  textArea.focus();
  textArea.setSelectionRange(0, 999999); // Dla pewności

  const range = document.createRange();
  range.selectNodeContents(textArea);
  
  const selection = window.getSelection();
  selection.removeAllRanges(); // Wyczyść stare zaznaczenia
  selection.addRange(range);   // Dodaj nowe

  let success = false;
  try {
    success = document.execCommand('copy');
  } catch (err) {
    console.error('Fallback copy failed', err);
  }
  
  // Sprzątanie
  selection.removeAllRanges();
  document.body.removeChild(textArea);
  return success;
}