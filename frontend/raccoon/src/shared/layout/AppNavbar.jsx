import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import ProfileMenu from "./ProfileMenu";
import { useAuth } from "../auth/AuthContext";
import { logoutUser } from "../api/authApi";
import Mark from "../../assets/Mark.png";
import { avatarImages } from "../constants/avatarImages";

// Each role sees its own pages
// "disabled" = page not built yet → shown as «قريبًا» instead of a dead link (cheated from Laila)
const userPages = [
  { label: "الرئيسية", to: "/home", end: true },
  { label: "التجارب", to: "/packages" },
  { label: "المتجر", to: "/store" },
];

const navigationByRole = {
  user: userPages,
  // admin = everything a user has (incl. their own packages to claim and play) + the admin pages
  admin: [
    ...userPages,
    { label: "إدارة التجارب", to: "/admin/experiences" },
    { label: "إدارة المستخدمين", to: "/admin/users", disabled: true },
  ],
};

// title اختياري: شاشات المسح تمرّر اسم الجولة فيظهر بدل روابط التنقل
export default function AppNavbar({ title }) {
  const { user, clearSession } = useAuth();
  const navigate = useNavigate();
  const [logoutError, setLogoutError] = useState("");

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const avatarId = Number(user?.avatar_id);
  const avatarSrc = avatarImages[avatarId] ?? avatarImages[1];
  const navigationItems =
    user?.role === "admin" ? navigationByRole.admin : navigationByRole.user;

  async function handleLogout() {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    setLogoutError("");

    try {
      await logoutUser();

      clearSession();
      navigate("/login", { replace: true });
    } catch {
      setLogoutError("تعذر تسجيل الخروج. حاول مرة أخرى.");
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
            name={user?.name || "حسابي"}
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
