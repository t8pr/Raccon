import "./AvatarOption.css";
// In this componnent responsiable to display one avatar to user with selected or unseleced action
export default function AvatarOption({
  // this props come from characterPicker component
  id, // for save the avatar in the back-end
  name,
  image,
  checked,
  onChange,
  required = false,
}) {
  return (
    <label className="avatar-option">
      <input
        type="radio" // radio input to prevent the user to choose 2 avatar in the same time
        name="avatar_id"
        value={id}
        checked={checked}
        onChange={() => onChange(id)}
        required={required}
        className="avatar-option__radio"
      />

      <span className="avatar-option__circle">
        <img src={image} alt="" className="avatar-option__image" />

        <span className="avatar-option__check" aria-hidden="true">
          ✓
        </span>
      </span>

      <span className="avatar-option__name">{name}</span>
    </label>
  );
}
