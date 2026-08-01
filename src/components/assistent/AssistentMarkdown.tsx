'use client'

import type { Components } from 'react-markdown'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type Props = {
  content: string
  onNavigate?: (href: string) => void
}

export function AssistentMarkdown({ content, onNavigate }: Props) {
  const components: Components = {
    a({ href, children }) {
      const url = href?.trim() || ''
      if (url.startsWith('/') && onNavigate) {
        return (
          <button
            type="button"
            className="assistent-md__link assistent-md__link--btn"
            onClick={() => onNavigate(url)}
          >
            {children}
          </button>
        )
      }
      return (
        <a
          href={url || undefined}
          className="assistent-md__link"
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </a>
      )
    },
    table({ children }) {
      return (
        <div className="assistent-md__table-wrap">
          <table>{children}</table>
        </div>
      )
    },
  }

  return (
    <div className="assistent-md">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
