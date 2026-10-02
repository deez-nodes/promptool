// Markdown sections -> tagged XML for the model.
// Each markdown heading starts a section; the heading text becomes the tag.
// Text before the first heading is <instructions>. Empty sections are dropped.
// Output format matches toXml: <tag>\nbody\n</tag>, blank line between sections.

export function mdSlugTag(label) {
  const s = String(label == null ? '' : label).toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  if (!s) return 'section'
  if (/^[0-9]/.test(s)) return 's_' + s
  return s
}

export function mdToXml(md) {
  const lines = String(md || '').replace(/\r\n?/g, '\n').split('\n')
  const sections = []
  let cur = { tag: 'instructions', body: [] }
  let fence = false
  for (const line of lines) {
    if (/^\s{0,3}(```|~~~)/.test(line)) {
      fence = !fence
      cur.body.push(line)
      continue
    }
    const m = !fence && /^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/.exec(line)
    if (m) {
      sections.push(cur)
      cur = { tag: mdSlugTag(m[1]), body: [] }
    } else {
      cur.body.push(line)
    }
  }
  sections.push(cur)
  return sections
    .map(s => ({ tag: s.tag, body: s.body.join('\n').replace(/^\n+|\n+$/g, '') }))
    .filter(s => s.body.trim() !== '')
    .map(s => `<${s.tag}>\n${s.body}\n</${s.tag}>`)
    .join('\n\n')
}
