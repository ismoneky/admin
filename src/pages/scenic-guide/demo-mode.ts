import { isImageUrl, isDemoImageUrl } from './model'

// DEV prevents a build with --mode guide-demo from bypassing production authentication.
export const GUIDE_DEMO = import.meta.env.DEV && import.meta.env.MODE === 'guide-demo'

export const isEditorImageUrl = (url: string) => isImageUrl(url) || (GUIDE_DEMO && isDemoImageUrl(url))
