import { useState, useRef, useEffect } from "react";
import api from "../../api/client";
import { usersApi, messagesApi } from "../../api";
import { useAuth } from "../../context/AuthContext";
import type { TeamMember } from "../../types";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "What's my current stock value?",
  "Add 50 units to [product name]",
  "Create a PO for [supplier name]",
  "Schedule a meeting for next Monday",
  "Which products need restocking?",
  "Update selling price of [product] to $X",
];

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-brand-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

export default function AbiTrackAI() {
  const { user: me } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [mention, setMention] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: "assistant", content: "Hi! I'm AbiTrack. Ask me anything about your inventory, orders, stock levels, or suppliers." }]);
      usersApi.list().then((all) => setMembers(all.filter((m) => m.id !== me?.id))).catch(() => {});
    }
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleInputChange = (val: string) => {
    setInput(val);
    const match = val.match(/@([^@\s]*)$/);
    setMention(match ? match[1] : null);
  };

  const selectMember = (m: TeamMember) => {
    setInput(input.replace(/@[^@\s]*$/, `@${m.name} `));
    setMention(null);
    inputRef.current?.focus();
  };

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    setMention(null);
    setError("");
    const newMessages: Message[] = [...messages, { role: "user", content: msg }];
    setMessages(newMessages);
    setLoading(true);

    members
      .filter((m) => msg.includes(`@${m.name}`))
      .forEach((m) => messagesApi.send(m.id, msg).catch(() => {}));

    try {
      const res = await api.post<{ reply: string }>("/ai/chat", { message: msg, history: newMessages.slice(0, -1) });
      setMessages([...newMessages, { role: "assistant", content: res.reply }]);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const mentionResults = mention !== null
    ? members.filter((m) => m.name.toLowerCase().startsWith(mention.toLowerCase()))
    : [];

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        title="AbiTrack"
        className={`fixed bottom-6 left-6 z-50 flex h-13 w-13 items-center justify-center rounded-full shadow-lg transition-all duration-300 ${
          open
            ? "bg-gray-800 dark:bg-gray-700 rotate-90"
            : "bg-brand-500 hover:bg-brand-600"
        }`}
        style={{ width: 52, height: 52 }}
      >
        {open ? (
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 left-6 z-50 flex flex-col w-[340px] h-[500px] rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-brand-500 text-white">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">AbiTrack</p>
              <p className="text-xs text-white/70 leading-tight">Your inventory assistant</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="ml-auto text-white/70 hover:text-white"
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 custom-scrollbar">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-brand-500 text-white rounded-br-sm"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-sm">
                  <TypingDots />
                </div>
              </div>
            )}

            {error && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-error-50 dark:bg-error-500/10 border border-error-200 dark:border-error-500/20 px-3 py-2">
                  <p className="text-xs font-medium text-error-600 dark:text-error-400 mb-0.5">Something went wrong</p>
                  <p className="text-xs text-error-500 dark:text-error-400">{error}</p>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Suggestions (only when just greeting) */}
          {messages.length === 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-500/10 px-2.5 py-1 text-xs text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-500/20 transition-colors text-left"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 pb-3 pt-1 border-t border-gray-100 dark:border-gray-800">
            {mentionResults.length > 0 && (
              <div className="mb-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-md overflow-hidden">
                {mentionResults.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); selectMember(m); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-brand-50 dark:hover:bg-brand-500/10 text-left"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-white shrink-0">
                      {m.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                    </span>
                    <span className="font-medium">{m.name}</span>
                    <span className="text-xs text-gray-400 ml-auto">{m.role === "business_admin" ? "Account Admin" : m.role.replace(/_/g, " ")}</span>
                  </button>
                ))}
              </div>
            )}
            <form
              onSubmit={(e) => { e.preventDefault(); send(); }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="Ask anything… or type @ to message a teammate"
                disabled={loading}
                className="flex-1 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2 text-sm text-gray-800 dark:text-white/90 placeholder:text-gray-400 focus:outline-none focus:border-brand-400 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-40 transition-colors shrink-0"
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
