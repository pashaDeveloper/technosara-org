import { useEffect, useLayoutEffect, useRef, useState } from "react";

function descriptionText(description) {
  const hasTags = /<\/?[a-z][^>]*>/i.test(description);
  if (!hasTags && !/&(?:#\d+|#x[\da-f]+|[a-z]+);/i.test(description)) {
    return description;
  }

  const template = document.createElement("template");
  template.innerHTML = description;
  const blockTags = new Set([
    "ADDRESS", "ARTICLE", "BLOCKQUOTE", "DIV", "H1", "H2", "H3", "H4",
    "H5", "H6", "OL", "P", "PRE", "SECTION", "TR", "UL",
  ]);
  const ignoredTags = new Set(["SCRIPT", "STYLE", "TEMPLATE", "NOSCRIPT"]);

  function read(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return hasTags ? node.textContent.replace(/[\t\r\n ]+/g, " ") : node.textContent;
    }
    if (ignoredTags.has(node.nodeName)) return "";
    if (node.nodeName === "BR") return "\n";

    const content = Array.from(node.childNodes, read).join("");
    if (node.nodeName === "LI") return `\n• ${content.trim()}`;
    return blockTags.has(node.nodeName) ? `\n\n${content.trim()}\n\n` : content;
  }

  return read(template.content).trim();
}

export default function GameDescription({ game, children }) {
  const source = typeof game.description === "string" ? game.description.trim() : "";
  const [description, setDescription] = useState("");
  const textRef = useRef(null);
  const textFrameRef = useRef(null);
  const collapsedHeightRef = useRef(0);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    setDescription(descriptionText(source));
  }, [source]);

  useEffect(() => {
    const text = textRef.current;
    if (!text || expanded) return;
    const measure = () => {
      setOverflowing(text.scrollHeight > text.clientHeight || text.scrollWidth > text.clientWidth);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(text);
    return () => observer.disconnect();
  }, [description, expanded]);

  useLayoutEffect(() => {
    const frame = textFrameRef.current;
    if (!frame || !expanded || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const height = frame.getBoundingClientRect().height;
    const animation = frame.animate([
      { height: `${collapsedHeightRef.current}px`, overflow: "hidden" },
      { height: `${height}px`, overflow: "hidden" },
    ], { duration: 320, easing: "ease-out" });
    return () => animation.cancel();
  }, [expanded]);
  return (
    <section
      className="mb-8 [margin-inline:calc(-1*var(--game-body-gutter))] bg-white px-[var(--game-body-gutter)] py-6"
      aria-labelledby={description ? "game-description-title" : undefined}
    >
      <div className="mx-auto max-w-[1200px]">
        <div className="min-w-0">
          {description && <>
            <h2 id="game-description-title" dir="auto" className="mb-3 text-start text-[clamp(26px,4vw,40px)] font-extrabold text-gray-900">
              {game.title}
            </h2>
            <div ref={textFrameRef} id="game-description-text">
              <div
                ref={textRef}
                className="text-[15px] leading-[1.9] text-gray-700 [overflow-wrap:anywhere] data-[expanded=false]:max-h-[14lh] data-[expanded=false]:overflow-hidden data-[fade=true]:[mask-image:linear-gradient(to_bottom,#000_12lh,transparent_14lh)]"
                data-expanded={expanded}
                data-fade={!expanded && overflowing}
              >
                {description.split(/\r?\n(?:[^\S\r\n]*\r?\n)+/).map((paragraph, index) => (
                  <p key={index} dir="auto" className="mb-3 whitespace-pre-line text-start last:mb-0">{paragraph}</p>
                ))}
              </div>
            </div>
            {overflowing && (
              <button type="button" className="mx-auto mt-2 block font-bold text-pink-800 hover:underline" aria-expanded={expanded}
                aria-controls="game-description-text" onClick={() => {
                  if (!expanded) collapsedHeightRef.current = textFrameRef.current.getBoundingClientRect().height;
                  setExpanded(!expanded);
                }}>
                {expanded ? "کمتر" : "بیشتر"}
              </button>
            )}
          </>}
          {children}
        </div>
      </div>
    </section>
  );
}
