import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../ui/Navbar";
import ProfileMenu from "../ui/ProfileMenu";
import { useAuth } from "../../context/AuthContext";
import { logoutUser } from "../../api/auth/authApi";
import Mark from "../../assets/Mark.png";
import { avatarImages } from "../ui/avatarImages";

const navigationItems = [
  { label: "باقاتي", to: "/packages", disabled: false },
  { label: "التخصيص", to: "/customization", disabled: false },
  { label: "المتصدرين", to: "/leaderboard", disabled: false },
  { label: "المتجر", to: "/store", disabled: false },
];

export default function AppNavbar() {
  const { accessToken, user, clearSession } = useAuth();
  const navigate = useNavigate();
  const [logoutError, setLogoutError] = useState("");

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const avatarId = Number(user?.avatar_id);
  const avatarSrc = avatarImages[avatarId] ?? avatarImages[1];

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
