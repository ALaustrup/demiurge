import { DEMIURGE_RPC_URL } from "@/config/demiurge";

export async function callRpc<T>(
  method: string,
  params: any | null = null
): Promise<T> {
  const res = await fetch(DEMIURGE_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method,
      params,
      id: Date.now(),
    }),
  });

  const json = await res.json();
  if (json.error) {
    throw new Error(json.error.message || "RPC error");
  }
  return json.result as T;
}

