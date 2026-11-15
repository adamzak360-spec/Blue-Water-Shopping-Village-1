import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Archive, Clapperboard, FilePlus2, FolderOpen, LayoutDashboard, Loader2, Plus, Save, Settings2, Sparkles, Trash2, Video, WandSparkles } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import './ReliableContentStudio.css'

type ProjectType = 'video' | 'advertisement' | 'graphic' | 'voiceover'
type ProjectStatus = 'draft' | 'rendering' | 'completed' | 'archived'
type AspectRatio = '9:16' | '1:1' | '4:5' | '16:9'

type ContentProject = {
  id: string
  owner_id: string
  name: string
  description: string
  project_type: ProjectType
  status: ProjectStatus
  aspect_ratio: AspectRatio
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

const projectTypeLabels: Record<ProjectType, string> = {
  video: 'Video project',
  advertisement: 'Animated advertisement',
  graphic: 'Social graphic',
  voiceover: 'Voiceover project',
}

const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(value))

const escapeSvgText = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[character] || character))

const graphicDimensions: Record<AspectRatio, { width: number; height: number }> = {
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
  '16:9': { width: 1920, height: 1080 },
}

const buildGraphicSvg = (title: string, subtitle: string, cta: string, aspectRatio: AspectRatio) => {
  const { width, height } = graphicDimensions[aspectRatio]
  const safeTitle = escapeSvgText(title || 'Your next big idea starts here')
  const safeSubtitle = escapeSvgText(subtitle || 'Professional digital solutions for ambitious businesses.')
  const safeCta = escapeSvgText(cta || 'Message Reliable today')
  const titleSize = aspectRatio === '16:9' ? 76 : aspectRatio === '1:1' ? 70 : 66
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="bg" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#062d50"/><stop offset=".62" stop-color="#075f87"/><stop offset="1" stop-color="#0aa6c2"/></linearGradient><radialGradient id="glow"><stop stop-color="#ffc400" stop-opacity=".9"/><stop offset="1" stop-color="#ffc400" stop-opacity="0"/></radialGradient></defs><rect width="${width}" height="${height}" fill="url(#bg)"/><circle cx="${width * .88}" cy="${height * .1}" r="${Math.min(width, height) * .24}" fill="url(#glow)" opacity=".72"/><circle cx="${width * .06}" cy="${height * .94}" r="${Math.min(width, height) * .3}" fill="#10b8cf" opacity=".18"/><path d="M0 ${height * .78} C${width * .3} ${height * .68},${width * .55} ${height * .9},${width} ${height * .72} L${width} ${height} L0 ${height}Z" fill="#041f3b" opacity=".72"/><text x="${width * .09}" y="${height * .13}" fill="#ffc400" font-family="Arial,sans-serif" font-size="${Math.max(34, width * .032)}" font-weight="800" letter-spacing="5">RELIABLE</text><text x="${width * .09}" y="${height * .39}" fill="#ffffff" font-family="Arial,sans-serif" font-size="${titleSize}" font-weight="900"><tspan x="${width * .09}" dy="0">${safeTitle.slice(0, 30)}</tspan><tspan x="${width * .09}" dy="${titleSize * 1.18}">${safeTitle.slice(30, 60)}</tspan></text><text x="${width * .09}" y="${height * .57}" fill="#d9f6fb" font-family="Arial,sans-serif" font-size="${Math.max(28, width * .026)}" font-weight="500"><tspan x="${width * .09}" dy="0">${safeSubtitle.slice(0, 48)}</tspan><tspan x="${width * .09}" dy="${Math.max(40, width * .04)}">${safeSubtitle.slice(48, 96)}</tspan></text><rect x="${width * .09}" y="${height * .78}" width="${width * .48}" height="${Math.max(70, width * .07)}" rx="${Math.max(18, width * .018)}" fill="#ffc400"/><text x="${width * .33}" y="${height * .825}" text-anchor="middle" fill="#123957" font-family="Arial,sans-serif" font-size="${Math.max(25, width * .024)}" font-weight="800">${safeCta.slice(0, 28)}</text><text x="${width * .09}" y="${height * .94}" fill="#ffffff" font-family="Arial,sans-serif" font-size="${Math.max(22, width * .02)}" font-weight="700">RPM SOFTWARE SERVICES  ·  RELIABLE PREMIUM MARKETPLACE</text></svg>`
}

