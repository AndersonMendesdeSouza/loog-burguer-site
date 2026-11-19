import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import styles from "./Checkout.module.css";
import Colors from "../../themes/Colors";
import {
  ArrowLeft,
  ShoppingCart,
  User,
  Wallet,
  Check,
  Send,
  Home,
  UtensilsCrossed,
  Truck,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import { OrderController } from "../../controllers/order.controller";
import { PaymentMethod } from "../../dtos/enums/payment-method.enum";
import type { PaymentMethodEnum } from "../../dtos/enums/payment-method.enum";
import type { OrderRequestDto } from "../../dtos/request/order-request.dto";
import type { AddressResponseDto } from "../../dtos/response/address-response.dto";
import { useStoreStatus } from "../../hooks/useStoreStatus";
import { CART_STORAGE_KEY, notifyCartUpdated } from "../../utils/cartStorage";
import { AddressService } from "../../service/address.service";
import { UserService } from "../../service/user.service";
import { getRequestErrorMessage } from "../../utils/getRequestErrorMessage";
import TableIdentifiedModal from "../../components/TableIdentifiedMesa/TableIdentifiedModal";
import { useAuth } from "../../contexts/AuthContext";
import AuthRequiredModal from "../../components/AuthRequiredModal/AuthRequiredModal";
import { isAxiosError } from "axios";
import type { OrderDeliveryAddressRequestDto } from "../../dtos/request/order-delivery-address-request.dto";
import OrderDeliveryAddressForm from "./OrderDeliveryAddressForm";
import { TableService } from "../../service/table.service";
import type { TableResponseDto } from "../../dtos/response/table-response.dto";

type CartItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
  note?: string;
  subtitle?: string;
  image: string;
};

type CheckoutNavState = {
  items: CartItem[];
  orderObs?: string;
  deliveryFee: number;
  subtotal: number;
  total: number;
};

type PaymentType = PaymentMethodEnum;

type CheckoutCssVars = CSSProperties & {
  "--bgPrimary": string;
  "--bgSecondary": string;
  "--highlight": string;
  "--textPrimary": string;
  "--textSecondary": string;
};

type TableIdentifiedMesaProps = {
  mesaId: string | null;
  tableSessionExpired: boolean;
  onValidateTableSession: () => boolean;
};

const LS_SELECTED_KEY = "mb_checkout_selected_address_v1";

function onlyDigits(v: string) {
  return (v || "").replace(/\D/g, "");
}

