/**
 * Type definitions barrel file
 * Re-exports all types for backward compatibility
 */

// Domain-specific exports
export * from './bus';
export * from './train';
export * from './common';

// Legacy aliases for backward compatibility
export type { BusUpdate as Update } from './bus';