export default function ReliableContentStudio() {
  const { user, role, isLoading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [projects, setProjects] = useState<ContentProject[]>([])
  const [selectedProject, setSelectedProject] = useState<ContentProject | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [projectType, setProjectType] = useState<ProjectType>('video')
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16')
  const [graphicTitle, setGraphicTitle] = useState('Build better. Grow faster.')
  const [graphicSubtitle, setGraphicSubtitle] = useState('Professional digital solutions for ambitious businesses.')
  const [graphicCta, setGraphicCta] = useState('Message Reliable today')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [authorized, setAuthorized] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const stats = useMemo(() => ({
    total: projects.length,
    drafts: projects.filter(project => project.status === 'draft').length,
    completed: projects.filter(project => project.status === 'completed').length,
    rendering: projects.filter(project => project.status === 'rendering').length,
  }), [projects])

  const graphicPreviewUrl = useMemo(() => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildGraphicSvg(graphicTitle, graphicSubtitle, graphicCta, aspectRatio))}`, [aspectRatio, graphicCta, graphicSubtitle, graphicTitle])

  const loadProjects = useCallback(async () => {
    if (!supabase || !user) return
    setLoading(true)
    setError('')
    try {
      const { data: access, error: accessError } = await supabase.rpc('can_access_content_studio')
      if (accessError) throw accessError
      if (!access) {
        setAuthorized(false)
        return
      }
      setAuthorized(true)

      const { data, error: projectsError } = await supabase
        .from('content_projects')
        .select('id, owner_id, name, description, project_type, status, aspect_ratio, settings, created_at, updated_at')
        .order('updated_at', { ascending: false })
        .limit(50)
      if (projectsError) throw projectsError
      setProjects((data || []) as ContentProject[])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load Content Studio projects.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!authLoading && (!user || role !== 'admin')) navigate('/', { replace: true })
  }, [authLoading, navigate, role, user])

  useEffect(() => {
    void loadProjects()
  }, [loadProjects])

  const startNewProject = () => {
    setSelectedProject(null)
    setName('')
    setDescription('')
    setProjectType('video')
    setAspectRatio('9:16')
    setGraphicTitle('Build better. Grow faster.')
    setGraphicSubtitle('Professional digital solutions for ambitious businesses.')
    setGraphicCta('Message Reliable today')
    setMessage('New project ready. Save it when you are ready.')
    setError('')
  }

  const openProject = (project: ContentProject) => {
    setSelectedProject(project)
    setName(project.name)
    setDescription(project.description)
    setProjectType(project.project_type)
    setAspectRatio(project.aspect_ratio)
    setGraphicTitle(String(project.settings?.graphicTitle || 'Build better. Grow faster.'))
    setGraphicSubtitle(String(project.settings?.graphicSubtitle || 'Professional digital solutions for ambitious businesses.'))
    setGraphicCta(String(project.settings?.graphicCta || 'Message Reliable today'))
    setMessage(`Opened ${project.name}.`)
    setError('')
  }

  const saveProject = async () => {
    if (!supabase || !user || !authorized) return
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Give this project a name before saving.')
      return
    }

    setSaving(true)
    setError('')
    setMessage('')
    try {
      const payload = {
        name: trimmedName,
        description: description.trim(),
        project_type: projectType,
        aspect_ratio: aspectRatio,
        settings: { ...(selectedProject?.settings || {}), graphicTitle, graphicSubtitle, graphicCta },
      }
      const query = selectedProject
        ? supabase.from('content_projects').update(payload).eq('id', selectedProject.id).select('id, owner_id, name, description, project_type, status, aspect_ratio, settings, created_at, updated_at').single()
        : supabase.from('content_projects').insert({ ...payload, owner_id: user.id }).select('id, owner_id, name, description, project_type, status, aspect_ratio, settings, created_at, updated_at').single()
      const { data, error: saveError } = await query
      if (saveError) throw saveError
      const saved = data as ContentProject
      setSelectedProject(saved)
      setProjects(current => selectedProject
        ? current.map(project => project.id === saved.id ? saved : project)
        : [saved, ...current])
      setMessage(`${saved.name} saved successfully.`)
    } catch (saveErrorValue) {
      setError(saveErrorValue instanceof Error ? saveErrorValue.message : 'Unable to save this project.')
    } finally {
      setSaving(false)
    }
  }

  const archiveProject = async (project: ContentProject) => {
    if (!supabase || !window.confirm(`Delete the draft project “${project.name}”?`)) return
    setError('')
    try {
      const { error: deleteError } = await supabase.from('content_projects').delete().eq('id', project.id)
      if (deleteError) throw deleteError
      setProjects(current => current.filter(item => item.id !== project.id))
      if (selectedProject?.id === project.id) startNewProject()
      setMessage(`${project.name} deleted.`)
    } catch (deleteErrorValue) {
      setError(deleteErrorValue instanceof Error ? deleteErrorValue.message : 'Unable to delete this project.')
    }
  }

  const downloadGraphic = async () => {
    const svg = buildGraphicSvg(graphicTitle, graphicSubtitle, graphicCta, aspectRatio)
    const svgUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    const image = new Image()
    image.onload = () => {
      const { width, height } = graphicDimensions[aspectRatio]
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')
      if (!context) return
      context.drawImage(image, 0, 0, width, height)
      URL.revokeObjectURL(svgUrl)
      const link = document.createElement('a')
      link.download = `reliable-content-${aspectRatio.replace(':', 'x')}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      setMessage('High-definition PNG downloaded. Share it as a document when maximum clarity matters.')
    }
    image.onerror = () => { URL.revokeObjectURL(svgUrl); setError('The graphic preview could not be exported.') }
    image.src = svgUrl
  }

  if (authLoading || loading) {
    return <div className="content-studio-state"><Loader2 className="content-studio-spinner" size={30} /><p>Loading Reliable Content Studio…</p></div>
  }

  if (!authorized) {
    return <div className="content-studio-state"><Archive size={34} /><h1>Content Studio access required</h1><p>This private workspace is available only to explicitly authorized platform administrators.</p><Link to="/admin" className="content-studio-button secondary">Return to dashboard</Link></div>
  }

  return (
    <div className="content-studio-page">
      <header className="content-studio-header">
        <div>
          <p className="content-studio-eyebrow"><Clapperboard size={16} /> Reliable admin workspace</p>
          <h1>Reliable Content Studio</h1>
          <p>Create, organize, and prepare professional content for Reliable Premium Marketplace.</p>
        </div>
        <div className="content-studio-header-actions">
          <Link to="/admin" className="content-studio-button secondary"><LayoutDashboard size={17} /> Dashboard</Link>
          <button className="content-studio-button primary" onClick={startNewProject}><Plus size={18} /> New project</button>
        </div>
      </header>

      <div className="content-studio-stat-grid">
        <div><span>Total projects</span><strong>{stats.total}</strong></div>
        <div><span>Drafts</span><strong>{stats.drafts}</strong></div>
        <div><span>Completed</span><strong>{stats.completed}</strong></div>
        <div><span>Rendering</span><strong>{stats.rendering}</strong></div>
      </div>

      {(message || error) && <div className={error ? 'content-studio-notice error' : 'content-studio-notice'} role="status">{error || message}</div>}

      <div className="content-studio-workspace">
        <aside className="content-studio-projects panel">
          <div className="panel-heading"><div><span className="panel-kicker">Workspace</span><h2>My projects</h2></div><button className="icon-button" onClick={startNewProject} title="Create project"><FilePlus2 size={18} /></button></div>
          {projects.length === 0 ? <div className="content-studio-empty"><FolderOpen size={30} /><p>No projects yet.</p><button className="text-button" onClick={startNewProject}>Create your first project</button></div> : <div className="project-list">{projects.map(project => <article className={`project-list-item ${selectedProject?.id === project.id ? 'selected' : ''}`} key={project.id} onClick={() => openProject(project)}><div className="project-list-icon"><Video size={17} /></div><div><strong>{project.name}</strong><span>{projectTypeLabels[project.project_type]}</span><small>{formatDate(project.updated_at)}</small></div><button className="project-delete" onClick={(event) => { event.stopPropagation(); void archiveProject(project) }} aria-label={`Delete ${project.name}`}><Trash2 size={15} /></button></article>)}</div>}
        </aside>

        <main className="content-studio-editor panel">
          <div className="panel-heading"><div><span className="panel-kicker">Project setup</span><h2>{selectedProject ? 'Edit project' : 'Create a new project'}</h2></div><Settings2 size={22} className="panel-heading-icon" /></div>
          <div className="content-studio-preview"><div className="preview-glow" /><WandSparkles size={34} /><h3>Creative workspace ready</h3><p>Start with a clean social graphic, then save its copy inside this project for future video and animation stages.</p><span className="preview-badge"><Sparkles size={14} /> Free HD graphic creator</span></div>
          <section className="content-studio-graphic-tool"><div><span className="panel-kicker">Shareable content</span><h3>Social graphic creator</h3><p>Make a crisp branded visual for WhatsApp, LinkedIn, Facebook, Reels, or Shorts.</p></div><div className="graphic-tool-grid"><div className="graphic-tool-fields"><label>Headline<input value={graphicTitle} onChange={event => setGraphicTitle(event.target.value)} maxLength={60} /></label><label>Supporting message<textarea value={graphicSubtitle} onChange={event => setGraphicSubtitle(event.target.value)} rows={3} maxLength={120} /></label><label>Call to action<input value={graphicCta} onChange={event => setGraphicCta(event.target.value)} maxLength={32} /></label><button className="content-studio-button primary" onClick={() => void downloadGraphic()}><Save size={17} /> Download HD PNG</button></div><div className="graphic-preview-frame"><img src={graphicPreviewUrl} alt="Live social graphic preview" /></div></div></section>
          <div className="content-studio-form"><label>Project name<input value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Christmas marketplace campaign" maxLength={160} /></label><label>Description<textarea value={description} onChange={event => setDescription(event.target.value)} placeholder="Describe the content you want to create…" rows={4} maxLength={2000} /></label><div className="content-studio-form-grid"><label>Project type<select value={projectType} onChange={event => setProjectType(event.target.value as ProjectType)}>{Object.entries(projectTypeLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>Aspect ratio<select value={aspectRatio} onChange={event => setAspectRatio(event.target.value as AspectRatio)}><option value="9:16">9:16 · Reels / Shorts / TikTok</option><option value="1:1">1:1 · Square feed</option><option value="4:5">4:5 · Social feed</option><option value="16:9">16:9 · YouTube</option></select></label></div><div className="content-studio-actions"><button className="content-studio-button primary" onClick={() => void saveProject()} disabled={saving}>{saving ? <Loader2 className="content-studio-spinner" size={17} /> : <Save size={17} />} {saving ? 'Saving…' : 'Save project'}</button>{selectedProject && <button className="content-studio-button secondary" onClick={startNewProject}>Start another project</button>}</div></div>
        </main>
      </div>
    </div>
  )
}
