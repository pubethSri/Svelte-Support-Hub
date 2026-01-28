import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn utility', () => {
    it('merges tailwind classes correctly', () => {
        const result = cn('px-2 py-2', 'p-4');
        // p-4 should override px-2 and py-2 in tailwind-merge
        expect(result).toBe('p-4');
    });

    it('handles conditional classes', () => {
        const isActive = true;
        const result = cn('base-class', isActive && 'active-class', !isActive && 'inactive-class');
        expect(result).toContain('base-class');
        expect(result).toContain('active-class');
        expect(result).not.toContain('inactive-class');
    });

    it('handles undefined and null inputs', () => {
        const result = cn('base', undefined, null, 'next');
        expect(result).toBe('base next');
    });
});
