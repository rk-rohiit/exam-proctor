// screenChange.ts — Fullscreen exit, copy/paste, right-click detection

export interface ScreenChangeResult {
  exitedFullscreen: boolean;
  copyPasteAttempt: boolean;
  rightClickAttempt: boolean;
}

type ScreenEventCallback = (type: 'FULLSCREEN_EXIT' | 'COPY_PASTE' | 'RIGHT_CLICK') => void;

let onEventCallback: ScreenEventCallback | null = null;
let registered = false;
let fullscreenActive = false;

function handleFullscreenChange() {
  const isFs = !!document.fullscreenElement;
  if (fullscreenActive && !isFs) {
    // Was fullscreen, now isn't — violation
    if (onEventCallback) onEventCallback('FULLSCREEN_EXIT');
  }
  fullscreenActive = isFs;
}

function handleCopy(e: Event) {
  e.preventDefault();
  if (onEventCallback) onEventCallback('COPY_PASTE');
}

function handlePaste(e: Event) {
  e.preventDefault();
  if (onEventCallback) onEventCallback('COPY_PASTE');
}

function handleContextMenu(e: Event) {
  e.preventDefault();
  if (onEventCallback) onEventCallback('RIGHT_CLICK');
}

function handleKeydown(e: KeyboardEvent) {
  // Block common shortcuts: PrintScreen, F12 devtools, Ctrl+C/V/U/S
  const blocked = [
    e.key === 'PrintScreen',
    e.key === 'F12',
    e.ctrlKey && ['c', 'v', 'u', 's', 'p', 'a'].includes(e.key.toLowerCase()),
    e.metaKey && ['c', 'v', 'u', 's'].includes(e.key.toLowerCase()),
  ];
  if (blocked.some(Boolean)) {
    e.preventDefault();
    if ((e.ctrlKey || e.metaKey) && ['c', 'v'].includes(e.key.toLowerCase())) {
      if (onEventCallback) onEventCallback('COPY_PASTE');
    }
  }
}

export function initScreenChangeDetection(onEvent: ScreenEventCallback) {
  if (registered) return;
  onEventCallback = onEvent;
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('copy', handleCopy);
  document.addEventListener('paste', handlePaste);
  document.addEventListener('contextmenu', handleContextMenu);
  document.addEventListener('keydown', handleKeydown);
  registered = true;
  console.log('[ML] Screen change detection initialized');
}

export function requestFullscreen(element: HTMLElement = document.documentElement): Promise<void> {
  fullscreenActive = true;
  return element.requestFullscreen();
}

export function stopScreenChangeDetection() {
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
  document.removeEventListener('copy', handleCopy);
  document.removeEventListener('paste', handlePaste);
  document.removeEventListener('contextmenu', handleContextMenu);
  document.removeEventListener('keydown', handleKeydown);
  onEventCallback = null;
  registered = false;
  fullscreenActive = false;
}
