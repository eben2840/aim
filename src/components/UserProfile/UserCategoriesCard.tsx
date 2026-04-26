import { useState, useEffect } from "react";
import { settingsApi, usersApi } from "../../api";
import { useAuth } from "../../context/AuthContext";
import type { TeamMember } from "../../types";

type Cat = { name: string; hidden: boolean };

export default function UserCategoriesCard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "business_admin" || user?.role === "super_admin";
  const [categories, setCategories] = useState<Cat[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [editing, setEditing] = useState<{ idx: number; name: string } | null>(null);
  const [newCat, setNewCat] = useState("");

  useEffect(() => {
    settingsApi.getCategories().then(setCategories).catch(() => {});
    usersApi.list().then(setMembers).catch(() => {});
  }, []);

  const save = (updated: Cat[], renameFrom?: string, renameTo?: string) =>
    settingsApi.updateCategories(updated, renameFrom, renameTo).then(setCategories).catch(() => {});

  const commitRename = (idx: number) => {
    if (!editing) return;
    const old = categories[idx].name;
    const next = editing.name.trim();
    setEditing(null);
    if (!next || next === old) return;
    save(categories.map((c, i) => i === idx ? { ...c, name: next } : c), old, next);
  };

  const addCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCat.trim();
    if (!name || categories.some((c) => c.name === name)) return;
    save([...categories, { name, hidden: false }]);
    setNewCat("");
  };

  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
      <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-5">Categories</h4>

      <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden mb-4">
        {categories.length === 0 && (
          <p className="px-4 py-3 text-sm text-gray-400">No categories yet.</p>
        )}
        {categories.map((cat, idx) => {
          const catMembers = members.filter((m) => !m.allowedCategories || m.allowedCategories.includes(cat.name));
          return (
            <div key={idx} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0 bg-white dark:bg-gray-900">
              {editing?.idx === idx ? (
                <input autoFocus value={editing.name}
                  onChange={(e) => setEditing({ idx, name: e.target.value })}
                  onBlur={() => commitRename(idx)}
                  onKeyDown={(e) => e.key === "Enter" && commitRename(idx)}
                  className="flex-1 rounded-lg border border-brand-500 px-2 py-1 text-sm dark:bg-gray-800 dark:text-white outline-none" />
              ) : (
                <span className={`flex-1 text-sm font-medium ${cat.hidden ? "line-through text-gray-400" : "text-gray-800 dark:text-white/90"}`}>
                  {cat.name}
                </span>
              )}
              {editing?.idx !== idx && (
                <div className="flex items-center -space-x-2 shrink-0">
                  {catMembers.slice(0, 5).map((m) => (
                    <span key={m.id} title={m.name} className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-white ring-2 ring-white dark:ring-gray-900">
                      {m.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                    </span>
                  ))}
                  {catMembers.length > 5 && (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300 ring-2 ring-white dark:ring-gray-900">
                      +{catMembers.length - 5}
                    </span>
                  )}
                </div>
              )}
              {isAdmin && editing?.idx !== idx && (
                <div className="flex items-center gap-3 shrink-0">
                  <button onClick={() => setEditing({ idx, name: cat.name })} className="text-xs text-brand-500 hover:text-brand-700">Edit</button>
                  <button onClick={() => save(categories.map((c, i) => i === idx ? { ...c, hidden: !c.hidden } : c))} className="text-xs text-gray-400 hover:text-gray-600">
                    {cat.hidden ? "Show" : "Hide"}
                  </button>
                  <button onClick={() => save(categories.filter((_, i) => i !== idx))} className="text-xs text-error-500 hover:text-error-700">Delete</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isAdmin && (
        <form onSubmit={addCategory} className="flex gap-2">
          <input
            type="text"
            placeholder="New category name"
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:text-white/90"
          />
          <button type="submit" className="rounded-full bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">Add</button>
        </form>
      )}
    </div>
  );
}
