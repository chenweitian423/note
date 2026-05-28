"use client";

import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const CODE_LANGUAGES = [
  { value: "text", label: "Plain Text" },
  { value: "bash", label: "Bash" },
  { value: "dockerfile", label: "Dockerfile" },
  { value: "yaml", label: "YAML" },
  { value: "json", label: "JSON" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "sql", label: "SQL" },
  { value: "nginx", label: "Nginx" }
];

function languageFromClassName(className?: string): string {
  return className?.match(/language-([^\s]+)/)?.[1] ?? "text";
}

function CodeBlock({
  className,
  children
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const detectedLanguage = languageFromClassName(className);
  const [language, setLanguage] = useState(detectedLanguage);
  const [copied, setCopied] = useState(false);
  const code = useMemo(() => String(children).replace(/\n$/, ""), [children]);

  async function copyCode() {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(code);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = code;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <figure className="code-block">
      <figcaption className="code-block-toolbar">
        <select
          aria-label="代码类型"
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
        >
          {CODE_LANGUAGES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <button type="button" title="复制代码" aria-label="复制代码" onClick={copyCode}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </figcaption>
      <pre>
        <code className={`language-${language}`}>{code}</code>
      </pre>
    </figure>
  );
}

export function MarkdownView({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children, ...props }) {
          const codeText = String(children);
          const isBlock = Boolean(className) || codeText.includes("\n");
          if (!isBlock) {
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          }
          return <CodeBlock className={className}>{children}</CodeBlock>;
        }
      }}
    >
      {content || " "}
    </ReactMarkdown>
  );
}
