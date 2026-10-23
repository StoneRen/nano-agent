import path from 'node:path'

export const WORKSPACE = process.cwd()

export function resolveWorkspacePath(inputPath: string): string {
  const resolved = path.resolve(WORKSPACE, inputPath)
  const relative = path.relative(WORKSPACE, resolved)

  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`路径超出当前工作目录，已拒绝访问：${inputPath}`)
  }

  return resolved
}

export function toRelativePath(absolutePath: string): string {
  return path.relative(WORKSPACE, absolutePath) || '.'
}
