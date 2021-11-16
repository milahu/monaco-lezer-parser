import { Monaco } from "./monaco.js";

export class Theme {

  cssClassNamePrefix = '';

  /**
   * Load a theme. The theme will be used for ALL monaco editors.
   * A theme provides definitions for both MonacoTreeSitter and Monaco Editor itself.
   *
   * Notice that Monaco Editor doesn't support using different themes in different editor
   * instances, so we don't support it either.
   *
   * Theme config files are in the "themes" directory.
   *
   * @param config The JSON.parse()-ed theme config.
   */
  static load(config) {
    if (Monaco) {
      Monaco.editor.defineTheme("monaco-tree-sitter", config.base);
      Monaco.editor.setTheme("monaco-tree-sitter");
    }

    if (!this.tag) {
      this.tag = document.createElement("style");
      document.head.appendChild(this.tag);
    }

    this.config = config;
    this.tag.innerHTML = this.generateCss();
    this.cssClassNamePrefix = '';
  }

  /**
   * Only monaco-tree-sitter's theme will be generated to CSS.
   */
  static generateCss(classNamePrefix = this.cssClassNamePrefix) {
    return Object.keys(this.config.monacoTreeSitter)
      .map((term) => `span.${this.getClassNameOfTerm(term, classNamePrefix)}{${this.generateStyleOfTerm(term)}}`)
      .join("");
  }

  static generateStyleOfTerm(term) {
    const style = this.config.monacoTreeSitter[term];
    if (!style) return "";
    return typeof style === "string"
      ? `color:${style}`
      : `color:${style.color};${style.extraCssStyles ? style.extraCssStyles : ""}`;
  }

  static getClassNameOfTerm(term, classNamePrefix = this.cssClassNamePrefix) {
    return classNamePrefix + term;
  }

  static getColorOfTerm(term) {
    const style = this.config.monacoTreeSitter[term];
    if (typeof style === "object") {
      return style.color;
    } else {
      return style;
    }
  }
}