function maskPhoneBR(input: string) {
  const d = onlyDigits(input).slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function maskMoneyBR(input: string) {
  const cleaned = input.replace(/[^\d,.]/g, "").replace(/\./g, ",");
  const parts = cleaned.split(",");
  const i = parts[0].replace(/\D/g, "").slice(0, 6);
  const f = (parts[1] || "").replace(/\D/g, "").slice(0, 2);
  if (!i && !f) return "";
  return f.length ? `${i || "0"},${f}` : `${i}`;
}

function formatAddressDetails(address: AddressResponseDto) {
  return [
    address.neighborhood,
    `${address.city}/${address.state}`,
    `CEP ${address.zipCode}`,
  ]
    .filter(Boolean)
    .join(" - ");
}

export default function Checkout({ mesaId, tableSessionExpired, onValidateTableSession }: TableIdentifiedMesaProps) {
  const nav = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [showAuthRequired, setShowAuthRequired] = useState(false);
  const state = (location.state || {}) as Partial<CheckoutNavState>;
  const items = state.items || [];
  const baseDeliveryFee =
    typeof state.deliveryFee === "number" ? state.deliveryFee : 0;
  const subtotal = typeof state.subtotal === "number" ? state.subtotal : 0;
  const orderObs = state.orderObs || "";
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [payment, setPayment] = useState<PaymentType>(PaymentMethod.PIX);
  const [cashChange, setCashChange] = useState("");
  const [needChange, setNeedChange] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTableConfirmation, setShowTableConfirmation] = useState(false);
  const [tables, setTables] = useState<TableResponseDto[]>([]);
  const [tableId, setTableId] = useState("");
  const [loadingTables, setLoadingTables] = useState(false);
  const [tableError, setTableError] = useState("");
  const selectedTable = tables.find((table) => table.id === tableId);
  const tableNumber = selectedTable ? String(selectedTable.number) : "";
  const identifiedTableNumber = mesaId?.trim() || "";
  const hasIdentifiedTable = identifiedTableNumber.length > 0;
  const [orderType, setOrderType] = useState<"table" | "delivery">(
    () => (hasIdentifiedTable || tableSessionExpired ? "table" : "delivery"),
  );
  const isTableOrder = orderType === "table";
  const deliveryFee = !isTableOrder && items.length ? baseDeliveryFee : 0;
  const total = subtotal + deliveryFee;
  const storeStatus = useStoreStatus();

  const [savedAddresses, setSavedAddresses] = useState<AddressResponseDto[]>(
    [],
  );
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  );
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [addressError, setAddressError] = useState("");
  const [addressMode, setAddressMode] = useState<"saved" | "manual">("saved");
  const useManualAddress = !isAuthenticated || addressMode === "manual";
  const [manualAddress, setManualAddress] = useState<OrderDeliveryAddressRequestDto>({
    street: "", number: "", block: "", lot: "", neighborhood: "",
    city: "Buriti Alegre", state: "GO", zipCode: "75660-000", complement: "", reference: "",
  });

  const brl = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  useEffect(() => {
    if (tableSessionExpired) return;
    setOrderType(hasIdentifiedTable ? "table" : "delivery");
  }, [hasIdentifiedTable, tableSessionExpired]);

  useEffect(() => {
    if (!isTableOrder || !identifiedTableNumber) return;
    let active = true;
    async function loadTable() {
      setLoadingTables(true);
      setTableError("");
      try {
        const table = await TableService.findOneNumber(identifiedTableNumber);
        if (!active) return;
        setTables(table.isActive ? [table] : []);
        setTableId(table.isActive ? table.id : "");
        if (!table.isActive) setTableError("Esta mesa não está disponível no momento.");
      } catch (error) {
        if (!active) return;
        setTables([]);
        setTableId("");
        setTableError(getRequestErrorMessage(error, "Não foi possível identificar a mesa."));
      } finally {
        if (active) setLoadingTables(false);
      }
    }
    void loadTable();
    return () => { active = false; };
  }, [isTableOrder, identifiedTableNumber]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let active = true;

    async function loadInitialData() {
      try {
        const storedUserId = localStorage.getItem("userId");

        if (storedUserId) {
          const user = await UserService.findOne(storedUserId);
          if (!active) return;
          setFullName(user.name || "");
          setPhone(maskPhoneBR(user.phone || ""));
        }
      } catch {
        if (active) {
          setFullName("");
          setPhone("");
        }
      }
    }

    void loadInitialData();

    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setSavedAddresses([]);
      setSelectedAddressId(null);
      setAddressError("");
      setLoadingAddresses(false);
      return;
    }
    if (isTableOrder) return;

    let active = true;

    async function loadAddresses() {
      setLoadingAddresses(true);

      try {
        const data = await AddressService.findAll();
        if (!active) return;

        const sorted = [...data].sort((a, b) => {
          if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });

        setSavedAddresses(sorted);
        setAddressError("");

        const storedSelectedId = localStorage.getItem(LS_SELECTED_KEY);
        const selected =
          sorted.find((address) => address.id === storedSelectedId) ||
          sorted.find((address) => address.isDefault) ||
          sorted[0];

        setSelectedAddressId(selected?.id ?? null);
      } catch (error) {
        if (active) {
          if (isAxiosError(error) && error.response?.status === 401) {
            if (!localStorage.getItem("token")) setShowAuthRequired(true);
            return;
          }
          setAddressError(
            getRequestErrorMessage(
              error,
              "Não foi possível carregar seus endereços.",
            ),
          );
        }
      } finally {
        if (active) setLoadingAddresses(false);
      }
    }

    void loadAddresses();

    return () => {
      active = false;
    };
  }, [isTableOrder, isAuthenticated, authLoading]);

  useEffect(() => {
    if (payment !== PaymentMethod.CASH) {
      setNeedChange(null);
      setCashChange("");
    }
  }, [payment]);

  const selectedAddress = useMemo(() => {
    if (!selectedAddressId) return null;
    return savedAddresses.find((a) => a.id === selectedAddressId) || null;
  }, [savedAddresses, selectedAddressId]);

  const step1Done =
    fullName.trim().length > 0 && onlyDigits(phone).length >= 10;

  const manualAddressValid = [manualAddress.street, manualAddress.number, manualAddress.neighborhood, manualAddress.city].every((value) => value.trim().length > 0)
    && /^[A-Z]{2}$/.test(manualAddress.state) && /^\d{5}-?\d{3}$/.test(manualAddress.zipCode);
  let step2Done = isAuthenticated && !!selectedAddress && !loadingAddresses && !addressError;
  if (isTableOrder) step2Done = hasIdentifiedTable && !tableSessionExpired && !!selectedTable && !loadingTables && !tableError;
  else if (useManualAddress) step2Done = manualAddressValid;

  const step3Done =
    payment !== PaymentMethod.CASH ||
    needChange === false ||
    (needChange === true && cashChange.trim().length > 0);

  const canSend =
    items.length > 0 &&
    step1Done &&
    step2Done &&
    step3Done &&
    !authLoading &&
    !isSubmitting;

  const openNow = storeStatus.openNow;

  function handleSelectAddress(id: string) {
    setSelectedAddressId(id);
    localStorage.setItem(LS_SELECTED_KEY, id);
  }

  function buildOrderPayload(): OrderRequestDto {
    const extraInfo = [
      orderObs.trim() ? `Obs pedido: ${orderObs.trim()}` : "",
      payment === PaymentMethod.CASH && needChange === true
        ? `Troco para: R$ ${cashChange.trim()}`
        : "",
    ].filter(Boolean);
    const orderObservation = extraInfo.join(" | ");

    return {
      tableId: isTableOrder ? selectedTable?.id : undefined,
      mesaId: isTableOrder ? identifiedTableNumber : undefined,
      paymentMethod: payment,
      customerName: fullName.trim(),
      customerPhone: onlyDigits(phone),
      addressId: !isTableOrder && !useManualAddress ? selectedAddress?.id : undefined,
      deliveryAddress: !isTableOrder && useManualAddress ? manualAddress : undefined,
      subtotal,
      deliveryFee,
      discount: 0,
      total,
      items: items.map((item, index) => ({
        id: String(item.id),
        productId: String(item.id),
        name: item.name,
        description: item.subtitle,
        imageUrl: item.image,
        quantity: item.qty,
        unitPrice: item.price,
        totalPrice: item.price * item.qty,
        observations: [item.note, index === 0 ? orderObservation : ""]
          .filter(Boolean)
          .join(" | "),
      })),
    };
  }

  async function handleCreateOrder(tableConfirmed = false) {
    if (isTableOrder && !onValidateTableSession()) {
      setShowTableConfirmation(false);
      return;
    }
    if (!canSend) {
      alert("Preencha os dados obrigatórios do pedido");
      return;
    }

    if (storeStatus.loading) {
      toast.info("Verificando horário de funcionamento...", {
        autoClose: 1800,
      });
      return;
    }

    if (!openNow) {
      const left = storeStatus.hoursToOpen;
      toast.error(
        `Fechado, abrimos em ${left} ${left === 1 ? "hora" : "horas"}`,
        { autoClose: 2500 },
      );
      return;
    }

    if (isTableOrder && !tableConfirmed) {
      setShowTableConfirmation(true);
      return;
    }

    setIsSubmitting(true);

    try {
      const createdOrder = await OrderController.create(buildOrderPayload());

      localStorage.removeItem(CART_STORAGE_KEY);
      notifyCartUpdated();
      nav("/order-inform", {
        state: {
          orderId: createdOrder.id,
        },
      });
      localStorage.removeItem(CART_STORAGE_KEY);
    } catch (error) {
      setShowTableConfirmation(false);
      toast.error(getRequestErrorMessage(error, "Erro ao criar pedido"), {
        autoClose: 3000,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className={styles.screen}
      style={
        {
          "--bgPrimary": Colors.Background.primary,
          "--bgSecondary": Colors.Background.secondary,
          "--highlight": Colors.Highlight.primary,
          "--textPrimary": Colors.Texts.primary,
          "--textSecondary": Colors.Texts.secondary,
        } as CheckoutCssVars
      }
    >
      <ToastContainer position="top-center" />
      {isTableOrder && !tableSessionExpired && showTableConfirmation && (
        <TableIdentifiedModal
          tableNumber={tableNumber.trim()}
          title="Confirmar mesa do pedido"
          description="Seu pedido será direcionado para esta mesa. Confirma?"
          closeLabel="Cancelar"
          isConfirming={isSubmitting}
          onClose={() => setShowTableConfirmation(false)}
          onConfirm={() => void handleCreateOrder(true)}
        />
      )}
      <div className={styles.content} data-enter="page">
        <header className={styles.header}>
          <button
            className={styles.iconBtn}
            aria-label="Voltar"
            onClick={() => nav(-1)}
          >
            <ArrowLeft size={20} />
          </button>

          <div className={styles.headerTitle}>
            <div className={styles.headerTop}>Finalizar Pedido</div>
          </div>

          <button
            className={styles.headerCart}
            type="button"
            onClick={() => nav("/cart")}
          >
            <ShoppingCart size={18} />
          </button>
        </header>

        <div className={styles.stepBarContainer}>
          <div className={styles.stepBar}>
            <div
              className={`${styles.stepSeg} ${step3Done ? styles.stepSegOn : ""
                }`}
            />
            <div
              className={`${styles.stepSeg} ${step2Done ? styles.stepSegOn : ""
                }`}
            />
            <div
              className={`${styles.stepSeg} ${step1Done ? styles.stepSegOn : ""
                }`}
            />
          </div>
        </div>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div className={styles.sectionTitle}>
              <ShoppingCart size={16} />
              <span>Resumo</span>
            </div>

            <button
              type="button"
              className={styles.editOrderBtn}
              onClick={() => nav("/cart")}
            >
              Editar pedido
            </button>
          </div>

          <div className={styles.summaryList}>
            {items.map((it) => (
              <div key={it.id} className={styles.summaryItem}>
                <div className={styles.summaryThumbWrap}>
                  <img
                    className={styles.summaryThumb}
                    src={it.image}
                    alt={it.name}
                  />
                </div>

                <div className={styles.summaryInfo}>
                  <div className={styles.summaryName}>{it.name}</div>
                  <div className={styles.summaryMeta}>
                    {it.subtitle ? <span>{it.subtitle}</span> : <span />}
                    <span className={styles.summaryQty}>x{it.qty}</span>
                  </div>
                  <div className={styles.summaryPrice}>{brl(it.price)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionTitle}>
            <User size={16} />
            <span>Seus Dados</span>
          </div>

          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span className={styles.label}>Nome Completo</span>
              <input
                className={styles.input}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Como devemos te chamar?"
                autoComplete="name"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Telefone / WhatsApp</span>
              <input
                className={styles.input}
                value={phone}
                onChange={(e) => setPhone(maskPhoneBR(e.target.value))}
                placeholder="(00) 00000-0000"
                inputMode="tel"
                autoComplete="tel"
              />
            </label>
          </div>

          <div className={styles.orderTypeField}>
            <span className={styles.label} id="order-type-label">
              Como você quer receber seu pedido?
            </span>
            {hasIdentifiedTable || tableSessionExpired ? (
              <div
                className={styles.orderTypeSwitch}
                role="group"
                aria-labelledby="order-type-label"
              >
                <button
                  type="button"
                  className={`${styles.orderTypeButton} ${isTableOrder ? styles.orderTypeActive : ""}`}
                  aria-pressed={isTableOrder}
                  onClick={() => setOrderType("table")}
                >
                  <UtensilsCrossed size={16} aria-hidden="true" />
                  Na mesa
                </button>
                <button
                  type="button"
                  className={`${styles.orderTypeButton} ${!isTableOrder ? styles.orderTypeActive : ""}`}
                  aria-pressed={!isTableOrder}
                  onClick={() => setOrderType("delivery")}
                >
                  <Truck size={16} aria-hidden="true" />
                  Para entrega
                </button>
              </div>
            ) : null}
          </div>
        </section>

        {isTableOrder ? (
          <section className={styles.section}>
            <div className={styles.sectionTitle}>
              <UtensilsCrossed size={16} />
              <span>Pedido na mesa</span>
            </div>
            {tableSessionExpired ? (
              <p role="alert" className={styles.label}>
                Sua identificação da mesa expirou. Aproxime o telefone da plaquinha
                ou escaneie o QR Code novamente para pedir na mesa.
              </p>
            ) : (
              <>
            <span className={styles.label} id="table-options-label">Selecione a mesa</span>
            {loadingTables && <p role="status" className={styles.label}>Carregando mesas...</p>}
            {tableError && <p role="alert" className={styles.label}>{tableError}</p>}
            {!loadingTables && !tableError && tables.length === 0 && <p className={styles.label}>Nenhuma mesa disponível no momento.</p>}
            <div className={styles.tableChoices} role="group" aria-labelledby="table-options-label">
              {tables.map((table) => (
                <button key={table.id} type="button" className={`${styles.tableChoice} ${table.id === tableId ? styles.tableChoiceActive : ""}`} aria-label={`Mesa ${table.number}`} aria-pressed={table.id === tableId} disabled={isSubmitting} onClick={() => setTableId(table.id)}>{table.number}</button>
              ))}
            </div>
            <p className={styles.label}>Seu pedido será levado até a mesa selecionada, sem taxa de entrega.</p>
              </>
            )}
          </section>
        ) : (
          <section className={styles.section}>
            <div className={styles.sectionTitle}>
              <Home size={16} />
              <span>Endereço de entrega</span>
            </div>

            {isAuthenticated && (
              <div className={styles.orderTypeSwitch} role="group" aria-label="Escolher endereço de entrega">
                <button type="button" className={`${styles.orderTypeButton} ${!useManualAddress ? styles.orderTypeActive : ""}`} aria-pressed={!useManualAddress} onClick={() => setAddressMode("saved")}>Endereço cadastrado</button>
                <button type="button" className={`${styles.orderTypeButton} ${useManualAddress ? styles.orderTypeActive : ""}`} aria-pressed={useManualAddress} onClick={() => setAddressMode("manual")}>Informar neste pedido</button>
              </div>
            )}
            {useManualAddress ? (
              <OrderDeliveryAddressForm address={manualAddress} onChange={(field, value) => setManualAddress((current) => ({ ...current, [field]: value }))} />
            ) : addressError ? (
              <div className={styles.emptyAddressCard}>
                <div className={styles.emptyAddressTitle}>{addressError}</div>
                <button
                  type="button"
                  className={styles.useNewBtn}
                  onClick={() =>
                    nav("/perfil", { state: { openAddresses: true } })
                  }
                >
                  Gerenciar endereços
                </button>
              </div>
            ) : loadingAddresses ? (
              <div className={styles.emptyAddressCard}>
                <div className={styles.emptyAddressTitle}>
                  Carregando endereços...
                </div>
              </div>
            ) : savedAddresses.length === 0 ? (
              <div className={styles.emptyAddressCard}>
                <div className={styles.emptyAddressTitle}>
                  Nenhum endereço cadastrado
                </div>
                <div className={styles.emptyAddressDesc}>
                  Cadastre um endereço no perfil ou use a opção de informar neste pedido.
                </div>
                <button
                  type="button"
                  className={styles.useNewBtn}
                  onClick={() =>
                    nav("/perfil", { state: { openAddresses: true } })
                  }
                >
                  Cadastrar endereço
                </button>
              </div>
            ) : (
              <div className={styles.addressList}>
                {savedAddresses.map((address) => {
                  const active = address.id === selectedAddressId;
                  return (
                    <button
                      key={address.id}
                      type="button"
                      className={`${styles.addressCard} ${active ? styles.addressCardActive : ""
                        }`}
                      onClick={() => handleSelectAddress(address.id)}
                    >
                      <div className={styles.addressTopRow}>
                        <div className={styles.addressTitle}>
                          {address.street}, {address.number}
                        </div>
                        {address.isDefault ? (
                          <span className={styles.addressBadge}>Padrão</span>
                        ) : null}
                      </div>
                      <div className={styles.addressMeta}>
                        <span>{formatAddressDetails(address)}</span>
                      </div>
                      {address.complement ? (
                        <div className={styles.addressComp}>
                          {address.complement}
                        </div>
                      ) : null}
                      {address.reference ? (
                        <div className={styles.addressComp}>
                          {address.reference}
                        </div>
                      ) : null}
                    </button>
                  );
                })}

                <button
                  type="button"
                  className={styles.useNewBtn}
                  onClick={() =>
                    nav("/perfil", { state: { openAddresses: true } })
                  }
                >
                  Gerenciar endereços
                </button>
              </div>
            )}
          </section>
        )}

        <section className={styles.section}>
          <div className={styles.sectionTitle}>
            <Wallet size={16} />
            <span>Pagamento</span>
          </div>

          <div className={styles.payList}>
            <button
              type="button"
              className={`${styles.payItem} ${payment === PaymentMethod.PIX ? styles.payItemActive : ""
                }`}
              onClick={() => setPayment(PaymentMethod.PIX)}
            >
              <div className={styles.payLeft}>
                <div className={styles.payIcon}>
                  <Check size={16} />
                </div>
                <div className={styles.payTexts}>
                  <div className={styles.payName}>Pix</div>
                  <div className={styles.payDesc}>Pagamento instantâneo</div>
                </div>
              </div>
              <div
                className={`${styles.radio} ${payment === PaymentMethod.PIX ? styles.radioOn : ""
                  }`}
              />
            </button>

            <button
              type="button"
              className={`${styles.payItem} ${payment === PaymentMethod.CREDIT_CARD
                ? styles.payItemActive
                : ""
                }`}
              onClick={() => setPayment(PaymentMethod.CREDIT_CARD)}
            >
              <div className={styles.payLeft}>
                <div className={styles.payIcon}>
                  <Check size={16} />
                </div>
                <div className={styles.payTexts}>
                  <div className={styles.payName}>Cartão de crédito</div>
                  <div className={styles.payDesc}>
                    {isTableOrder ? "Pagamento no estabelecimento" : "Pagamento na entrega"}
                  </div>
                </div>
              </div>
              <div
                className={`${styles.radio} ${payment === PaymentMethod.CREDIT_CARD ? styles.radioOn : ""
                  }`}
              />
            </button>

            <button
              type="button"
              className={`${styles.payItem} ${payment === PaymentMethod.DEBIT_CARD ? styles.payItemActive : ""
                }`}
              onClick={() => setPayment(PaymentMethod.DEBIT_CARD)}
            >
              <div className={styles.payLeft}>
                <div className={styles.payIcon}>
                  <Check size={16} />
                </div>
                <div className={styles.payTexts}>
                  <div className={styles.payName}>Cartão de débito</div>
                  <div className={styles.payDesc}>
                    {isTableOrder ? "Pagamento no estabelecimento" : "Pagamento na entrega"}
                  </div>
                </div>
              </div>
              <div
                className={`${styles.radio} ${payment === PaymentMethod.DEBIT_CARD ? styles.radioOn : ""
                  }`}
              />
            </button>

            <button
              type="button"
              className={`${styles.payItem} ${payment === PaymentMethod.CASH ? styles.payItemActive : ""
                }`}
              onClick={() => setPayment(PaymentMethod.CASH)}
            >
              <div className={styles.payLeft}>
                <div className={styles.payIcon}>
                  <Check size={16} />
                </div>
                <div className={styles.payTexts}>
                  <div className={styles.payName}>Dinheiro</div>
                  <div className={styles.payDesc}>Precisa de troco?</div>
                </div>
              </div>
              <div
                className={`${styles.radio} ${payment === PaymentMethod.CASH ? styles.radioOn : ""
                  }`}
              />
            </button>

            {payment === PaymentMethod.CASH ? (
              <div className={styles.cashBox}>
                <div className={styles.payList}>
                  <button
                    type="button"
                    className={`${styles.payItem} ${needChange === true ? styles.payItemActive : ""
                      }`}
                    onClick={() => setNeedChange(true)}
                  >
                    <div className={styles.payLeft}>
                      <div className={styles.payIcon}>
                        <Check size={16} />
                      </div>
                      <div className={styles.payTexts}>
                        <div className={styles.payName}>Sim</div>
                        <div className={styles.payDesc}>
                          Vou precisar de troco
                        </div>
                      </div>
                    </div>
                    <div
                      className={`${styles.radio} ${needChange === true ? styles.radioOn : ""
                        }`}
                    />
                  </button>

                  <button
                    type="button"
                    className={`${styles.payItem} ${needChange === false ? styles.payItemActive : ""
                      }`}
                    onClick={() => {
                      setNeedChange(false);
                      setCashChange("");
                    }}
                  >
                    <div className={styles.payLeft}>
                      <div className={styles.payIcon}>
                        <Check size={16} />
                      </div>
                      <div className={styles.payTexts}>
                        <div className={styles.payName}>Não</div>
                        <div className={styles.payDesc}>Sem troco</div>
                      </div>
                    </div>
                    <div
                      className={`${styles.radio} ${needChange === false ? styles.radioOn : ""
                        }`}
                    />
                  </button>
                </div>

                {needChange === true ? (
                  <label className={styles.field} style={{ marginTop: 10 }}>
                    <span className={styles.label}>Troco para</span>
                    <input
                      className={styles.input}
                      value={cashChange}
                      onChange={(e) =>
                        setCashChange(maskMoneyBR(e.target.value))
                      }
                      placeholder="Ex: 50,00"
                      inputMode="decimal"
                      autoComplete="off"
                    />
                  </label>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        <div className={styles.bottomSpacer} />
      </div>

      <div className={styles.bottomBar}>
        <div className={styles.totalRow}>
          <span className={styles.totalLabel}>Total do pedido</span>
          <span className={styles.totalValue}>{brl(total)}</span>
        </div>

        <button
          className={styles.sendBtn}
          type="button"
          disabled={!canSend}
          onClick={() => void handleCreateOrder()}
        >
          <span className={styles.sendLeft}>
            <Send size={18} />
            <span>{isSubmitting ? "Enviando..." : "Enviar pedido"}</span>
          </span>
        </button>
      </div>
      {showAuthRequired && (
        <AuthRequiredModal
          description="Entre ou crie uma conta para cadastrar seu endereço e receber o pedido em casa."
          onClose={() => setShowAuthRequired(false)}
        />
      )}
    </div>
  );
}
