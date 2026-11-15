import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Archive, Captions, Clapperboard, Download, FilePlus2, Film, FolderOpen, LayoutDashboard, Loader2, Mic2, Plus, Save, Settings2, Sparkles, Trash2, Video, WandSparkles } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import './ReliableContentStudio.css'

type ProjectType = 'video' | 'advertisement' | 'graphic' | 'voiceover'
type ProjectStatus = 'draft' | 'rendering' | 'completed' | 'archived'
type AspectRatio = '9:16' | '1:1' | '4:5' | '16:9'
type ContentScene = { title: string; caption: string; dialogue?: string; visualPrompt?: string }

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

const createContentPlan = (prompt: string, visualStyle: string, setting: string, characters: string, mood: string, dialogue: string): { title: string; subtitle: string; cta: string; scenes: ContentScene[] } => {
  const cleanPrompt = prompt.trim() || 'a practical way to grow your business online'
  const subject = cleanPrompt.length > 62 ? `${cleanPrompt.slice(0, 59)}…` : cleanPrompt
  const visualPrompt = `${visualStyle} scene in a ${setting}, featuring ${characters}, ${mood} mood, no text, no logos`
  const conversation = dialogue.trim() || 'A natural conversation that makes the idea easy to understand.'
  return {
    title: subject.charAt(0).toUpperCase() + subject.slice(1),
    subtitle: `${visualStyle} storytelling in a ${setting}.`,
    cta: 'Follow for more practical ideas',
    scenes: [
      { title: 'The situation', caption: subject, dialogue: conversation, visualPrompt },
      { title: 'The conversation', caption: 'A relatable moment turns the idea into a story people remember.', dialogue: conversation, visualPrompt },
      { title: 'The takeaway', caption: 'End with a clear, useful next step that invites people to respond.', dialogue: conversation, visualPrompt },
    ],
  }
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
  const [videoPrompt, setVideoPrompt] = useState('Create a short video explaining how Reliable Premium Marketplace helps local businesses sell online.')
  const [contentTone, setContentTone] = useState('Clear and confident')
  const [visualStyle, setVisualStyle] = useState('Cartoon illustration')
  const [sceneSetting, setSceneSetting] = useState('a lively neighborhood street')
  const [sceneCharacters, setSceneCharacters] = useState('two friendly young adults')
  const [sceneMood, setSceneMood] = useState('warm, funny, and relatable')
  const [sceneDialogue, setSceneDialogue] = useState('Person A: How will I pay the school fees? Person B: Let us find a simple way forward.')
  const [sceneImageUrl, setSceneImageUrl] = useState('/content-studio-cartoon-school-fees.jpg')
  const [contentPlan, setContentPlan] = useState<ContentScene[]>([])
  const [renderingVideo, setRenderingVideo] = useState(false)
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
    setVideoPrompt('Create a short video explaining how Reliable Premium Marketplace helps local businesses sell online.')
    setContentTone('Clear and confident')
    setVisualStyle('Cartoon illustration')
    setSceneSetting('a lively neighborhood street')
    setSceneCharacters('two friendly young adults')
    setSceneMood('warm, funny, and relatable')
    setSceneDialogue('Person A: How will I pay the school fees? Person B: Let us find a simple way forward.')
    setSceneImageUrl('/content-studio-cartoon-school-fees.jpg')
    setContentPlan([])
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
    setVideoPrompt(String(project.settings?.videoPrompt || 'Create a short video explaining how Reliable Premium Marketplace helps local businesses sell online.'))
    setContentTone(String(project.settings?.contentTone || 'Clear and confident'))
    setVisualStyle(String(project.settings?.visualStyle || 'Cartoon illustration'))
    setSceneSetting(String(project.settings?.sceneSetting || 'a lively neighborhood street'))
    setSceneCharacters(String(project.settings?.sceneCharacters || 'two friendly young adults'))
    setSceneMood(String(project.settings?.sceneMood || 'warm, funny, and relatable'))
    setSceneDialogue(String(project.settings?.sceneDialogue || 'Person A: How will I pay the school fees? Person B: Let us find a simple way forward.'))
    setSceneImageUrl(String(project.settings?.sceneImageUrl || '/content-studio-cartoon-school-fees.jpg'))
    setContentPlan(Array.isArray(project.settings?.contentPlan) ? project.settings.contentPlan as ContentScene[] : [])
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
        settings: { ...(selectedProject?.settings || {}), graphicTitle, graphicSubtitle, graphicCta, videoPrompt, contentTone, visualStyle, sceneSetting, sceneCharacters, sceneMood, sceneDialogue, sceneImageUrl, contentPlan },
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

  const generatePlan = () => {
    const plan = createContentPlan(videoPrompt, visualStyle, sceneSetting, sceneCharacters, sceneMood, sceneDialogue)
    setContentPlan(plan.scenes)
    setGraphicTitle(plan.title)
    setGraphicSubtitle(`${plan.subtitle} Tone: ${contentTone.toLowerCase()}.`)
    setGraphicCta(plan.cta)
    setProjectType('video')
    setMessage('Your content plan is ready. Review the scenes, then render a shareable browser video.')
  }

  const renderBrowserVideo = () => {
    if (!contentPlan.length) {
      setError('Create a content plan first so the video has scenes to render.')
      return
    }
    if (!('MediaRecorder' in window)) {
      setError('This browser does not support video export. Try the latest Chrome, Edge, or Firefox.')
      return
    }
    setRenderingVideo(true)
    setError('')
    const dimensions = graphicDimensions[aspectRatio]
    const scale = Math.min(1, 720 / dimensions.width)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(dimensions.width * scale)
    canvas.height = Math.round(dimensions.height * scale)
    const context = canvas.getContext('2d')
    if (!context) { setRenderingVideo(false); setError('Video canvas could not be created.'); return }
    const sceneImage = new Image()
    sceneImage.src = sceneImageUrl
    const stream = canvas.captureStream(30)
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm'
    const recorder = new MediaRecorder(stream, { mimeType })
    const chunks: BlobPart[] = []
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data) }
    recorder.onstop = () => {
      const link = document.createElement('a')
      link.download = `reliable-content-${Date.now()}.webm`
      link.href = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' }))
      link.click()
      setRenderingVideo(false)
      setMessage('Your browser-rendered video is ready. Upload the WebM directly to supported platforms or convert it to MP4 later.')
    }
    const draw = (elapsed: number) => {
      const progress = Math.min(0.999, elapsed / 6000)
      const scenePosition = progress * contentPlan.length
      const sceneIndex = Math.min(contentPlan.length - 1, Math.floor(scenePosition))
      const scene = contentPlan[sceneIndex]
      const sceneProgress = scenePosition - sceneIndex
      const entrance = Math.min(1, sceneProgress * 5)
      const easedEntrance = 1 - Math.pow(1 - entrance, 3)
      const width = canvas.width
      const height = canvas.height
      const pulse = Math.sin(elapsed / 420)
      if (sceneImage.complete && sceneImage.naturalWidth > 0) {
        const imageScale = Math.max(width / sceneImage.naturalWidth, height / sceneImage.naturalHeight)
        const imageWidth = sceneImage.naturalWidth * imageScale
        const imageHeight = sceneImage.naturalHeight * imageScale
        context.save()
        context.globalAlpha = 0.36
        context.drawImage(sceneImage, (width - imageWidth) / 2, (height - imageHeight) / 2, imageWidth, imageHeight)
        context.restore()
      }
      const gradient = context.createLinearGradient(0, 0, width, height)
      gradient.addColorStop(0, '#041f3b'); gradient.addColorStop(.52, '#075f87'); gradient.addColorStop(1, '#0aa6c2')
      context.fillStyle = gradient; context.fillRect(0, 0, width, height)
      context.fillStyle = 'rgba(255,196,0,.2)'; context.beginPath(); context.arc(width * (.86 + pulse * .025), height * .14, width * (.22 + pulse * .01), 0, Math.PI * 2); context.fill()
      context.fillStyle = 'rgba(35,225,230,.17)'; context.beginPath(); context.arc(width * (.08 - pulse * .03), height * .76, width * .34, 0, Math.PI * 2); context.fill()
      context.save(); context.translate(0, (1 - easedEntrance) * 34)
      context.fillStyle = '#ffc400'; context.font = `800 ${Math.max(18, width * .035)}px Arial`; context.fillText('RELIABLE', width * .09, height * .13)
      context.fillStyle = 'rgba(255,255,255,.16)'; context.fillRect(width * .09, height * .19, width * .82, 2)
      context.fillStyle = 'rgba(255,255,255,.12)'; context.beginPath(); context.roundRect(width * .08, height * .24, width * .84, height * .43, width * .045); context.fill()
      context.strokeStyle = 'rgba(255,255,255,.2)'; context.lineWidth = 2; context.stroke()
      context.fillStyle = '#ffc400'; context.beginPath(); context.arc(width * .17, height * .32, width * .045, 0, Math.PI * 2); context.fill()
      context.fillStyle = '#123957'; context.font = `900 ${Math.max(16, width * .022)}px Arial`; context.textAlign = 'center'; context.fillText(String(sceneIndex + 1).padStart(2, '0'), width * .17, height * .328); context.textAlign = 'left'
      context.globalAlpha = .55 + easedEntrance * .45; context.fillStyle = '#fff'; context.font = `900 ${Math.max(28, width * .065)}px Arial`
      const words = scene.title.split(' '); let line = ''; let y = height * .43
      words.forEach(word => { const test = `${line} ${word}`.trim(); if (context.measureText(test).width > width * .7 && line) { context.fillText(line, width * .13, y); y += width * .085; line = word } else line = test }); context.fillText(line, width * .13, y)
      context.globalAlpha = .78 + easedEntrance * .22; context.fillStyle = '#d9f6fb'; context.font = `500 ${Math.max(18, width * .033)}px Arial`
      const captionWords = scene.caption.split(' '); line = ''; y += width * .14
      captionWords.forEach(word => { const test = `${line} ${word}`.trim(); if (context.measureText(test).width > width * .7 && line) { context.fillText(line, width * .13, y); y += width * .05; line = word } else line = test }); context.fillText(line, width * .13, y)
      context.restore()
      context.fillStyle = '#ffc400'; context.beginPath(); context.roundRect(width * .09, height * .77, width * .48, Math.max(42, width * .08), 12); context.fill(); context.fillStyle = '#123957'; context.font = `800 ${Math.max(14, width * .023)}px Arial`; context.textAlign = 'center'; context.fillText(graphicCta.slice(0, 24), width * .33, height * .82); context.textAlign = 'left'
      context.fillStyle = 'rgba(255,255,255,.3)'; context.fillRect(width * .09, height * .91, width * .82, 5); context.fillStyle = '#ffc400'; context.fillRect(width * .09, height * .91, width * .82 * progress, 5)
      context.fillStyle = 'rgba(255,255,255,.7)'; context.font = `700 ${Math.max(13, width * .018)}px Arial`; context.fillText('RELIABLE PREMIUM MARKETPLACE', width * .09, height * .95)
    }
    recorder.start()
    const startedAt = performance.now()
    const timer = window.setInterval(() => { const elapsed = performance.now() - startedAt; draw(elapsed); if (elapsed >= 6000) { window.clearInterval(timer); recorder.stop(); stream.getTracks().forEach(track => track.stop()) } }, 33)
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
      <section className="prompt-creator panel">
        <div className="prompt-creator-heading"><div><span className="panel-kicker">Create from an idea</span><h2>What do you want to make today?</h2><p>Describe the video in one sentence. Reliable turns it into a hook, three scenes, captions, and a shareable browser-rendered video.</p></div><div className="prompt-creator-badge"><Film size={17} /> No paid provider required</div></div>
        <div className="visual-scene-builder">
          <div className="visual-scene-builder-heading"><div><span className="panel-kicker">Visual scene builder</span><h3>Give the story a place, people, and personality</h3><p>Create cartoon or realistic scene directions for conversations about life, school fees, comedy, business, and everyday moments.</p></div><WandSparkles size={24} /></div>
          <div className="visual-scene-grid">
            <label>Visual style<select value={visualStyle} onChange={event => { setVisualStyle(event.target.value); setSceneImageUrl(event.target.value === 'Realistic human scene' ? '/content-studio-realistic-office.jpg' : '/content-studio-cartoon-school-fees.jpg') }}><option>Cartoon illustration</option><option>Realistic human scene</option><option>3D animated film</option><option>Comic-book style</option></select></label>
            <label>Location<select value={sceneSetting} onChange={event => setSceneSetting(event.target.value)}><option>a lively neighborhood street</option><option>a cozy family room</option><option>a bright modern office</option><option>a school compound</option><option>a roadside shop</option></select></label>
            <label>Characters<input value={sceneCharacters} onChange={event => setSceneCharacters(event.target.value)} placeholder="e.g. two friends and a shop owner" /></label>
            <label>Mood<select value={sceneMood} onChange={event => setSceneMood(event.target.value)}><option>warm, funny, and relatable</option><option>emotional and thoughtful</option><option>bold and energetic</option><option>calm and educational</option></select></label>
          </div>
          <label className="visual-dialogue-field">Dialogue or conversation<textarea value={sceneDialogue} onChange={event => setSceneDialogue(event.target.value)} rows={2} placeholder="Person A: ... Person B: ..." /></label>
          <div className="visual-sample-picker"><span>Scene reference</span><button type="button" className={sceneImageUrl.includes('cartoon') ? 'selected' : ''} onClick={() => { setVisualStyle('Cartoon illustration'); setSceneImageUrl('/content-studio-cartoon-school-fees.jpg') }}><img src="/content-studio-cartoon-school-fees.jpg" alt="Cartoon neighborhood conversation sample" /><b>Cartoon conversation</b></button><button type="button" className={sceneImageUrl.includes('realistic') ? 'selected' : ''} onClick={() => { setVisualStyle('Realistic human scene'); setSceneImageUrl('/content-studio-realistic-office.jpg') }}><img src="/content-studio-realistic-office.jpg" alt="Realistic office conversation sample" /><b>Realistic people</b></button></div>
        </div>
        <div className="prompt-creator-form"><textarea value={videoPrompt} onChange={event => setVideoPrompt(event.target.value)} rows={3} placeholder="Example: Create a 30-second video showing why local shops should start selling online." /><div className="prompt-creator-controls"><label>Tone<select value={contentTone} onChange={event => setContentTone(event.target.value)}><option>Clear and confident</option><option>Warm and inspiring</option><option>Bold and energetic</option><option>Simple and educational</option></select></label><button className="content-studio-button primary" onClick={generatePlan}><Sparkles size={17} /> Create content plan</button></div></div>
        <div className="creator-steps"><span className="active"><b>1</b> Idea</span><span className={contentPlan.length ? 'active' : ''}><b>2</b> Scenes & captions</span><span className={renderingVideo ? 'active' : ''}><b>3</b> Export video</span></div>
        {contentPlan.length > 0 && <div className="scene-plan"><div className="scene-plan-header"><div><span className="panel-kicker">Your generated structure</span><h3>Ready-to-share short video</h3></div><button className="content-studio-button primary" onClick={renderBrowserVideo} disabled={renderingVideo}>{renderingVideo ? <Loader2 className="content-studio-spinner" size={17} /> : <Download size={17} />} {renderingVideo ? 'Rendering…' : 'Render WebM video'}</button></div><div className="scene-cards">{contentPlan.map((scene, index) => <article className="scene-card" key={`${scene.title}-${index}`}><span>Scene {index + 1}</span><strong>{scene.title}</strong><p>{scene.caption}</p>{scene.dialogue && <small><Mic2 size={13} /> {scene.dialogue}</small>}<small><Captions size={13} /> Caption and visual direction ready</small></article>)}</div><div className="scene-plan-note"><Mic2 size={15} /> Voiceover is not connected yet. You can add narration in the next provider stage, or upload this video to a platform with built-in audio tools.</div></div>}
      </section>

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
