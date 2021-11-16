import { Theme } from "./theme.js";

export let Monaco;

export function provideMonacoModule(module) {
  if (!Monaco) {
    Monaco = module;
    Theme.load(Theme.config);
  }
}
