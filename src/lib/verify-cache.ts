import type { QueryClient } from "@tanstack/react-query";
import { verifyProductCode, type VerifyResult } from "./db";

export function normalizeVerifyKey(code: string): string {
  return (code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function verifyResultQueryKey(code: string) {
  return ["verify-result", normalizeVerifyKey(code)] as const;
}

export function preloadImage(url: string | null | undefined, maxWaitMs = 450): Promise<void> {
  if (!url || typeof Image === "undefined") return Promise.resolve();
  return new Promise((resolve) => {
    const img = new Image();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      resolve();
    };
    const timer = window.setTimeout(finish, maxWaitMs);
    img.onload = finish;
    img.onerror = finish;
    img.src = url;
    if (img.complete) finish();
  });
}

/**
 * Resolves verification + warms the product hero image into browser & query cache
 * BEFORE switching routes, eliminating skeleton/blank states during scanner navigation.
 */
export async function prefetchAndVerifyCode(
  queryClient: QueryClient,
  code: string,
): Promise<VerifyResult> {
  const result = await queryClient.fetchQuery({
    queryKey: verifyResultQueryKey(code),
    queryFn: () => verifyProductCode(code),
    staleTime: 0,
  });
  await preloadImage(result.product?.image);
  return result;
}
