import AvatarOption from "../AvatarOption/AvatarOption";

import Dehem from "../../../../assets/avatars/Dehem.png";
import Ghamda from "../../../../assets/avatars/Ghamda.png";
import Mento from "../../../../assets/avatars/Mento.png";
import Sakhr from "../../../../assets/avatars/Sakhr.png";
import "./CharacterPicker.css";
import { useTranslation } from "react-i18next";

// avatar array will use in .map()
const avatars = [
  { id: 1, nameKey: "profile.avatars.dehem", image: Dehem },
  { id: 2, nameKey: "profile.avatars.ghamda", image: Ghamda },
  { id: 3, nameKey: "profile.avatars.mento", image: Mento },
  { id: 4, nameKey: "profile.avatars.sakhr", image: Sakhr },
];

export default function CharacterPicker({
  value,
  onChange,
  error = "",
  required = false,
}) {
  const { t } = useTranslation();
  return (
    <fieldset className="character-picker">
      <legend className="character-picker__title">{t("profile.chooseCharacter")}</legend>

      <div className="character-picker__options">
        {avatars.map((avatar) => (
          <AvatarOption
            key={avatar.id}
            id={avatar.id}
            name={t(avatar.nameKey)}
            image={avatar.image}
            checked={value === avatar.id}
            onChange={onChange}
            required={required}
          />
        ))}
      </div>

      <p
        className="character-picker__error"
        role={error ? "alert" : undefined}
        aria-hidden={!error}
      >
        {error || "\u00A0"}
      </p>
    </fieldset>
  );
}
