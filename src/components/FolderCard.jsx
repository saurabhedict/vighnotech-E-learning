import { Link } from 'react-router-dom'

export default function FolderCard({ className, module }) {
  const fileCount = module.chapters.reduce((a, c) => a + c.items.length, 0)
  return (
    <Link
      to={`/app/${className}/module/${module.id}`}
      className="w-52 bg-vigno-card border border-vigno-line rounded-2xl p-4 hover:-translate-y-1 hover:border-vigno-accent transition block"
    >
      <div className="text-3xl">📁</div>
      <div className="mt-2.5 font-semibold text-sm">{module.name}</div>
      <div className="mt-1 text-xs text-vigno-muted">{module.chapters.length} chapters · {fileCount} files</div>
    </Link>
  )
}
