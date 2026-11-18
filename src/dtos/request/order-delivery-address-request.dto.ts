export interface OrderDeliveryAddressRequestDto {
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  block?: string;
  lot?: string;
  complement?: string;
  reference?: string;
}
