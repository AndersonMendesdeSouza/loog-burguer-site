import { CheckCircle2 } from "lucide-react";
import { Slide, toast } from "react-toastify";

export const CART_ADDED_TOAST_ID = "cart-added-product";

const content = (
  <span className="cart-added-toast-message">
    Produto adicionado ao carrinho!
  </span>
);

export function showCartAddedToast() {
  if (toast.isActive(CART_ADDED_TOAST_ID)) {
    toast.update(CART_ADDED_TOAST_ID, {
      render: content,
      type: "success",
      isLoading: false,
      autoClose: 2000,
      transition: Slide,
      className: "cart-added-toast",
      icon: <CheckCircle2 size={20} aria-hidden="true" />,
    });
    return;
  }

  toast.success(content, {
    toastId: CART_ADDED_TOAST_ID,
    position: "top-center",
    autoClose: 2000,
    closeButton: false,
    hideProgressBar: true,
    transition: Slide,
    className: "cart-added-toast",
    icon: <CheckCircle2 size={20} aria-hidden="true" />,
  });
}
