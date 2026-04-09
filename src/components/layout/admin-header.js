import { Button } from "@/components/ui/button";
import { revokeCurrentSession, clearSessionCookies } from "@/modules/auth/session-service";

async function logoutAction() {
  "use server";
  await revokeCurrentSession();
  await clearSessionCookies();
}

export function AdminHeader({ sessionUser }) {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-5">
      <div>
        <h1 className="text-lg font-bold text-slate-900">BPC POS Control Panel</h1>
        <p className="text-sm text-slate-500">Store scoped operations with manager overrides.</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-sm font-semibold text-slate-800">{sessionUser.email}</div>
          <div className="text-xs text-slate-500">Store: {sessionUser.storeId || "All stores"}</div>
        </div>
        <form action={logoutAction}>
          <Button variant="outline" type="submit">Logout</Button>
        </form>
      </div>
    </header>
  );
}
