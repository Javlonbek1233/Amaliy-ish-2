import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTerminalResponse(text: string) {
  return text.split('\n').map(line => `> ${line}`).join('\n');
}
