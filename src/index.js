import lodashDebounce from "lodash.debounce";

import { buildDecorations } from "./highlighter.js";
import { Theme } from "./theme.js";
import { provideMonacoModule } from "./monaco.js";

export * from "./theme.js";
export * from "./language.js";
export * from "./highlighter.js";
export * from "./highlight.js";

function monacoPositionToParserPoint(position) {
  return { row: position.lineNumber, column: position.column };
}

export class MonacoTreeSitter {

  constructor(
    Monaco,
    editor,
    language,
    debounceUpdate = 15
  ) {
    this.editor = editor;
    this.language = language;
    this.monacoDecorationKeys = {};
    provideMonacoModule(Monaco);

    this.tree = language ? language.parser.parse(editor.getValue()) : null;
    console.log('tree', this.tree);
    this.buildHighlightDebounced =
      debounceUpdate == null ? this.buildHighlight : lodashDebounce(this.buildHighlight.bind(this), debounceUpdate);

    const eventListener = editor.getModel().onDidChangeContent(this.onEditorContentChange.bind(this));
    this.dispose = () => {
      eventListener.dispose();
      this.language = this.tree = null;
      this.buildHighlight();
    };

    this.buildHighlight();
  }

  onEditorContentChange(e) {
    console.log('monaco-tree-sitter onEditorContentChange', this.language, e.changes.length);
    if (!this.language) return;
    if (e.changes.length == 0) return;

    for (const change of e.changes) {
      const startIndex = change.rangeOffset;
      const oldEndIndex = change.rangeOffset + change.rangeLength;
      const newEndIndex = change.rangeOffset + change.text.length;
      const startPosition = monacoPositionToParserPoint(this.editor.getModel().getPositionAt(startIndex));
      const oldEndPosition = monacoPositionToParserPoint(this.editor.getModel().getPositionAt(oldEndIndex));
      const newEndPosition = monacoPositionToParserPoint(this.editor.getModel().getPositionAt(newEndIndex));
      this.tree.edit({ startIndex, oldEndIndex, newEndIndex, startPosition, oldEndPosition, newEndPosition });
    }
    this.tree = this.language.parser.parse(this.editor.getValue(), this.tree); // TODO: Don't use getText, use Parser.Input
    
    console.log('tree', this.tree.rootNode.toString());
    this.buildHighlightDebounced(); // TODO: Build highlight incrementally
  }

  buildHighlight() {
    const decorations = this.language ? buildDecorations(this.tree, this.language) : null;

    const monacoDecorations = [];
    if (decorations)
      for (const [term, ranges] of Object.entries(decorations)) {
        const options = {
          inlineClassName: Theme.getClassNameOfTerm(term)
        };
        for (const range of ranges) {
          monacoDecorations.push({ range, options });
        }
      }
    this.monacoDecorationKeys = this.editor.deltaDecorations(this.monacoDecorationKeys, monacoDecorations);
  }

  changeLanguage(language) {
    this.language = language;
    this.tree = language ? language.parser.parse(this.editor.getValue()) : null;
    this.buildHighlight();
  }

  /**
   * Refresh the editor's highlight. Usually called after switching theme.
   */
  refresh() {
    this.buildHighlight();
  }
}
