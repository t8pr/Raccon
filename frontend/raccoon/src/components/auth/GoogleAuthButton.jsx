import { useEffect, useRef, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import googleLogo from "../../assets/googleLogo.png";
import Button from "../ui/Button";

const hasClientId = Boolean(process.env.REACT_APP_GOOGLE_CLIENT_ID);

// Google's own button needs a pixel width (max 400), so we measure the slot.
function useSlotWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!ref.current) return undefined;
    const update = () =>
      setWidth(Math.min(400, Math.floor(ref.current.offsetWidth)));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}

// What the user sees: our Outline button (Figma: Button / Outline).
// What receives the click: Google's official button, invisible on top of it.
// Google only gives us the ID token (credential) through its own button,
// so we keep it for the click and draw our design underneath.
export default function GoogleAuthButton({
  onCredential,
  onError,
  disabled = false, // true while we send the token to the backend → loading state
  mode = "signin", // "signin" | "signup"
}) {
  const [slotRef, width] = useSlotWidth();
  const isOff = !hasClientId; // no client id in .env yet → disabled state

  return (
    <div
      ref={slotRef}
      className={`google-auth${disabled ? " google-auth--loading" : ""}${
        isOff ? " google-auth--off" : ""
      }`}
    >
      <Button
        variant="outline"
        fullWidth
        className="google-auth__button"
        disabled={isOff}
        loading={disabled}
        tabIndex={-1}
        aria-hidden={!isOff}
      >
        <span className="google-auth__label">
          المتابعة باستخدام <bdi>Google</bdi>
        </span>
        <img src={googleLogo} alt="" className="google-auth__logo" />
      </Button>

      {!isOff && !disabled && width > 0 && (
        <div className="google-auth__hit">
          <GoogleLogin
            onSuccess={(response) => {
              if (response?.credential) onCredential?.(response.credential);
              else onError?.();
            }}
            onError={() => onError?.()}
            context={mode}
            text="continue_with"
            theme="outline"
            shape="rectangular"
            size="large"
            locale="ar"
            width={width}
          />
        </div>
      )}
    </div>
  );
}
