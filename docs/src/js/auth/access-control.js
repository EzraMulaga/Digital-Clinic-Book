/**
 * NOTE:
 * This file currently contains placeholder / partial logic.
 * Access rules and data handling are under active development.
 */

const params = new URLSearchParams(window.location.search);
const source = params.get("source");

if (source !== "emergency") {
  window.location.replace("access-denied.html?reason=unauthorized_access");
}

