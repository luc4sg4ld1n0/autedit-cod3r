import { electronAPI } from '@electron-toolkit/preload'
import type { WorkflowResult, WorkflowVideo } from '../shared/workflow'

export const api = {
  selectWorkflowVideo: (): Promise<WorkflowVideo | null> =>
    electronAPI.ipcRenderer.invoke('select-workflow-video'),
  processWorkflowVideo: (selectedVideo: WorkflowVideo): Promise<WorkflowResult> =>
    electronAPI.ipcRenderer.invoke('process-workflow-video', selectedVideo)
}
