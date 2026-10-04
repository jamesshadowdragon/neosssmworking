import { NeonQueryBuilder, NeonStorageClient, executeRpc } from "./server";
import { neonAuth } from "./auth";

export function createNeonClient() {
  return {
    auth: neonAuth,
    from(tableName: string) {
      return new NeonQueryBuilder(tableName);
    },
    rpc(functionName: string, args: Record<string, any> = {}) {
      return executeRpc(functionName, args);
    },
    storage: {
      from(bucket: string) {
        return new NeonStorageClient(bucket);
      },
    },
  };
}

export const neon = createNeonClient();
export const neonAdmin = createNeonClient();
export const neonClient = neon;

export default neon;
