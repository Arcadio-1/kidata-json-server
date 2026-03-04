// === Shared utility functions for sorting, pagination, and filtering ===

function parseIntOrDefault(v, d) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : d;
}

const isIsoDate = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v);

const normalizeForSort = (val) => {
  if (val == null) return "";
  if (typeof val === "number") return val;
  if (isIsoDate(val)) return new Date(val).getTime();
  if (val instanceof Date) return val.getTime();
  return String(val).toLowerCase();
};

const sortItems = (items, sortBy = "createdAt", order = "desc") => {
  const dir = order === "asc" || order === "asce" ? 1 : -1;
  return items.slice().sort((a, b) => {
    const av = normalizeForSort(a?.[sortBy]);
    const bv = normalizeForSort(b?.[sortBy]);
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });
};

const normForSort = (val) => {
  if (val == null) return "";
  if (typeof val === "number") return val;
  if (isIsoDate(val)) return new Date(val).getTime();
  if (val instanceof Date) return val.getTime();
  return String(val).toLowerCase();
};

const sortGeneric = (items, sortBy = "date", order = "desc") => {
  const dir = order === "asc" || order === "asce" ? 1 : -1;
  return items.slice().sort((a, b) => {
    const av = normForSort(a?.[sortBy]);
    const bv = normForSort(b?.[sortBy]);
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });
};

const toSetOrNull = (v) =>
  v
    ? new Set(
        String(v)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      )
    : null;

module.exports = {
  parseIntOrDefault,
  isIsoDate,
  normalizeForSort,
  sortItems,
  normForSort,
  sortGeneric,
  toSetOrNull,
};
