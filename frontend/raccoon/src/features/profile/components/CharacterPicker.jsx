import AvatarOption from "./AvatarOption";

import Dehem from "../../../assets/avatars/Dehem.png";
import Ghamda from "../../../assets/avatars/Ghamda.png";
import Mento from "../../../assets/avatars/Mento.png";
import Sakhr from "../../../assets/avatars/Sakhr.png";
import "./CharacterPicker.css";

// avatar array will use in .map()
const avatars = [
  { id: 1, name: "دهم", image: Dehem },
  { id: 2, name: "غمدة", image: Ghamda },
  { id: 3, name: "منتو", image: Mento },
  { id: 4, name: "صخر", image: Sakhr },
];

export default function CharacterPicker({
  value,
  onChange,
  error = "",
  required = false,
}) {
  return (
    <fieldset className="character-picker">
      <legend className="character-picker__title">اختر شخصيتك</legend>

      <div className="character-picker__options">
        {avatars.map((avatar) => (
          <AvatarOption
            key={avatar.id}
            id={avatar.id}
            name={avatar.name}
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
