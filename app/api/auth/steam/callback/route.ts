import { NextRequest, NextResponse } from "next/server";
import { verifySteamCallback, getSteamProfile } from "@/lib/steam";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const params = request.nextUrl.searchParams;

  const steamId = await verifySteamCallback(params);
  if (!steamId) {
    return NextResponse.redirect(`${baseUrl}/?error=auth_failed`);
  }

  const profile = await getSteamProfile(steamId);
  if (!profile) {
    return NextResponse.redirect(`${baseUrl}/?error=profile_failed`);
  }

  const session = await getSession();
  session.steamId = steamId;
  session.steamName = profile.name;
  session.steamAvatar = profile.avatar;
  await session.save();

  return NextResponse.redirect(`${baseUrl}/dashboard`);
}
