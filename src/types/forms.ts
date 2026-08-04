import type { Timestamp } from 'firebase/firestore';

export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'checkbox'; // multi

export interface FormConditionalRule {
  dependsOnFieldId: string;
  /**
   * Only supports string match for the dependent value (e.g. select value equals "yes").
   * For checkbox fields, "equals" matches if the dependent array contains this value.
   */
  equals: string;
}

export interface FormFieldVisibility {
  /**
   * If provided, only users whose `roleIds` intersect this list may see the field.
   * Admins can always see all fields.
   */
  allowedRoleIds?: string[];
  /** If provided, only these user ids may see the field. */
  allowedUserIds?: string[];
}

export interface FormFieldDefinition {
  id: string;
  label: string;
  type: FormFieldType;
  order: number;
  required: boolean;
  options?: string[]; // for select and checkbox
  conditional?: FormConditionalRule;
  visibility?: FormFieldVisibility;
}

export interface FormDefinition {
  id: string;
  title: string;
  description?: string;
  fields: FormFieldDefinition[];
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  /**
   * Link token used by guests to open this form.
   * This is intentionally unguessable (UUID-like).
   */
  publicToken?: string;
  /**
   * Form listing visibility for signed-in users.
   * Guests are handled via publicToken (separate link access).
   */
  allowedRoleIds?: string[];
  allowedUserIds?: string[];
  createdBy?: string;
}

export interface FormPublicLink {
  publicToken: string;
  formId: string;
}

export type FormAnswerValue = string | string[];

export interface FormResponse {
  id: string;
  formId: string;
  formTitleSnapshot?: string;
  submitterEmail: string; // normalized lowercase
  submitterUserId?: string | null; // when submitted by an authenticated user
  /**
   * Answers stored as either string or string[] depending on the field type.
   * Keys are field ids.
   */
  answers: Record<string, FormAnswerValue>;
  lastValidationErrors?: Record<string, string>; // fieldId -> message
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  updatedBy?: 'guest' | 'admin';
}

