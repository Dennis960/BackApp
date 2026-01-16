import type { Server, StorageLocation, NamingRule } from '../types';

// ============================================================================
// Input Type Definitions - Each input type has its own interface
// ============================================================================

/** Base properties shared by all input types */
interface BaseInput {
  title: string;
  description?: string;
  required?: boolean;
  placeholder?: string;
  helperText?: string;
}

/** String input - for plain text */
export interface StringInput extends BaseInput {
  type: 'string';
  default?: string;
}

/** Password input - masked text field */
export interface PasswordInput extends BaseInput {
  type: 'password';
  default?: string;
}

/** Number input - numeric value */
export interface NumberInput extends BaseInput {
  type: 'number';
  default?: number;
}

/** Path input - file/directory picker */
export interface PathInput extends BaseInput {
  type: 'path';
  /**
   * Location of the path: 'remote' (on server) or 'local' (on client)
   */
  pathLocation: 'remote' | 'local';
  /**
   * Allow selecting directories (default: true)
   */
  directories?: boolean;
  default?: string;
}

/** Storage location selector */
export interface StorageLocationInput extends BaseInput {
  type: 'storage_location';
}

/** Naming rule selector */
export interface NamingRuleInput extends BaseInput {
  type: 'naming_rule';
}

/** Cron expression input */
export interface CronInput extends BaseInput {
  type: 'cron';
  default?: string;
}

/** Union of all input types */
export type TemplateInput =
  | StringInput
  | PasswordInput
  | NumberInput
  | PathInput
  | StorageLocationInput
  | NamingRuleInput
  | CronInput;

// ============================================================================
// Step Definition - Generic for type-safe input IDs
// ============================================================================

/**
 * A single input within a step, with type-safe ID.
 * TInputId is constrained to keys of the step's values.
 */
export interface TypedInput<TInputId extends string = string> {
  id: TInputId;
  config: TemplateInput;
}

/**
 * A step definition where input IDs are type-safe.
 * TStepId is the step's identifier (key in TValues).
 * TStepValues is the shape of values this step collects.
 */
export interface TypedStep<
  TStepId extends string = string,
  TStepValues extends Record<string, unknown> = Record<string, unknown>
> {
  id: TStepId;
  title: string;
  description?: string;
  inputs: Array<TypedInput<Extract<keyof TStepValues, string>>>;
}

/**
 * Creates a union of valid step definitions for a TValues type.
 * Each step's input IDs must match the keys in TValues[stepId].
 */
export type TypedSteps<TValues> = {
  [K in keyof TValues]: TypedStep<
    Extract<K, string>,
    TValues[K] extends Record<string, unknown> ? TValues[K] : never
  >;
}[keyof TValues][];

/** Runtime step type (untyped, for wizard) */
export interface TemplateStep {
  id: string;
  title: string;
  description?: string;
  inputs: Array<{
    id: string;
    config: TemplateInput;
  }>;
}

// ============================================================================
// Result Types - What the template produces
// ============================================================================

export interface ProfileResult {
  name: string;
  server_id: number;
  storage_location_id: number;
  naming_rule_id: number;
  schedule_cron?: string;
  enabled: boolean;
}

export interface CommandResult {
  run_stage: 'pre' | 'post';
  command: string;
}

export interface FileRuleResult {
  remote_path: string;
  recursive?: boolean;
  compress_format?: string;
  exclude_pattern?: string;
}

export interface TemplateResult {
  profile: ProfileResult;
  commands: CommandResult[];
  fileRules: FileRuleResult[];
}

// ============================================================================
// Template Context - Generic for type-safe values
// ============================================================================

/** Base type for template values at runtime - each step maps to its inputs */
export type TemplateValues = Record<string, Record<string, unknown>>;

/**
 * Template context with typed values.
 * TValues is a record of step IDs to their input value types.
 * 
 * Example:
 * ```
 * type MyValues = {
 *   target: { path: string };
 *   config: { username: string; password: string };
 * };
 * TemplateContext<MyValues>
 * ```
 */
export interface TemplateContext<TValues = TemplateValues> {
  /** The selected server */
  server: Server;
  /** All collected input values - typed per template */
  values: TValues;
  /** Available storage locations for reference */
  storageLocations: StorageLocation[];
  /** Available naming rules for reference */
  namingRules: NamingRule[];
}

/** Untyped context for runtime use (wizard doesn't know template types) */
export type UntypedTemplateContext = TemplateContext<TemplateValues>;

/** Deep partial type for nested objects */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// ============================================================================
// Template Definition - Generic for type-safe values
// ============================================================================

/**
 * Template definition with typed values.
 * TValues defines the shape of values collected from the user.
 */
export interface Template<TValues = TemplateValues> {
  /** Display name */
  name: string;
  /** Description shown in template picker */
  description: string;
  /** Steps in order */
  steps: TypedSteps<TValues>;
  /** 
   * Build the result from collected values.
   * Uses native TypeScript with full type safety.
   */
  buildResult: (ctx: TemplateContext<TValues>) => TemplateResult;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the directory portion of a path.
 * If path ends with '/', returns the path without trailing slash.
 * If path is a file, returns the parent directory.
 */
export function dirname(path: string): string {
  if (!path) return '';
  const normalized = path.replace(/\\/g, '/');
  if (normalized === '/' || normalized === '') {
    return '/';
  } else if (normalized.endsWith('/')) {
    return normalized.replace(/\/+$/g, '');
  } else {
    const idx = normalized.lastIndexOf('/');
    return idx > 0 ? normalized.substring(0, idx) : '/';
  }
}

/** Get the filename portion of a path.
 * If path ends with '/', returns an empty string.
 * If path is a file, returns the filename.
 */
export function filename(path: string): string {
  if (!path) return '';
  const normalized = path.replace(/\\/g, '/');
  if (normalized.endsWith('/')) {
    return '';
  } else {
    const idx = normalized.lastIndexOf('/');
    return idx >= 0 ? normalized.substring(idx + 1) : normalized;
  }
}
