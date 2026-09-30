"use client";
import { useState, type FormEvent, type KeyboardEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FriendlyError } from "@/components/Shell/FriendlyError";
import { TurnstileWidget } from "@/components/Auth/TurnstileWidget";
import { useAuthStore } from "@/features/auth/store";
import { loginRequest, registerRequest } from "@/features/auth/api";
import { useRulesPromptStore } from "@/features/auth/rulesPromptStore";
import { PASSWORD_MIN, USERNAME_MAX, USERNAME_MIN } from "@/lib/limits";
import { TURNSTILE_REGISTER_ACTION } from "@/lib/auth/turnstile";
import { userFacingApiErrorMessage } from "@/features/http/responseErrors";
type Mode = "login" | "register";
const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || null;
const turnstileErrorMessage = (code: string | null) =>
  `No pudimos verificar que no seas un bot. Recargá la página y probá de nuevo.${code ? ` (código ${code})` : ""}`;
const inputCls =
  "rounded-md border border-fg/15 bg-surface-sunken px-3 py-2 text-sm text-fg placeholder:text-fg-subtle";
export const AuthDialog = () => {
  const open = useAuthStore((s) => s.authDialogOpen);
  const closeAuthDialog = useAuthStore((s) => s.closeAuthDialog);
  const refresh = useAuthStore((s) => s.refresh);
  const logout = useAuthStore((s) => s.logout);
  const requestRules = useRulesPromptStore((s) => s.request);
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileError, setTurnstileError] = useState<string | null>(null);
  const [turnstileResetSignal, setTurnstileResetSignal] = useState(0);
  const needsTurnstile = mode === "register" && turnstileSiteKey !== null;
  const waitingTurnstile = needsTurnstile && turnstileToken === null;
  const resetFields = () => {
    setUsername("");
    setPassword("");
    setPasswordConfirm("");
    setError(null);
    setTurnstileToken(null);
    setTurnstileError(null);
  };
  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    setError(null);
    const trimmedUser = username.trim();
    if (trimmedUser.length < USERNAME_MIN || trimmedUser.length > USERNAME_MAX) {
      setError(`El usuario debe tener entre ${USERNAME_MIN} y ${USERNAME_MAX} caracteres.`);
      return;
    }
    if (password.length < PASSWORD_MIN) {
      setError(`La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`);
      return;
    }
    if (mode === "register" && password !== passwordConfirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (waitingTurnstile) return;
    setBusy(true);
    try {
      if (mode === "register") {
        // Confirmed before creating the account: cancelling leaves no half-made account.
        if (!(await requestRules("register"))) return;
        await registerRequest(trimmedUser, password, turnstileToken);
        await refresh();
        closeAuthDialog();
        resetFields();
        return;
      }
      await loginRequest(trimmedUser, password);
      await refresh();
      closeAuthDialog();
      resetFields();
      if (useAuthStore.getState().user?.rulesAccepted === false) {
        if (!(await requestRules("login"))) await logout();
      }
    } catch (err: unknown) {
      setError(userFacingApiErrorMessage(err) ?? "No se pudo completar. Reintentá.");
      if (needsTurnstile) setTurnstileResetSignal((n) => n + 1);
    } finally {
      setBusy(false);
    }
  };
  const submitOnEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || busy || waitingTurnstile) return;
    e.preventDefault();
    void handleSubmit();
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          closeAuthDialog();
          resetFields();
        }
      }}
    >
      <DialogContent className="border-fg/10 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "login" ? "Iniciar sesión" : "Crear cuenta"}</DialogTitle>
          <DialogDescription className="text-fg-muted">
            Usuario y contraseña. Sin correo electrónico.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 border-b border-fg/10 pb-3">
          <Button
            type="button"
            size="sm"
            variant={mode === "login" ? "default" : "ghost"}
            className={
              mode === "login"
                ? "cursor-pointer bg-brand-600 text-on-solid hover:bg-brand-500"
                : "cursor-pointer text-fg-secondary hover:bg-fg/10"
            }
            onClick={() => {
              setMode("login");
              setPasswordConfirm("");
              setError(null);
              setTurnstileToken(null);
              setTurnstileError(null);
            }}
          >
            Ingresar
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "register" ? "default" : "ghost"}
            className={
              mode === "register"
                ? "cursor-pointer bg-brand-600 text-on-solid hover:bg-brand-500"
                : "cursor-pointer text-fg-secondary hover:bg-fg/10"
            }
            onClick={() => {
              setMode("register");
              setPasswordConfirm("");
              setError(null);
              setTurnstileToken(null);
              setTurnstileError(null);
            }}
          >
            Registro
          </Button>
        </div>
        <form
          className="grid gap-3 py-2"
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
        >
          <label className="grid gap-1 text-sm text-fg-secondary">
            {mode === "register" ? (
              <>
                Usuario ({USERNAME_MIN}–{USERNAME_MAX}: letras, números, _)
              </>
            ) : (
              "Usuario"
            )}
            <input
              className={inputCls}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={submitOnEnter}
              autoComplete="username"
              maxLength={USERNAME_MAX}
            />
          </label>
          <label className="grid gap-1 text-sm text-fg-secondary">
            {mode === "register" ? `Contraseña (mínimo ${PASSWORD_MIN} caracteres)` : "Contraseña"}
            <input
              type="password"
              className={inputCls}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={submitOnEnter}
              minLength={mode === "register" ? PASSWORD_MIN : undefined}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>
          {mode === "register" && (
            <label className="grid gap-1 text-sm text-fg-secondary">
              Repetir contraseña
              <input
                type="password"
                className={inputCls}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                onKeyDown={submitOnEnter}
                autoComplete="new-password"
              />
            </label>
          )}
          {mode === "register" && turnstileSiteKey && (
            <TurnstileWidget
              siteKey={turnstileSiteKey}
              action={TURNSTILE_REGISTER_ACTION}
              resetSignal={turnstileResetSignal}
              onToken={(token) => {
                setTurnstileToken(token);
                if (token) setTurnstileError(null);
              }}
              onError={(code) => setTurnstileError(turnstileErrorMessage(code))}
            />
          )}
          {turnstileError && !error && (
            <FriendlyError size="compact" title="Error" message={turnstileError} />
          )}
          {error && <FriendlyError size="compact" title="Error" message={error} />}
          <Button
            type="submit"
            disabled={busy || waitingTurnstile}
            className="cursor-pointer bg-brand-600 text-on-solid hover:bg-brand-500"
          >
            {busy
              ? "Procesando…"
              : mode === "login"
                ? "Entrar"
                : waitingTurnstile
                  ? "Verificando…"
                  : "Registrarme"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
