# Agent Guidelines

## Component Architecture

When building or modifying components in this project, adhere to the following architecture rules:

1. **Component Definition**: A component is a function that takes as input a DOM element (HTMLElement or SVGElement) and mounts its logic onto it.
2. **Options and Returns**: The component function can accept an `options` object. It must return a plain object containing methods (e.g., `update(state)`) and an `unmount()` function.

## Tool Limitations

- **NEVER use the browser subagent in this project.**
- **NEVER use the browser subagent in this project.**
