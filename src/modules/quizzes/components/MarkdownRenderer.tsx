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
    '*': ['className', 'style', 'dir'],
    span: ['className', 'style'],
    div: ['className', 'style'],
    annotation: ['encoding'],
  },
  protocols: {
    ...defaultSchema.protocols,
    href: ['http', 'https', 'mailto', 'tel'],
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
          h1: ({ children }) => <h1 className="text-xl font-bold text-slate-800 mt-4 mb-2 border-b pb-1">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold text-slate-800 mt-3.5 mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-bold text-slate-850 mt-3 mb-1.5">{children}</h3>,
          p: ({ children }) => <p className="text-sm text-slate-700 leading-relaxed my-2">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 pr-5 my-2 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 pr-5 my-2 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="text-sm text-slate-700">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-r-4 border-emerald-400 bg-slate-50 pr-4 pl-2 py-2 my-3 rounded-l-lg text-slate-600 italic">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700 underline font-semibold transition-colors">
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-4 rounded-xl border border-slate-200 shadow-sm bg-white">
              <table className="min-w-full divide-y divide-slate-200 text-sm text-right">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-slate-50 text-slate-700 font-bold">{children}</thead>,
          tbody: ({ children }) => <tbody className="divide-y divide-slate-100 bg-white">{children}</tbody>,
          tr: ({ children }) => <tr className="hover:bg-slate-50/50 transition-colors">{children}</tr>,
          th: ({ children }) => <th className="px-4 py-2 border-b border-slate-200 font-bold">{children}</th>,
          td: ({ children }) => <td className="px-4 py-2 text-slate-650">{children}</td>,
          hr: () => <hr className="my-5 border-t border-slate-200" />,
          img: ({ src, alt }) => (
            <span className="block my-4 text-center">
              <img src={src} alt={alt} className="inline-block max-h-64 object-contain rounded-xl border border-slate-100 shadow-sm bg-slate-50 p-1" />
              {alt && <span className="block text-xs text-slate-400 mt-1 font-semibold">{alt}</span>}
            </span>
          ),
          code({ inline, className: codeClassName, children, ...props }: any) {
            const match = /language-(\w+)/.exec(codeClassName || '');
            const lang = match ? match[1] : '';
            const codeStr = String(children).replace(/\n$/, '');

            if (!inline && lang) {
              // Syntax highlighted code block
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
                    {...props}
                  >
                    {!hasLanguage ? codeStr : undefined}
                  </code>
                </pre>
              );
            }

            // Inline code
            return (
              <code className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-emerald-600 rounded-md font-mono text-xs font-semibold" {...props}>
                {children}
              </code>
            );
          }
        }}
      />
    </div>
  );
}
