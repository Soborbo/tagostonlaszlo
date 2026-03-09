import { readFileSync, writeFileSync, existsSync } from 'fs';

const xml = readFileSync('../taacutegostonlaacuteszloacute.WordPress.2026-03-07.xml', 'utf-8');

const items = xml.split('<item>').slice(1);

// Build attachment map: post_id -> filename
const attachments = {};
for (const item of items) {
  const getTag = (tag) => {
    const cdataMatch = item.match(new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`));
    if (cdataMatch) return cdataMatch[1].trim();
    const simpleMatch = item.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
    return simpleMatch ? simpleMatch[1].trim() : '';
  };
  const postType = getTag('wp:post_type');
  if (postType !== 'attachment') continue;
  const postId = getTag('wp:post_id');
  const url = getTag('wp:attachment_url');
  if (postId && url) {
    const filename = url.split('/').pop();
    attachments[postId] = filename;
  }
}

console.log(`${Object.keys(attachments).length} attachment(s) indexed.\n`);

let postCount = 0;

for (const item of items) {
  const getTag = (tag) => {
    const cdataMatch = item.match(new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`));
    if (cdataMatch) return cdataMatch[1].trim();
    const simpleMatch = item.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
    return simpleMatch ? simpleMatch[1].trim() : '';
  };

  const postType = getTag('wp:post_type');
  const status = getTag('wp:status');

  if (postType !== 'post') continue;
  if (status !== 'publish' && status !== 'draft') continue;

  const title = getTag('title');
  const slug = getTag('wp:post_name');
  const dateRaw = getTag('wp:post_date');
  const content = getTag('content:encoded');

  const catMatch = item.match(/<category domain="category"[^>]*><!\[CDATA\[(.*?)\]\]><\/category>/);
  const category = catMatch ? catMatch[1] : '';

  // Get thumbnail_id
  const thumbMatch = item.match(/<wp:meta_key><!\[CDATA\[_thumbnail_id\]\]><\/wp:meta_key>\s*<wp:meta_value><!\[CDATA\[(\d+)\]\]><\/wp:meta_value>/);
  const thumbnailId = thumbMatch ? thumbMatch[1] : null;
  let heroImage = '';
  if (thumbnailId && attachments[thumbnailId]) {
    const imgFile = attachments[thumbnailId];
    if (existsSync(`public/images/posts/${imgFile}`)) {
      heroImage = `/images/posts/${imgFile}`;
    }
  }

  if (!title || !slug) continue;

  // Convert HTML to markdown, preserving inline images
  let md = content
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    // Convert img tags to markdown images with local paths
    .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, (_, src, alt) => {
      const imgFilename = src.split('/').pop();
      if (existsSync(`public/images/posts/${imgFilename}`)) {
        return `![${alt}](/images/posts/${imgFilename})`;
      }
      return `![${alt}](${src})`;
    })
    .replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, (_, src) => {
      const imgFilename = src.split('/').pop();
      if (existsSync(`public/images/posts/${imgFilename}`)) {
        return `![](/images/posts/${imgFilename})`;
      }
      return `![](${src})`;
    })
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, inner) =>
      inner.split('\n').map((l) => `> ${l}`).join('\n')
    )
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#8216;/g, '\u2018')
    .replace(/&#8217;/g, '\u2019')
    .replace(/&#8220;/g, '\u201c')
    .replace(/&#8221;/g, '\u201d')
    .replace(/&#8230;/g, '\u2026')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const excerpt = md.slice(0, 150).replace(/\n/g, ' ').replace(/"/g, "'").trim();
  const dateStr = dateRaw ? dateRaw.split(' ')[0] : '2024-01-01';
  const safeTitle = title.replace(/"/g, '\\"');

  const frontmatter = `---
title: "${safeTitle}"
date: "${dateStr}"
category: "${category}"
excerpt: "${excerpt}"${heroImage ? `\nheroImage: "${heroImage}"` : ''}
---

${md}
`;

  const filename = `src/content/irasok/${slug}.md`;
  writeFileSync(filename, frontmatter);
  postCount++;
  console.log(`✓ ${title} -> ${filename}${heroImage ? ` [kép: ${heroImage}]` : ''}`);
}

console.log(`\nÖsszesen ${postCount} poszt migrálva.`);
