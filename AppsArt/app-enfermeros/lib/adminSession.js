import "server-only";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "enf_admin_session";

export async function isAdminSession() {
  const store = await cookies();
  const value = store.get(ADMIN_COOKIE)?.value;
  return Boolean(value) && value === process.env.ADMIN_PASSCODE;
}
