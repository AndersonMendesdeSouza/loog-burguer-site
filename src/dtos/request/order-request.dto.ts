import type { PaymentMethodEnum } from "../enums/payment-method.enum";
import type { OrderItem } from "../../types/order-item.type";
import type { OrderDeliveryAddressRequestDto } from "./order-delivery-address-request.dto";

export interface OrderRequestDto {
  tableId?: string;
  mesaId?: string | null;
  paymentMethod?: PaymentMethodEnum | null;
  customerName: string;
  customerPhone: string;
  addressId?: string;
  deliveryAddress?: OrderDeliveryAddressRequestDto;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  items: OrderItem[];
}
