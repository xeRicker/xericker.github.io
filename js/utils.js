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

/**
 * Przyciemnia kolor w formacie HEX o podany procent.
 */
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
 * Zaawansowana metoda awaryjna kopiowania dla iOS/Safari.
 * Zwraca true/false zamiast wyświetlać alerty.
 */
export function fallbackCopyToClipboard(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  
  // Upewnij się, że element jest niewidoczny wizualnie, ale dostępny dla systemu
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  textArea.style.top = "0";
  textArea.setAttribute("readonly", "");
  document.body.appendChild(textArea);

  // Specjalna obsługa iOS
  const isIos = navigator.userAgent.match(/ipad|iphone/i);

  if (isIos) {
      const range = document.createRange();
      range.selectNodeContents(textArea);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      textArea.setSelectionRange(0, 999999);
  } else {
      textArea.select();
  }

  let success = false;
  try {
    success = document.execCommand('copy');
  } catch (err) {
    console.error('Fallback copy failed', err);
    success = false;
  }
  
  document.body.removeChild(textArea);
  return success;
}