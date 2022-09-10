import lodashDebounce from "lodash.debounce";

import { buildDecorations } from "./highlighter.js";
import { Theme } from "./theme.js";
import { provideMonacoModule } from "./monaco.js";

import { TreeFragment } from "@lezer/common";

export * from "./theme.js";
export * from "./language.js";
export * from "./highlighter.js";
export * from "./highlight.js";

function monacoPositionToParserPoint(position) {
  return { row: position.lineNumber, column: position.column };
}

export class MonacoLezerParser {

  constructor(
    Monaco,
    editor,
    language,
    options = {},
  ) {
    this.editor = editor;
    this.language = language;
    this.monacoDecorationKeys = {};
    this.options = options || {};
    if (this.options.debounceUpdate == undefined) this.options.debounceUpdate = 15;
    this.onUpdateTree = options.onUpdateTree || (() => null);
    provideMonacoModule(Monaco);

    // https://lezer.codemirror.net/docs/guide/#running-the-parser
    // TODO? use parser.startParse + parser.advance
    // an external tokenizer gets access to a stack and can query it to,
    // for example, ask if the current state accepts a given token.
    //
    // TODO use custom Input object, compatible with solidjs store
    // Parsing consumes an Input, which abstracts access to a string-like data structure.
    // You may simply pass a string to parse, in which case the library will do the wrapping itself,
    // but if you have your data in some kind of data structure more involved than a string,
    // you'll need to write your own class that implements Input,
    // so that Lezer can read directly from your data structure,
    // without copying its content into a flat string.

    // initial parse
    console.log(`monaco-lezer-parser constructor: language=${language}`);
    console.log(`monaco-lezer-parser constructor: editor.value=${editor.getValue()}`);
    if (language) {
      this.tree = language.parser.parse(editor.getValue());
      this.fragments = TreeFragment.addTree(this.tree);
    }
    else {
      this.tree = null;
      this.fragments = null;
    }
    this.onUpdateTree(this.tree); // callback
    console.log(`monaco-lezer-parser constructor: debounceUpdate=${this.options.debounceUpdate}`);
    this.buildHighlightDebounced = (!this.options.debounceUpdate
      ? this.buildHighlight // instant update
      : lodashDebounce(this.buildHighlight.bind(this), this.options.debounceUpdate)
    );

    const eventListener = editor.getModel().onDidChangeContent(this.onEditorContentChange.bind(this));
    this.dispose = () => {
      eventListener.dispose();
      this.language = this.tree = null;
      this.buildHighlight();
    };

    console.log(`monaco-lezer-parser constructor: buildHighlight`);
    this.buildHighlight();
  }

  onEditorContentChange(e) {
    console.log('monaco-lezer-parser onEditorContentChange', this.language, e.changes.length);
    if (!this.language) return;
    if (e.changes.length == 0) return;

    console.log('e.changes', e.changes);
    const changes = [];
    e.changes.forEach(change => {
      const { range } = change;
      const c = {
        fromA: change.rangeOffset,
        toA: change.rangeOffset + change.rangeLength,
        fromB: this.editor.getModel().getOffsetAt({ lineNumber: range.startLineNumber, column: range.startColumn }),
        toB: this.editor.getModel().getOffsetAt({ lineNumber: range.endLineNumber, column: range.endColumn }),
      };
      console.log('change', change, 'c', c);
      changes.push(c);
    });

    //this.fragments = TreeFragment.applyChanges(this.fragments, e.changes);
    this.fragments = TreeFragment.applyChanges(this.fragments, changes);
    console.log('editor.value', this.editor.getValue());
    this.tree = this.language.parser.parse(
      this.editor.getValue(), // TODO: Don't use getText, use Parser.Input
      //this.tree,
      this.fragments,
    );
    this.onUpdateTree(this.tree);
    this.buildHighlightDebounced(); // TODO: Build highlight incrementally
    return;

/*
let ranges = [];
if (stepMap) {
  // Normalize entire document to single PM node by substracting start of node
  stepMap.forEach((oldStart, oldEnd, newStart, newEnd) => ranges.push({fromA: oldStart - pos, toA: oldEnd - pos, fromB: newStart - pos, toB: newEnd - pos}));
}
*/
    /*
    for (const change of e.changes) {
      const startIndex = change.rangeOffset;
      const oldEndIndex = change.rangeOffset + change.rangeLength;
      const newEndIndex = change.rangeOffset + change.text.length;
      const startPosition = monacoPositionToParserPoint(this.editor.getModel().getPositionAt(startIndex));
      const oldEndPosition = monacoPositionToParserPoint(this.editor.getModel().getPositionAt(oldEndIndex));
      const newEndPosition = monacoPositionToParserPoint(this.editor.getModel().getPositionAt(newEndIndex));

      // tree-sitter
      //this.tree.edit({ startIndex, oldEndIndex, newEndIndex, startPosition, oldEndPosition, newEndPosition });
      // lezer-parser
      // TODO
      console.log('this.tree', this.tree)
      this.tree.edit({ startIndex, oldEndIndex, newEndIndex, startPosition, oldEndPosition, newEndPosition });
    }
    */
    // TODO incremental updates
    // https://lezer.codemirror.net/docs/guide/#incremental-parsing
    // https://lezer.codemirror.net/docs/ref/#common.Incremental_Parsing
    // https://discuss.codemirror.net/t/incremental-syntax-highlighting-with-lezer/3292
    this.tree = this.language.parser.parse(this.editor.getValue(), this.tree); // TODO: Don't use getText, use Parser.Input
    this.onUpdateTree(this.tree);
    this.buildHighlightDebounced(); // TODO: Build highlight incrementally
  }

  buildHighlight() {
    // tree-sitter
    //const decorations = this.language ? buildDecorations(this.tree, this.language) : null;
    // lezer-parser: editor is needed in buildDecorations
    const decorations = this.language ? buildDecorations(this.editor, this.tree, this.language) : null;

    const monacoDecorations = [];
    if (decorations)
      for (const [term, ranges] of Object.entries(decorations)) {
        //console.log(`monaco-lezer-parser buildHighlight: term=${term} class=${Theme.getClassNameOfTerm(term)}`)
        const options = {
          inlineClassName: Theme.getClassNameOfTerm(term)
        };
        for (const range of ranges) {
          console.log(`monaco-lezer-parser buildHighlight: term=${term} range=${range} options=${options}`)
          monacoDecorations.push({ range, options });
        }
      }
    this.monacoDecorationKeys = this.editor.deltaDecorations(this.monacoDecorationKeys, monacoDecorations);
  }

  changeLanguage(language) {
    this.language = language;
    // initial parse
    console.log(`monaco-lezer-parser changeLanguage: language=${language}`);
    console.log(`monaco-lezer-parser changeLanguage: editor.value=${this.editor.getValue()}`);
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
