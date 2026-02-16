'use client';

import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import DOMPurify from 'dompurify';

interface MessageRendererProps {
  content: string;
  className?: string;
}

/**
 * MessageRenderer provides an XSS-safe pipeline for rendering markdown content
 * from the LLM. It uses DOMPurify for sanitization and react-syntax-highlighter
 * for code blocks.
 * 
 * The component handles both inline code and block-level code with syntax highlighting,
 * and provides consistent styling for common markdown elements like lists, headers,
 * and blockquotes using Tailwind CSS.
 */
export function MessageRenderer({ content, className }: MessageRendererProps) {
  const [sanitizedContent, setSanitizedContent] = useState(content);

  useEffect(() => {
    // Sanitize content on the client side to prevent XSS.
    // DOMPurify is used here to ensure any HTML injected into the markdown
    // is safely handled before ReactMarkdown processes it.
    // This is especially important when dealing with LLM-generated content
    // that might contain unexpected HTML tags.
    if (typeof window !== 'undefined') {
      setSanitizedContent(DOMPurify.sanitize(content));
    }
  }, [content]);

  return (
    <div className={`text-sm sm:text-base break-words ${className || ''}`}>
      <ReactMarkdown
        components={{
          // Custom renderer for code blocks and inline code
          code({ children, className, node, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match;

            if (isInline) {
              return (
                <code 
                  className="bg-muted px-1.5 py-0.5 rounded-sm font-mono text-[0.9em] font-medium" 
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <div className="my-4 rounded-md overflow-hidden border border-border">
                <SyntaxHighlighter
                  style={vscDarkPlus}
                  language={match[1]}
                  PreTag="div"
                  customStyle={{
                    margin: 0,
                    padding: '1rem',
                    fontSize: '0.875rem',
                    lineHeight: '1.5',
                    backgroundColor: 'transparent',
                  }}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              </div>
            );
          },
          // Custom styling for common markdown elements
          p({ children }) {
            return <p className="mb-4 last:mb-0 leading-relaxed">{children}</p>;
          },
          ul({ children }) {
            return <ul className="list-disc pl-6 mb-4 space-y-1">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal pl-6 mb-4 space-y-1">{children}</ol>;
          },
          li({ children }) {
            return <li className="mb-1">{children}</li>;
          },
          h1({ children }) {
            return <h1 className="text-2xl font-bold mb-4 mt-6">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-xl font-bold mb-3 mt-5">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-lg font-bold mb-2 mt-4">{children}</h3>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-primary/30 pl-4 italic my-4 text-muted-foreground">
                {children}
              </blockquote>
            );
          },
          a({ children, href }) {
            return (
              <a 
                href={href} 
                className="text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            );
          },
          hr() {
            return <hr className="my-6 border-t border-border" />;
          }
        }}
      >
        {sanitizedContent}
      </ReactMarkdown>
    </div>
  );
}
