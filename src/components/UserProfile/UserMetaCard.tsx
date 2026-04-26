import { useAuth } from "../../context/AuthContext";

export default function UserMetaCard() {
  const { user } = useAuth();

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  const roleLabel = user?.role === "business_admin" ? "Account Admin" : (user?.role?.replace(/_/g, " ") ?? "");

  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
          {/* Avatar with initials */}
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-500 text-2xl font-bold text-white border border-gray-200 dark:border-gray-800">
            {initials}
          </div>

          <div className="order-3 xl:order-2">
            <h4 className="mb-2 text-lg font-semibold text-center text-gray-800 dark:text-white/90 xl:text-left">
              {user?.name ?? "—"}
            </h4>
            <div className="flex flex-col items-center gap-1 text-center xl:flex-row xl:gap-3 xl:text-left">
              <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                {roleLabel}
              </p>
              {user?.email && (
                <>
                  <div className="hidden h-3.5 w-px bg-gray-300 dark:bg-gray-700 xl:block"></div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {user.email}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Role badge */}
          <div className="flex items-center order-2 gap-2 grow xl:order-3 xl:justify-end">
            <span className="inline-flex items-center rounded-full bg-brand-50 dark:bg-brand-500/10 px-3 py-1 text-sm font-medium text-brand-600 dark:text-brand-400 capitalize">
              {roleLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
