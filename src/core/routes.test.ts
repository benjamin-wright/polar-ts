import { describe, expect, it } from 'vitest';
import { gameUrl, previewerUrl } from './routes';

describe('static game / previewer navigation', () => {
  it.each(['/', '/polar/', '/polar-qa/', '/nested/polar/'])(
    'round trips beneath %s without a redirect loop',
    (root) => {
      const preview = previewerUrl(new URL(`https://example.test${root}?dev&quality=high#demo`));
      expect(preview.href).toBe(`https://example.test${root}dev/?quality=high#demo`);
      const game = gameUrl(preview);
      expect(game.href).toBe(`https://example.test${root}?quality=high#demo`);
      expect(game.searchParams.has('dev')).toBe(false);
    },
  );

  it.each(['/polar', '/polar-qa'])('handles a slashless deployment directory %s', (root) => {
    const preview = previewerUrl(new URL(`https://example.test${root}?dev`));
    expect(preview.pathname).toBe(`${root}/dev/`);
    expect(gameUrl(new URL(`https://example.test${root}/dev?dev`)).href).toBe(
      `https://example.test${root}/`,
    );
  });

  it.each(['/', '/polar/', '/polar-qa/'])('handles explicit index files under %s', (root) => {
    expect(previewerUrl(new URL(`https://example.test${root}index.html?dev=1`)).href).toBe(
      `https://example.test${root}dev/`,
    );
    expect(gameUrl(new URL(`https://example.test${root}dev/index.html?dev=1&dev=2`)).href).toBe(
      `https://example.test${root}`,
    );
  });

  it('does not mutate the source location', () => {
    const source = new URL('https://example.test/polar/index.html?dev#demo');
    previewerUrl(source);
    expect(source.href).toBe('https://example.test/polar/index.html?dev#demo');
  });
});
