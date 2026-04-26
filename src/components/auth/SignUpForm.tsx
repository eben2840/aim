import { useState } from "react";
import confetti from "canvas-confetti";
import { Link, useNavigate } from "react-router";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import { useAuth } from "../../context/AuthContext";

const BUSINESS_CATS = ["Retail", "Restaurant", "Warehouse", "Healthcare", "Salon & Spa"];
const PERSONAL_CATS = ["Home", "Kitchen", "Garage", "Office", "Storage Unit", "Children's Items", "School Supplies"];

export default function SignUpForm() {
  const { signup, loading } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);
  const [accountType, setAccountType] = useState<"business" | "personal">("business");
  const [categories, setCategories] = useState<string[]>([]);
  const [customCat, setCustomCat] = useState("");
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", spaceName: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cats = accountType === "business" ? BUSINESS_CATS : PERSONAL_CATS;
  const toggleCat = (cat: string) =>
    setCategories((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]);
  const finalCategory = categories.map((c) => c === "Other" ? customCat : c).filter(Boolean).join(", ");

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.email || !form.password || !agreed) {
      setError("Please fill all required fields and agree to terms.");
      return;
    }
    setError(null);
    try {
      const name = `${form.firstName} ${form.lastName}`.trim();
      const spaceName = form.spaceName || `${name}'s ${finalCategory || (accountType === "business" ? "Organization" : "Space")}`;
      await signup(name, form.email, form.password, spaceName, accountType, finalCategory);
      confetti({ particleCount: 180, spread: 100, origin: { y: 0.5 }, colors: ["#465FFF", "#22c55e", "#f59e0b"] });
      navigate("/abitrack/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed. Please try again.");
    }
  };

  if (step === 1) return (
    <div className="flex flex-col flex-1 w-full overflow-y-auto no-scrollbar">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto px-6 sm:px-0 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">How will you use AbiTrack?</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Choose your account type to get started</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {(["business", "personal"] as const).map((type) => (
            <button key={type} type="button"
              onClick={() => { setAccountType(type); setCategories([]); }}
              className={`rounded-2xl border-2 p-5 text-left transition-all ${accountType === type ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10" : "border-gray-200 dark:border-gray-700 hover:border-gray-300"}`}
            >
              {/* <div className="text-2xl mb-2">{type === "business" ? "🏢" : "🏠"}</div> */}
              <p className="font-semibold text-gray-800 dark:text-white/90 capitalize">{type}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {type === "business" ? "Manage store inventory & orders" : "Track items around your home"}
              </p>
            </button>
          ))}
        </div>

        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          {accountType === "business" ? "What type of business?" : "What are you tracking?"}
        </p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[...cats, "Other"].map((cat) => (
            <button key={cat} type="button"
              onClick={() => toggleCat(cat)}
              className={`rounded-xl border py-2.5 px-2 text-sm transition-all ${categories.includes(cat) ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 font-medium" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {categories.includes("Other") && (
          <input
            type="text"
            placeholder={accountType === "business" ? "e.g. Pharmacy, Auto Shop…" : "e.g. Workshop, Pantry…"}
            value={customCat}
            onChange={(e) => setCustomCat(e.target.value)}
            className="mb-4 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-white/90 outline-none focus:border-brand-500"
          />
        )}

        <button
          type="button"
          disabled={categories.length === 0 || (categories.includes("Other") && !customCat.trim())}
          onClick={() => setStep(2)}
          className="w-full rounded-lg bg-brand-500 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50 transition-colors"
        >
          Continue
        </button>

        <p className="mt-6 text-sm text-center text-gray-500 dark:text-gray-400">
          Already have an account?{" "}
          <Link to="/abitrack/signin" className="font-medium text-brand-500 hover:text-brand-600">Sign In</Link>
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col flex-1 w-full overflow-y-auto no-scrollbar">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto px-6 sm:px-0 py-10">
        <button type="button" onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mb-6">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back
        </button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">Create your account</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {accountType === "business" ? finalCategory : `Tracking: ${finalCategory}`} ·{" "}
            <span className="capitalize">{accountType}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>First Name <span className="text-error-500">*</span></Label>
              <Input type="text" placeholder="John" value={form.firstName} onChange={set("firstName")} />
            </div>
            <div>
              <Label>Last Name</Label>
              <Input type="text" placeholder="Doe" value={form.lastName} onChange={set("lastName")} />
            </div>
          </div>

          <div>
            <Label>{accountType === "business" ? "Organization Name" : "Space Name"}</Label>
            <Input type="text"
              placeholder={accountType === "business" ? "Acme Supplies Ltd" : "My Home"}
              value={form.spaceName} onChange={set("spaceName")} />
          </div>

          <div>
            <Label>Email <span className="text-error-500">*</span></Label>
            <Input type="email" placeholder="you@email.com" value={form.email} onChange={set("email")} />
          </div>

          <div>
            <Label>Password <span className="text-error-500">*</span></Label>
            <div className="relative">
              <Input type={showPassword ? "text" : "password"} placeholder="Minimum 8 characters"
                value={form.password} onChange={set("password")} />
              <span onClick={() => setShowPassword(!showPassword)}
                className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2">
                {showPassword
                  ? <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                  : <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <input type="checkbox" id="agree" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500" />
            <label htmlFor="agree" className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              I agree to the <span className="font-medium text-gray-800 dark:text-white/90">Terms & Conditions</span>{" "}
              and <span className="font-medium text-gray-800 dark:text-white/90">Privacy Policy</span>
            </label>
          </div>

          {error && (
            <div className="rounded-lg bg-error-50 dark:bg-error-500/10 px-4 py-3 text-sm text-error-600 dark:text-error-400">{error}</div>
          )}

          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors">
            {loading ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Creating account…</> : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-sm text-center text-gray-500 dark:text-gray-400">
          Already have an account?{" "}
          <Link to="/abitrack/signin" className="font-medium text-brand-500 hover:text-brand-600">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
