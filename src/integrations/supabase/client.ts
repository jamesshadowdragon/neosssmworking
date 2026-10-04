// Client-side authentication and database bridge (Browser-Safe)
import { neonAuth } from "../neon/auth";

export const supabase = {
  auth: neonAuth,
  from(tableName: string) {
    if (typeof window !== "undefined") {
      console.warn(
        `[Neon] Direct database access from browser for table "${tableName}" is not recommended. Use server functions.`,
      );
    }
    const createStub = () => {
      const stub: any = {
        select: () => stub,
        insert: () => stub,
        update: () => stub,
        upsert: () => stub,
        delete: () => stub,
        eq: () => stub,
        neq: () => stub,
        gte: () => stub,
        lte: () => stub,
        in: () => stub,
        is: () => stub,
        ilike: () => stub,
        like: () => stub,
        match: () => stub,
        order: () => stub,
        limit: () => stub,
        range: () => stub,
        single: () => stub,
        maybeSingle: () => stub,
        then: (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve),
        catch: (reject: any) => Promise.resolve({ data: null, error: null }).catch(reject),
      };
      return stub;
    };
    return createStub();
  },
  rpc: async () => ({ data: null, error: null }),
  storage: {
    from: () => ({
      upload: async () => ({ data: null, error: null }),
      download: async () => ({ data: null, error: null }),
      remove: async () => ({ data: null, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: "" } }),
    }),
  },
};

export default supabase;
