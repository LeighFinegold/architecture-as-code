import { CachingTrackingResolver } from './caching-tracking-resolver';

describe('CachingTrackingResolver', () => {
    it('loads a reference once and caches the result', async () => {
        const loader = vi.fn().mockResolvedValue({ doc: 1 });
        const resolver = new CachingTrackingResolver(loader);

        const first = await resolver.resolve('a');
        const second = await resolver.resolve('a');

        expect(first).toEqual({ doc: 1 });
        expect(second).toBe(first);
        expect(loader).toHaveBeenCalledTimes(1);
    });

    it('tracks resolved references via has() and resolvedReferences', async () => {
        const resolver = new CachingTrackingResolver(vi.fn().mockResolvedValue({}));

        expect(resolver.has('a')).toBe(false);
        await resolver.resolve('a');

        expect(resolver.has('a')).toBe(true);
        expect([...resolver.resolvedReferences]).toEqual(['a']);
    });

    it('exposes the cached raw document via get()', async () => {
        const resolver = new CachingTrackingResolver(vi.fn().mockResolvedValue({ raw: true }));

        await resolver.resolve('a');

        expect(resolver.get('a')).toEqual({ raw: true });
        expect(resolver.get('missing')).toBeUndefined();
    });

    it('marks a reference as seen even when the load fails (no retry for siblings)', async () => {
        const loader = vi.fn().mockRejectedValue(new Error('boom'));
        const resolver = new CachingTrackingResolver(loader);

        await expect(resolver.resolve('a')).rejects.toThrow('boom');

        expect(resolver.has('a')).toBe(true);
        expect(resolver.get('a')).toBeUndefined();
    });

    it('supports pre-seeding seen references via markSeen()', () => {
        const resolver = new CachingTrackingResolver(vi.fn());

        resolver.markSeen('a');

        expect(resolver.has('a')).toBe(true);
    });
});
