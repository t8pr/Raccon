import { DropdownMenu } from "radix-ui";
import { UserRound, LogOut, Languages } from "lucide-react"; // profile icon
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./ProfileMenu.css";

export default function ProfileMenu({
  name,
  username,
  avatarSrc,
  accountPath,
  onLogout,
  isLoggingOut = false,
}) {
  const { t, i18n } = useTranslation();
  const nextLanguage = i18n.resolvedLanguage === "ar" ? "en" : "ar";

  return (
    <DropdownMenu.Root dir={i18n.dir()}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="profile-menu__trigger"
          aria-label={t("profileMenu.menuLabel")}
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
              <bdi>{name || t("profileMenu.myAccount")}</bdi>
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
                {t("profileMenu.myAccount")}
              </Link>
            </DropdownMenu.Item>
          ) : (
            <DropdownMenu.Item className="profile-menu__item" disabled>
              <UserRound size={24} strokeWidth={1.7} aria-hidden="true" />
              {t("profileMenu.myAccountSoon")}
            </DropdownMenu.Item>
          )}

          <DropdownMenu.Item
            className="profile-menu__item"
            aria-label={t("language.label")}
            onSelect={() => i18n.changeLanguage(nextLanguage)}
          >
            <Languages size={20} strokeWidth={1.7} aria-hidden="true" />
            <span lang={nextLanguage}>{t("language.switchTo")}</span>
          </DropdownMenu.Item>

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
              {isLoggingOut
                ? t("profileMenu.loggingOut")
                : t("profileMenu.logout")}
            </span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
