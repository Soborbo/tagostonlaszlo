import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const irasok = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/irasok' }),
  schema: z.object({
    title: z.string(),
    date: z.string(),
    category: z.string().optional(),
    excerpt: z.string().optional(),
    heroImage: z.string().optional(),
  }),
});

export const collections = { irasok };
