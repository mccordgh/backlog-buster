import { NextResponse } from "next/server";
import { buildSteamLoginUrl } from "@/lib/steam";

export async function GET() {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const returnTo = `${baseUrl}/api/auth/steam/callback`;
  const loginUrl = buildSteamLoginUrl(returnTo, baseUrl);
  return NextResponse.redirect(loginUrl);
}
