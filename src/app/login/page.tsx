"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password })
    });
    setLoading(false);
    if (!response.ok) {
      setError("密码错误，请重试");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="login-page">
      <form className="login-panel" onSubmit={onSubmit}>
        <div className="login-mark">
          <LockKeyhole aria-hidden="true" size={28} />
        </div>
        <h1>在线笔记</h1>
        <label htmlFor="password">访问密码</label>
        <input
          id="password"
          name="password"
          type="password"
          autoFocus
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error ? <p className="form-error">{error}</p> : null}
        <button type="submit" disabled={loading}>
          {loading ? "登录中..." : "登录"}
        </button>
      </form>
    </main>
  );
}
