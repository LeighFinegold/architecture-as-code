import { greet } from './index';

test('greet returns a greeting with a name', () => {
    expect(greet('World')).toBe('Hello, World!');
});

test('greet handles an empty name', () => {
    expect(greet('')).toBe('Hello, !');
});
