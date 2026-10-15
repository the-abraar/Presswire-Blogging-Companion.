export type Rev = number

declare module 'claude-code' {
  interface PluginState {
    'presswire-meta': { rev: Rev }
  }
}
