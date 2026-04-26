import { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { useAuth } from "../../context/AuthContext";

const STEPS = [
  {
    icon: "📦",
    title: "Add Your Products",
    desc: "Go to Inventory → Products to add your first product with SKU, price, and category.",
  },
  {
    icon: "📍",
    title: "Set Up Locations",
    desc: "Create warehouses or store locations under Locations so you can track stock per site.",
  },
  {
    icon: "📬",
    title: "Create Purchase Orders",
    desc: "Under Orders → Purchase Orders, create POs for your suppliers to restock inventory.",
  },
  {
    icon: "🤖",
    title: "Use AbiTrack",
    desc: "Click the sparkle button (bottom-left) to let AI add suppliers, schedule meetings, and more — just by typing.",
  },
  {
    icon: "🔔",
    title: "Low Stock Alerts",
    desc: "The bell icon will notify you when stock drops below the minimum. You can resolve or snooze alerts.",
  },
];

export default function WelcomeTour() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!user) return;
    const key = `abitrack_onboarded_${user.id}`;
    if (!localStorage.getItem(key)) {
      setVisible(true);
      setTimeout(() => {
        confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 }, colors: ["#465FFF", "#22c55e", "#f59e0b"] });
      }, 400);
    }
  }, [user]);

  const finish = () => {
    if (user) localStorage.setItem(`abitrack_onboarded_${user.id}`, "1");
    setVisible(false);
  };

  if (!visible) return null;

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">

        {/* Header */}
        {step === 0 ? (
          <div className="bg-brand-500 px-6 pt-8 pb-6 text-center text-white">
            <div className="text-4xl mb-3">🎉</div>
            <h2 className="text-2xl font-bold">Welcome to AbiTrack!</h2>
            <p className="mt-2 text-white/80 text-sm">
              Congratulations, <span className="font-semibold">{user?.name?.split(" ")[0]}</span>! Your account is ready. Let's get you set up.
            </p>
          </div>
        ) : (
          <div className="bg-brand-500 px-6 py-4 text-white flex items-center gap-2">
            <span className="text-xs font-medium text-white/70">Step {step} of {STEPS.length}</span>
            <div className="flex gap-1 ml-auto">
              {STEPS.map((_, i) => (
                <span key={i} className={`h-1.5 w-6 rounded-full transition-all ${i < step ? "bg-white" : i === step ? "bg-white" : "bg-white/30"}`} />
              ))}
            </div>
          </div>
        )}

        {/* Step content */}
        <div className="px-6 py-8 text-center">
          <div className="text-5xl mb-4">{current.icon}</div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-2">{current.title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{current.desc}</p>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="rounded-full border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
            >
              Back
            </button>
          )}
          <button
            onClick={isLast ? finish : () => setStep((s) => s + 1)}
            className="ml-auto rounded-full bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
          >
            {isLast ? "Let's go! 🚀" : "Next →"}
          </button>
          {step === 0 && (
            <button onClick={finish} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              Skip tour
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
