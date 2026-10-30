import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import Prism from 'prismjs';
import { useEffect } from 'react';

// Import Prism language components
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';
import 'prismjs/themes/prism-tomorrow.css';
import 'katex/dist/katex.min.css';

// Customize rehype-sanitize schema to allow math and code styling tags/classes
const customSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames || []),
    'math', 'semantics', 'mrow', 'msup', 'msub', 'mi', 'mo', 'mn', 'annotation', 'mtext', 
    'mspace', 'mfrac', 'msqrt', 'mroot', 'mover', 'munder', 'msubsup', 'code', 'span', 'div'
  ],
  attributes: {
    ...defaultSchema.attributes,
    '*': [...(defaultSchema.attributes?.['*'] || []), 'className', 'style', 'dir'],
    span: ['className', 'style'],
    div: ['className', 'style'],
    annotation: ['encoding'],
    img: ['src', 'alt', 'title', 'width', 'height', 'className', 'style', 'referrerPolicy', 'loading'],
  },
  protocols: {
    ...defaultSchema.protocols,
    href: ['http', 'https', 'mailto', 'tel'],
    src: ['http', 'https', 'data'],
  }
};

interface Props {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = '' }: Props) {
  useEffect(() => {
    // Re-run prism highlighting on render
    Prism.highlightAll();
  }, [content]);

  return (
    <div className={`prose max-w-none text-slate-800 select-text ${className}`} style={{ direction: 'rtl', textAlign: 'right' }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          [rehypeSanitize, customSchema],
          rehypeKatex
        ]}
        components={{
          h1: ({ children }: any) => <h1 className="text-xl font-bold text-slate-800 mt-4 mb-2 border-b pb-1">{children}</h1>,
          h2: ({ children }: any) => <h2 className="text-lg font-bold text-slate-800 mt-3.5 mb-2">{children}</h2>,
          h3: ({ children }: any) => <h3 className="text-base font-bold text-slate-850 mt-3 mb-1.5">{children}</h3>,
          p: ({ children }: any) => <p className="text-sm text-slate-700 leading-relaxed my-2">{children}</p>,
          ul: ({ children }: any) => <ul className="list-disc pl-5 pr-5 my-2 space-y-1">{children}</ul>,
          ol: ({ children }: any) => <ol className="list-decimal pl-5 pr-5 my-2 space-y-1">{children}</ol>,
          li: ({ children }: any) => <li className="text-sm text-slate-700">{children}</li>,
          blockquote: ({ children }: any) => (
            <blockquote className="border-r-4 border-emerald-400 bg-slate-50 pr-4 pl-2 py-2 my-3 rounded-l-lg text-slate-600 italic">
              {children}
            </blockquote>
          ),
          a: ({ href, children }: any) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700 underline font-semibold transition-colors">
              {children}
            </a>
          ),
          table: ({ children }: any) => (
            <div className="overflow-x-auto my-4 rounded-xl border border-slate-200 shadow-sm bg-white">
              <table className="min-w-full divide-y divide-slate-200 text-sm text-right">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }: any) => <thead className="bg-slate-50 text-slate-700 font-bold">{children}</thead>,
          tbody: ({ children }: any) => <tbody className="divide-y divide-slate-100 bg-white">{children}</tbody>,
          tr: ({ children }: any) => <tr className="hover:bg-slate-50/50 transition-colors">{children}</tr>,
          th: ({ children }: any) => <th className="px-4 py-2 border-b border-slate-200 font-bold">{children}</th>,
          td: ({ children }: any) => <td className="px-4 py-2 text-slate-650">{children}</td>,
          hr: () => <hr className="my-5 border-t border-slate-200" />,
          img: ({ src, alt }: any) => (
            <span className="block my-4 text-center">
              <img src={src} alt={alt} referrerPolicy="no-referrer" className="inline-block max-h-64 object-contain rounded-xl border border-slate-100 shadow-sm bg-slate-50 p-1" />
              {alt && <span className="block text-xs text-slate-400 mt-1 font-semibold">{alt}</span>}
            </span>
          ),
          pre: ({ children }: any) => {
            // Extract code element from children
            const codeEl = (children as any);
            const codeClassName = codeEl?.props?.className || '';
            const match = /language-(\w+)/.exec(codeClassName);
            const lang = match ? match[1] : '';
            const codeStr = String(codeEl?.props?.children || '').replace(/\n$/, '');

            if (lang) {
              const hasLanguage = Prism.languages[lang];
              const html = hasLanguage
                ? Prism.highlight(codeStr, Prism.languages[lang], lang)
                : codeStr;

              return (
                <pre className="p-4 bg-slate-900 text-slate-100 rounded-2xl overflow-x-auto font-mono text-sm my-3 shadow-inner relative group select-text">
                  <span className="absolute top-2 left-3 text-[10px] text-slate-500 uppercase font-bold tracking-wider pointer-events-none">{lang}</span>
                  <code
                    className={`language-${lang}`}
                    dangerouslySetInnerHTML={hasLanguage ? { __html: html } : undefined}
                  >
                    {!hasLanguage ? codeStr : undefined}
                  </code>
                </pre>
              );
            }

            return (
              <pre className="p-4 bg-slate-900 text-slate-100 rounded-2xl overflow-x-auto font-mono text-sm my-3 shadow-inner select-text">
                {children}
              </pre>
            );
          },
          code: ({ children, className: codeClassName }: any) => {
            // Inline code only (block code is handled by `pre`)
            const match = /language-(\w+)/.exec(codeClassName || '');
            if (match) return <code className={codeClassName}>{children}</code>;
            return (
              <code className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-emerald-600 rounded-md font-mono text-xs font-semibold">
                {children}
              </code>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
