/**
 * NAS Helper
 *
 * Provides utility functions for determining session type and provider
 * based on NAS (Network Access Server) name.
 */

/**
 * NAS information interface
 */
export interface NasInfo {
  sessionType: 'ipoe' | 'pppoe' | null;
  sessionProvider: 'intelekt' | 'opensvit' | 'veles' | null;
}

/**
 * Determine session type and provider based on NAS name
 *
 * Mapping logic:
 * - Juniper_BRAS1, Juniper_BRAS2, Juniper_BRAS3 → ipoe + intelekt
 * - Jun_bras_opensvit → pppoe + opensvit
 * - Jun_pppoe_veles → pppoe + veles
 * - Jun_pppoe_BRAS1, NAS15 → pppoe + intelekt
 *
 * @param nasName - NAS name from database
 * @returns Object with sessionType and sessionProvider
 */
export function getNasInfo(nasName: string | null): NasInfo {
  if (!nasName) {
    return { sessionType: null, sessionProvider: null };
  }

  const name = nasName.trim();

  // ipoe: Juniper_BRAS1, Juniper_BRAS2, Juniper_BRAS3
  if (name === 'Juniper_BRAS1' || name === 'Juniper_BRAS2' || name === 'Juniper_BRAS3') {
    return { sessionType: 'ipoe', sessionProvider: 'intelekt' };
  }

  // pppoe opensvit: Jun_bras_opensvit
  if (name === 'Jun_bras_opensvit') {
    return { sessionType: 'pppoe', sessionProvider: 'opensvit' };
  }

  // pppoe veles: Jun_pppoe_veles
  if (name === 'Jun_pppoe_veles') {
    return { sessionType: 'pppoe', sessionProvider: 'veles' };
  }

  // pppoe intelekt: Jun_pppoe_BRAS1, NAS15
  if (name === 'Jun_pppoe_BRAS1' || name === 'NAS15') {
    return { sessionType: 'pppoe', sessionProvider: 'intelekt' };
  }

  // Unknown NAS - default to pppoe + intelekt (for legacy/old sessions)
  return { sessionType: 'pppoe', sessionProvider: 'intelekt' };
}
