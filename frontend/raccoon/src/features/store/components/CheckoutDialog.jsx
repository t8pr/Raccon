import Button from "../../../shared/ui/Button/Button";
import { getModeLabel } from "../../../shared/constants/modes";
import { useTranslation } from "react-i18next";

// نافذة تأكيد الشراء. checkout: ما يرجّعه useCheckout.
export default function CheckoutDialog({ checkout }) {
  const { t } = useTranslation();
  const { dialogRef, selected } = checkout;

  return (
    <dialog
      ref={dialogRef}
      className="store-modal store-modal--confirm"
      aria-labelledby="store-modal-title"
      onClose={checkout.handleClosed}
      onClick={(event) => {
        // الضغط على الخلفية خارج المحتوى يغلق النافذة
        if (event.target === event.currentTarget) checkout.close();
      }}
    >
      <div className="store-modal__body">
        <h2 id="store-modal-title">{t("store.confirmTitle")}</h2>

        {selected && (
          <p>
            {getModeLabel(selected.mode)} ·{" "}
            {t("common.piecesFlat", { count: selected.pieces })} · {selected.price}{" "}
            {t("common.currency")}
          </p>
        )}

        <div className="store-modal__actions">
          <Button fullWidth onClick={checkout.buy}>
            {t("common.buy")}
          </Button>

          <Button fullWidth variant="outline" onClick={checkout.close} autoFocus>
            {t("common.cancel")}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
