import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Copy } from 'lucide-react';
import { cn, copyToClipboard } from '@/lib/utils';

interface CodeBlockProps {
  code: string;
  className?: string;
}

export function CodeBlock({ code, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyToClipboard(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn('relative', className)}>
      <pre className="bg-black/50 border border-zinc-800/60 rounded-lg p-4 pr-24 text-sm font-mono text-emerald-400 leading-relaxed whitespace-pre-wrap break-words">
        <code>{code}</code>
      </pre>
      <Button
        size="sm"
        className={`absolute top-2 right-2 h-8 px-3 transition-all ${
          copied
            ? 'bg-emerald-600 hover:bg-emerald-600 text-white'
            : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200'
        }`}
        onClick={handleCopy}
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 mr-1.5" />
            Copied
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5 mr-1.5" />
            Copy
          </>
        )}
      </Button>
    </div>
  );
}
