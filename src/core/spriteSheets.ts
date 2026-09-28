import player from '../../assets/data/player-animation.json';
import walkStudy from '../../assets/data/polar-bear-walk-study.json';
import type { SpriteSheetDefinition } from './animation';

export const spriteSheets: Readonly<Record<string, SpriteSheetDefinition>> = {
  player,
  'walk-study': walkStudy,
};
