const ALLOWED_TAGS = new Set([
  'P', 'H2', 'H3', 'H4', 'UL', 'OL', 'LI', 'STRONG', 'B', 'EM', 'I', 'A', 'BLOCKQUOTE', 'BR', 'IMG', 'HR',
])
const ALLOWED_ATTRIBUTES = new Set(['href', 'src', 'alt', 'title', 'target', 'rel'])

export function sanitizeArticleHtml(html: string) {
  if (typeof DOMParser === 'undefined') return ''
  const document = new DOMParser().parseFromString(html || '', 'text/html')
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT)
  const nodes: Element[] = []
  let current = walker.nextNode()
  while (current) {
    nodes.push(current as Element)
    current = walker.nextNode()
  }

  for (const node of nodes) {
    if (!ALLOWED_TAGS.has(node.tagName)) {
      const parent = node.parentNode
      if (!parent) continue
      while (node.firstChild) parent.insertBefore(node.firstChild, node)
      parent.removeChild(node)
      continue
    }

    for (const attribute of Array.from(node.attributes)) {
      const name = attribute.name.toLowerCase()
      const value = attribute.value.trim()
      if (name.startsWith('on') || !ALLOWED_ATTRIBUTES.has(name)) {
        node.removeAttribute(attribute.name)
        continue
      }
      if (name === 'href' && !/^(https?:|mailto:|tel:|\/|#)/i.test(value)) node.removeAttribute(attribute.name)
      if (name === 'src' && !/^https?:\/\//i.test(value)) node.removeAttribute(attribute.name)
    }

    if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
      node.setAttribute('rel', 'noopener noreferrer')
    }
  }

  return document.body.innerHTML
}

export function estimateReadingTime(html: string) {
  const plainText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return Math.max(1, Math.ceil(plainText.split(' ').filter(Boolean).length / 220))
}

export function addFormattingTag(value: string, tag: 'strong' | 'em' | 'h2' | 'h3' | 'ul' | 'ol' | 'blockquote') {
  const clean = value.trim()
  if (!clean) return value
  if (tag === 'ul' || tag === 'ol') return `<${tag}><li>${clean.replace(/\n+/g, '</li><li>')}</li></${tag}>`
  return `<${tag}>${clean}</${tag}>`
}
