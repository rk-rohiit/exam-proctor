// tabSwitch.ts — Tab / window focus change detection

export interface TabSwitchResult {
  switched: boolean;
  switchCount: number;
  lastSwitchTime: number | null;
}

let switchCount = 0;
let lastSwitchTime: number | null = null;
let onSwitchCallback: (() => void) | null = null;
let registered = false;

function handleVisibilityChange() {
  if (document.hidden) {
    switchCount++;
    lastSwitchTime = Date.now();
    if (onSwitchCallback) onSwitchCallback();
  }
}

function handleBlur() {
  // Window blur also counts as switching away
  switchCount++;
  lastSwitchTime = Date.now();
  if (onSwitchCallback) onSwitchCallback();
}

export function initTabSwitchDetection(onSwitch: () => void) {
  if (registered) return;
  onSwitchCallback = onSwitch;
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('blur', handleBlur);
  registered = true;
  console.log('[ML] Tab switch detection initialized');
}

export function getTabSwitchResult(): TabSwitchResult {
  return {
    switched: switchCount > 0,
    switchCount,
    lastSwitchTime,
  };
}

export function stopTabSwitchDetection() {
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('blur', handleBlur);
  onSwitchCallback = null;
  registered = false;
  switchCount = 0;
  lastSwitchTime = null;
}

export function resetTabSwitchCount() {
  switchCount = 0;
  lastSwitchTime = null;
}
