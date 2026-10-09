import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { Alert, App, Button, Empty, Form, Input, InputNumber, Popconfirm, Radio, Select, Space, Spin, Switch } from 'antd'
import { ArrowLeftOutlined, PlusOutlined, SaveOutlined, ReloadOutlined, AimOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons'
import { getScenicGuide, saveScenicGuide } from '../../api/scenicGuide'
import { GUIDE_CATEGORIES, newGuidePoint, reduceGuideEditorNavigation, replaceGuideImage, validateDraft } from './model'
import type { GuideDocument, GuideImage, GuidePoint, Position } from './model'
import GuideCanvas from './GuideCanvas'
import ImageField from './ImageField'
import { GUIDE_DEMO, isEditorImageUrl } from './demo-mode'
import './scenic-guide.css'

export default function ScenicGuidePage() {
  const { message, modal } = App.useApp()
  const [draft, setDraft] = useState<GuideDocument | null>(null)
  const [saved, setSaved] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [navigation, navigateEditor] = useReducer(reduceGuideEditorNavigation, { selectedId: null, panel: 'points' })
  const [pickMode, setPickMode] = useState<'add' | 'move' | null>(null)
  const loadSequence = useRef(0)
  const busy = loading || saving || uploading
  const dirty = !!draft && JSON.stringify(draft) !== saved
  const selected = draft?.points.find(point => point.id === navigation.selectedId)
  const points = [...(draft?.points || [])].sort((a, b) => a.sortOrder - b.sortOrder)

  const load = useCallback(async () => {
    const sequence = ++loadSequence.current
    setLoading(true); setLoadError(false)
    try {
      const res = await getScenicGuide()
      if (sequence !== loadSequence.current) return
      if (!res.success || !res.data) throw new Error('配置加载失败')
      setDraft(res.data); setSaved(JSON.stringify(res.data)); setSaveError(''); navigateEditor({ type: 'clear-selection' }); setPickMode(null)
    } catch { if (sequence === loadSequence.current) setLoadError(true) }
    finally { if (sequence === loadSequence.current) setLoading(false) }
  }, [])

  const invalidateLoad = useCallback(() => { loadSequence.current++ }, [])
  useEffect(() => { void load(); return invalidateLoad }, [load, invalidateLoad])
  useEffect(() => {
    if (!dirty && !uploading && !saving) return
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    const beforeLeave = (event: Event) => {
      if (!window.confirm(uploading || saving ? '正在上传或保存，确定离开此页面吗？' : '导览有未保存的修改，确定离开并放弃这些修改吗？')) event.preventDefault()
    }
    window.addEventListener('beforeunload', beforeUnload)
    window.addEventListener('scenic-guide:before-leave', beforeLeave)
    return () => { window.removeEventListener('beforeunload', beforeUnload); window.removeEventListener('scenic-guide:before-leave', beforeLeave) }
  }, [dirty, uploading, saving])

  const editPoint = (id: string, patch: Partial<GuidePoint>) => setDraft(current => current ? { ...current, points: current.points.map(point => point.id === id ? { ...point, ...patch } : point) } : current)
  const selectPoint = (id: string) => { navigateEditor({ type: 'select-point', id }); setPickMode(null) }
  const pick = (position: Position) => {
    if (!draft || busy) return
    if (pickMode === 'move' && navigation.selectedId) editPoint(navigation.selectedId, position)
    else if (pickMode === 'add') {
      const id = crypto.randomUUID()
      const sortOrder = Math.min(9999, Math.max(-1, ...draft.points.map(p => p.sortOrder)) + 1)
      setDraft(current => current ? { ...current, points: [...current.points, newGuidePoint(id, position, sortOrder)] } : current)
      navigateEditor({ type: 'select-point', id })
    }
    setPickMode(null)
  }
  const changeMap = (image: GuideImage) => {
    const apply = (clear: boolean) => { setDraft(current => current ? replaceGuideImage(current, image, clear) : current); if (clear) navigateEditor({ type: 'clear-selection' }); setPickMode(null) }
    if (!draft?.points.length || image.imageUrl === draft.imageUrl) { apply(false); return }
    let clear = false
    modal.confirm({
      title: '更换导览底图', okText: '更换底图', cancelText: '取消',
      content: <Space orientation="vertical">
        <p>新底图可能改变地点位置。保留标记后，请逐一重新校准。</p>
        <Radio.Group defaultValue="keep" onChange={event => { clear = event.target.value === 'clear' }} options={[{ label: '保留现有标记', value: 'keep' }, { label: '清空标记，重新添加', value: 'clear' }]} />
      </Space>,
      onOk: () => apply(clear),
    })
  }
  const save = async () => {
    if (!draft || busy) return
    const issue = validateDraft(draft, isEditorImageUrl)
    if (issue) { if (issue.pointId) navigateEditor({ type: 'select-point', id: issue.pointId }); message.warning(issue.message); return }
    setSaving(true); setSaveError('')
    try {
      const res = await saveScenicGuide(draft)
      if (!res.success || !res.data) throw new Error('保存失败')
      setDraft(res.data); setSaved(JSON.stringify(res.data)); setPickMode(null)
      message.success(GUIDE_DEMO ? '已保存到本地演示，刷新页面仍可查看' : '已保存，小程序重新进入导览页即可看到更新')
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response?.status
      setSaveError(status === 409 ? '其他管理员已更新导览。当前修改仍保留，请先导出备份，再重新加载并合并修改。' : '保存失败，当前修改仍保留，请稍后重试。')
    } finally { setSaving(false) }
  }
  const reload = () => {
    if (!dirty) { void load(); return }
    modal.confirm({ title: '重新加载会放弃未保存的修改', content: '需要保留时，请先导出当前配置。', okText: '放弃修改并重新加载', cancelText: '继续编辑', onOk: () => load() })
  }
  const download = () => {
    if (!draft) return
    const url = URL.createObjectURL(new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a'); link.href = url; link.download = `景区导览-${new Date().toISOString().slice(0, 10)}.json`; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  if (!draft) return <Spin spinning={loading}><div className="guide-initial">
    {loadError ? <Alert type="error" showIcon title="导览配置加载失败" action={<Button onClick={() => void load()}>重试</Button>} /> : <p>正在加载导览配置…</p>}
  </div></Spin>

  return <div className="guide-editor">
    <header className="guide-editor__header">
      <div className="guide-editor__intro">
        <h2>景区导览</h2>
        <p>编辑导览底图和地点信息，保存后同步到小程序。</p>
      </div>
      <div className="guide-editor__actions">
        <span className={`guide-sync-state ${dirty ? 'is-dirty' : ''}`}><i />{dirty ? '有未保存修改' : '已同步'}</span>
        <Button icon={<DownloadOutlined />} onClick={download} disabled={busy}>导出</Button>
        <Button icon={<ReloadOutlined />} onClick={reload} disabled={busy}>重新加载</Button>
        <Button type="primary" icon={<SaveOutlined />} loading={saving} disabled={busy || !dirty} onClick={() => void save()}>保存并更新</Button>
      </div>
    </header>

    {saveError && <Alert type="warning" showIcon title={saveError} />}
    {loadError && <Alert type="error" showIcon title="重新加载失败，当前内容已保留" />}

    <section className="guide-settings" aria-label="导览基础设置">
      <div className="guide-settings__title">
        <label htmlFor="guide-title">导览标题</label>
        <Input id="guide-title" value={draft.title} maxLength={60} disabled={busy} onChange={event => setDraft({ ...draft, title: event.target.value })} />
        <span className="guide-muted">{draft.updatedAt ? `上次保存：${new Date(draft.updatedAt).toLocaleString('zh-CN')}` : '尚未发布导览图'}</span>
      </div>
      <div className="guide-settings__image">
        <div className="guide-settings__label">
          <span>导览底图</span>
          {draft.imageWidth > 0 && draft.imageHeight > 0 && <small>{draft.imageWidth} × {draft.imageHeight}px</small>}
        </div>
        <ImageField key={draft.imageUrl || 'empty-map'} label="底图" value={draft.imageUrl} disabled={busy} onBusy={setUploading} onChange={changeMap} />
      </div>
    </section>

    <div className="guide-workspace">
      <section className="guide-map-panel" aria-label="导览图标记编辑区">
        <div className="guide-panel-heading">
          <div>
            <h3>图上标记</h3>
            <p>{selected ? `当前选中：${selected.name || '未命名地点'}` : `${points.length} 个地点`}</p>
          </div>
          {pickMode && <Button size="small" disabled={busy} onClick={() => setPickMode(null)}>取消选点</Button>}
        </div>
        <div className={`guide-canvas-hint ${pickMode ? 'is-picking' : ''}`}>
          {pickMode === 'add' ? '请点击导览图，为新地点选择位置' : pickMode === 'move' ? '请点击导览图，重新设置该地点位置' : '点击编号编辑地点，拖动编号可调整位置，方向键可微调'}
        </div>
        <GuideCanvas guide={draft} selectedId={navigation.selectedId} picking={!!pickMode} disabled={busy} onPick={pick} onMove={editPoint} onSelect={selectPoint} />
        <p className="guide-map-note">灰色编号表示该地点已隐藏；底图本身已有的文字或图形不会随地点隐藏。</p>
      </section>

      <aside className="guide-inspector" aria-label="地点编辑面板">
        <div className="guide-inspector__tabs" role="tablist" aria-label="地点面板">
          <button type="button" role="tab" aria-selected={navigation.panel === 'points'} className={navigation.panel === 'points' ? 'is-active' : ''} onClick={() => navigateEditor({ type: 'show-points' })}>地点列表 <span>{points.length}</span></button>
          <button type="button" role="tab" aria-selected={navigation.panel === 'details'} className={navigation.panel === 'details' ? 'is-active' : ''} disabled={!selected} onClick={() => selected && navigateEditor({ type: 'select-point', id: selected.id })}>地点详情</button>
          <Button size="small" type="primary" icon={<PlusOutlined />} disabled={busy || !draft.imageUrl || points.length >= 100} onClick={() => { navigateEditor({ type: 'show-points' }); setPickMode('add') }}>新增</Button>
        </div>

        {navigation.panel === 'points' ? <div className="guide-inspector__body guide-point-list">
          {pickMode === 'add' && <div className="guide-point-list__picking">新增地点：请在左侧导览图中点击位置</div>}
          {points.length ? <div className="guide-point-list__items">{points.map((point, index) => <button type="button" key={point.id} className={`guide-point-row ${navigation.selectedId === point.id ? 'is-selected' : ''}`} disabled={busy} onClick={() => selectPoint(point.id)}>
            <span className="guide-point-row__number">{index + 1}</span>
            <span className="guide-point-row__text"><strong>{point.name || '未命名地点'}</strong><small>{point.categories.map(c => GUIDE_CATEGORIES.find(option => option.value === c)?.label).join(' / ')}</small></span>
            {point.latitude == null || point.longitude == null ? <span className="guide-point-row__state is-required">缺坐标</span> : !point.visible && <span className="guide-point-row__state">已隐藏</span>}
          </button>)}</div> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="点击新增，再在导览图上选择位置" />}
        </div> : <div className="guide-inspector__body guide-point-form">
          {!selected ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="请先选择一个地点" /> : <>
            <div className="guide-point-form__heading">
              <Button type="text" size="small" icon={<ArrowLeftOutlined />} onClick={() => navigateEditor({ type: 'show-points' })}>返回地点列表</Button>
              <div><strong>{selected.name || '未命名地点'}</strong><span>编号 {points.findIndex(point => point.id === selected.id) + 1}</span></div>
            </div>
            <Form layout="vertical" disabled={busy}>
              <Form.Item label="地点名称" required><Input id="guide-point-name" value={selected.name} maxLength={60} placeholder="例如：摩友驿站" onChange={event => editPoint(selected.id, { name: event.target.value })} /></Form.Item>
              <section className="guide-location-required" aria-label="必填导航坐标">
                <div className="guide-location-required__heading"><strong>导航坐标</strong><span>必填 · 腾讯/高德 GCJ-02</span></div>
                <div className="guide-form-row">
                  <Form.Item label="纬度" required><InputNumber aria-label="导航纬度" min={-90} max={90} precision={8} step={0.000001} placeholder="例如 35.77794175" value={selected.latitude} onChange={latitude => editPoint(selected.id, { latitude })} /></Form.Item>
                  <Form.Item label="经度" required><InputNumber aria-label="导航经度" min={-180} max={180} precision={8} step={0.000001} placeholder="例如 114.14446553" value={selected.longitude} onChange={longitude => editPoint(selected.id, { longitude })} /></Form.Item>
                </div>
                <Form.Item label="地点地址（选填）"><Input value={selected.address} maxLength={200} placeholder="地图导航中显示的地址" onChange={event => editPoint(selected.id, { address: event.target.value })} /></Form.Item>
              </section>
              <Form.Item label="地点分类" required><Select mode="multiple" aria-label="地点分类" value={selected.categories} options={GUIDE_CATEGORIES.map(({ value, label }) => ({ value, label }))} onChange={categories => editPoint(selected.id, { categories })} /></Form.Item>
              <div className="guide-form-row">
                <Form.Item label="小程序显示"><Switch checked={selected.visible} checkedChildren="显示" unCheckedChildren="隐藏" onChange={visible => editPoint(selected.id, { visible })} /></Form.Item>
                <Form.Item label="排序"><InputNumber aria-label="地点排序" min={0} max={9999} precision={0} value={selected.sortOrder} onChange={value => editPoint(selected.id, { sortOrder: value ?? 0 })} /></Form.Item>
              </div>
              <Form.Item label="图上位置">
                <div className="guide-position-field"><span>横向 {(selected.x * 100).toFixed(1)}% · 纵向 {(selected.y * 100).toFixed(1)}%</span><Button size="small" icon={<AimOutlined />} onClick={() => setPickMode('move')}>重新选点</Button></div>
              </Form.Item>
              <Form.Item label="地点简介"><Input.TextArea value={selected.description} maxLength={500} showCount rows={3} placeholder="介绍景点特色或服务设施" onChange={event => editPoint(selected.id, { description: event.target.value })} /></Form.Item>
              <Form.Item label="地点配图"><ImageField key={`${selected.id}-${selected.imageUrl}`} label="配图" value={selected.imageUrl} disabled={busy} onBusy={setUploading} onChange={image => editPoint(selected.id, { imageUrl: image.imageUrl })} onClear={() => editPoint(selected.id, { imageUrl: '' })} />
                {selected.imageUrl && <img className="guide-point-photo" src={selected.imageUrl} alt="地点配图预览" />}
              </Form.Item>
              <Popconfirm title="删除这个地点？" description="保存并更新后，小程序将不再显示此交互标记。" okText="删除" cancelText="取消" disabled={busy} onConfirm={() => { setDraft({ ...draft, points: draft.points.filter(p => p.id !== selected.id) }); navigateEditor({ type: 'clear-selection' }); setPickMode(null) }}><Button danger block icon={<DeleteOutlined />}>删除地点</Button></Popconfirm>
            </Form>
          </>}
        </div>}
      </aside>
    </div>
  </div>
}
