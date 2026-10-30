import { z } from 'zod';
import fa from 'zod/v4/locales/fa.js';
import raw from '@/generated/api/contract.json';
z.config(fa());
type Schema = {
  $ref?: string;
  type?: string;
  format?: string;
  nullable?: boolean;
  enum?: string[];
  required?: string[];
  properties?: Record<string, Schema>;
  additionalProperties?: Schema | boolean;
  items?: Schema;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
};
export type Operation = {
  path: string;
  method: string;
  parameters: { name: string; in: string; required?: boolean; schema: Schema }[];
  body: Schema | null;
  response: Schema | null;
};
export const contract = raw as unknown as {
  schemas: Record<string, Schema>;
  operations: Operation[];
};
export function resolve(
  schema: Schema,
  schemas: Record<string, Schema> = contract.schemas,
): Schema {
  return schema.$ref ? (schemas[schema.$ref.split('/').pop()!] ?? {}) : schema;
}
const schemaCaches = new WeakMap<Record<string, Schema>, Map<string, z.ZodType>>();
export function validator(
  input: Schema,
  utcField = false,
  schemas: Record<string, Schema> = contract.schemas,
): z.ZodType {
  let cache = schemaCaches.get(schemas);
  if (!cache) {
    cache = new Map();
    schemaCaches.set(schemas, cache);
  }
  if (input.$ref) {
    const key = `${input.$ref}:${utcField}`;
    let v = cache.get(key);
    if (!v) {
      v = z.lazy(() => validator(resolve(input, schemas), utcField, schemas));
      cache.set(key, v);
    }
    return v;
  }
  let result: z.ZodType = z.unknown();
  if (input.enum) result = z.enum(input.enum as [string, ...string[]]);
  else if (input.type === 'object') {
    const shape: Record<string, z.ZodType> = {};
    for (const [name, s] of Object.entries(input.properties ?? {})) {
      let v = validator(s, name.endsWith('Utc'), schemas);
      if (!input.required?.includes(name)) v = v.optional();
      shape[name] = v;
    }
    result = input.additionalProperties
      ? z
          .object(shape)
          .catchall(
            input.additionalProperties === true
              ? z.unknown()
              : validator(input.additionalProperties, false, schemas),
          )
      : z.object(shape);
  } else if (input.type === 'array') result = z.array(validator(input.items ?? {}, false, schemas));
  else if (input.type === 'string') {
    let v = z.string();
    if (input.minLength) v = v.min(input.minLength);
    if (input.maxLength) v = v.max(input.maxLength);
    result =
      input.format === 'uuid'
        ? // The .NET API also returns canonical non-versioned Guid seed IDs.
          v.guid()
        : input.format === 'date-time'
          ? z.preprocess(
              // SQL-backed .NET DateTime UTC fields can lose their Kind during
              // serialization. Only explicit *Utc fields have this UTC meaning.
              (value) =>
                utcField &&
                typeof value === 'string' &&
                /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(value)
                  ? `${value}Z`
                  : value,
              v.datetime({ offset: true }),
            )
          : input.format === 'date'
            ? v.regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
                const date = new Date(value + 'T00:00:00Z');
                return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
              }, 'Invalid date-only value')
            : v;
  } else if (input.type === 'integer') result = z.number().int();
  else if (input.type === 'number') result = z.number();
  else if (input.type === 'boolean') result = z.boolean();
  return input.nullable ? result.nullable() : result;
}
const matchers = [...contract.operations]
  .sort((a, b) => (a.path.match(/\{/g)?.length ?? 0) - (b.path.match(/\{/g)?.length ?? 0))
  .map((o) => ({
    operation: o,
    pattern: new RegExp(
      '^' + o.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{[^}]+\\\}/g, '[^/]+') + '$',
    ),
  }));
export function operationFor(method: string, path: string) {
  return matchers.find(
    ({ operation, pattern }) => operation.method === method && pattern.test(path),
  )?.operation;
}
export function operationKey(o: Pick<Operation, 'method' | 'path'>) {
  return `${o.method} ${o.path}`;
}
