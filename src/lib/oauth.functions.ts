import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { exchangeGoogleCode as exchangeCodeInAccount } from "./account.functions";

export function getGoogleOAuthCredentials(): { clientId?: string; clientSecret?: string } {
  const clientId = process.env["GOOGLE_CLIENT_ID"] || process.env["VITE_GOOGLE_CLIENT_ID"] || "";
  const clientSecret = process.env["GOOGLE_CLIENT_SECRET"] || "";

  return { clientId: clientId.trim(), clientSecret: clientSecret.trim() };
}

export const getGoogleOAuthDetails = createServerFn({ method: "GET" })
  .handler(async () => {
    const { clientId } = getGoogleOAuthCredentials();
    return {
      clientId: clientId || "",
      configured: Boolean(clientId && clientId.length > 5),
    };
  });

export const exchangeGoogleCode = exchangeCodeInAccount;
