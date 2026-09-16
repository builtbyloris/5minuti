import { AccountPage } from "@/components/account/account-page";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const authResult =
    params.auth === "success"
      ? "Accesso completato. Verifica dei progressi in corso."
      : params.error
        ? "Accesso non completato. Puoi continuare come ospite."
        : null;

  return <AccountPage authResult={authResult} />;
}
