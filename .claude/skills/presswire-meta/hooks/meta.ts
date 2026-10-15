export const PLATFORMS = ['devto', 'hashnode', 'substack', 'medium', 'byte2go', 'linkedin']
export const POST = /^(.*)\/published\/(\d+)_([^/]+)\.md$/
export const META = /^(.*)\/published\/(\d+)_([^/]+)\.meta\.json$/

/** Returns a reason string if the meta.json text is wrong, else null. */
export const checkMeta = (text: string, number: number): string | null => {
  let m: any
  try {
    m = JSON.parse(text)
  } catch {
    return 'not valid JSON'
  }
  for (const k of ['title', 'number', 'topic_slug', 'tags', 'published_date', 'platforms'])
    if (!(k in m)) return `missing "${k}"`
  if (m.number !== number) return `"number" is ${m.number} but the filename says ${number}`
  if (!Array.isArray(m.tags)) return '"tags" must be an array'
  for (const [p, v] of Object.entries<any>(m.platforms ?? {})) {
    if (!PLATFORMS.includes(p)) return `unknown platform "${p}" (${PLATFORMS.join(', ')})`
    if (v?.url && !/^https?:\/\//.test(v.url)) return `${p}.url must start with http(s)://`
  }
  return null
}

export const skeleton = (n: number, slug: string, title: string, date: string) =>
  JSON.stringify({ title, number: n, topic_slug: slug, tags: [], published_date: date, platforms: {} }, null, 2) + '\n'
