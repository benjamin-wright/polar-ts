import playerSheetUrl from '../../assets/sprites/polar-bear-cub.png?url';
import { spriteSheets } from '../core/spriteSheets';
import { SpriteSheet } from './sprites';

const imageUrls: Readonly<Record<string, string>> = { 'polar-bear-cub.png': playerSheetUrl };
const sheets = new Map<string, Promise<SpriteSheet>>();

/** The game and previewer resolve the same Vite-bundled images and metadata. */
export async function loadSpriteSheet(id: string): Promise<SpriteSheet> {
  const definition = spriteSheets[id];
  const url = definition && imageUrls[definition.image];
  if (!url) throw new Error(`No bundled sprite sheet: ${id}`);
  // Re-selecting a sheet reuses its frame textures and source subscriptions.
  let pending = sheets.get(id);
  if (!pending) {
    pending = SpriteSheet.load(definition, url).catch((error: unknown) => {
      sheets.delete(id);
      throw error;
    });
    sheets.set(id, pending);
  }
  return pending;
}
