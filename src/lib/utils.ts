import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * shadcn-style class merger. Resolves Tailwind class conflicts
 * (e.g. `p-2 p-4` → `p-4`) while preserving conditional values.
 * Used by all shadcn components added in PRs 2–7.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
