import type { UpdateUserRequestDto } from "../../dtos/request/update-user-request.dto";

export type ProfileFormErrors = Partial<Record<keyof UpdateUserRequestDto, string>>;

export function formatProfilePhone(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.length > 11 && digits.startsWith("55")) {
    digits = digits.slice(2);
  }
  digits = digits.slice(0, 11);

  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;

  const firstGroupEnd = digits.length === 11 ? 7 : 6;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, firstGroupEnd)}-${digits.slice(firstGroupEnd)}`;
}

export function validateProfileForm(values: UpdateUserRequestDto): ProfileFormErrors {
  const errors: ProfileFormErrors = {};

  if (!values.name.trim()) errors.name = "Informe seu nome.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = "Informe um e-mail válido.";
  }

  const phoneLength = values.phone.replace(/\D/g, "").length;
  if (phoneLength !== 10 && phoneLength !== 11) {
    errors.phone = "Informe o telefone com DDD e 10 ou 11 dígitos.";
  }

  return errors;
}
