import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkPrism from 'remark-prism';
import { visit } from 'unist-util-visit';
import { Node } from 'unist';

const URL_REGEX = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg'];

interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
}

interface MediaEmbed {
  type: 'image' | 'video' | 'code' | 'link';
  content: string;
  metadata?: Record<string, any>;
}

export async function processRichContent(content: string): Promise<{
  html: string;
  embeds: MediaEmbed[];
}> {
  const embeds: MediaEmbed[] = [];
  
  // Process markdown
  const processor = remark()
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkPrism)
    .use(() => (tree: Node) => {
      visit(tree, 'link', (node: any) => {
        if (URL_REGEX.test(node.url)) {
          const ext = node.url.split('.').pop()?.toLowerCase();
          if (IMAGE_EXTENSIONS.includes(`.${ext}`)) {
            embeds.push({ type: 'image', content: node.url });
          } else if (VIDEO_EXTENSIONS.includes(`.${ext}`)) {
            embeds.push({ type: 'video', content: node.url });
          } else {
            embeds.push({ type: 'link', content: node.url });
          }
        }
      });
      
      visit(tree, 'code', (node: any) => {
        embeds.push({
          type: 'code',
          content: node.value,
          metadata: { language: node.lang }
        });
      });
    });

  const result = await processor.process(content);
  return { html: String(result), embeds };
}

export async function fetchLinkPreview(url: string): Promise<LinkPreview | null> {
  try {
    const response = await fetch(url);
    const html = await response.text();
    
    // Basic metadata extraction
    const title = html.match(/<title>(.*?)<\/title>/i)?.[1];
    const description = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i)?.[1];
    const image = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"[^>]*>/i)?.[1];
    
    return {
      url,
      title: title || undefined,
      description: description || undefined,
      image: image || undefined
    };
  } catch {
    return null;
  }
}

export function isMediaUrl(url: string): boolean {
  const ext = url.split('.').pop()?.toLowerCase();
  return IMAGE_EXTENSIONS.includes(`.${ext}`) || VIDEO_EXTENSIONS.includes(`.${ext}`);
}

export function getMediaType(url: string): 'image' | 'video' | 'link' {
  const ext = url.split('.').pop()?.toLowerCase();
  if (IMAGE_EXTENSIONS.includes(`.${ext}`)) return 'image';
  if (VIDEO_EXTENSIONS.includes(`.${ext}`)) return 'video';
  return 'link';
} 