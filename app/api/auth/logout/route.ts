import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  session.destroy();
  return NextResponse.redirect(
    process.env.NEXTAUTH_URL ?? "http://localhost:3000"
  );
}
