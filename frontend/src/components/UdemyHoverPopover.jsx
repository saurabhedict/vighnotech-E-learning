import { useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import FavoriteButton from './FavoriteButton'
import { addCartItem, removeCartItem } from '../store/cartSlice'

const TYPE_LABEL = { pdf: 'PDF', video: 'Video', game: 'Simulator', '3d': '3D Model' }

export default function UdemyHoverPopover({
  title,
  isCourse,
  isPaid,
  price,
  oldPrice,
  instructor,
  description,
  previewText,
  learningOutcomes = [],
  isEnrolled,
  type,
  onActionClick,
  contentId,
  favoriteId,
  side = 'right',
  coords,
  thumbnail,
  rating,
  ratingCount,
  tags = [],
}) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const isDark = useSelector((s) => s.ui.theme) === 'dark'
  const cartItems = useSelector((s) => s.cart.items)
  const isInCart = contentId ? cartItems.some((i) => i.id === contentId) : false
  const favId = favoriteId || contentId

  const handleCartToggle = (e) => {
    e.stopPropagation()
    if (isInCart) {
      dispatch(removeCartItem(contentId))
    } else {
      dispatch(addCartItem({
        id: contentId,
        title,
        price: Number(price),
        type: isCourse ? 'course' : 'resource',
        thumbnail: thumbnail || '',
        instructor: instructor || 'AeroLearn Instructor Panel',
        rating: rating || (isCourse ? '4.7' : '4.8'),
        ratingCount: ratingCount || (isCourse ? '12,450' : '8,200'),
        oldPrice: oldPrice || ''
      }))
    }
  }

  // Calculate body-absolute positioning styles
  const style = useMemo(() => {
    if (!coords) return {}
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft
    const scrollY = window.pageYOffset || document.documentElement.scrollTop

    const cardPageTop = coords.top + scrollY
    const cardPageLeft = coords.left + scrollX
    const cardPageRight = coords.right + scrollX

    const leftVal = side === 'right'
      ? cardPageRight + 16
      : cardPageLeft - 330 - 16

    return {
      position: 'absolute',
      top: `${cardPageTop + coords.height / 2}px`,
      transform: 'translateY(-50%)',
      left: `${leftVal}px`,
      width: '330px',
    }
  }, [coords, side])

  // Don't render until coordinates are calculated
  if (!coords) return null

  // Pick 3 outcomes or fallback points
  const points = useMemo(() => {
    if (!isCourse && previewText) {
      return previewText.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
    }

    let outcomes = Array.isArray(learningOutcomes) ? learningOutcomes : []
    if (outcomes.length === 0) {
      if (isCourse) {
        outcomes = [
          'Gain comprehensive flight theory and practical concepts.',
          'Prepare fully for flight examinations and tests.',
          'Understand regulations, meteorological data, and flight safety.',
        ]
      } else {
        // Fallbacks for Standalone Resources based on type
        if (type === 'video') {
          outcomes = [
            'High-definition video explainer covering key training concepts.',
            'Self-paced step-by-step visual demonstration.',
            'Secure adaptive streaming with instant resume.',
          ]
        } else if (type === 'pdf') {
          outcomes = [
            'Detailed reference manuals and flight study checklists.',
            'High-contrast typography designed for easy screen reading.',
            'Comprehensive coverage of critical exam subjects.',
          ]
        } else if (type === '3d') {
          outcomes = [
            'Interactive 3D model visualization with rotate and zoom.',
            'Understand spatial relationships and system configurations.',
            'Deepen visual memory of cockpit components.',
          ]
        } else {
          outcomes = [
            'Interactive pilot training simulator modules.',
            'Practice procedures in a low-risk virtual environment.',
            'Develop muscle memory for flight procedures.',
          ]
        }
      }
    }
    // Stable random selection of up to 3 points
    if (outcomes.length <= 3) return outcomes
    const shuffled = [...outcomes].sort(() => 0.5 - Math.random())
    return shuffled.slice(0, 3)
  }, [learningOutcomes, isCourse, type, previewText])

  const displayDescription = useMemo(() => {
    if (description) return description
    if (isCourse) {
      return 'This course is designed to guide you step-by-step through the core concepts, practical exercises, and flight theory. It offers rich learning resources and lifetime access.'
    }
    return 'A standalone training resource designed to guide you through core aviation topics at your own pace.'
  }, [description, isCourse])

  // Display badges
  const showPremiumBadge = isPaid
  const showBestsellerBadge = isCourse

  return createPortal(
    <div
      style={{ ...style, minHeight: 'auto' }}
      className={[
        isDark ? '' : 'theme-light',
        'absolute z-20 p-6 rounded-2xl border shadow-xl transition-all duration-200 pointer-events-auto',
        isDark 
          ? 'bg-[#0d1625] border-vigno-line/60 text-vigno-txt' 
          : 'bg-white border-slate-200/90 text-vigno-txt'
      ].join(' ')}
    >
        {/* Pointer arrow */}
        <div
          className={[
            'absolute w-3.5 h-3.5 rotate-45 top-1/2 -translate-y-1/2 border',
            side === 'right' 
              ? 'left-[-8px] border-r-0 border-t-0' 
              : 'right-[-8px] border-l-0 border-b-0',
            isDark 
              ? 'bg-[#0d1625] border-vigno-line/60' 
              : 'bg-white border-slate-200/90'
          ].join(' ')}
        />

        <div className="relative z-10 space-y-3.5 text-left">
          {/* Title */}
          <h4 className="font-extrabold text-sm md:text-base leading-snug tracking-tight text-vigno-txt">
            {title}
          </h4>

          {/* Badges Row */}
          <div className="flex flex-wrap gap-1.5 items-center">
            {tags && tags.length > 0 ? (
              // Admin-defined tags replace the default Bestseller + Premium badges
              tags.map((tag, idx) => {
                const TAG_COLORS = [
                  'bg-indigo-500/10 text-indigo-400 border-indigo-500/25',
                  'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
                  'bg-amber-500/10 text-amber-400 border-amber-500/25',
                  'bg-rose-500/10 text-rose-400 border-rose-500/25',
                  'bg-purple-500/10 text-purple-400 border-purple-500/25',
                  'bg-cyan-500/10 text-cyan-400 border-cyan-500/25',
                  'bg-orange-500/10 text-orange-400 border-orange-500/25',
                ]
                const colorClass = TAG_COLORS[idx % TAG_COLORS.length]
                return (
                  <span key={idx} className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${colorClass}`}>
                    {tag}
                  </span>
                )
              })
            ) : (
              // Default fallback badges when no admin tags set
              <>
                {showBestsellerBadge && (
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    Bestseller
                  </span>
                )}
                {showPremiumBadge ? (
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-purple-600/10 text-purple-400 border border-purple-600/20">
                    Premium
                  </span>
                ) : (
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">
                    Free
                  </span>
                )}
              </>
            )}
            {type && (
              <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border transition-colors ${
                {
                  video: 'bg-blue-50 text-blue-600 border-blue-200/60 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
                  pdf: 'bg-emerald-50 text-emerald-600 border-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
                  '3d': 'bg-purple-50 text-purple-600 border-purple-200/60 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20',
                  game: 'bg-rose-50 text-rose-600 border-rose-200/60 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
                }[type] || 'bg-slate-50 text-slate-600 border-slate-200/60 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20'
              }`}>
                {TYPE_LABEL[type] || type}
              </span>
            )}
          </div>

          {/* Meta info */}
          <div className="text-[11px] text-vigno-muted font-medium flex items-center flex-wrap gap-x-2 gap-y-0.5">
            <span>Updated <span className="font-bold text-vigno-txt/90">June 2026</span></span>
            <span>·</span>
            <span>All Levels</span>
            <span>·</span>
            <span>Subtitles, CC</span>
          </div>

          {/* Short description */}
          <p className="text-xs text-vigno-txt/80 leading-relaxed line-clamp-3">
            {displayDescription}
          </p>

          {/* Bullet checklist */}
          {points.length > 0 && (
            <ul className="space-y-2 pt-2.5 border-t border-vigno-line/20">
              {points.map((pt, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-[11px] text-vigno-txt/85 leading-normal">
                  <span className="text-vigno-accent font-bold shrink-0 mt-0.5">✓</span>
                  <span className="line-clamp-2">{pt}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Actions Row */}
          <div className="pt-2 w-full">
            {isEnrolled || !isPaid ? (
              /* Enrolled or Free: just a full width Start learning button */
              <button
                onClick={onActionClick}
                className="w-full py-3 rounded-lg bg-vigno-accent hover:brightness-110 text-vigno-accent-txt font-black text-sm transition-all active:scale-[0.98]"
              >
                Start learning
              </button>
            ) : (
              /* Paid and not enrolled: Add to cart (or Go to cart) + Heart button */
              <div className="flex items-center gap-3 w-full">
                {isInCart ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate('/app/cart')
                    }}
                    className="flex-1 py-3 rounded-lg bg-vigno-accent hover:brightness-110 text-vigno-accent-txt font-black text-sm transition-all active:scale-[0.98] text-center"
                  >
                    Go to cart
                  </button>
                ) : (
                  <button
                    onClick={handleCartToggle}
                    className="flex-1 py-3 rounded-lg bg-vigno-accent hover:brightness-110 text-vigno-accent-txt font-black text-sm transition-all active:scale-[0.98] text-center"
                  >
                    Add to cart
                  </button>
                )}

                {favId && (
                  <div className="w-12 h-12 rounded-full border border-slate-350 dark:border-vigno-line/45 flex items-center justify-center bg-white dark:bg-vigno-card hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer shrink-0">
                    <FavoriteButton contentId={favId} variant="heart" size={20} className="w-full h-full flex items-center justify-center" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>,
      document.body
    )
}
