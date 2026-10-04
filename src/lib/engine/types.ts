export interface Note {
  tone: 'plus' | 'minus';
  text: string;
}

export type RejectionCode =
  | 'color'
  | 'pattern'
  | 'formality-gap'
  | 'occasion-formality'
  | 'occasion-category'
  | 'occasion-pattern'
  | 'all-white'
  | 'recent';

export interface Rejection {
  code: RejectionCode;
  text: string;
}

/** What every rule module returns; `evaluatePair` only adds these up. */
export interface RuleResult {
  /** 0–100 for weighted scorers, a signed delta for adjustments. */
  score: number;
  notes: Note[];
  rejections: Rejection[];
}
