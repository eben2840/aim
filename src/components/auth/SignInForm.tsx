import logoLight from "../../aseets/logo/2.png";
import logoDark from "../../aseets/logo/1.png";
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import { useAuth } from "../../context/AuthContext";

export default function SignInForm() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? "/abitrack/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setError(null);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid email or password.");
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto px-6 sm:px-0">
        {/* Logo */}
        {/* <div className="mb-8 text-center">
          <img src={logoLight} alt="AbiTrack" className="h-5 w-auto sm:h-6 mx-auto dark:hidden" />
          <img src={logoDark} alt="AbiTrack" className="h-5 w-auto sm:h-6 mx-auto hidden dark:block" />
        </div> */}

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Sign in to your AbiTrack account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label>Email <span className="text-error-500">*</span></Label>
            <Input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Password <span className="text-error-500">*</span></Label>
              <Link to="#" className="text-xs text-brand-500 hover:text-brand-600">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <span
                onClick={() => setShowPassword(!showPassword)}
                className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
              >
                {showPassword
                  ? <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                  : <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />}
              </span>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-error-50 dark:bg-error-500/10 px-4 py-3 text-sm text-error-600 dark:text-error-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors"
          >
            {loading ? (
              <>
                <span className="h-5 w-auto sm:h-6 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Signing in…
              </>
            ) : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-sm text-center text-gray-500 dark:text-gray-400">
          Don't have an account?{" "}
          <Link to="/abitrack/signup" className="font-medium text-brand-500 hover:text-brand-600">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
