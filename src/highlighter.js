import { Monaco } from "./monaco.js";

export const terms = [
  "type",
  "scope",
  "function",
  "variable",
  "number",
  "string",
  "comment",
  "constant",
  "directive",
  "control",
  "operator",
  "modifier",
  "punctuation"
];

export function buildHighlightInfo(tree, language) {
  const result = [];

  //console.log('monaco-lezer-parser buildHighlightInfo tree', tree);
  //console.log('monaco-lezer-parser buildHighlightInfo language.simpleTerms', language.simpleTerms);
  //console.log('monaco-lezer-parser buildHighlightInfo language.complexTerms', language.complexTerms);
  //console.log('monaco-lezer-parser buildHighlightInfo language.complexScopes', language.complexScopes);
  language.complexDepth = 10; // TODO?
  //console.log('monaco-lezer-parser buildHighlightInfo language.complexDepth', language.complexDepth);

  // Travel tree and make decorations
  const stack = [];
  //let node = tree.rootNode.firstChild; // tree-sitter
  let node = tree.topNode.firstChild; // lezer-parser
  // depth-first search
  while (stack.length > 0 || node) {
    // Go deeper
    if (node) {
      stack.push(node);
      node = node.firstChild;
    }
    // Go back
    else {
      node = stack.pop();
      //let type = node.type; // tree-sitter: string types?
      //let type = node.type.id; // lezer-parser: numeric types

      let type = node.type.name; // lezer-parser: string types // TODO use numeric types
      // lezer-parser-nix/src/parser.terms.js

      // TODO node.name == node.type.name
      // "node.name: string": Shorthand for "node.type.name" https://lezer.codemirror.net/docs/ref/#common.TreeCursor
      //console.dir({ node });
      //if (!node.isNamed()) type = '"' + type + '"'; // tree-sitter
      if (!node.name) type = '"' + type + '"'; // lezer-parser
      // Simple one-level terms
      let term = null;
      //if (!(type in language.complexTerms)) {
      if (!(language.complexTerms.has(type))) {
        term = language.simpleTerms[type];
        //console.log(`monaco-lezer-parser buildHighlightInfo simple term. type ${type} -> term ${term}`);
      }
      // Complex terms require multi-level analyzes
      else {
        // Build complex scopes
        let desc = type;
        //console.log(`monaco-lezer-parser buildHighlightInfo complex term. type ${type} -> desc ${desc}`);
        let scopes = [desc];
        let parent = node.parent;
        for (let i = 0; i < language.complexDepth && parent; i++) {
          //let parentType = parent.type; // tree-sitter
          //let parentType = parent.type.id; // lezer-parser

          let parentType = parent.type.name; // lezer-parser // TODO use numeric types
          // lezer-parser-nix/src/parser.terms.js

          //if (!parent.isNamed()) parentType = '"' + parentType + '"'; // tree-sitter
          if (!parent.name) parentType = '"' + parentType + '"'; // lezer-parser
          desc = parentType + " > " + desc;
          //console.log(`monaco-lezer-parser buildHighlightInfo complex term child. depth ${i}. parentType ${parentType} -> desc ${desc}`);
          scopes.push(desc);
          parent = parent.parent;
        }
        // If there is also order complexity
        if (language.complexOrder) {
          let index = 0;
          let sibling = node.previousSibling;
          while (sibling) {
            //if (sibling.type === node.type) index++; // tree-sitter
            if (sibling.type.id === node.type.id) index++; // lezer-parser
            sibling = sibling.previousSibling;
          }

          let rindex = -1;
          sibling = node.nextSibling;
          while (sibling) {
            //if (sibling.type === node.type) rindex--; // tree-sitter
            if (sibling.type.id === node.type.id) rindex--; // lezer-parser
            sibling = sibling.nextSibling;
          }

          const orderScopes = [];
          for (let i = 0; i < scopes.length; i++)
            orderScopes.push(scopes[i], scopes[i] + "[" + index + "]", scopes[i] + "[" + rindex + "]");
          scopes = orderScopes;
        }
        // Use most complex scope
        //console.log(`monaco-lezer-parser buildHighlightInfo complex term child. scopes ${scopes}`);
        for (const d of scopes) if (d in language.complexScopes) term = language.complexScopes[d];
      }

      // If term is found add decoration
      if (terms.includes(term)) {
        result.push({ term, node });
      }

      // Go right
      node = node.nextSibling;
    }
  }

  return result;
}

//export function buildDecorations(tree, language) { // tree-sitter
export function buildDecorations(editor, tree, language) { // lezer-parser
  if (!Monaco) throw new TypeError("Please provide the monaco-editor module via provideMonacoModule() first.");

  const decorations = Object.fromEntries(terms.map(term => [term, []]));

  const highlightInfo = buildHighlightInfo(tree, language);

  for (const { term, node } of highlightInfo) {
    //console.log({ term, node })
    // tree-sitter
    /*
    decorations[term].push(
      new Monaco.Range(
        node.startPosition.row + 1,
        node.startPosition.column + 1,
        node.endPosition.row + 1,
        node.endPosition.column + 1
      )
    );
    */
    // lezer-parser
    // transform: index -> lineNumber + column
    // https://github.com/Microsoft/monaco-editor/issues/1359
    // https://stackoverflow.com/questions/55107224

    // debug
    /*
    const startPosition = editor.getModel().getPositionAt(node.cursor.from);
    const endPosition = editor.getModel().getPositionAt(node.cursor.to);
    console.log('node: cursor', node.cursor, 'startPosition', startPosition, 'endPosition', endPosition)
    */

    decorations[term].push(
      Monaco.Range.fromPositions(
        editor.getModel().getPositionAt(node.cursor.from),
        editor.getModel().getPositionAt(node.cursor.to)
      )
    );
  }

  return decorations;
}
