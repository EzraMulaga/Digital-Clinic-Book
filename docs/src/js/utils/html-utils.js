/**
 * Escapes HTML special characters to prevent XSS when interpolating
 * dynamic values into innerHTML.
 * @param {*} str - Value to escape
 * @returns {string} Escaped string
 */
export function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
