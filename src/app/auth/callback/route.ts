import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requestedNext = url.searchParams.get("next") ?? "/login";
  const next = requestedNext.startsWith("/") ? requestedNext : "/login";
  const client = await createSupabaseServerClient();

  if (!client || !code) {
    return NextResponse.redirect(
      new URL("/login?error=auth_callback", url.origin),
    );
  }

  const { error } = await client.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL("/login?error=auth_exchange", url.origin),
    );
  }

  const destination = new URL(next, url.origin);
  destination.searchParams.set("auth", "success");
  return NextResponse.redirect(destination);
}
