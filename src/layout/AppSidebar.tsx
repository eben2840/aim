import logoLight from "../aseets/logo/2.png";
import logoDark from "../aseets/logo/1.png";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import {
  BoxCubeIcon,
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  ListIcon,
  PieChartIcon,
  UserCircleIcon,
  AlertIcon,
  BoxIconLine,
  GroupIcon,
  TableIcon,
  PlusIcon,
  ArrowRightIcon,
  FolderIcon,
  DocsIcon,
  CalenderIcon,
} from "../icons";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";
import { productsApi } from "../api";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  businessOnly?: boolean;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean; adminOnly?: boolean }[];
};

const navItems: NavItem[] = [
  { icon: <GridIcon />, name: "Dashboard", path: "" },
  {
    icon: <BoxIconLine />,
    name: "Inventory",
    subItems: [
      { name: "Products", path: "products" },
      { name: "Stock View", path: "stock" },
      { name: "Stock Transfer", path: "stock-transfer" },
    ],
  },
  {
    icon: <DocsIcon />,
    name: "Orders",
    businessOnly: true,
    subItems: [
      { name: "Purchase Orders", path: "purchase-orders" },
      { name: "Sales Orders", path: "sales-orders" },
    ],
  },
  { icon: <GroupIcon />, name: "Suppliers", path: "suppliers" },
  { icon: <UserCircleIcon />, name: "Customers", path: "customers", businessOnly: true },
  { icon: <FolderIcon />, name: "Locations", path: "locations" },
];

