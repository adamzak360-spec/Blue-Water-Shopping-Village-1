import { useEffect, useRef } from 'react'
import { useI18n } from '../i18n'
import { informationalContentTranslations } from '../i18n/informationalContent'

const sourceTextByNode = new WeakMap<Text, string>()
const sourceAttributeByElement = new WeakMap<Element, Map<string, string>>()
const translatableAttributes = ['placeholder', 'aria-label', 'title']
const normalize = (value: string) => value.replace(/\s+/g, ' ').trim()

function translateNode(node: Text, language: string) {
  const original = sourceTextByNode.get(node) || node.nodeValue || ''
  sourceTextByNode.set(node, original)
  const key = normalize(original)
  const translated = informationalContentTranslations[language]?.[key]
  if (!translated || !key) return
  const leading = original.match(/^\s*/)?.[0] || ''
  const trailing = original.match(/\s*$/)?.[0] || ''
  node.nodeValue = `${leading}${translated}${trailing}`
}

function translateElement(element: Element, language: string) {
  let originalAttributes = sourceAttributeByElement.get(element)
  if (!originalAttributes) { originalAttributes = new Map(); sourceAttributeByElement.set(element, originalAttributes) }
  for (const attribute of translatableAttributes) {
    const current = element.getAttribute(attribute)
    if (current === null) continue
    const original = originalAttributes.get(attribute) || current
    originalAttributes.set(attribute, original)
    const translated = informationalContentTranslations[language]?.[normalize(original)]
    if (translated) element.setAttribute(attribute, translated)
  }
}

function translateTree(root: HTMLElement, language: string) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let current: Node | null
  while ((current = walker.nextNode())) {
    const text = current as Text
    if (text.parentElement?.closest('[data-no-auto-translate="true"]')) continue
    translateNode(text, language)
  }
  translateElement(root, language)
  root.querySelectorAll('*').forEach(element => translateElement(element, language))
}

export default function LocalizedContent({ children }: { children: React.ReactNode }) {
  const { language } = useI18n()
  const rootRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    translateTree(root, language)
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') translateNode(mutation.target as Text, language)
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE) translateNode(node as Text, language)
          else if (node.nodeType === Node.ELEMENT_NODE) translateTree(node as HTMLElement, language)
        })
      }
    })
    observer.observe(root, { subtree: true, childList: true, characterData: true })
    return () => observer.disconnect()
  }, [language])
  return <div ref={rootRef} className="localized-content-boundary">{children}</div>
}
