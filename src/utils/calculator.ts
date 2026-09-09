/**
 * Safe mathematical calculator for amount inputs like:
 * "3000+500", "15000-2500", "500*3", "12000/4"
 */

export function sanitizeMathExpression(input: string): string {
  // Allow only digits, +, -, *, /, ., (, )
  return input.replace(/[^0-9+\-*\/.()]/g, '');
}

export function evaluateExpression(expr: string): number | null {
  const clean = sanitizeMathExpression(expr.trim());
  if (!clean) return null;

  // Simple and safe arithmetic expression evaluator without eval
  try {
    // Check for trailing operator like "3000+"
    const sanitized = clean.replace(/[+\-*\/]+$/, '');
    if (!sanitized) return null;

    // Use Function constructor with strict sanitized string containing only math chars
    // Double check that it contains ONLY digits and operators
    if (/^[0-9+\-*\/.()\s]+$/.test(sanitized)) {
      // eslint-disable-next-line no-new-func
      const result = Function(`'use strict'; return (${sanitized})`)();
      if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
        return Math.max(0, Math.round(result * 100) / 100);
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function formatExpressionPreview(expr: string): string {
  const evaluated = evaluateExpression(expr);
  if (evaluated === null) return '';
  return evaluated.toLocaleString();
}
