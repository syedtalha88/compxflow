/**
 * Escapes regex special characters from a string so it can be safely used
 * inside `new RegExp()` for literal substring matching.
 *
 * Prevents ReDoS (Regular Expression Denial of Service) attacks where
 * crafted input like `(a+)+$` causes catastrophic backtracking.
 *
 * @param {string} str - Raw user input
 * @returns {string} Escaped string safe for RegExp constructor
 */
export const escapeRegex = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export default escapeRegex;
