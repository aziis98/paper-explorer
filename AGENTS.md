# Agent Guidelines

## Component Architecture

When building or modifying components in this project, adhere to the following architecture rules:

1. **Component Definition**: A component is a function that takes as input a DOM element (HTMLElement or SVGElement) and mounts its logic onto it.
2. **Options and Returns**: The component function can accept an `options` object. It must return a plain object containing methods (e.g., `update(state)`) and an `unmount()` function.
3. **DOM Querying**: Prefer doing all `querySelector` and similar DOM lookup calls at the root level (e.g., in `main.ts`). Pass these pre-selected elements down the call stack to the components.
4. **State Management**: Global state should be maintained as module-level variables at the orchestration layer (`main.ts`). Components receive state updates via their returned methods.

## Tool Limitations

- **NEVER use the browser subagent in this project.**
- **NEVER use the browser subagent in this project.**
