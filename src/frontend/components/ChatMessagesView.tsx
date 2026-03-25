import type React from "react";
import type { Message } from "@langchain/langgraph-sdk";
import { ScrollArea } from "./ui/scroll-area";
import { CheckCircle, ChevronDown, ChevronRight, Loader2, Settings } from "lucide-react";
import { InputForm } from "./InputForm";
import { useState, useEffect, useRef, ReactNode, useMemo } from "react";
import { cn } from "../lib/utils";
import { Badge } from "./ui/badge";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import mermaid from "mermaid";
import { TodoListRenderer, isWriteTodosCall, extractTodos } from "./TodoListRenderer";
import type { TodoItem } from "./TodoListRenderer";

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  securityLevel: "loose",
});

let mermaidIdCounter = 0;

function MermaidDiagram({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    const id = `mermaid-${++mermaidIdCounter}`;

    mermaid
      .render(id, chart.trim())
      .then(({ svg: renderedSvg }) => {
        if (!cancelled) setSvg(renderedSvg);
      })
      .catch((err) => {
        if (!cancelled) setError(String(err));
      });

    return () => {
      cancelled = true;
    };
  }, [chart]);

  if (error) {
    return (
      <pre className="bg-red-950/30 border border-red-700/30 p-3 rounded-lg text-xs text-red-300 my-3 overflow-x-auto">
        {chart}
      </pre>
    );
  }

  if (!svg) {
    return (
      <div className="flex items-center gap-2 text-xs text-neutral-500 my-3">
        <Loader2 className="w-3 h-3 animate-spin" />
        Rendering diagram...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-3 overflow-x-auto bg-neutral-900/50 rounded-lg p-4"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

// Markdown component props type from former ReportView
type MdComponentProps = {
  className?: string;
  children?: ReactNode;
  [key: string]: unknown;
};

// Markdown components (from former ReportView.tsx)
const mdComponents = {
  h1: ({ className, children, ...props }: MdComponentProps) => (
    <h1 className={cn("text-2xl font-bold mt-4 mb-2", className)} {...props}>
      {children}
    </h1>
  ),
  h2: ({ className, children, ...props }: MdComponentProps) => (
    <h2 className={cn("text-xl font-bold mt-3 mb-2", className)} {...props}>
      {children}
    </h2>
  ),
  h3: ({ className, children, ...props }: MdComponentProps) => (
    <h3 className={cn("text-lg font-bold mt-3 mb-1", className)} {...props}>
      {children}
    </h3>
  ),
  p: ({ className, children, ...props }: MdComponentProps) => (
    <p className={cn("mb-3 leading-7", className)} {...props}>
      {children}
    </p>
  ),
  a: ({ className, children, href, ...props }: MdComponentProps) => (
    <Badge className="text-xs mx-0.5">
      <a
        className={cn("text-blue-400 hover:text-blue-300 text-xs", className)}
        href={href as string}
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    </Badge>
  ),
  ul: ({ className, children, ...props }: MdComponentProps) => (
    <ul className={cn("list-disc pl-6 mb-3", className)} {...props}>
      {children}
    </ul>
  ),
  ol: ({ className, children, ...props }: MdComponentProps) => (
    <ol className={cn("list-decimal pl-6 mb-3", className)} {...props}>
      {children}
    </ol>
  ),
  li: ({ className, children, ...props }: MdComponentProps) => (
    <li className={cn("mb-1", className)} {...props}>
      {children}
    </li>
  ),
  blockquote: ({ className, children, ...props }: MdComponentProps) => (
    <blockquote
      className={cn(
        "border-l-4 border-neutral-600 pl-4 italic my-3 text-sm",
        className
      )}
      {...props}
    >
      {children}
    </blockquote>
  ),
  code: ({ className, children, ...props }: MdComponentProps) => {
    const match = /language-(\w+)/.exec(className || "");
    const lang = match?.[1];
    const codeText = String(children).replace(/\n$/, "");

    if (lang === "mermaid") {
      return <MermaidDiagram chart={codeText} />;
    }

    return (
      <code
        className={cn(
          "bg-neutral-900 rounded px-1 py-0.5 font-mono text-xs",
          className
        )}
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ className, children, ...props }: MdComponentProps) => {
    const child = children as React.ReactElement<{ className?: string }>;
    if (child?.props?.className?.includes("language-mermaid")) {
      return <>{children}</>;
    }

    return (
      <pre
        className={cn(
          "bg-neutral-900 p-3 rounded-lg overflow-x-auto font-mono text-xs my-3",
          className
        )}
        {...props}
      >
        {children}
      </pre>
    );
  },
  hr: ({ className, ...props }: MdComponentProps) => (
    <hr className={cn("border-neutral-600 my-4", className)} {...props} />
  ),
  table: ({ className, children, ...props }: MdComponentProps) => (
    <div className="my-3 overflow-x-auto">
      <table className={cn("border-collapse w-full", className)} {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ className, children, ...props }: MdComponentProps) => (
    <thead className={cn("bg-neutral-800", className)} {...props}>
      {children}
    </thead>
  ),
  tbody: ({ className, children, ...props }: MdComponentProps) => (
    <tbody className={cn("", className)} {...props}>
      {children}
    </tbody>
  ),
  tr: ({ className, children, ...props }: MdComponentProps) => (
    <tr
      className={cn(
        "border-b border-neutral-700 even:bg-neutral-800 odd:bg-neutral-900",
        className
      )}
      {...props}
    >
      {children}
    </tr>
  ),
  th: ({ className, children, ...props }: MdComponentProps) => (
    <th
      className={cn(
        "border border-neutral-700 px-3 py-2 text-left font-bold bg-neutral-800",
        className
      )}
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ className, children, ...props }: MdComponentProps) => (
    <td
      className={cn("border border-neutral-600 px-3 py-2", className)}
      {...props}
    >
      {children}
    </td>
  ),
  img: ({ className, ...props }: MdComponentProps) => (
    <img className={cn("w-full h-auto", className)} {...props} />
  ),
};

// Props for HumanMessageBubble
interface HumanMessageBubbleProps {
  message: Message;
}

// HumanMessageBubble Component
const HumanMessageBubble: React.FC<HumanMessageBubbleProps> = ({
  message,
}) => {
  return (
    <div
      className={`text-white rounded-3xl break-words min-h-7 bg-neutral-700 max-w-[100%] sm:max-w-[90%] p-3 rounded-br-xs`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
        {typeof message.content === "string"
          ? message.content
          : JSON.stringify(message.content)}
      </ReactMarkdown>
    </div>
  );
};

// Props for AiMessageBubble
interface AiMessageBubbleProps {
  message: Message;
}

// AiMessageBubble Component
const AiMessageBubble: React.FC<AiMessageBubbleProps> = ({
  message,
}) => {
  return (
    <div className={`relative break-words flex flex-col w-full`}>
      <div className="w-full prose prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
          {typeof message.content === "string"
            ? message.content
            : JSON.stringify(message.content)}
        </ReactMarkdown>
      </div>
    </div>
  );
};

interface ChatMessagesViewProps {
  messages: Message[];
  isLoading: boolean;
  scrollAreaRef: React.RefObject<HTMLDivElement | null>;
  onSubmit: (inputValue: string) => void;
  onCancel: () => void;
}

interface AIMessageRendererProps {
  message: Message;
  latestTodos?: TodoItem[];
  skipWriteTodos?: boolean;
}

export function AIMessageRenderer({ message, latestTodos, skipWriteTodos }: AIMessageRendererProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const renderMessage = useMemo(() => {

    const isToolCallStart = message.type === 'ai' && Array.isArray(message?.tool_calls) && message?.tool_calls?.length > 0;
    const isToolCallResult = message.type === 'tool';
    const isNormalMessage = message.type === 'ai' && (!Array.isArray(message?.tool_calls) || message?.tool_calls?.length === 0);

    if (isToolCallStart) {
      const toolCalls = message.tool_calls ?? [];
      const nonTodoToolCalls = toolCalls.filter(tc => !isWriteTodosCall(tc));
      const hasTodoCall = toolCalls.some(tc => isWriteTodosCall(tc));

      const elements: React.ReactNode[] = [];

      if (hasTodoCall && latestTodos && !skipWriteTodos) {
        elements.push(
          <TodoListRenderer key="aggregated-todos" todos={latestTodos} />
        );
      }

      for (let idx = 0; idx < nonTodoToolCalls.length; idx++) {
        const toolCall = nonTodoToolCalls[idx];
        elements.push(
          <div key={`${message.id || 'tc'}-${idx}`} className="bg-blue-900/20 border border-blue-700/30 rounded-lg overflow-hidden w-full min-w-0">
            <button
              onClick={() => toggleExpand(`${message.id}-${idx}`)}
              className="w-full flex items-center justify-between p-4 hover:bg-blue-800/20 transition-colors min-w-0"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Settings className="w-5 h-5 text-blue-400 shrink-0" />
                <div className="text-left min-w-0">
                  <div className="text-sm font-medium text-blue-100 flex items-center gap-2">
                    {toolCall.name}
                    {
                      (toolCall as any).content ? (
                        <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                      ) : (
                        <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
                      )
                    }
                  </div>

                  <div className="text-xs text-blue-200/60">
                    Tool execution
                  </div>
                </div>
              </div>
              {expandedItems.has(`${message.id}-${idx}`) ? (
                <ChevronDown className="w-4 h-4 text-blue-400 shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-blue-400 shrink-0" />
              )}
            </button>

            {expandedItems.has(`${message.id}-${idx}`) && (
              <div className="px-4 pb-4 border-t border-blue-700/20 min-w-0 overflow-hidden">
                <div className="text-xs text-blue-200/60 mb-2">Arguments:</div>
                <pre className="text-xs text-blue-100 bg-blue-950/30 p-2 rounded overflow-auto max-h-60 whitespace-pre-wrap break-all">
                  {JSON.stringify(toolCall.args, null, 2)}
                </pre>
                <div className="text-xs text-blue-200/60 mb-2">
                  {
                    (toolCall as any).content ? 'Result:' : 'Running...:'
                  }
                </div>
                <pre className="text-xs text-green-100 bg-green-950/30 p-2 rounded overflow-auto max-h-60 whitespace-pre-wrap break-all">
                  {JSON.stringify((toolCall as any).content, null, 2)}
                </pre>
              </div>
            )}
          </div>
        );
      }

      if (elements.length === 0) return null;
      return <>{elements}</>;
    }


    if (isToolCallResult) {
      return (
        <>
          <div key={message.id} className="bg-green-900/20 border border-green-700/30 rounded-lg overflow-hidden ml-6 w-full min-w-0">
            <button
              onClick={() => toggleExpand(message.id || '')}
              className="w-full flex items-center justify-between p-3 hover:bg-green-800/20 transition-colors min-w-0"
            >
              <div className="flex items-center gap-3 min-w-0">
                <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                <div className="text-left min-w-0">
                  <div className="text-sm font-medium text-green-100">
                    {message.name} result
                  </div>
                  <div className="text-xs text-green-200/60">
                    Execution completed
                  </div>
                </div>
              </div>
              {expandedItems.has(message.id || '') ? (
                <ChevronDown className="w-4 h-4 text-green-400 shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-green-400 shrink-0" />
              )}
            </button>

            {expandedItems.has(message.id || '') && (
              <div className="px-3 pb-3 border-t border-green-700/20 min-w-0 overflow-hidden">
                <div className="text-xs text-green-200/60 mb-2">Result:</div>
                <pre className="text-xs text-green-100 bg-green-950/30 p-2 rounded overflow-auto max-h-60 whitespace-pre-wrap break-all">
                  {typeof message.content === 'string' ? message.content : JSON.stringify(message.content, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </>
      );
    }

    if (isNormalMessage) {
      return (
        <AiMessageBubble message={message} />
      );
    }

  }, [JSON.stringify(message), expandedItems, latestTodos, skipWriteTodos]);


  return (
    <div className="space-y-1 mb-1 w-full min-w-0">
      {renderMessage}
    </div>
  );
}


export function ChatMessagesView({
  messages,
  isLoading,
  scrollAreaRef,
  onSubmit,
  onCancel,
}: ChatMessagesViewProps) {
  const todoMeta = useMemo(() => {
    let firstTodoIndex = -1;
    let latestTodos: TodoItem[] = [];
    const writeTodosMsgIndices = new Set<number>();

    messages.forEach((msg, idx) => {
      if (msg.type === 'ai' && Array.isArray(msg.tool_calls)) {
        for (const tc of msg.tool_calls) {
          if (isWriteTodosCall(tc)) {
            if (firstTodoIndex === -1) firstTodoIndex = idx;
            writeTodosMsgIndices.add(idx);
            latestTodos = extractTodos(tc);
          }
        }
      }
    });

    return { firstTodoIndex, latestTodos, writeTodosMsgIndices };
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 overflow-y-auto" ref={scrollAreaRef}>
        <div className="p-4 md:p-6 lg:p-8 space-y-1 w-full mx-auto">
          {messages.map((message, index) => {
            if (message.type === 'tool' && message.name === 'write_todos') {
              return null;
            }

            const isFirstTodo = index === todoMeta.firstTodoIndex;
            const isLaterTodo = todoMeta.writeTodosMsgIndices.has(index) && !isFirstTodo;

            return (
              <div key={message.id || `msg-${index}`} className="space-y-3">
                <div
                  className={`flex items-start gap-3 ${message.type === "human" ? "justify-end" : ""
                    }`}
                >
                  {message.type === "human" ? (
                    <HumanMessageBubble
                      message={message}
                    />
                  ) : (
                    <div className="w-full min-w-0">
                      <AIMessageRenderer
                        message={message}
                        latestTodos={isFirstTodo ? todoMeta.latestTodos : undefined}
                        skipWriteTodos={isLaterTodo}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}

        </div>
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-neutral-500 justify-center py-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            Processing...
          </div>
        )}
      </ScrollArea>
      <InputForm
        onSubmit={onSubmit}
        isLoading={isLoading}
        onCancel={onCancel}
        hasHistory={messages.length > 0}
      />
    </div>
  );
}
