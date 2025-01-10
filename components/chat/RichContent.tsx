import { useEffect, useState } from 'react';
import { processRichContent, fetchLinkPreview, type MediaEmbed } from '@/lib/richMedia';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface RichContentProps {
  content: string;
  className?: string;
}

export function RichContent({ content, className }: RichContentProps) {
  const [processedContent, setProcessedContent] = useState<{
    html: string;
    embeds: MediaEmbed[];
  }>({ html: '', embeds: [] });
  const [linkPreviews, setLinkPreviews] = useState<Record<string, any>>({});

  useEffect(() => {
    async function process() {
      const result = await processRichContent(content);
      setProcessedContent(result);

      // Fetch link previews
      const linkEmbeds = result.embeds.filter(embed => embed.type === 'link');
      const previews = await Promise.all(
        linkEmbeds.map(async embed => ({
          url: embed.content,
          preview: await fetchLinkPreview(embed.content)
        }))
      );

      setLinkPreviews(
        previews.reduce((acc, { url, preview }) => ({
          ...acc,
          [url]: preview
        }), {})
      );
    }

    process();
  }, [content]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Rendered markdown content */}
      <div 
        className="prose dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: processedContent.html }} 
      />

      {/* Media embeds */}
      {processedContent.embeds.map((embed, index) => {
        switch (embed.type) {
          case 'image':
            return (
              <div key={index} className="relative w-full aspect-video">
                <Image
                  src={embed.content}
                  alt="Embedded image"
                  fill
                  className="object-contain"
                />
              </div>
            );
          
          case 'video':
            return (
              <video
                key={index}
                src={embed.content}
                controls
                className="w-full rounded-lg"
              />
            );
          
          case 'code':
            return (
              <pre key={index} className="p-4 rounded-lg bg-muted">
                <code className={embed.metadata?.language || ''}>
                  {embed.content}
                </code>
              </pre>
            );
          
          case 'link':
            const preview = linkPreviews[embed.content];
            if (!preview) return null;
            
            return (
              <Card key={index} className="p-4 hover:bg-muted/50 transition-colors">
                <a 
                  href={embed.content}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-4"
                >
                  {preview.image && (
                    <div className="relative w-24 h-24 flex-shrink-0">
                      <Image
                        src={preview.image}
                        alt={preview.title || 'Link preview'}
                        fill
                        className="object-cover rounded-lg"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold truncate">
                      {preview.title || embed.content}
                    </h4>
                    {preview.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {preview.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {embed.content}
                    </p>
                  </div>
                </a>
              </Card>
            );
        }
      })}
    </div>
  );
} 