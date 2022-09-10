export class Language {
  // Parser
  parser;

  /**
   * Load a grammar from a grammar JSON object. Grammar JSON files are in the "grammars" directory.
   *
   * @param grammarJson The `JSON.parse()`-ed object of grammar JSON file.
   * @param parser The web-tree-sitter parser, should be after called `.setLanguage()`. If omitted,
   * `init()` must be called to load a compiled tree-sitter language WASM file.
   */
  constructor(grammarJson) {
    this.simpleTerms = {};
    //this.complexTerms = {};
    this.complexTerms = new Set();
    this.complexScopes = {};
    for (const t in grammarJson.simpleTerms) this.simpleTerms[t] = grammarJson.simpleTerms[t];
    //for (const t in grammarJson.complexTerms) this.complexTerms[t] = grammarJson.complexTerms[t];
    for (const t of grammarJson.complexTerms) this.complexTerms.add(t);
    for (const t in grammarJson.complexScopes) this.complexScopes[t] = grammarJson.complexScopes[t];
    this.complexDepth = 0;
    this.complexOrder = false;
    for (const s in this.complexScopes) {
      const depth = s.split(">").length;
      if (depth > this.complexDepth) this.complexDepth = depth;
      if (s.indexOf("[") >= 0) this.complexOrder = true;
    }
    this.complexDepth--;
    this.parser = null;
  }

  /**
   * Initialize the parser with a tree-sitter language WASM file and web-tree-sitter module.
   */
  /*
  async init(languageWasmPath, Parser) {
    // Initlaize parser
    this.parser = new Parser();
    const language = await Parser.Language.load(languageWasmPath);
    this.parser.setLanguage(language);
  }
  */
  // based on codemirror-lang-nix/src/nix.js
  init(
    LezerParser, // import {parser} from "lezer-parser-nix"
    lezerParserOptions,
  ) {
    this.parser = LezerParser.configure(lezerParserOptions);
  }
}



/*

import {parser} from "lezer-parser-nix"
import {LRLanguage, LanguageSupport,
        delimitedIndent, flatIndent, continuedIndent, indentNodeProp,
        foldNodeProp, foldInside} from "@codemirror/language"
import {styleTags, tags as t} from "@lezer/highlight"
import {completeFromList} from "@codemirror/autocomplete"
//import {snippets} from "./snippets"

// A language provider based on the Lezer nix parser,
// extended with highlighting and indentation information.
export const language = LRLanguage.define({
  parser: lezerParser.configure(lezerParserOptions),

  // TODO monaco
  languageData: {
    commentTokens: {line: "#", block: {open: "/"+"*", close: "*"+"/"}},
    //closeBrackets: {brackets: ["(", "[", "{", '"', "''"]}, // TODO verify ''
    closeBrackets: {brackets: ["(", "[", "{", '"']}, // TODO verify ''
  }

})

  // TODO monaco
const snippets = [
  // trivial. too short for autocomplete
  // {label: "with", type: "keyword"},
  // {label: "let", type: "keyword"},
  // {label: "in", type: "keyword"},
  // {label: "true", type: "keyword"},
  // {label: "false", type: "keyword"},
  // {label: "null", type: "keyword"},
  // {label: "if", type: "keyword"},
  // {label: "then", type: "keyword"},
  // {label: "else", type: "keyword"},
  {label: "import", type: "keyword"},
  {label: "assert", type: "keyword"},
  {label: "stdenv", type: "keyword"},
  {label: "mkDerivation", type: "keyword"},
  {label: "fetchFromGitHub", type: "keyword"},
];

export const completion = language.data.of({
  //autocomplete: ifNotIn(["LineComment", "BlockComment", "String"], completeFromList(snippets)),
  autocomplete: completeFromList(snippets)
})

export function nix() {
  return new LanguageSupport(language, completion)
}

*/
