export type FieldRule = {
  type:
    | "string"
    | "string-null"
    | "enum"
    | "number"
    | "number-null"
    | "boolean"
    | "boolean-null"
    | "date"
    | "date-null"
    | "uuid"
    | "uuid-null"
    | "json"
    | "json-null";
  values?: readonly string[];
};

export type FieldRules = Record<string, FieldRule>;

export type ParseResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string; status: number };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseFields(body: unknown, rules: FieldRules, required: readonly string[]): ParseResult {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, error: "invalid_json_body", status: 400 };
  }
  const input = body as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  for (const key of Object.keys(rules)) {
    if (!(key in input)) continue;
    const parsed = parseValue(input[key], rules[key]);
    if (!parsed.ok) return { ok: false, error: `invalid_${key}`, status: 400 };
    data[key] = parsed.value;
  }
  for (const key of required) {
    if (!(key in data)) return { ok: false, error: `missing_${key}`, status: 400 };
  }
  return { ok: true, data };
}

type ParsedValue = { ok: true; value: unknown } | { ok: false };

function parseValue(value: unknown, rule: FieldRule): ParsedValue {
  switch (rule.type) {
    case "string":
      if (typeof value !== "string") return { ok: false };
      return { ok: true, value };
    case "string-null":
      if (value === null) return { ok: true, value: null };
      if (typeof value !== "string") return { ok: false };
      return { ok: true, value };
    case "enum":
      if (typeof value !== "string") return { ok: false };
      if (!rule.values?.includes(value)) return { ok: false };
      return { ok: true, value };
    case "number":
      if (typeof value !== "number" || Number.isNaN(value)) return { ok: false };
      return { ok: true, value };
    case "number-null":
      if (value === null) return { ok: true, value: null };
      if (typeof value !== "number" || Number.isNaN(value)) return { ok: false };
      return { ok: true, value };
    case "boolean":
      if (typeof value !== "boolean") return { ok: false };
      return { ok: true, value };
    case "boolean-null":
      if (value === null) return { ok: true, value: null };
      if (typeof value !== "boolean") return { ok: false };
      return { ok: true, value };
    case "date":
      return parseDate(value);
    case "date-null":
      if (value === null) return { ok: true, value: null };
      return parseDate(value);
    case "uuid":
      if (typeof value !== "string" || !UUID_RE.test(value)) return { ok: false };
      return { ok: true, value };
    case "uuid-null":
      if (value === null) return { ok: true, value: null };
      if (typeof value !== "string" || !UUID_RE.test(value)) return { ok: false };
      return { ok: true, value };
    case "json":
      return { ok: true, value };
    case "json-null":
      if (value === null) return { ok: true, value: null };
      return { ok: true, value };
  }
}

function parseDate(value: unknown): ParsedValue {
  if (typeof value !== "string") return { ok: false };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { ok: false };
  return { ok: true, value: date };
}