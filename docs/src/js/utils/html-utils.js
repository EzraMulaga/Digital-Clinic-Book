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

// Supabase Auth errors (signUp/signInWithPassword/etc.) are already
// reasonably plain-language -- pass these through as-is rather than
// replacing them with a generic message.
const PASSTHROUGH_AUTH_MESSAGE_PREFIXES = [
  "Invalid login credentials",
  "User already registered",
  "Email not confirmed",
  "Password should be",
  "Signup requires a valid password",
  "Unable to validate email address",
];

// Postgres/PostgREST error codes and message patterns mapped to plain
// language, so raw database errors are never shown to the user directly.
const KNOWN_ERROR_PATTERNS = [
  {
    test: (err) => err?.code === "PGRST116",
    message: "We couldn't find that record. It may have been removed, or the ID may be incorrect.",
  },
  {
    test: (err) => err?.code === "23505" || /duplicate key value/i.test(err?.message ?? ""),
    message: "That value is already in use. Please double-check and try a different one.",
  },
  {
    test: (err) => err?.code === "42501" || /row-level security/i.test(err?.message ?? ""),
    message: "You don't have permission to do that.",
  },
  {
    test: (err) => err?.code === "23503" || /foreign key constraint/i.test(err?.message ?? ""),
    message: "That record couldn't be found, or is linked to other data that no longer exists. Please check the details and try again.",
  },
  {
    test: (err) => err?.code === "23502" || /null value in column/i.test(err?.message ?? ""),
    message: "Please fill in all required fields.",
  },
  {
    test: (err) => /failed to fetch|network/i.test(err?.message ?? ""),
    message: "Couldn't connect. Please check your internet connection and try again.",
  },
];

/**
 * Translates a raw Supabase/Postgres error into a plain-language message
 * safe to show to a user, instead of surfacing technical error text
 * (constraint names, error codes, etc.) directly.
 * @param {*} err - The caught error
 * @param {string} [fallback] - Shown when no known pattern matches
 * @returns {string}
 */
export function friendlyErrorMessage(
  err,
  fallback = "Something went wrong. Please try again, or contact support if this keeps happening."
) {
  if (!err) return fallback;

  const message = err.message ?? "";
  if (PASSTHROUGH_AUTH_MESSAGE_PREFIXES.some((prefix) => message.startsWith(prefix))) {
    return message;
  }

  const known = KNOWN_ERROR_PATTERNS.find((pattern) => pattern.test(err));
  return known ? known.message : fallback;
}

/**
 * Sets the text of a per-field validation message.
 * Expects an element with matching data-error-for="<fieldName>" in the form.
 */
export function setFieldError(form, fieldName, message) {
  const el = form.querySelector(`[data-error-for="${fieldName}"]`);
  if (el) el.textContent = message || "";
}

/** Clears every per-field validation message in the form. */
export function clearFieldErrors(form) {
  form.querySelectorAll("[data-error-for]").forEach((el) => { el.textContent = ""; });
}

/**
 * Validates that each of the given fields has a non-empty value, setting a
 * plain-language message beside the first offending field(s) and focusing
 * the first one. Returns true if every field is valid.
 * @param {HTMLFormElement} form
 * @param {{name: string, label: string}[]} fields
 */
export function validateRequiredFields(form, fields) {
  clearFieldErrors(form);
  let firstInvalid = null;

  for (const { name, label } of fields) {
    const value = form.elements[name]?.value?.trim();
    if (!value) {
      setFieldError(form, name, `${label} is required.`);
      if (!firstInvalid) firstInvalid = form.elements[name];
    }
  }

  if (firstInvalid) firstInvalid.focus();
  return !firstInvalid;
}
