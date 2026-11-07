import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../ui/Navbar";
import ProfileMenu from "../ui/ProfileMenu";
import { useAuth } from "../../context/AuthContext";
import { logoutUser } from "../../api/auth/authApi";
import Mark from "../../assets/Mark.png";
import { avatarImages } from "../ui/avatarImages";

// Each role sees its own pages 
// "disabled" = page not built yet → shown as «قريبًا» instead of a dead link (cheated from Laila)
const navigationByRole = {
  user: [
    { label: "الرئيسية", to: "/home", end: true },
    { label: "التجارب", to: "/packages" },
    { label: "المتجر", to: "/store" },
    { label: "طلب خاص", to: "/special-request", disabled: true },
  ],
  admin: [
    { label: "الرئيسية", to: "/home", end: true },
    { label: "إدارة التجارب", to: "/admin/experiences" },
    { label: "إدارة المستخدمين", to: "/admin/users", disabled: true },
    { label: "المتجر", to: "/store" },
  ],
};

export default function AppNavbar() {
  const { accessToken, user, clearSession } = useAuth();
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
      await logoutUser(accessToken);

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
