import AppNavbar from "../../shared/layout/AppNavbar/AppNavbar";
import InlineMessage from "../../shared/ui/InlineMessage/InlineMessage";
import { avatarImages } from "../../shared/constants/avatarImages";

import { useProfileEditor } from "./hooks/useProfileEditor";
import {
  DangerCard,
  IdentityCard,
  InformationCard,
} from "./components/ProfileSections";
import ProfileEditDialog from "./components/ProfileEditDialog";
import "./ProfilePage.css";
import { useTranslation } from "react-i18next";

/*
  صفحة الحساب: الشخصية، المعلومات، وحذف الحساب.
  كل تعديل يفتح نافذة واحدة (ProfileEditDialog)، ومنطقها كله في useProfileEditor.
*/
export default function ProfilePage() {
  const { t } = useTranslation();
  const editor = useProfileEditor();
  const { user } = editor;

  // جميع Hooks أعلاه، قبل أي return شرطي.
  if (!user) {
    return (
      <p role="status">
        {t("profile.unavailable")}
      </p>
    );
  }

  const avatarSrc = avatarImages[Number(user.avatar_id)] || avatarImages[1];

  return (
    <div className="profile-view">
      <AppNavbar />

      <div className="profile-page">
        <header className="profile-page__heading">
          <h1>{t("profileMenu.myAccount")}</h1>
          <p>{t("profile.subtitle")}</p>
        </header>

        {editor.notice && <InlineMessage type="success" message={editor.notice} />}

        <IdentityCard user={user} avatarSrc={avatarSrc} onEdit={editor.open} />
        <InformationCard user={user} onEdit={editor.open} />
        <DangerCard onEdit={editor.open} />
      </div>

      <ProfileEditDialog editor={editor} />
    </div>
  );
}
