import { Injectable, Logger } from '@nestjs/common';
import { IOltVendor } from '../interfaces/olt-vendor.interface';
import { BdcomVendor } from './bdcom.vendor';

/**
 * Supported OLT Vendor Types
 */
export type OltVendorType = 'bdcom' | 'huawei' | 'zte' | 'auto';

/**
 * Vendor Factory
 *
 * Factory pattern for creating and managing OLT vendor implementations.
 * Returns the appropriate vendor implementation based on type.
 */
@Injectable()
export class VendorFactory {
  private readonly logger = new Logger(VendorFactory.name);
  private readonly vendors: Map<string, IOltVendor> = new Map();

  constructor() {
    // Register available vendors
    this.registerVendor(new BdcomVendor());
    // Add more vendors as they are implemented:
    // this.registerVendor(new HuaweiVendor());
    // this.registerVendor(new ZteVendor());

    this.logger.log(
      `Vendor factory initialized with ${this.vendors.size} vendor(s): ${Array.from(this.vendors.keys()).join(', ')}`
    );
  }

  /**
   * Register a vendor implementation
   */
  private registerVendor(vendor: IOltVendor): void {
    this.vendors.set(vendor.vendorName.toLowerCase(), vendor);
  }

  /**
   * Get vendor implementation by type
   *
   * @param type - Vendor type (bdcom, huawei, zte, auto)
   * @returns Vendor implementation
   * @throws Error if vendor not supported
   */
  getVendor(type: OltVendorType): IOltVendor {
    // If auto-detect, default to BDCOM for now
    // TODO: Implement auto-detection logic based on device probe
    if (type === 'auto') {
      this.logger.debug('Auto-detect requested, defaulting to BDCOM');
      type = 'bdcom';
    }

    const vendor = this.vendors.get(type.toLowerCase());

    if (!vendor) {
      const supportedVendors = Array.from(this.vendors.keys()).join(', ');
      throw new Error(
        `Unsupported OLT vendor: ${type}. Supported vendors: ${supportedVendors}`
      );
    }

    return vendor;
  }

  /**
   * Get list of supported vendors
   */
  getSupportedVendors(): string[] {
    return Array.from(this.vendors.keys());
  }

  /**
   * Check if vendor is supported
   */
  isVendorSupported(type: string): boolean {
    return this.vendors.has(type.toLowerCase());
  }
}
