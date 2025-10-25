/**
 * Payment System Constants
 *
 * Defines payment methods, provider support matrix, and configuration
 */

/**
 * Available payment methods
 */
export enum PaymentMethod {
  PRIVAT24 = 'privat24',
  EASYPAY = 'easypay',
  PORTMONE = 'portmone',
}

/**
 * Provider names (matches company names in database)
 */
export enum PaymentProvider {
  INTELEKT = 'Intelekt',
  VELES = 'Veles',
  OPENSVIT = 'Opensvit',
  OPTICOM = 'Opticom',
}

/**
 * Payment method support matrix
 * Maps payment methods to supported providers
 */
export const PAYMENT_METHOD_SUPPORT_MATRIX: Record<PaymentMethod, PaymentProvider[]> = {
  [PaymentMethod.PRIVAT24]: [
    PaymentProvider.INTELEKT,
    PaymentProvider.VELES,
    PaymentProvider.OPENSVIT,
  ],
  [PaymentMethod.EASYPAY]: [
    PaymentProvider.INTELEKT,
    PaymentProvider.VELES,
    PaymentProvider.OPENSVIT,
    PaymentProvider.OPTICOM,
  ],
  [PaymentMethod.PORTMONE]: [
    PaymentProvider.INTELEKT,
    PaymentProvider.VELES,
  ],
};

/**
 * Payment method display names (Ukrainian)
 */
export const PAYMENT_METHOD_NAMES: Record<PaymentMethod, string> = {
  [PaymentMethod.PRIVAT24]: 'Приват24',
  [PaymentMethod.EASYPAY]: 'EasyPay',
  [PaymentMethod.PORTMONE]: 'Portmone',
};

/**
 * Privat24 base URL
 */
export const PRIVAT24_BASE_URL = 'https://my-payments.privatbank.ua/mypayments/customauth/identification/fp/static';

/**
 * EasyPay base URLs by provider
 */
export const EASYPAY_URLS: Record<PaymentProvider, string> = {
  [PaymentProvider.INTELEKT]: 'https://easypay.ua/ua/catalog/internet/intelekt',
  [PaymentProvider.VELES]: 'https://easypay.ua/ua/catalog/internet/veles',
  [PaymentProvider.OPENSVIT]: 'https://easypay.ua/ua/catalog/internet/opensvit',
  [PaymentProvider.OPTICOM]: 'https://easypay.ua/ua/catalog/internet/opticom-plus',
};

/**
 * Portmone API configuration
 */
export const PORTMONE_CONFIG = {
  PAYMENT_URL: 'https://www.portmone.com.ua/gateway/',
  DEFAULT_HEADERS: { 'Content-Type': 'application/json' },
};

/**
 * Portmone payeeId mapping
 * Maps database payeeId to actual Portmone payeeId
 */
export const PORTMONE_PAYEE_ID_MAP: Record<string, string> = {
  '131611': '133660', // TOV INTELEKT GROUP
  '138348': '134757', // FOP SLIVA
  '138347': '134758', // FOP ZAPARNYK
  '139811': '139812', // TOV BYKNET
  '138349': '139811', // INTELEKT_BUKNET
};
