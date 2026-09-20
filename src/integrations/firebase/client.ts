/* eslint-disable @typescript-eslint/no-explicit-any */
import { getStore, genId } from "./mockStore";
import { RPC } from "./rpc";

let mockSession: {
  user: { id: string; email?: string; app_metadata?: { roles?: string[] } };
} | null = null;

if (typeof window !== "undefined") {
  try {
    const saved = localStorage.getItem("asemi_mock_session");
    if (saved) {
      mockSession = JSON.parse(saved);
    }
  } catch (_e) {
    // Ignore storage read error
  }
}

const authListeners = new Set<(event: string, session: any) => void>();

function saveSession(session: typeof mockSession) {
  mockSession = session;
  if (typeof window !== "undefined") {
    try {
      if (session) {
        localStorage.setItem("asemi_mock_session", JSON.stringify(session));
      } else {
        localStorage.removeItem("asemi_mock_session");
      }
    } catch (_e) {
      // Ignore storage write error
    }
  }
}

function notifyAuth(event: string) {
  const session = mockSession ? { user: mockSession.user } : null;
  authListeners.forEach((cb) => {
    try {
      cb(event, session);
    } catch (e) {
      console.error(e);
    }
  });
}

const storage = {
  from(bucket: string) {
    return {
      upload: async (key: string, _file: any, _opts?: any) => {
        return { data: { Key: `${bucket}/${key}` }, error: null };
      },
      getPublicUrl: (key: string) => ({
        data: { publicUrl: `https://mock-fb.local/${bucket}/${key}` },
      }),
      createSignedUrl: async (key: string, _ttl: number) => ({
        data: { signedUrl: `https://mock-fb.local/${bucket}/${key}` },
        error: null,
      }),
    };
  },
};

const auth = {
  getSession: async () => ({
    data: { session: mockSession ? { user: mockSession.user } : null },
    error: null,
  }),
  getUser: async () => ({
    data: { user: mockSession ? mockSession.user : null },
    error: null,
  }),
  signInWithOAuth: async (_opts?: any) => {
    const user = { id: "usr_company_demo_001", email: "company@asemi.demo" };
    saveSession({ user });
    notifyAuth("SIGNED_IN");
    return { data: { user: mockSession?.user }, error: null };
  },
  signInAs: async (userId: string, email?: string, roles?: string[]) => {
    const user: any = { id: userId };
    if (email !== undefined) user.email = email;
    if (roles && roles.length > 0) user.app_metadata = { roles };
    saveSession({ user });
    notifyAuth("SIGNED_IN");
    return { data: { user: mockSession?.user }, error: null };
  },
  signOut: async () => {
    saveSession(null);
    notifyAuth("SIGNED_OUT");
    return { error: null };
  },
  onAuthStateChange: (cb: any) => {
    authListeners.add(cb);
    try {
      cb("INITIAL_SESSION", mockSession ? { user: mockSession.user } : null);
    } catch (_e) {
      // Ignore callback error
    }
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            authListeners.delete(cb);
          },
        },
      },
    };
  },
};

async function rpc(name: string, args?: Record<string, any>) {
  const impl = (RPC as any)[name];
  if (!impl) return { data: null, error: new Error(`Unknown RPC: ${name}`) };
  try {
    const result = await impl(args || {});
    return { data: result, error: null };
  } catch (e: any) {
    return {
      data: null,
      error: { message: e?.message || String(e) },
    };
  }
}

export function getMockSession() {
  return mockSession;
}

type FilterEntry = { key: string; op: string; val: any };

class QueryBuilder {
  private table: string;
  private selectFields: string | undefined = undefined;
  private filters: FilterEntry[] = [];
  private orderKey: string | undefined = undefined;
  private orderOpts: { ascending?: boolean } | undefined = undefined;
  private limitN: number | undefined = undefined;
  private rangeFrom: number | undefined = undefined;
  private rangeTo: number | undefined = undefined;
  private wantsMaybeSingle = false;
  private wantsSingle = false;

  constructor(table: string) {
    this.table = table;
  }

  select(fields?: string) {
    this.selectFields = fields;
    return this;
  }

  eq(key: string, val: any) {
    this.filters.push({ key, op: "eq", val });
    return this;
  }

  neq(key: string, val: any) {
    this.filters.push({ key, op: "neq", val });
    return this;
  }

  gte(key: string, val: any) {
    this.filters.push({ key, op: "gte", val });
    return this;
  }

  lte(key: string, val: any) {
    this.filters.push({ key, op: "lte", val });
    return this;
  }

  gt(key: string, val: any) {
    this.filters.push({ key, op: "gt", val });
    return this;
  }

  lt(key: string, val: any) {
    this.filters.push({ key, op: "lt", val });
    return this;
  }

  in(key: string, arr: any[]) {
    this.filters.push({ key, op: "in", val: arr });
    return this;
  }

  like(_key: string, _val: any) {
    return this;
  }

  ilike(_key: string, _val: any) {
    return this;
  }

  is(key: string, val: any) {
    this.filters.push({ key, op: "is", val });
    return this;
  }

  order(key: string, opts?: { ascending?: boolean }) {
    this.orderKey = key;
    this.orderOpts = opts;
    return this;
  }

  limit(n: number) {
    this.limitN = n;
    return this;
  }

  range(from: number, to: number) {
    this.rangeFrom = from;
    this.rangeTo = to;
    return this;
  }

