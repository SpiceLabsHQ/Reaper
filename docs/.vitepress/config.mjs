import { defineConfig } from "vitepress";

/**
 * Markdown-it plugin that escapes non-standard HTML tags in inline content.
 *
 * The docs contain raw angle-bracket tokens (e.g. <role>, <task>) in plain
 * prose. Markdown-it passes these through as raw HTML, and Vue's SFC parser
 * then fails with "Element is missing end tag". This plugin walks the token
 * stream and converts unrecognized inline HTML to escaped entities.
 */
function escapeNonHtmlTagsPlugin(md) {
  const HTML_TAGS = new Set([
    "a",
    "abbr",
    "address",
    "area",
    "article",
    "aside",
    "audio",
    "b",
    "base",
    "bdi",
    "bdo",
    "blockquote",
    "body",
    "br",
    "button",
    "canvas",
    "caption",
    "cite",
    "code",
    "col",
    "colgroup",
    "data",
    "datalist",
    "dd",
    "del",
    "details",
    "dfn",
    "dialog",
    "div",
    "dl",
    "dt",
    "em",
    "embed",
    "fieldset",
    "figcaption",
    "figure",
    "footer",
    "form",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "head",
    "header",
    "hgroup",
    "hr",
    "html",
    "i",
    "iframe",
    "img",
    "input",
    "ins",
    "kbd",
    "label",
    "legend",
    "li",
    "link",
    "main",
    "map",
    "mark",
    "menu",
    "meta",
    "meter",
    "nav",
    "noscript",
    "object",
    "ol",
    "optgroup",
    "option",
    "output",
    "p",
    "picture",
    "pre",
    "progress",
    "q",
    "rp",
    "rt",
    "ruby",
    "s",
    "samp",
    "script",
    "search",
    "section",
    "select",
    "slot",
    "small",
    "source",
    "span",
    "strong",
    "style",
    "sub",
    "summary",
    "sup",
    "svg",
    "table",
    "tbody",
    "td",
    "template",
    "textarea",
    "tfoot",
    "th",
    "thead",
    "time",
    "title",
    "tr",
    "track",
    "u",
    "ul",
    "var",
    "video",
    "wbr",
  ]);

  function escapeTag(content) {
    return content.replace(
      /<(\/?)([\w-]+)([^>]*)>/g,
      (match, slash, tagName, rest) => {
        if (HTML_TAGS.has(tagName.toLowerCase())) return match;
        return `&lt;${slash}${tagName}${rest}&gt;`;
      },
    );
  }

  // Override the html_inline rule renderer. When markdown-it encounters raw
  // HTML in inline context, it creates html_inline tokens. We intercept those
  // and escape any non-standard tags.
  const defaultHtmlInline =
    md.renderer.rules.html_inline ||
    ((tokens, idx) => tokens[idx].content);

  md.renderer.rules.html_inline = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const tagMatch = token.content.match(/^<\/?(\w+)/);
    if (tagMatch && !HTML_TAGS.has(tagMatch[1].toLowerCase())) {
      return escapeTag(token.content);
    }
    return defaultHtmlInline(tokens, idx, options, env, self);
  };

  // Also handle html_block for standalone raw HTML blocks.
  const defaultHtmlBlock =
    md.renderer.rules.html_block ||
    ((tokens, idx) => tokens[idx].content);

  md.renderer.rules.html_block = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const escaped = escapeTag(token.content);
    if (escaped !== token.content) return escaped;
    return defaultHtmlBlock(tokens, idx, options, env, self);
  };
}

export default defineConfig({
  title: "Reaper",
  description:
    "Ground control for your codebase — autonomous AI agents for software development",
  base: "/reaper/",
  appearance: true,
  srcExclude: ["**/spice/**", "CLAUDE.md"],

  // Existing docs reference ./../README which lives outside the docs tree.
  // Allow these links rather than breaking the build.
  ignoreDeadLinks: [/\.\/\.\.\/README/],

  markdown: {
    config: (md) => {
      md.use(escapeNonHtmlTagsPlugin);
    },
  },

  themeConfig: {
    logo: "/reaper-banner.png",

    nav: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/workflow" },
      { text: "Reference", link: "/agents" },
      {
        text: "GitHub",
        link: "https://github.com/SpiceLabsHQ/reaper",
      },
    ],

    sidebar: [
      {
        text: "Getting Started",
        items: [{ text: "Workflow", link: "/workflow" }],
      },
      {
        text: "Guides",
        items: [
          { text: "Commands", link: "/commands" },
          { text: "Quality Gates", link: "/quality-gates" },
          { text: "Auto-Formatting", link: "/auto-formatting" },
        ],
      },
      {
        text: "Reference",
        items: [
          { text: "Agent Catalog", link: "/agents" },
          { text: "Build System", link: "/build-system" },
        ],
      },
      {
        text: "Advanced",
        items: [
          { text: "Prompt Engineering", link: "/PROMPT_ENGINEERING" },
        ],
      },
    ],

    search: {
      provider: "local",
    },

    socialLinks: [
      { icon: "github", link: "https://github.com/SpiceLabsHQ/reaper" },
    ],

    footer: {
      message: "Built with conviction.",
      copyright: "SpiceLabs",
    },
  },
});
