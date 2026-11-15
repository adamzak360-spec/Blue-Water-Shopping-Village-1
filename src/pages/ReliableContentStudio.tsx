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

export default function ReliableContentStudio() {
  const { user, role, isLoading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [projects, setProjects] = useState<ContentProject[]>([])
  const [selectedProject, setSelectedProject] = useState<ContentProject | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [projectType, setProjectType] = useState<ProjectType>('video')
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16')
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
    setMessage('New project ready. Save it when you are ready.')
    setError('')
  }

  const openProject = (project: ContentProject) => {
    setSelectedProject(project)
    setName(project.name)
    setDescription(project.description)
    setProjectType(project.project_type)
    setAspectRatio(project.aspect_ratio)
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
        settings: selectedProject?.settings || {},
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
          <div className="content-studio-preview"><div className="preview-glow" /><WandSparkles size={34} /><h3>Creative workspace ready</h3><p>Template previews, animation, voiceover, and rendering will be added in the next stages.</p><span className="preview-badge"><Sparkles size={14} /> Stage 2 project foundation</span></div>
          <div className="content-studio-form"><label>Project name<input value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Christmas marketplace campaign" maxLength={160} /></label><label>Description<textarea value={description} onChange={event => setDescription(event.target.value)} placeholder="Describe the content you want to create…" rows={4} maxLength={2000} /></label><div className="content-studio-form-grid"><label>Project type<select value={projectType} onChange={event => setProjectType(event.target.value as ProjectType)}>{Object.entries(projectTypeLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>Aspect ratio<select value={aspectRatio} onChange={event => setAspectRatio(event.target.value as AspectRatio)}><option value="9:16">9:16 · Reels / Shorts / TikTok</option><option value="1:1">1:1 · Square feed</option><option value="4:5">4:5 · Social feed</option><option value="16:9">16:9 · YouTube</option></select></label></div><div className="content-studio-actions"><button className="content-studio-button primary" onClick={() => void saveProject()} disabled={saving}>{saving ? <Loader2 className="content-studio-spinner" size={17} /> : <Save size={17} />} {saving ? 'Saving…' : 'Save project'}</button>{selectedProject && <button className="content-studio-button secondary" onClick={startNewProject}>Start another project</button>}</div></div>
        </main>
      </div>
    </div>
  )
}
