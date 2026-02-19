/**
 * @file utils.js
 * @description General utility functions. Provides `cn()` for merging Tailwind CSS
 * class names with conflict resolution via clsx and tailwind-merge.
 */

import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 