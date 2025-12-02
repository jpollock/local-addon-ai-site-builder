/**
 * Electron Context - Store electron reference for components to access
 *
 * Local's CreateSite flow components don't receive electron via props,
 * so we store it globally when the renderer initializes.
 */

let electronInstance: any = null;

export function setElectron(electron: any) {
  electronInstance = electron;
}

export function getElectron(): any {
  if (!electronInstance) {
    // Try to get from window as fallback
    electronInstance = (window as any).electron;
  }

  if (!electronInstance) {
    throw new Error('Electron not initialized. Please ensure the addon is loaded correctly.');
  }

  return electronInstance;
}

export function hasElectron(): boolean {
  return !!electronInstance || !!(window as any).electron;
}
