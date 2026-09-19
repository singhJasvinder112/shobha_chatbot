import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function Markdown({ text, tone }: { text: string; tone: 'user' | 'assistant' }) {
  const components: Components = {
    p: ({ children }) => <p className="mb-2 leading-relaxed last:mb-0">{children}</p>,
    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    ul: ({ children }) => <ul className="mb-2 ml-4 list-disc space-y-1 last:mb-0">{children}</ul>,
    ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal space-y-1 last:mb-0">{children}</ol>,
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    h1: ({ children }) => <h1 className="mb-2 mt-3 text-base font-bold first:mt-0">{children}</h1>,
    h2: ({ children }) => <h2 className="mb-2 mt-3 text-sm font-bold first:mt-0">{children}</h2>,
    h3: ({ children }) => <h3 className="mb-1 mt-2 text-sm font-semibold first:mt-0">{children}</h3>,
    a: ({ children, href }) => (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={`underline underline-offset-2 ${
          tone === 'user' ? 'text-white hover:text-orange-100' : 'text-primary-600 hover:text-primary-700'
        }`}
      >
        {children}
      </a>
    ),
    blockquote: ({ children }) => (
      <blockquote
        className={`mb-2 border-l-2 pl-3 italic last:mb-0 ${
          tone === 'user' ? 'border-white/40' : 'border-primary-300'
        }`}
      >
        {children}
      </blockquote>
    ),
    code: ({ children, className }) => {
      const isBlock = className?.includes('language-');
      if (isBlock) {
        return (
          <code className={`block whitespace-pre-wrap font-mono text-[13px] ${className ?? ''}`}>{children}</code>
        );
      }
      return (
        <code
          className={`rounded px-1 py-0.5 font-mono text-[13px] ${
            tone === 'user' ? 'bg-white/20' : 'bg-primary-50 text-primary-800'
          }`}
        >
          {children}
        </code>
      );
    },
    pre: ({ children }) => (
      <pre
        className={`mb-2 overflow-x-auto rounded-lg p-3 text-[13px] last:mb-0 ${
          tone === 'user' ? 'bg-black/20' : 'bg-stone-900 text-stone-100'
        }`}
      >
        {children}
      </pre>
    ),
    table: ({ children }) => (
      <div className="mb-2 overflow-x-auto last:mb-0">
        <table className="min-w-full border-collapse text-left text-[13px]">{children}</table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className={tone === 'user' ? 'border-b border-white/30' : 'border-b border-border'}>{children}</thead>
    ),
    th: ({ children }) => <th className="whitespace-nowrap px-2 py-1 font-semibold">{children}</th>,
    td: ({ children }) => (
      <td
        className={`whitespace-nowrap px-2 py-1 align-top ${tone === 'user' ? 'border-t border-white/10' : 'border-t border-border'}`}
      >
        {children}
      </td>
    ),
    hr: () => <hr className={`my-2 ${tone === 'user' ? 'border-white/30' : 'border-border'}`} />,
  };

  return (
    <div className="text-sm">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
