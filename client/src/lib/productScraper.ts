// Room Layout Tool — Product URL Scraper
// Fetches a retailer product page via a CORS proxy and uses OpenAI GPT
// to extract furniture name, dimensions, and category.
// The user's OpenAI API key is stored in localStorage and sent directly
// from the browser to the OpenAI API — it never touches any third-party server.

import { FurnitureCategory } from './furniture';

const API_KEY_STORAGE_KEY = 'room-layout-openai-key';

// ─── API Key management ────────────────────────────────────────────────────────

export function getStoredApiKey(): string {
  return localStorage.getItem(API_KEY_STORAGE_KEY) ?? '';
}

export function setStoredApiKey(key: string): void {
  if (key.trim()) {
    localStorage.setItem(API_KEY_STORAGE_KEY, key.trim());
  } else {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
  }
}

export function hasApiKey(): boolean {
  return !!getStoredApiKey();
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ScrapedProduct {
  name: string;
  width_inches: number | null;
  depth_inches: number | null;
  height_inches: number | null;
  category: FurnitureCategory;
  confidence: 'high' | 'medium' | 'low';
  notes: string;
  source_url: string;
}

// ─── CORS proxy list (tried in order) ─────────────────────────────────────────

const CORS_PROXIES = [
  (url: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

async function fetchViaProxy(productUrl: string): Promise<string> {
  let lastError: Error | null = null;

  for (const makeProxyUrl of CORS_PROXIES) {
    try {
      const proxyUrl = makeProxyUrl(productUrl);
      const resp = await fetch(proxyUrl, { signal: AbortSignal.timeout(15000) });
      if (!resp.ok) continue;

      // allorigins returns { contents, status }
      const contentType = resp.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        const data = await resp.json();
        const html: string = data.contents ?? data ?? '';
        if (html && typeof html === 'string' && html.length > 500) {
          return extractText(html);
        }
      } else {
        const html = await resp.text();
        if (html && html.length > 500) {
          return extractText(html);
        }
      }
    } catch (e) {
      lastError = e as Error;
    }
  }

  throw lastError ?? new Error('All CORS proxies failed. The retailer may be blocking automated requests.');
}

function extractText(html: string): string {
  // Extract JSON-LD structured data (often has product name + dimensions)
  const jsonLdMatches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const jsonLdText = jsonLdMatches.map(m => m[1]).join('\n').slice(0, 2000);

  // Extract useful meta tags
  const metaMatches = [...html.matchAll(/<meta[^>]+(name|property)=["']([^"']+)["'][^>]+content=["']([^"']+)["'][^>]*>/gi)];
  const metaText = metaMatches
    .filter(m => /title|description|product|name/i.test(m[2]))
    .map(m => `${m[2]}: ${m[3]}`)
    .join('\n')
    .slice(0, 500);

  // Strip scripts, styles, SVG, and tags
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

  // Find dimension-rich section
  const dimMatch = text.match(/.{0,400}(?:width|depth|height|diameter|overall|dimension|W x D|W x H|\d+["″]\s*[WwDdHh]).{0,400}/i);
  const dimSection = dimMatch ? dimMatch[0] : '';

  const parts = [
    jsonLdText ? `=== Structured Data ===\n${jsonLdText}` : '',
    metaText ? `=== Meta ===\n${metaText}` : '',
    dimSection ? `=== Dimensions ===\n${dimSection}` : '',
    `=== Page Text ===\n${text.slice(0, 4000)}`,
  ].filter(Boolean);

  return parts.join('\n\n').slice(0, 8000);
}

// ─── OpenAI extraction ─────────────────────────────────────────────────────────

async function callOpenAI(pageText: string, productUrl: string, apiKey: string): Promise<ScrapedProduct> {
  const prompt = `You are extracting furniture product information from a retailer webpage for use in a room layout planning tool.

URL: ${productUrl}

Page content (may be truncated):
${pageText}

Extract the following and return ONLY valid JSON (no markdown fences, no explanation):
{
  "name": "Short product name, e.g. 'Rowan Sofa' or 'Parsons Dining Table' (2-4 words, drop color/material)",
  "width_inches": <number or null>,
  "depth_inches": <number or null>,
  "height_inches": <number or null>,
  "category": "one of exactly: bed, seating, storage, desk, table, other",
  "confidence": "high, medium, or low",
  "notes": "brief note, e.g. 'converted from cm' or 'multiple sizes, used smallest'"
}

Rules:
- Width = widest horizontal dimension (left to right when facing the piece)
- Depth = front-to-back dimension (how far it sticks out from a wall)
- Convert cm to inches if needed: divide by 2.54, round to 1 decimal place
- If multiple size options exist, use the first/smallest listed
- If a dimension truly cannot be found, use null
- category must be one of the exact strings listed above`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      max_tokens: 300,
    }),
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Invalid OpenAI API key. Please check your key in Settings.');
    if (response.status === 429) throw new Error('OpenAI rate limit reached. Please try again in a moment.');
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  let content: string = data.choices[0].message.content.trim();

  // Strip markdown code fences if present
  content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

  const parsed = JSON.parse(content);

  // Validate category
  const validCategories: FurnitureCategory[] = ['bed', 'seating', 'storage', 'desk', 'table', 'other'];
  if (!validCategories.includes(parsed.category)) parsed.category = 'other';

  return { ...parsed, source_url: productUrl };
}

// ─── Main export ───────────────────────────────────────────────────────────────

export async function scrapeProductUrl(url: string): Promise<ScrapedProduct> {
  const apiKey = getStoredApiKey();
  if (!apiKey) {
    throw new Error('No OpenAI API key set. Click the ⚙ Settings button to add your key.');
  }

  // Validate URL
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Please enter a valid URL (e.g. https://www.cb2.com/...)');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only http:// and https:// URLs are supported.');
  }

  const pageText = await fetchViaProxy(url);
  return callOpenAI(pageText, url, apiKey);
}
