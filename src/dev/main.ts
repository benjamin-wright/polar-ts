import './style.css';
import { GameLoop } from '../core/GameLoop';
import type { AnimationClip, Facing } from '../core/animation';
import { gameUrl } from '../core/routes';
import { spriteSheets } from '../core/spriteSheets';
import { AnimationPreviewView } from '../render/AnimationPreviewView';
import { loadSpriteSheet } from '../render/spriteAssets';
import { AnimationPreview } from './AnimationPreview';

function element<T extends HTMLElement>(id: string): T {
  const node = document.querySelector<T>(`#${id}`);
  if (!node) throw new Error(`Missing preview control: ${id}`);
  return node;
}

function title(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function options(select: HTMLSelectElement, entries: [string, string][]): void {
  select.replaceChildren(...entries.map(([value, label]) => new Option(label, value)));
}

function showError(error: unknown): void {
  console.error(error);
  const message = element('error');
  message.hidden = false;
  message.textContent = `Could not load the preview. ${error instanceof Error ? error.message : 'Please reload to try again.'}`;
}

async function main(): Promise<void> {
  element<HTMLAnchorElement>('back-to-game').href = gameUrl(new URL(window.location.href)).href;
  const controls = element<HTMLFieldSetElement>('controls');
  const sheetSelect = element<HTMLSelectElement>('sheet');
  const clipSelect = element<HTMLSelectElement>('animation');
  const facingSelect = element<HTMLSelectElement>('facing');
  const frame = element<HTMLInputElement>('frame');
  const speed = element<HTMLInputElement>('speed');
  const zoom = element<HTMLInputElement>('zoom');
  const play = element<HTMLButtonElement>('toggle-play');
  const frameValue = element<HTMLOutputElement>('frame-value');
  const frameReadout = element('frame-readout');
  const speedValue = element<HTMLOutputElement>('speed-value');
  const zoomValue = element<HTMLOutputElement>('zoom-value');
  const playbackState = element('playback-state');
  const poseLabel = element('pose-label');
  const duration = element('duration');

  options(
    sheetSelect,
    Object.entries(spriteSheets).map(([id, definition]) => [id, definition.label]),
  );
  let sheetId = sheetSelect.value;
  let sheet = await loadSpriteSheet(sheetId);
  const preview = new AnimationPreview(sheet.definition);
  const view = await AnimationPreviewView.create(element('preview-stage'));
  import.meta.hot?.dispose(() => view.destroy());

  const syncTransport = (): void => {
    const fps = preview.definition.animations[preview.state.clip].fps;
    frame.max = String(preview.frameCount - 1);
    frame.value = String(preview.frame);
    frameValue.value = `${preview.frame + 1} / ${preview.frameCount}`;
    frameReadout.textContent = `Frame ${preview.frame + 1} of ${preview.frameCount}`;
    frame.setAttribute('aria-valuetext', frameReadout.textContent);
    play.textContent = preview.playing ? 'Pause' : 'Play';
    playbackState.textContent = preview.playing ? 'Playing' : 'Paused';
    poseLabel.textContent = `${title(preview.state.clip)} / ${title(preview.state.facing)}`;
    speedValue.value = `${preview.speed}× · ${fps * preview.speed} fps`;
    zoomValue.value = `${preview.zoom}×`;
    duration.textContent = `${(preview.frameCount / fps / preview.speed).toFixed(2)} s loop`;
  };
  const render = (): void => {
    view.render(sheet, preview.state, preview.zoom);
    syncTransport();
  };
  const syncSheet = (): void => {
    options(
      clipSelect,
      Object.keys(preview.definition.animations).map((clip) => [clip, title(clip)]),
    );
    options(
      facingSelect,
      Object.keys(preview.definition.facings).map((facing) => [facing, title(facing)]),
    );
    clipSelect.value = preview.state.clip;
    facingSelect.value = preview.state.facing;
    element('sheet-title').textContent = preview.definition.label;
    element('asset-name').textContent = preview.definition.image;
  };
  syncSheet();
  controls.disabled = false;

  sheetSelect.addEventListener('change', () => {
    controls.disabled = true;
    const nextId = sheetSelect.value;
    void loadSpriteSheet(nextId)
      .then((next) => {
        sheet = next;
        sheetId = nextId;
        preview.selectSheet(next.definition);
        element('error').hidden = true;
        syncSheet();
      })
      .catch((error: unknown) => {
        sheetSelect.value = sheetId;
        showError(error);
      })
      .finally(() => {
        controls.disabled = false;
      });
  });
  clipSelect.addEventListener('change', () => {
    preview.selectClip(clipSelect.value as AnimationClip);
    render();
  });
  facingSelect.addEventListener('change', () => {
    preview.selectFacing(facingSelect.value as Facing);
    render();
  });
  play.addEventListener('click', () => {
    preview.playing = !preview.playing;
    render();
  });
  element('previous-frame').addEventListener('click', () => {
    preview.step(-1);
    render();
  });
  element('next-frame').addEventListener('click', () => {
    preview.step(1);
    render();
  });
  frame.addEventListener('input', () => {
    preview.scrub(frame.valueAsNumber);
    render();
  });
  speed.addEventListener('input', () => {
    preview.speed = speed.valueAsNumber;
    render();
  });
  zoom.addEventListener('input', () => {
    preview.zoom = zoom.valueAsNumber;
    render();
  });

  const loop = new GameLoop();
  render();
  view.start((dt) => {
    loop.advance(dt, (step) => preview.advance(step));
    render();
  });
}

void main().catch(showError);
