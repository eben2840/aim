import { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { authApi } from "../../api";

export default function MobileAppQrCard() {
  const [token, setToken] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchToken = async () => {
    setLoading(true);
    setError("");
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      const res = await authApi.generateQrToken();
      setToken(res.token);
      setCountdown(res.expiresIn);
      timerRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) { clearInterval(timerRef.current!); setToken(null); return 0; }
          return c - 1;
        });
      }, 1000);
    } catch {
      setError("Failed to generate QR code.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchToken(); return () => { if (timerRef.current) clearInterval(timerRef.current); }; }, []);

  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
      <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-1">Sign In to Mobile App</h4>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Scan this QR code with the AbiTrack mobile app to log in instantly.</p>

      <div className="flex flex-col items-center gap-4">
        {loading && (
          <div className="h-[200px] w-[200px] rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
        )}
        {!loading && error && (
          <div className="text-sm text-error-600 dark:text-error-400">{error}</div>
        )}
        {!loading && !error && token && (
          <>
            <div className="p-3 rounded-xl bg-white border border-gray-200 dark:border-gray-700">
              <QRCodeSVG value={token} size={200} />
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span className={`font-medium ${countdown <= 15 ? "text-error-500" : "text-brand-500"}`}>{countdown}s</span>
              <span>remaining</span>
            </div>
          </>
        )}
        {!loading && !token && !error && (
          <p className="text-sm text-gray-400">QR code expired.</p>
        )}
        <button
          onClick={fetchToken}
          disabled={loading}
          className="rounded-full border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {loading ? "Generating…" : "Refresh QR Code"}
        </button>
      </div>
    </div>
  );
}
