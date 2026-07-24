const SENSITIVE_AUDIT_KEY =
  /(?:iban|bic|accountowner|payment|password|secret|token|twofactor|2fa|identity|idcard|recovery|seed|credential)/i;

const isPlainObject = (value) =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.getPrototypeOf(value) === Object.prototype;

const redactAuditValue = (value, key = "") => {
  if (SENSITIVE_AUDIT_KEY.test(key)) return "[REDACTED]";
  if (Array.isArray(value)) {
    return value.map((item) => redactAuditValue(item));
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([nestedKey, nestedValue]) => [
        nestedKey,
        redactAuditValue(nestedValue, nestedKey),
      ]),
    );
  }
  return value;
};

module.exports = { redactAuditValue };
