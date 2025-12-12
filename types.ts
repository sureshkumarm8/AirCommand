export interface IOSDevice {
  id: string;
  name: string;
  model: string;
  osVersion: string;
  ip: string;
  status: 'connected' | 'busy' | 'offline';
  batteryLevel: number;
  currentApp?: string;
  lastScreenshot?: string;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  source: 'User' | 'AI' | 'System';
  message: string;
  type: 'info' | 'success' | 'error' | 'command';
}

export enum ScriptCommand {
  URL = 'url',
  LAUNCH = 'launch',
  KILL = 'kill',
  INSTALL = 'install',
  UNINSTALL = 'uninstall',
  SCREENSHOT = 'screenshot',
  HOME = 'home',
  RESTART = 'restart',
  APPS = 'apps',
  TEXT = 'text',
  QUIT = 'quit'
}

// Map for visualization of command execution
export const CommandDescriptions: Record<ScriptCommand, string> = {
  [ScriptCommand.URL]: 'Opening URL',
  [ScriptCommand.LAUNCH]: 'Launching App',
  [ScriptCommand.KILL]: 'Terminating App',
  [ScriptCommand.INSTALL]: 'Installing IPA',
  [ScriptCommand.UNINSTALL]: 'Uninstalling App',
  [ScriptCommand.SCREENSHOT]: 'Capturing Screen',
  [ScriptCommand.HOME]: 'Navigating Home',
  [ScriptCommand.RESTART]: 'Restarting Device',
  [ScriptCommand.APPS]: 'Listing Apps',
  [ScriptCommand.TEXT]: 'Sending Text Input',
  [ScriptCommand.QUIT]: 'Ending Session'
};