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

  // Travel tree and make decorations
  const stack = [];
  let node = tree.rootNode.firstChild;
  while (stack.length > 0 || node) {
    // Go deeper
    if (node) {
      stack.push(node);
      node = node.firstChild;
    }
    // Go back
    else {
      node = stack.pop();
      let type = node.type;
      if (!node.isNamed()) type = '"' + type + '"';
      // Simple one-level terms
      let term = null;
      if (!(type in language.complexTerms)) {
        term = language.simpleTerms[type];
      }
      // Complex terms require multi-level analyzes
      else {
        // Build complex scopes
        let desc = type;
        let scopes = [desc];
        let parent = node.parent;
        for (let i = 0; i < language.complexDepth && parent; i++) {
          let parentType = parent.type;
          if (!parent.isNamed()) parentType = '"' + parentType + '"';
          desc = parentType + " > " + desc;
          scopes.push(desc);
          parent = parent.parent;
        }
        // If there is also order complexity
        if (language.complexOrder) {
          let index = 0;
          let sibling = node.previousSibling;
          while (sibling) {
            if (sibling.type === node.type) index++;
            sibling = sibling.previousSibling;
          }

          let rindex = -1;
          sibling = node.nextSibling;
          while (sibling) {
            if (sibling.type === node.type) rindex--;
            sibling = sibling.nextSibling;
          }

          const orderScopes = [];
          for (let i = 0; i < scopes.length; i++)
            orderScopes.push(scopes[i], scopes[i] + "[" + index + "]", scopes[i] + "[" + rindex + "]");
          scopes = orderScopes;
        }
        // Use most complex scope
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

export function buildDecorations(tree, language) {
  if (!Monaco) throw new TypeError("Please provide the monaco-editor module via provideMonacoModule() first.");

  const decorations = Object.fromEntries(terms.map(term => [term, []]));

  const highlightInfo = buildHighlightInfo(tree, language);
  for (const { term, node } of highlightInfo) {
    decorations[term].push(
      new Monaco.Range(
        node.startPosition.row + 1,
        node.startPosition.column + 1,
        node.endPosition.row + 1,
        node.endPosition.column + 1
      )
    );
  }

  return decorations;
}
