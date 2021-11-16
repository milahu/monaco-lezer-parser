import { Theme } from "./theme.js";
import { terms, buildHighlightInfo } from "./highlighter.js";

export function escapeHtml(text, escapeQuotes = false) {
  text = text.split("&").join("&amp;").split("<").join("&lt;").split(">").join("&gt;").split(" ").join("&nbsp;");
  if (escapeQuotes) text = text.split('"').join("&quot;");
  return text;
}

/**
 * Highlight some code. This can run without a Monaco Editor.
 *
 * @param code The code to be highlighted.
 * @param language The code's language object.
 * @param useInlineStyle If true, the generated code will use the `style` attribute to set color. No external CSS is needed.
 * @param getCssClassName If not null, use this function to generate the CSS class name for terms.
 */
export function highlight(
  code,
  language,
  useInlineStyle = false,
  getCssClassName
) {
  const tree = language.parser.parse(code);
  const highlightInfo = buildHighlightInfo(tree, language)
    .map(({ term, node }) => ({
      term,
      startIndex: node.startIndex,
      endIndex: node.endIndex
    }))
    .sort((a, b) => a.startIndex - b.startIndex);

  const termCssClassName = useInlineStyle
    ? null
    : Object.fromEntries(
        terms.map(term => [term, getCssClassName ? escapeHtml(getCssClassName(term), true) : `mts-${term}`])
      );

  // TODO: Use a tree-traversal based algorithm to handle nested terms.
  let currentIndex = 0,
    result = "";
  for (const { term, startIndex, endIndex } of highlightInfo) {
    if (startIndex > currentIndex) result += escapeHtml(code.substring(currentIndex, startIndex));
    if (startIndex < currentIndex) continue;

    const text = code.substring(startIndex, endIndex);
    if (useInlineStyle) result += `<span style="${Theme.generateStyleOfTerm(term)}">${escapeHtml(text)}</span>`;
    else result += `<span class="${termCssClassName[term]}">${escapeHtml(text)}</span>`;

    currentIndex = endIndex;
  }

  if (currentIndex !== code.length) result += escapeHtml(code.slice(currentIndex));

  return result.split("\n").join("<br>");
}
