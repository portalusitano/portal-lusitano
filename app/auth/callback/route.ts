import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { destinoSeguro } from "@/lib/destino-seguro";

/**
 * Auth callback route for Supabase email confirmation.
 *
 * When a user clicks the confirmation link in their email, Supabase redirects
 * them to this route with a `code` parameter. This route exchanges the code
 * for a session, completing the email verification flow.
 *
 * Supabase Auth uses PKCE (Proof Key for Code Exchange) by default for
 * server-side auth. The `code` is exchanged server-side for security.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Ver `destinoSeguro`: o `next` vem do URL e vai ser colado ao origin.
  const next = destinoSeguro(searchParams.get("next"));

  /* Quando é o próprio fornecedor que recusa — a conta Google não está
     ligada no Supabase, a pessoa cancelou —, o regresso traz `error` e não
     traz `code`. Vale a pena passar a razão adiante em vez de a engolir. */
  const recusa = searchParams.get("error_description") || searchParams.get("error");
  if (recusa) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(recusa.slice(0, 200))}`
    );
  }

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Successful verification — redirect to the intended page
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // If code is missing or exchange failed, redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
