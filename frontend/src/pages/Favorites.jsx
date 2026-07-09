import { useQuery } from '@tanstack/react-query'
import { discoverApi } from '../api/discoverApi'
import ContentCard from '../components/ContentCard'
import Breadcrumb from '../components/Breadcrumb'

export default function Favorites() {
  const favs = useQuery({ queryKey: ['favorites', 'mine'], queryFn: discoverApi.myFavorites })
  return (
    <div className="max-w-6xl mx-auto pb-10">
      <Breadcrumb trail="My Wishlist" />
      
      <div className="flex items-center gap-4 mb-8 mt-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center text-blue-500 shadow-sm border border-blue-500/20 backdrop-blur-md">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
          </svg>
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-vigno-txt">My Wishlist</h1>
          <p className="text-sm font-medium text-vigno-muted mt-1">Saved courses and resources for later</p>
        </div>
      </div>
      
      {favs.isLoading && (
        <div className="py-20 flex flex-col items-center justify-center gap-4">
          <div className="w-8 h-8 rounded-full border-4 border-vigno-line border-t-vigno-accent animate-spin" />
          <p className="text-sm font-bold text-vigno-muted">Loading your wishlist...</p>
        </div>
      )}
      
      {favs.isError && (
        <div className="p-6 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 font-medium">
          Failed to load your wishlist. Please try again later.
        </div>
      )}
      
      {favs.data?.length === 0 && (
        <div className="py-20 text-center flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-vigno-line/20 flex items-center justify-center text-vigno-muted/50 mb-4">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>
          </div>
          <h3 className="text-xl font-bold text-vigno-txt mb-2">Your wishlist is empty</h3>
          <p className="text-vigno-muted max-w-md">You haven't saved any items yet. Browse the catalog and tap the save icon on any course or resource to add it here.</p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-6">
        {favs.data?.map((it) => <ContentCard key={it.id} item={it} />)}
      </div>
    </div>
  )
}
