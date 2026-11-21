import Button from "../../../shared/ui/Button";
import { getModeLabel } from "../../../shared/constants/modes";

// نافذة تأكيد الشراء. checkout: ما يرجّعه useCheckout.
export default function CheckoutDialog({ checkout }) {
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
        <h2 id="store-modal-title">هل أنت متأكد من إتمام عملية الشراء؟</h2>

        {selected && (
          <p>
            {getModeLabel(selected.mode)} · {selected.pieces} قطعة ·{" "}
            {selected.price} ر.س
          </p>
        )}

        <div className="store-modal__actions">
          <Button fullWidth onClick={checkout.buy}>
            شراء
          </Button>

          <Button fullWidth variant="outline" onClick={checkout.close} autoFocus>
            إلغاء
          </Button>
        </div>
      </div>
    </dialog>
  );
}
