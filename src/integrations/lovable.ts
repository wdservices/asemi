import { fb } from "@/integrations/firebase/client";

export const lovable = {
  auth: {
    async signInWithOAuth(
      provider: "google" | "github" | "azure",
      opts?: { redirect_uri?: string },
    ) {
      const redirectTo = opts?.redirect_uri ?? window.location.origin;
      const res = await fb.auth.signInWithOAuth({ provider });
      if (!res.error && redirectTo && typeof window !== "undefined") {
        window.location.assign(`${redirectTo}/dashboard`);
      }
      return res;
    },
  },
};
