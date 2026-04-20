'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Code block with sticky copy button ──────────────────────────────────────
function CodeBlock({
  language,
  value,
  inline,
}: {
  language: string;
  value: string;
  inline?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (inline) {
    return (
      <code className="px-1.5 py-0.5 rounded-md bg-white/10 text-yellow-300 text-[0.82em] font-mono">
        {value}
      </code>
    );
  }

  const displayLang = language || 'text';

  return (
    <div className="relative group my-4 rounded-xl overflow-hidden border border-white/10">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-white/8">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-gray-500" />
          <span className="text-xs text-gray-400 font-mono">{displayLang}</span>
        </div>
        {/* Sticky copy — always visible, not just on hover */}
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded-md hover:bg-white/10"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-green-400" />
              <span className="text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy code
            </>
          )}
        </button>
      </div>

      {/* Code */}
      <SyntaxHighlighter
        language={displayLang}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: '1rem',
          background: '#0f0f0f',
          fontSize: '0.8125rem',
          lineHeight: '1.6',
          borderRadius: 0,
        }}
        showLineNumbers={value.split('\n').length > 4}
        lineNumberStyle={{ color: '#444', minWidth: '2.5em', paddingRight: '1em' }}
        wrapLongLines={false}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
}

// ─── Table ────────────────────────────────────────────────────────────────────
function Table({ children }: { children?: React.ReactNode }) {
  return (
    <div className="my-4 overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

function Thead({ children }: { children?: React.ReactNode }) {
  return <thead className="bg-white/5 border-b border-white/10">{children}</thead>;
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider whitespace-nowrap">
      {children}
    </th>
  );
}

function Td({ children }: { children?: React.ReactNode }) {
  return (
    <td className="px-4 py-2.5 text-gray-300 border-t border-white/5 align-top">
      {children}
    </td>
  );
}

function Tr({ children }: { children?: React.ReactNode }) {
  return <tr className="hover:bg-white/3 transition-colors">{children}</tr>;
}

// ─── Blockquote ───────────────────────────────────────────────────────────────
function Blockquote({ children }: { children?: React.ReactNode }) {
  return (
    <blockquote className="my-3 pl-4 border-l-2 border-yellow-400/60 text-gray-400 italic">
      {children}
    </blockquote>
  );
}

// ─── Main renderer ────────────────────────────────────────────────────────────
interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={cn('prose-nimbus text-sm text-gray-100 leading-relaxed', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          // Code blocks
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match && !String(children).includes('\n');
            const value = String(children).replace(/\n$/, '');

            if (isInline) {
              return <CodeBlock language="" value={value} inline />;
            }

            return (
              <CodeBlock
                language={match ? match[1] : ''}
                value={value}
              />
            );
          },

          // Headings
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-white mt-6 mb-3 pb-2 border-b border-white/10">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold text-white mt-5 mb-2.5">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-gray-100 mt-4 mb-2">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-semibold text-gray-200 mt-3 mb-1.5">{children}</h4>
          ),

          // Paragraph
          p: ({ children }) => (
            <p className="text-gray-200 leading-7 mb-3 last:mb-0">{children}</p>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="my-3 space-y-1.5 pl-5 list-none">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-3 space-y-1.5 pl-5 list-decimal marker:text-yellow-400/70">
              {children}
            </ol>
          ),
          li: ({ children, ordered, ...props }: any) => (
            <li className="text-gray-200 leading-relaxed flex gap-2 items-start">
              {!ordered && (
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-yellow-400/70 shrink-0" />
              )}
              <span>{children}</span>
            </li>
          ),

          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
            >
              {children}
            </a>
          ),

          // Strong / em
          strong: ({ children }) => (
            <strong className="font-semibold text-white">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-gray-300">{children}</em>
          ),

          // HR
          hr: () => <hr className="my-5 border-white/10" />,

          // Table
          table: ({ children }) => <Table>{children}</Table>,
          thead: ({ children }) => <Thead>{children}</Thead>,
          th: ({ children }) => <Th>{children}</Th>,
          td: ({ children }) => <Td>{children}</Td>,
          tr: ({ children }) => <Tr>{children}</Tr>,
          tbody: ({ children }) => <tbody>{children}</tbody>,

          // Blockquote
          blockquote: ({ children }) => <Blockquote>{children}</Blockquote>,

          // Pre — handled by code, but prevent double-wrapping
          pre: ({ children }) => <>{children}</>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
