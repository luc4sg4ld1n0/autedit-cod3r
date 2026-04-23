export function sanitizeDirectoryName(name: string): string {
  return name.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
}
