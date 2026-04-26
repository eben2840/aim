import { useState, useEffect, useRef } from "react";
import api from "../../api/client";
import { usersApi, messagesApi, settingsApi } from "../../api";
import { useAuth } from "../../context/AuthContext";
import type { TeamMember, Message } from "../../types";

const TEAM_ROLES = [
  { value: "business_admin", label: "Account Admin" },
  { value: "store_manager", label: "Store Manager" },
  { value: "read_only", label: "Read Only" },
];

const FAMILY_ROLES = [
  { value: "child", label: "Child" },
  { value: "parent", label: "Parent" },
  { value: "others", label: "Others" },
];

function roleColor(role: string) {
  if (role === "business_admin") return "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400";
  if (role === "store_manager") return "bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400";
  return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

const emptyForm = { name: "", email: "", password: "", role: "store_manager", allowedCategories: null as string[] | null };

export default function Team() {
  const { user: me } = useAuth();
  const isAdmin = me?.role === "business_admin" || me?.role === "super_admin";
  const isPersonal = me?.accountType === "personal";
  const ROLES = isPersonal ? FAMILY_ROLES : TEAM_ROLES;
  const label = isPersonal ? "Family" : "Team";

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add modal
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Edit modal
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [editForm, setEditForm] = useState({ name: "", role: "", isActive: true, password: "", allowedCategories: null as string[] | null });

  // Delete confirm
  const [deleting, setDeleting] = useState<TeamMember | null>(null);

  // DM chat
  const [chatWith, setChatWith] = useState<TeamMember | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatText, setChatText] = useState("");
  const [chatMention, setChatMention] = useState<string | null>(null);
  const [aiConvo, setAiConvo] = useState<{ id: string; body: string; fromMe: boolean }[]>([]);
  const [aiHistory, setAiHistory] = useState<{ role: string; content: string }[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const load = () => {
    setLoading(true);
    Promise.all([usersApi.list(), settingsApi.getCategories()])
      .then(([users, cats]) => { setMembers(users); setCategories(cats.map((c) => c.name)); })
      .catch(() => setError("Failed to load team members"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!chatWith) return;
    const load = () => messagesApi.list(chatWith.id).then(setMessages).catch(() => {});
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [chatWith]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, aiConvo, aiLoading]);

  const sendAiMessage = async (body: string) => {
    const clean = body.replace(/@abitrack\s*/gi, "").trim();
    setAiConvo((prev) => [...prev, { id: Date.now().toString(), body, fromMe: true }]);
    setAiLoading(true);
    try {
      const res = await api.post<{ reply: string }>("/ai/chat", { message: clean, history: aiHistory });
      setAiConvo((prev) => [...prev, { id: (Date.now() + 1).toString(), body: res.reply, fromMe: false }]);
      setAiHistory((h) => [...h, { role: "user", content: clean }, { role: "assistant", content: res.reply }]);
    } catch (err: any) {
      console.error("AI chat error:", err);
      setAiConvo((prev) => [...prev, { id: (Date.now() + 1).toString(), body: err?.message ?? "Failed to get a response.", fromMe: false }]);
    } finally { setAiLoading(false); }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = chatText.trim();
    if (!body || !chatWith) return;
    setChatText("");
    setChatMention(null);
    if (body.toLowerCase().includes("@abitrack")) { sendAiMessage(body); return; }
    await messagesApi.send(chatWith.id, body);
    messagesApi.list(chatWith.id).then(setMessages).catch(() => {});
  };

  const openChat = (m: TeamMember) => { setChatWith(m); setMessages([]); setChatText(""); setAiHistory([]); setAiConvo([]); messagesApi.markRead(m.id).catch(() => {}); };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      const created = await usersApi.create({ ...form, allowedCategories: form.allowedCategories });
      setMembers((prev) => [...prev, created]);
      setShowAdd(false);
      setForm(emptyForm);
    } catch (err: any) {
      setFormError(err?.message ?? "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (m: TeamMember) => {
    setEditing(m);
    setEditForm({ name: m.name, role: m.role, isActive: m.isActive, password: "", allowedCategories: m.allowedCategories });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const payload: any = { name: editForm.name, role: editForm.role, isActive: editForm.isActive, allowedCategories: editForm.allowedCategories };
      if (editForm.password) payload.password = editForm.password;
      const updated = await usersApi.update(editing.id, payload);
      setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      setEditing(null);
    } catch (err: any) {
      setFormError(err?.message ?? "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await usersApi.delete(deleting.id);
      setMembers((prev) => prev.filter((m) => m.id !== deleting.id));
      setDeleting(null);
    } catch (err: any) {
      setError(err?.message ?? "Failed to delete user");
    }
  };

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">{label} Members</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Manage who has access to your AbiTrack account
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setShowAdd(true); setFormError(""); setForm({ ...emptyForm, role: ROLES[0].value }); }}
            className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Member
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-error-50 dark:bg-error-500/10 px-4 py-3 text-sm text-error-600 dark:text-error-400">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">Loading {label.toLowerCase()} members...</div>
        ) : members.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">No {label.toLowerCase()} members yet. Add one to get started.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-xs uppercase text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Member</th>
                <th className="px-5 py-3 text-left font-medium">{isPersonal ? "Relationship" : "Role"}</th>
                <th className="px-5 py-3 text-left font-medium">Categories</th>
                <th className="px-5 py-3 text-left font-medium">Status</th>
                <th className="px-5 py-3 text-left font-medium">Joined</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-white shrink-0">
                        {initials(m.name)}
                      </span>
                      <div>
                        <p className="font-medium text-gray-800 dark:text-white/90 leading-tight">
                          {m.name}
                          {m.id === me?.id && (
                            <span className="ml-2 text-xs text-gray-400">(you)</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400 leading-tight">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${roleColor(m.role)}`}>
                      {m.role === "business_admin" ? "Account Admin" : m.role.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {m.allowedCategories === null ? (
                      <span className="text-xs text-gray-400">All</span>
                    ) : m.allowedCategories.length === 0 ? (
                      <span className="text-xs text-gray-400">None</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {m.allowedCategories.map((cat) => (
                          <span key={cat} className="inline-block rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-400">{cat}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${m.isActive ? "text-success-600 dark:text-success-400" : "text-gray-400"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${m.isActive ? "bg-success-500" : "bg-gray-400"}`}></span>
                      {m.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-gray-500 dark:text-gray-400">
                    {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {m.id !== me?.id && (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openChat(m)}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10 transition-colors"
                        >
                          Message
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => { setFormError(""); openEdit(m); }}
                              className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setDeleting(m)}
                              className="rounded-lg px-3 py-1.5 text-xs font-medium text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10 transition-colors"
                            >
                              Remove
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── DM Chat Modal ── */}
      {chatWith && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-xl flex flex-col overflow-hidden" style={{ height: "480px" }}>
            <div className="flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-white">
                  {initials(chatWith.name)}
                </span>
                <span className="text-sm font-semibold text-gray-800 dark:text-white/90">{chatWith.name}</span>
              </div>
              <button onClick={() => setChatWith(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto flex flex-col gap-3 px-5 py-4">
              {messages.length === 0 && (
                <p className="text-xs text-gray-400 text-center m-auto">No messages yet. Say something! Type @abitrack to ask the AI.</p>
              )}
              {messages.map((msg) => {
                const isMe = msg.senderId === me?.id;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    <div className={`max-w-xs rounded-2xl px-4 py-2 text-sm ${isMe ? "bg-brand-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white/90"}`}>
                      {msg.body}
                    </div>
                  </div>
                );
              })}
              {aiConvo.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.fromMe ? "items-end" : "items-start"}`}>
                  {!msg.fromMe && <span className="text-xs text-brand-500 font-medium mb-0.5 px-1">AbiTrack</span>}
                  <div className={`max-w-xs rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${msg.fromMe ? "bg-brand-500 text-white" : "bg-brand-50 dark:bg-brand-500/10 text-brand-800 dark:text-brand-200 border border-brand-200 dark:border-brand-500/20"}`}>
                    {msg.body}
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="flex items-start gap-1 px-1">
                  {[0,1,2].map((i) => <span key={i} className="h-2 w-2 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={sendMessage} className="flex flex-col gap-1 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
              {chatMention !== null && "abitrack".startsWith(chatMention.toLowerCase()) && (
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); setChatText(chatText.replace(/@[^@\s]*$/, "@abitrack ")); setChatMention(null); }}
                  className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 text-left"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-white">A</span>
                  <span className="font-medium">AbiTrack</span>
                  <span className="text-xs text-gray-400 ml-auto">AI Assistant</span>
                </button>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatText}
                  onChange={(e) => { setChatText(e.target.value); const m = e.target.value.match(/@([^@\s]*)$/); setChatMention(m ? m[1] : null); }}
                  placeholder={`Message ${chatWith.name}… or @abitrack`}
                  className="flex-1 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-800 dark:text-white/90 outline-none focus:border-brand-500"
                />
                <button
                  type="submit"
                  disabled={!chatText.trim()}
                  className="rounded-full bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-40 transition-colors"
                >
                  Send
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Member Modal ── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-1">Add {label} Member</h2>
            <p className="text-sm text-gray-400 mb-5">Create a new account for your {label.toLowerCase()}</p>
            {formError && (
              <div className="mb-4 rounded-lg bg-error-50 dark:bg-error-500/10 px-3 py-2 text-sm text-error-600 dark:text-error-400">
                {formError}
              </div>
            )}
            <form onSubmit={handleAdd} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-white/90 outline-none focus:border-brand-500"
                  placeholder="Jane Doe"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-white/90 outline-none focus:border-brand-500"
                  placeholder="jane@company.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-white/90 outline-none focus:border-brand-500"
                  placeholder="Min. 6 characters"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-white/90 outline-none focus:border-brand-500"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              {categories.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Category Access</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <button type="button"
                      onClick={() => setForm({ ...form, allowedCategories: null })}
                      className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${form.allowedCategories === null ? "bg-brand-500 text-white border-brand-500" : "border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-brand-400"}`}>
                      All
                    </button>
                    {categories.map((cat) => {
                      const selected = form.allowedCategories?.includes(cat) ?? false;
                      const toggle = () => {
                        const current = form.allowedCategories ?? [];
                        setForm({ ...form, allowedCategories: selected ? current.filter((c) => c !== cat) : [...current, cat] });
                      };
                      return (
                        <button key={cat} type="button" onClick={toggle}
                          className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${selected ? "bg-brand-500 text-white border-brand-500" : "border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-brand-400"}`}>
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="flex-1 rounded-full border border-gray-300 dark:border-gray-700 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-full bg-brand-500 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
                >
                  {saving ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Member Modal ── */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-1">Edit Member</h2>
            <p className="text-sm text-gray-400 mb-5">{editing.email}</p>
            {formError && (
              <div className="mb-4 rounded-lg bg-error-50 dark:bg-error-500/10 px-3 py-2 text-sm text-error-600 dark:text-error-400">
                {formError}
              </div>
            )}
            <form onSubmit={handleEdit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-white/90 outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-white/90 outline-none focus:border-brand-500"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">New Password (leave blank to keep current)</label>
                <input
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-white/90 outline-none focus:border-brand-500"
                  placeholder="Leave blank to keep current"
                />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="isActive" checked={editForm.isActive}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-brand-500" />
                <label htmlFor="isActive" className="text-sm text-gray-700 dark:text-gray-300">Account active</label>
              </div>
              {categories.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Category Access</label>
                  <div className="flex flex-wrap gap-2">
                    <button type="button"
                      onClick={() => setEditForm({ ...editForm, allowedCategories: null })}
                      className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${editForm.allowedCategories === null ? "bg-brand-500 text-white border-brand-500" : "border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-brand-400"}`}>
                      All
                    </button>
                    {categories.map((cat) => {
                      const selected = editForm.allowedCategories?.includes(cat) ?? false;
                      const toggle = () => {
                        const current = editForm.allowedCategories ?? [];
                        setEditForm({ ...editForm, allowedCategories: selected ? current.filter((c) => c !== cat) : [...current, cat] });
                      };
                      return (
                        <button key={cat} type="button" onClick={toggle}
                          className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${selected ? "bg-brand-500 text-white border-brand-500" : "border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-brand-400"}`}>
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="flex-1 rounded-full border border-gray-300 dark:border-gray-700 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-full bg-brand-500 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-2">Remove Member</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Are you sure you want to remove <span className="font-medium text-gray-800 dark:text-white/90">{deleting.name}</span>? They will lose all access immediately.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleting(null)}
                className="flex-1 rounded-full border border-gray-300 dark:border-gray-700 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 rounded-full bg-error-500 py-2 text-sm font-medium text-white hover:bg-error-600"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
