import { Languages } from 'lucide-react'
import { LANGUAGES, useI18n } from '../i18n'
import './LanguageSelector.css'

export default function LanguageSelector() {
  const { language, setLanguage, t } = useI18n()
  return (
    <label className="language-selector">
      <Languages size={17} aria-hidden="true" />
      <span className="visually-hidden">{t('language')}</span>
      <select value={language} onChange={(event) => setLanguage(event.target.value as typeof language)} aria-label={t('language')}>
        {LANGUAGES.map(({ code, nativeName }) => <option key={code} value={code}>{nativeName}</option>)}
      </select>
    </label>
  )
}
