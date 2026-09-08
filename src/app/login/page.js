import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const error = params?.error;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <img
            src="/images/bpc-logo.png"
            alt="BPC Logo"
            className="mb-3 h-14 w-auto object-contain"
          />
          <h1 className="text-2xl font-black text-slate-900">BPC POS Login</h1>
        </div>
        {error ? (
          <div className="mb-4 rounded-xl border border-[#e5f1ff] bg-[#e5f1ff] px-4 py-3 text-sm text-[#13508b]">
            {error}
          </div>
        ) : null}
        <form action="/api/v1/auth/login" method="post" className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">Email</label>
            <input name="email" type="email" required className="w-full rounded-xl border border-slate-200 px-4 py-3" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">Password</label>
            <input name="password" type="password" required className="w-full rounded-xl border border-slate-200 px-4 py-3" />
          </div>
          <Button type="submit" className="w-full">Sign in</Button>
        </form>
      </Card>
    </div>
  );
}