const othersItems: NavItem[] = [
  { icon: <CalenderIcon />, name: "Calendar", path: "calendar" },
  { icon: <GroupIcon />, name: "Team", path: "team" },
  { icon: <PlusIcon />, name: "Receipt Upload", path: "receipt-upload" },
  {
    icon: <AlertIcon />,
    name: "Low Stock Alerts",
    path: "low-stock-alerts",
  },
  {
    icon: <PieChartIcon />,
    name: "Reports",
    path: "reports",
  },
  {
    icon: <TableIcon />,
    name: "Integrations",
    subItems: [
      { name: "API Docs", path: "profile", pro: true },
      { name: "Webhooks", path: "profile", pro: true },
    ],
  },
  {
    icon: <ListIcon />,
    name: "Settings",
    subItems: [
      { name: "Profile", path: "profile" },
      { name: "Restock Stores", path: "settings", adminOnly: true },
    ],
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const { user } = useAuth();
  const isAdmin = user?.role === "business_admin" || user?.role === "super_admin";
  const isPersonal = user?.accountType === "personal";
  const location = useLocation();

  const [categories, setCategories] = useState<string[]>([]);
  const [catsOpen, setCatsOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback(
    (path: string) => {
      const fullPath = `/abitrack/${path}`.replace(/\/+/g, "/");
      return location.pathname === fullPath || location.pathname === `/abitrack/${path}`;
    },
    [location.pathname]
  );

  useEffect(() => {
    productsApi.categories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    let submenuMatched = false;
    ["main", "others"].forEach((menuType) => {
      const items = menuType === "main" ? navItems : othersItems;
      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (isActive(subItem.path)) {
              setOpenSubmenu({ type: menuType as "main" | "others", index });
              submenuMatched = true;
            }
          });
        }
      });
    });
    if (!submenuMatched) setOpenSubmenu(null);
  }, [location, isActive]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prev) => ({
          ...prev,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prev) => {
      if (prev && prev.type === menuType && prev.index === index) return null;
      return { type: menuType, index };
    });
  };

  const renderMenuItems = (items: NavItem[], menuType: "main" | "others") => (
    <ul className="flex flex-col gap-4">
      {items.filter((nav) => !nav.businessOnly || !isPersonal).map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group ${
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive"
              } cursor-pointer ${!isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"}`}
            >
              <span className={`menu-item-icon-size ${
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-icon-active"
                  : "menu-item-icon-inactive"
              }`}>
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon className={`ml-auto w-5 h-5 transition-transform duration-200 ${
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "rotate-180 text-brand-500"
                    : ""
                }`} />
              )}
            </button>
          ) : nav.path !== undefined && (
            <Link
              to={nav.path}
              className={`menu-item group ${isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"}`}
            >
              <span className={`menu-item-icon-size ${isActive(nav.path) ? "menu-item-icon-active" : "menu-item-icon-inactive"}`}>
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">{nav.name === "Team" && isPersonal ? "Family" : nav.name}</span>
              )}
            </Link>
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => { subMenuRefs.current[`${menuType}-${index}`] = el; }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-2 space-y-1 ml-9">
                {nav.subItems.filter((s) => !s.adminOnly || isAdmin).map((subItem) => (
                  <li key={subItem.name}>
                    <Link
                      to={subItem.path}
                      className={`menu-dropdown-item ${
                        isActive(subItem.path)
                          ? "menu-dropdown-item-active"
                          : "menu-dropdown-item-inactive"
                      }`}
                    >
                      {subItem.name}
                      <span className="flex items-center gap-1 ml-auto">
                        {subItem.new && (
                          <span className={`ml-auto ${isActive(subItem.path) ? "menu-dropdown-badge-active" : "menu-dropdown-badge-inactive"} menu-dropdown-badge`}>
                            new
                          </span>
                        )}
                        {subItem.pro && (
                          <span className={`ml-auto ${isActive(subItem.path) ? "menu-dropdown-badge-active" : "menu-dropdown-badge-inactive"} menu-dropdown-badge`}>
                            pro
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200
        ${isExpanded || isMobileOpen ? "w-[290px]" : isHovered ? "w-[290px]" : "w-[90px]"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`py-8 flex ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"}`}>
        <Link to="/abitrack/">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <img className="dark:hidden h-6 w-auto sm:h-7" src={logoLight} alt="AbiTrack" />
              <img className="hidden dark:block h-6 w-auto sm:h-7" src={logoDark} alt="AbiTrack" />
            </>
          ) : (
            <img src={logoLight} alt="AbiTrack" className="h-6 w-auto" />
          )}
        </Link>
      </div>

      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"}`}>
                {isExpanded || isHovered || isMobileOpen ? "Main Menu" : <HorizontaLDots className="size-6" />}
              </h2>
              {renderMenuItems(navItems, "main")}
              {categories.length > 0 && (isExpanded || isHovered || isMobileOpen) && (
                <ul className="flex flex-col gap-4 mt-4">
                  <li>
                    <button
                      onClick={() => setCatsOpen((o) => !o)}
                      className="menu-item group menu-item-inactive cursor-pointer lg:justify-start"
                    >
                      <span className="menu-item-icon-size menu-item-icon-inactive"><BoxCubeIcon /></span>
                      <span className="menu-item-text">Categories</span>
                      <ChevronDownIcon className={`ml-auto w-5 h-5 transition-transform duration-200 ${catsOpen ? "rotate-180 text-brand-500" : ""}`} />
                    </button>
                    <ul className={`mt-2 space-y-1 ml-9 ${catsOpen ? "" : "hidden"}`}>
                      {categories.map((cat) => (
                        <li key={cat}>
                          <Link
                            to={`categories/${encodeURIComponent(cat)}`}
                            className={`menu-dropdown-item ${isActive(`categories/${encodeURIComponent(cat)}`) ? "menu-dropdown-item-active" : "menu-dropdown-item-inactive"}`}
                          >
                            {cat}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                </ul>
              )}
            </div>
            <div>
              <h2 className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"}`}>
                {isExpanded || isHovered || isMobileOpen ? "Tools & Settings" : <HorizontaLDots />}
              </h2>
              {renderMenuItems(othersItems, "others")}
            </div>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
