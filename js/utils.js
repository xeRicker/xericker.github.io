/**
 * Zwraca sformatowaną datę w formacie DD.MM.RRRR
 * @returns {string} Sformatowana data
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
 * @param {string} hex - Kolor w formacie #RRGGBB
 * @param {number} percent - Procent przyciemnienia (0-100)
 * @returns {string} Nowy, przyciemniony kolor HEX.
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
 * Alternatywna metoda kopiowania do schowka dla starszych przeglądarek.
 * @param {string} text - Tekst do skopiowania.
 */
export function fallbackCopyToClipboard(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
    alert("Lista skopiowana alternatywnie!");
  } catch (err) {
    alert("Kopiowanie nieudane.");
  }
  document.body.removeChild(textarea);
}