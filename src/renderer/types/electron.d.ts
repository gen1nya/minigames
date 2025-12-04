export interface ElectronAPI {
  versions: {
    node: string;
    chrome: string;
    electron: string;
  };
  sendMessage: (channel: string, data: unknown) => void;
  onMessage: (channel: string, callback: (data: unknown) => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
