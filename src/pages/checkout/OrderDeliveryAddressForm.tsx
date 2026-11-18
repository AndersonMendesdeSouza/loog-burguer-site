import type { OrderDeliveryAddressRequestDto } from "../../dtos/request/order-delivery-address-request.dto";
import styles from "./Checkout.module.css";

type Props = {
  address: OrderDeliveryAddressRequestDto;
  onChange: (field: keyof OrderDeliveryAddressRequestDto, value: string) => void;
};

const fields: { name: keyof OrderDeliveryAddressRequestDto; label: string; maxLength: number; required?: boolean }[] = [
  { name: "street", label: "Rua / Avenida", maxLength: 160, required: true },
  { name: "number", label: "Número", maxLength: 30, required: true },
  { name: "block", label: "Quadra (opcional)", maxLength: 30 },
  { name: "lot", label: "Lote (opcional)", maxLength: 30 },
  { name: "neighborhood", label: "Bairro", maxLength: 80, required: true },
  { name: "city", label: "Cidade", maxLength: 80, required: true },
  { name: "state", label: "UF", maxLength: 2, required: true },
  { name: "zipCode", label: "CEP", maxLength: 9, required: true },
  { name: "complement", label: "Complemento (opcional)", maxLength: 160 },
  { name: "reference", label: "Referência (opcional)", maxLength: 160 },
];

export default function OrderDeliveryAddressForm({ address, onChange }: Props) {
  function changeField(field: keyof OrderDeliveryAddressRequestDto, value: string) {
    if (field === "state") value = value.replace(/[^a-z]/gi, "").toUpperCase();
    if (field === "zipCode") value = value.replace(/\D/g, "").slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");
    onChange(field, value);
  }

  return (
    <div className={styles.formGrid}>
      <p className={styles.label}>Informe onde deseja receber. Não é necessário criar conta nem cadastrar endereço no perfil.</p>
      {fields.map((field) => (
        <label key={field.name} className={styles.field}>
          <span className={styles.label}>{field.label}</span>
          <input
            className={styles.input} name={field.name}
            value={address[field.name] ?? ""} required={field.required}
            maxLength={field.maxLength}
            onChange={(event) => changeField(field.name, event.target.value)}
          />
        </label>
      ))}
    </div>
  );
}
