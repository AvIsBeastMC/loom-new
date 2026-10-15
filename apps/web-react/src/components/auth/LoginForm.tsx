import { KeyRound, LoaderCircle, UserRound } from "lucide-react";
import Image from "next/image";
import { useState, type FormEvent } from "react";

type LoginFormProps = {
  loading: boolean;
  error: string;
  onSubmit: (username: string, password: string) => Promise<void>;
};

export function LoginForm({ loading, error, onSubmit }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void onSubmit(username, password);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#111512] bg-[linear-gradient(rgba(169,199,134,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(169,199,134,0.035)_1px,transparent_1px)] bg-[size:40px_40px] px-5 py-9 text-[#f0f2ec]">
      <div className="mb-7 flex items-center gap-3 text-lg font-bold">
        <Image alt="Loom" className="rounded-full border border-white/15 object-cover" height={40} src="https://loom-static.arunnya.com/loom.jpg" unoptimized width={40} />
        <span>Loom Dashboard</span>
      </div>
      <section className="w-full max-w-[420px] rounded-xl border border-[#2b332d] bg-[#181d19]/95 p-7 shadow-[0_28px_80px_#0005] sm:p-[34px]">
        <div className="text-[10px] font-bold uppercase leading-[1.4] tracking-[0.12em] text-[#a9c786]">Administrator access</div>
        <h1 className="mb-1 mt-2 text-[28px] font-semibold leading-tight">Sign in</h1>
        <p className="m-0 text-sm text-[#929b91]">Use your Loom administrator credentials.</p>
        <form className="mt-6 grid gap-[13px]" onSubmit={submit}>
          <label className="flex min-w-0 items-center gap-[11px] rounded-md border border-[#2b332d] bg-[#141915] px-[13px] text-[#929b91] transition focus-within:border-[#a9c786]">
            <UserRound aria-hidden="true" size={18} />
            <span className="sr-only">Username</span>
            <input
              className="h-[46px] w-full min-w-0 bg-transparent text-[#f0f2ec] outline-none placeholder:text-[#798279]"
              autoComplete="username"
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Username"
              value={username}
            />
          </label>
          <label className="flex min-w-0 items-center gap-[11px] rounded-md border border-[#2b332d] bg-[#141915] px-[13px] text-[#929b91] transition focus-within:border-[#a9c786]">
            <KeyRound aria-hidden="true" size={18} />
            <span className="sr-only">Password</span>
            <input
              className="h-[46px] w-full min-w-0 bg-transparent text-[#f0f2ec] outline-none placeholder:text-[#798279]"
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              type="password"
              value={password}
            />
          </label>
          <button className="mt-1 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#a9c786] px-[13px] py-2 font-semibold text-[#182018] transition hover:bg-[#bbd69b] disabled:cursor-not-allowed disabled:opacity-55" disabled={loading} type="submit">
            {loading ? <LoaderCircle className="animate-spin" size={18} /> : null}
            {loading ? "Signing in" : "Sign in"}
          </button>
          {error ? <p className="m-0 text-[13px] text-[#e78f83]" role="alert">{error}</p> : null}
        </form>
      </section>
    </main>
  );
}