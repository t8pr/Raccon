import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Navbar from "../Navbar/Navbar";
import ProfileMenu from "../ProfileMenu/ProfileMenu";
import { useAuth } from "../../auth/AuthContext";
import { logoutUser } from "../../api/authApi";
import Mark from "../../../assets/Mark.png";
import { avatarImages } from "../../constants/avatarImages";

// Each role sees its own pages
// "disabled" = page not built yet → shown as «قريبًا» instead of a dead link (cheated from Laila)
// labelKey = مفتاح الترجمة، يتترجم داخل المكون حسب اللغة الحالية
const userPages = [
  { labelKey: "nav.home", to: "/home", end: true },
  { labelKey: "nav.packages", to: "/packages" },
  { labelKey: "nav.store", to: "/store" },
];

const navigationByRole = {
  user: userPages,
  // admin = everything a user has (incl. their own packages to claim and play) + the admin pages
  admin: [
    ...userPages,
    { labelKey: "nav.adminExperiences", to: "/admin/experiences" },
    { labelKey: "nav.adminUsers", to: "/admin/users", disabled: true },
  ],
};

// title اختياري: شاشات المسح تمرّر اسم الجولة فيظهر بدل روابط التنقل
export default function AppNavbar({ title }) {
  const { t } = useTranslation();
  const { user, clearSession } = useAuth();
  const navigate = useNavigate();
  const [logoutError, setLogoutError] = useState("");

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const avatarId = Number(user?.avatar_id);
  const avatarSrc = avatarImages[avatarId] ?? avatarImages[1];
  const navigationItems = (
    user?.role === "admin" ? navigationByRole.admin : navigationByRole.user
  ).map(({ labelKey, ...item }) => ({ ...item, label: t(labelKey) }));

  async function handleLogout() {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    setLogoutError("");

    try {
      await logoutUser();

      clearSession();
      navigate("/login", { replace: true });
    } catch {
      setLogoutError(t("nav.logoutError"));
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <>
      <Navbar
        logo={Mark}
        items={navigationItems}
        title={title}
        account={
          <ProfileMenu
            accountPath="/profile" // in profile icon if press حسابي  will Route u in profile page
            name={user?.name || t("profileMenu.myAccount")}
            username={user?.username}
            avatarSrc={avatarSrc}
            onLogout={handleLogout}
            isLoggingOut={isLoggingOut}
          />
        }
      />

      {logoutError && <p role="alert">{logoutError}</p>}
    </>
  );
}
