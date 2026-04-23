import { BrowserWindow, dialog } from 'electron'
import type { OpenDialogOptions } from 'electron'
import { ipcMain } from 'electron'
import type { WorkflowVideo } from '../../shared/workflow'
import { buildUnifiedWorkflowSelection, processUnifiedWorkflow } from '../services/workflow'

async function selectWorkflowVideo(): Promise<WorkflowVideo | null> {
  const window = BrowserWindow.getFocusedWindow()
  const dialogOptions: OpenDialogOptions = {
    title: 'Selecionar video MP4',
    properties: ['openFile'],
    filters: [{ name: 'Videos MP4', extensions: ['mp4'] }]
  }

  const { canceled, filePaths } = window
    ? await dialog.showOpenDialog(window, dialogOptions)
    : await dialog.showOpenDialog(dialogOptions)

  if (canceled || filePaths.length === 0) {
    return null
  }

  return buildUnifiedWorkflowSelection(filePaths[0])
}

export function registerWorkflowIpc(): void {
  ipcMain.handle('select-workflow-video', selectWorkflowVideo)
  ipcMain.handle('process-workflow-video', (_, video: WorkflowVideo) => processUnifiedWorkflow(video))
}
