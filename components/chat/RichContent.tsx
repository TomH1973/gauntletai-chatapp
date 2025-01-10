import { useEffect, useState } from 'react';
import { processRichContent, fetchLinkPreview } from '@/lib/richMedia';
import { Card } from '../ui/card';
import { cn } from '@/lib/utils';
import Image from 'next/image';

/**
 * @interface MediaEmbed
 * @description Type for media embeds in rich content
 */
interface MediaEmbed {
  type: 'image' | 'video' | 'code' | 'link';
  content: string;
  metadata?: Record<string, any>;
}

/**
 * @interface RichContentProps
 * @description Props for the RichContent component
 */
interface RichContentProps {
  /** Raw content string to be processed for rich media */
  content: string;
  /** Optional className for styling */
  className?: string;
}

/**
 * @component RichContent
 * @description A component that processes and renders rich text content with media embeds
 * 
 * Features:
 * - Markdown rendering
 * - Link previews
 * - Media embeds (images, videos, etc.)
 * - Automatic URL detection
 * 
 * @example
 * ```tsx
 * <RichContent
 *   content="Check out this link: https://example.com"
 *   className="message-content"
 * />
 * ```
 */
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
      {processedContent.embeds.map(embed => (
        <Card key={embed.content} className="overflow-hidden">
          {/* Render different types of embeds */}
          {embed.type === 'image' && (
            <Image
              src={embed.content}
              alt="Embedded content"
              width={600}
              height={400}
              className="object-cover"
            />
          )}
          {embed.type === 'link' && linkPreviews[embed.content] && (
            <div className="p-4">
              <h3 className="text-lg font-semibold">
                {linkPreviews[embed.content].title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {linkPreviews[embed.content].description}
              </p>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
} 