/**
 * Available API Token Scopes
 *
 * Scopes control which modules/endpoints an API token can access.
 * Tokens can have multiple scopes.
 */
export enum ApiScope {
  BILLING = 'billing',
  USERSIDE = 'userside',
  ANALYTICS = 'analytics',
  SHARED = 'shared',
  EQUIPMENT = 'equipment',
  CABINET_INTELEKT = 'cabinet_intelekt',
}

/**
 * All valid scope values
 */
export const ALL_SCOPES = Object.values(ApiScope);

/**
 * Scope descriptions for documentation
 */
export const SCOPE_DESCRIPTIONS: Record<ApiScope, string> = {
  [ApiScope.BILLING]: 'Access to billing endpoints',
  [ApiScope.USERSIDE]: 'Access to userside endpoints',
  [ApiScope.ANALYTICS]: 'Access to analytics endpoints',
  [ApiScope.SHARED]: 'Access to shared API endpoints',
  [ApiScope.EQUIPMENT]: 'Access to equipment SNMP monitoring endpoints',
  [ApiScope.CABINET_INTELEKT]: 'Access to cabinet intelekt (provider info) endpoints',
};
