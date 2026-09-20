/* eslint-disable @typescript-eslint/no-explicit-any */
import { SEED_DATA } from "./seed";
import type { Database } from "./types";

type Collections = {
  [T in keyof Database["public"]["Tables"]]: Record<string, Database["public"]["Tables"][T]["Row"]>;
};

function genId(prefix: string = "id"): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function deserializeDeepClone(seed: Record<string, any[]>): Collections {
  const out: any = {};
  for (const [table, rows] of Object.entries(seed)) {
    out[table] = {};
    for (const row of rows) {
      const id: string = row.id ?? `auto_${Math.random().toString(36).slice(2)}`;
      out[table][id] = { ...row };
    }
  }
  return out;
}

let _collections: Collections = deserializeDeepClone(SEED_DATA);

export function getStore(): {
  collections: Collections;
  reset: () => void;
  all: <T extends keyof Collections>(table: T) => Collections[T][keyof Collections[T]][];
  find: <T extends keyof Collections>(table: T, id: string) => Collections[T][string] | undefined;
} {
  return {
    collections: _collections,
    reset: () => {
      _collections = deserializeDeepClone(SEED_DATA);
    },
    all: (table) => Object.values(_collections[table] as any),
    find: (table, id) => (_collections[table] as any)[id],
  };
}

export type { Collections };
export { genId };
