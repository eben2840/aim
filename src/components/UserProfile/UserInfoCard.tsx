import { useAuth } from "../../context/AuthContext";

export default function UserInfoCard() {
  const { user } = useAuth();

  const nameParts = user?.name?.split(" ") ?? [];
  const firstName = nameParts[0] ?? "—";
  const lastName = nameParts.slice(1).join(" ") || "—";
  const roleLabel = user?.role === "business_admin" ? "Account Admin" : (user?.role?.replace(/_/g, " ") ?? "—");

  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="w-full">
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-6">
            Personal Information
          </h4>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                First Name
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {firstName}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Last Name
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {lastName}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Email Address
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {user?.email ?? "—"}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Role
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90 capitalize">
                {roleLabel}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Account Status
              </p>
              <span className="inline-flex items-center gap-1 rounded-full bg-success-50 dark:bg-success-500/10 px-2 py-0.5 text-xs font-medium text-success-600 dark:text-success-400">
                <span className="h-1.5 w-1.5 rounded-full bg-success-500"></span>
                Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