  maybeSingle() {
    this.wantsMaybeSingle = true;
    return this;
  }

  single() {
    this.wantsSingle = true;
    return this;
  }

  private parseSelectJoins(rows: any[]): any[] {
    if (!this.selectFields) return rows;
    const store = getStore();
    const segments: string[] = [];
    let depth = 0;
    let buf = "";
    for (const ch of this.selectFields) {
      if (ch === "(") depth++;
      if (ch === ")") depth--;
      if (ch === "," && depth === 0) {
        segments.push(buf.trim());
        buf = "";
      } else {
        buf += ch;
      }
    }
    if (buf.trim()) segments.push(buf.trim());

    const joins: { rel: string; cols: string[] }[] = [];
    for (const seg of segments) {
      const m = seg.match(/^(\w+)\(([^)]*)\)$/);
      if (m && m[1] && m[2] !== undefined) {
        joins.push({
          rel: m[1],
          cols: m[2]
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        });
      }
    }

    if (joins.length === 0) return rows;

    return rows.map((row) => {
      const out = { ...row };
      for (const { rel, cols } of joins) {
        const fkCol = `${rel.slice(0, -1)}_id`;
        const relId = out[fkCol];
        if (!relId) {
          out[rel] = undefined as any;
          continue;
        }
        const table = (store as any)[rel] || {};
        const related = table[relId];
        if (!related) {
          out[rel] = null as any;
          continue;
        }
        if (cols.length === 0 || cols.includes("*")) {
          out[rel] = { ...related };
        } else {
          const sub: any = {};
          for (const c of cols) sub[c] = related[c];
          out[rel] = sub;
        }
      }
      return out;
    });
  }

  private applyFilters(rows: any[]): any[] {
    let result = rows.filter((row) => {
      for (const f of this.filters) {
        const v = row[f.key];
        switch (f.op) {
          case "eq":
            if (v !== f.val) return false;
            break;
          case "neq":
            if (v === f.val) return false;
            break;
          case "gte":
            if (!(v >= f.val)) return false;
            break;
          case "lte":
            if (!(v <= f.val)) return false;
            break;
          case "gt":
            if (!(v > f.val)) return false;
            break;
          case "lt":
            if (!(v < f.val)) return false;
            break;
          case "in":
            if (!Array.isArray(f.val) || !f.val.includes(v)) return false;
            break;
          case "is":
            if (v !== f.val) return false;
            break;
        }
      }
      return true;
    });
    if (this.orderKey) {
      const key = this.orderKey;
      const asc = this.orderOpts?.ascending ?? true;
      result.sort((a, b) => {
        const va = a[key];
        const vb = b[key];
        if (va < vb) return asc ? -1 : 1;
        if (va > vb) return asc ? 1 : -1;
        return 0;
      });
    }
    if (this.rangeFrom !== undefined && this.rangeTo !== undefined) {
      result = result.slice(this.rangeFrom, this.rangeTo + 1);
    }
    if (this.limitN !== undefined) {
      result = result.slice(0, this.limitN);
    }
    return result;
  }

  private terminal(rows: any[]) {
    const joined = this.parseSelectJoins(rows);
    if (this.wantsSingle) {
      if (joined.length === 1) {
        return Promise.resolve({ data: joined[0], error: null });
      }
      return Promise.resolve({
        data: null,
        error: new Error("PGRST116: Query returned no rows"),
      });
    }
    if (this.wantsMaybeSingle) {
      if (joined.length === 0) return Promise.resolve({ data: null, error: null });
      return Promise.resolve({ data: joined[0], error: null });
    }
    return Promise.resolve({ data: joined, error: null });
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<{ data: any; error: any }> {
    const store = getStore();
    const table = (store as any)[this.table];
    if (!table) return { data: [], error: null };
    const all = Object.values(table);
    const filtered = this.applyFilters(all);
    return this.terminal(filtered);
  }

  async insert(data: any | any[], _opts?: any) {
    const store = getStore();
    const table = (store as any)[this.table] || {};
    const rows = Array.isArray(data) ? data : [data];
    const results: any[] = [];
    for (const row of rows) {
      const id = row.id ?? genId("row");
      const now = new Date().toISOString();
      const full: any = { ...row, id };
      if (table[id]) {
        full.created_at = row.created_at ?? now;
      }
      table[id] = full;
      results.push(full);
    }
    return { data: Array.isArray(data) ? results : results[0], error: null };
  }

  async update(data: any) {
    const store = getStore();
    const table = (store as any)[this.table] || {};
    const all = Object.values(table);
    const filtered = this.applyFilters(all);
    const now = new Date().toISOString();
    for (const row of filtered) {
      for (const k of Object.keys(data)) {
        (row as any)[k] = data[k];
      }
      (row as any).updated_at = now;
    }
    return { data: filtered, error: null };
  }

  async delete() {
    const store = getStore();
    const table = (store as any)[this.table] || {};
    const all = Object.values(table);
    const filtered = this.applyFilters(all);
    for (const row of filtered) {
      delete table[(row as any).id];
    }
    return { data: filtered, error: null };
  }
}

function from(collection: string) {
  return new QueryBuilder(collection);
}

const _fb = { from, rpc, auth, storage, _queryBuilder: QueryBuilder };

export const fb = new Proxy(_fb as any, {
  get: (t, p) => Reflect.get(t, p),
});

export { fb as supabase };
