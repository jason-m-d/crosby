// Tool executor registry — maps tool names to their handler functions.
// This is the groundwork for dynamic tool registration (e.g., user-created specialists).

export type ExecutorFunction = (input: any, ...args: any[]) => Promise<any>

const registry = new Map<string, ExecutorFunction>()

export function registerToolExecutor(name: string, fn: ExecutorFunction) {
  registry.set(name, fn)
}

export function getToolExecutor(name: string): ExecutorFunction | undefined {
  return registry.get(name)
}

export function hasToolExecutor(name: string): boolean {
  return registry.has(name)
}
