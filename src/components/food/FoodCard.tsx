import { ShoppingCart } from "lucide-react";
import type { CSSProperties } from "react";
import styles from "./FoodCard.module.css";
import { toast } from "react-toastify";
import Colors from "../../themes/Colors";
import { addCart } from "../../utils/cartStorage";

type BestSellerCssVars = CSSProperties & {
  "--bestSellerBg": string;
  "--bestSellerBorder": string;
  "--bestSellerText": string;
  "--bestSellerGlow": string;
};

type FoodCardProps = {
  id?: string;
  name?: string;
  desc?: string;
  price?: number;
  originalPrice?: number;
  img?: string;
  badge?: string;
  onDetails?: () => void;
  functions?: () => void;
};

function formatMoney(value?: number) {
  if (value === undefined) return "";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function FoodCard({
  id,
  name,
  functions,
  desc,
  price,
  originalPrice,
  img,
  badge,
  onDetails,
}: FoodCardProps) {
  const oldPrice =
    originalPrice !== undefined && price !== undefined && originalPrice > price
      ? originalPrice
      : undefined;

  const item = {
    id,
    name,
    price,
    img,
    badge,
    qty: 1,
    image: img,
  };

  return (
    <article
      onClick={onDetails}
      className={styles.card}
      style={
        {
          "--bestSellerBg": Colors.Status.bestSellerBg,
          "--bestSellerBorder": Colors.Status.bestSellerBorder,
          "--bestSellerText": Colors.Status.bestSellerText,
          "--bestSellerGlow": Colors.Status.bestSellerGlow,
        } as BestSellerCssVars
      }
    >
      {!!badge && <div className={styles.badge}>{badge}</div>}

      <div className={styles.imgWrap}>
        <img src={img} alt={name} className={styles.img} />
      </div>

      <div className={styles.body}>
        <h3 className={styles.title}>
          <button
            type="button"
            className={styles.detailsButton}
            onClick={(event) => {
              event.stopPropagation();
              onDetails?.();
            }}
            aria-label={`Ver detalhes de ${name}`}
          >
            {name}
          </button>
        </h3>
        <p className={styles.desc}>{desc}</p>

        <div className={styles.bottom}>
          <div className={styles.prices}>
            {oldPrice !== undefined && (
              <span className={styles.minPrice}>{formatMoney(oldPrice)}</span>
            )}
            <span className={styles.price}>{formatMoney(price)}</span>
          </div>
          <button
            type="button"
            className={styles.addBtn}
            onClick={(event) => {
              event.stopPropagation();
              addCart(item);
              toast.success("Produto adicionado ao carrinho", { autoClose: 1500 });
              functions?.();
            }}
            aria-label={`Adicionar ${name} ao carrinho`}
          >
            <ShoppingCart size={18} aria-hidden="true" />
            Adicionar
          </button>
        </div>
      </div>
    </article>
  );
}
