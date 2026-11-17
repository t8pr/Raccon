import { DropdownMenu } from "radix-ui";
import { UserRound, LogOut } from "lucide-react"; // profile icon
import { Link } from "react-router-dom";
import "./ProfileMenu.css";

export default function ProfileMenu({
  name = "حسابي",
  username,
  avatarSrc,
  accountPath,
  onLogout,
  isLoggingOut = false,
}) {
  return (
    <DropdownMenu.Root dir="rtl">
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="profile-menu__trigger"
          aria-label="قائمة الحساب"
          disabled={isLoggingOut}
        >
          {avatarSrc ? (
            <img src={avatarSrc} alt="" />
          ) : (
            <UserRound size={24} strokeWidth={1.7} aria-hidden="true" />
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="profile-menu__content"
          align="end"
          sideOffset={8}
          collisionPadding={16}
        >
          <DropdownMenu.Label className="profile-menu__identity">
            <strong>
              <bdi>{name}</bdi>
            </strong>

            {username && (
              <span>
                <bdi dir="ltr">@{username}</bdi>
              </span>
            )}
          </DropdownMenu.Label>

          <DropdownMenu.Separator className="profile-menu__separator" />

          {accountPath ? (
            <DropdownMenu.Item asChild>
              <Link className="profile-menu__item" to={accountPath}>
                <UserRound size={24} strokeWidth={1.7} aria-hidden="true" />
                حسابي
              </Link>
            </DropdownMenu.Item>
          ) : (
            <DropdownMenu.Item className="profile-menu__item" disabled>
              <UserRound size={24} strokeWidth={1.7} aria-hidden="true" />
              حسابي — قريبًا
            </DropdownMenu.Item>
          )}

          <DropdownMenu.Item
            className="profile-menu__item profile-menu__item--danger"
            disabled={isLoggingOut}
            onSelect={(event) => {
              event.preventDefault();
              onLogout();
            }}
          >
            <LogOut size={20} strokeWidth={1.7} aria-hidden="true" />
            <span role="status">
              {isLoggingOut ? "جارٍ الخروج..." : "تسجيل الخروج"}
            </span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
