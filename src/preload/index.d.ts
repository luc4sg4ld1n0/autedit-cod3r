import { ElectronAPI } from '@electron-toolkit/preload'
import type { WorkflowResult, WorkflowVideo } from '../shared/workflow'

interface AppAPI {
  selectWorkflowVideo: () => Promise<WorkflowVideo | null>
  processWorkflowVideo: (selectedVideo: WorkflowVideo) => Promise<WorkflowResult>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: AppAPI
  }
}
