import AppNavbar from "../../shared/layout/AppNavbar";
import InlineMessage from "../../shared/ui/InlineMessage";
import { avatarImages } from "../../shared/constants/avatarImages";

import { useProfileEditor } from "./hooks/useProfileEditor";
import {
  DangerCard,
  IdentityCard,
  InformationCard,
} from "./components/ProfileSections";
import ProfileEditDialog from "./components/ProfileEditDialog";
import "./ProfilePage.css";

/*
  صفحة الحساب: الشخصية، المعلومات، وحذف الحساب.
  كل تعديل يفتح نافذة واحدة (ProfileEditDialog)، ومنطقها كله في useProfileEditor.
*/
export default function ProfilePage() {
  const editor = useProfileEditor();
  const { user } = editor;

  // جميع Hooks أعلاه، قبل أي return شرطي.
  if (!user) {
    return (
      <p dir="rtl" role="status">
        بيانات الحساب غير متاحة. سجّل الدخول مجددًا.
      </p>
    );
  }

  const avatarSrc = avatarImages[Number(user.avatar_id)] || avatarImages[1];

  return (
    <div className="profile-view" dir="rtl">
      <AppNavbar />

      <div className="profile-page">
        <header className="profile-page__heading">
          <h1>حسابي</h1>
          <p>بياناتك وشخصيتك في مكان واحد.</p>
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
