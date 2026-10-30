import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ChevronDown, BookMarked, Bookmark, StickyNote, X, Search, Plus, Star, Share2, Lock, Globe, Home as HomeIcon, UserCheck, Users, ChevronUp, MoreHorizontal, Link2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useCommunities } from '../hooks/useCommunities'
import {
  useChapterText, useBibleMarkers, useBibleVersions, useFavoriteBibleVersions,
  useSavedBibleColors, useRecentBibleColors, useReadingProgress, useVerseReferences, saveReadingProgress, getLocalReadingPosition, DEFAULT_BIBLE_ID,
} from '../hooks/useBible'
import { useYouVersionAccount } from '../hooks/useYouVersionAccount'
import { isNativeApp } from '../lib/platform'
import { useToast } from '../context/ToastContext'
import { BIBLE_BOOKS, findBook } from '../lib/bibleBooks'
import SavedVersesSheet from '../components/bible/SavedVersesSheet'
import BibleReferenceChip from '../components/bible/BibleReferenceChip'
import BibleNoteCard from '../components/bible/BibleNoteCard'
import { HIGHLIGHT_COLORS, PRIMARY_COLORS, MORE_COLORS, resolveHighlightColor, highlightTextColor, colorsEqual, isCustomHex, normalizeColorKey } from '../lib/bibleColors'
import { formatReferenceLabel, parseBibleLinkParams, buildBibleLink } from '../lib/bibleLink'
import { verseTextFromContainer } from '../lib/biblePassageHtml'
import { DEFAULT_STARRED_VERSIONS } from '../lib/bibleVersionDefaults'
import { createFeedPost } from '../hooks/useFeed'
import FeedPostSheet from '../components/feed/FeedPostSheet'
import BookChapterPicker from '../components/bible/BookChapterPicker'
import VersePickerSheet from '../components/bible/VersePickerSheet'
import VersionPicker from '../components/bible/VersionPicker'
import VisibilityPicker, { VISIBILITY_OPTIONS } from '../components/common/VisibilityPicker'

const BIBLE_ID_STORAGE_KEY = 'oikos_bible_version_id'

export default function BibleView() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const contentRef = useRef(null)
  const [book, setBook] = useState(() => parseBibleLinkParams(searchParams)?.book ?? getLocalReadingPosition()?.book ?? 'JHN')
  const [chapter, setChapter] = useState(() => parseBibleLinkParams(searchParams)?.chapter ?? getLocalReadingPosition()?.chapter ?? 3)
  const [bibleId, setBibleId] = useState(() => {
    const fromLink = parseBibleLinkParams(searchParams)?.bibleId
    if (fromLink) return fromLink
    if (!parseBibleLinkParams(searchParams) && getLocalReadingPosition()?.bibleId) return getLocalReadingPosition().bibleId
    try { return localStorage.getItem(BIBLE_ID_STORAGE_KEY) || DEFAULT_BIBLE_ID } catch { return DEFAULT_BIBLE_ID }
  })
  // Hat der Nutzer schon selbst geblättert, darf die (bei kaltem Backend
  // evtl. erst Sekunden später eintreffende) DB-Leseposition ihn nicht mehr
  // zurückspringen lassen.
  const userNavigatedRef = useRef(false)
  // Vers(e), auf die nach dem Laden des Kapitels gesprungen + kurz geflasht
  // werden soll (aus einem Deep-Link wie /bible?book=JHN&chapter=3&verse=16).
  const [pendingVerses, setPendingVerses] = useState(() => {
    const parsed = parseBibleLinkParams(searchParams)
    return parsed?.verseStart != null ? { start: parsed.verseStart, end: parsed.verseEnd ?? parsed.verseStart } : null
  })
  const [flashVerses, setFlashVerses] = useState(null) // Set<number> | null
  const [showBookPicker, setShowBookPicker] = useState(false)
  const [showVersionPicker, setShowVersionPicker] = useState(false)
  // "Marker-Modus" wie in der YouVersion-App: erster Tap auf einen Vers
  // öffnet den Modus und wählt ihn aus, weitere Taps erweitern/verkleinern
  // die Auswahl. Die Aktionsleiste wirkt dann auf den gesamten (zusammen-
  // hängenden) Bereich min…max der ausgewählten Versnummern.
  const [selectedVerses, setSelectedVerses] = useState(new Set())
  const [noteDraft, setNoteDraft] = useState('')
  const [noteLinks, setNoteLinks] = useState([])
  const [showLinkPicker, setShowLinkPicker] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const [noteVisibility, setNoteVisibility] = useState('private')
  const [noteCommunityId, setNoteCommunityId] = useState(null)
  const [noteSiblingIds, setNoteSiblingIds] = useState([])
  const [sharePayload, setSharePayload] = useState(null) // { attachment, body } | null

  const bookInfo = findBook(book)
  const readingProgress = useReadingProgress()
  // Ohne Deep-Link und ohne lokal gespeicherte Stelle (neues Gerät/Browser)
  // kurz auf die DB-Leseposition warten, statt erst Johannes 3 zu laden und
  // dann sichtbar zur gespeicherten Stelle zu springen. Max. 2,5 s.
  const [needsDbPosition] = useState(() => !parseBibleLinkParams(searchParams) && !getLocalReadingPosition())
  const [positionWaitOver, setPositionWaitOver] = useState(false)
  useEffect(() => {
    if (!needsDbPosition) return
    const t = setTimeout(() => setPositionWaitOver(true), 2500)
    return () => clearTimeout(t)
  }, [needsDbPosition])
  const waitingForPosition = needsDbPosition && readingProgress === undefined && !positionWaitOver && !userNavigatedRef.current
  const { html, loading, error, retry: retryChapter } = useChapterText(bibleId, waitingForPosition ? null : book, chapter)
  // Der volle ~1479-Übersetzungen-Katalog wird erst geladen, wenn der Picker
  // tatsächlich geöffnet wird - nicht schon beim Öffnen des Bibel-Tabs.
  const { versions: bibleVersions, loading: versionsLoading } = useBibleVersions({ enabled: showVersionPicker })
  const { favorites: favoriteVersionIds, toggleFavorite: toggleFavoriteVersion } = useFavoriteBibleVersions()
  const yv = useYouVersionAccount()
  const { highlights, notes, bookmarks, addHighlight, removeHighlight, addNote, removeNote, toggleBookmark } = useBibleMarkers(bibleId, book, chapter, { youversionConnected: !!yv.connected })
  const { colors: savedColors, isSaved: isColorSaved, toggleColor: toggleSaveColor } = useSavedBibleColors()
  const { colors: recentColors, reload: reloadRecentColors } = useRecentBibleColors()
  const { myCommunities } = useCommunities()
  // Solange der volle Katalog nicht geladen ist (Normalfall: Picker war noch
  // nie offen), reicht die Chip-Anzeige der aktuellen Übersetzung aus den
  // Defaults - deckt HFA (Standardwert) und die anderen Standard-Favoriten
  // ohne jeden Netzwerk-Call ab.
  const currentVersion = bibleVersions?.find(v => String(v.id) === String(bibleId))
    ?? DEFAULT_STARRED_VERSIONS.find(v => String(v.id) === String(bibleId))

  // Schreibt die aktuelle Position (Buch/Kapitel/Übersetzung) in die URL, damit
  // sie einen Tab-Reload übersteht (mobile/Desktop-Browser können einen im
  // Hintergrund liegenden Tab bei Speicherdruck verwerfen und beim
  // Zurückwechseln neu laden - ohne Query-Params bliebe dann nur der
  // Hardcoded-Default JHN/3 übrig).
  function syncPositionToUrl(nextBook, nextChapter, nextBibleId) {
    const params = new URLSearchParams()
    params.set('book', nextBook)
    params.set('chapter', String(nextChapter))
    if (nextBibleId && String(nextBibleId) !== String(DEFAULT_BIBLE_ID)) params.set('bibleId', String(nextBibleId))
    setSearchParams(params, { replace: true })
  }

  // Kein Deep-Link in der URL (z.B. Einstieg über die Bottom-Nav) -> letzte
  // gelesene Stelle statt Johannes 3 laden, sobald sie geladen ist.
  useEffect(() => {
    if (parseBibleLinkParams(searchParams)) return
    if (!readingProgress || userNavigatedRef.current) return
    const sameSpot = readingProgress.book === book
      && Number(readingProgress.chapter) === Number(chapter)
      && (!readingProgress.bible_id || String(readingProgress.bible_id) === String(bibleId))
    if (sameSpot) return
    setBook(readingProgress.book)
    setChapter(readingProgress.chapter)
    if (readingProgress.bible_id) setBibleId(String(readingProgress.bible_id))
    syncPositionToUrl(readingProgress.book, readingProgress.chapter, readingProgress.bible_id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readingProgress])

  // Router remountet BibleView bei /bible?... -> /bible?...-Navigation NICHT
  // (z.B. wenn man aus dem bereits offenen Reader einen zweiten Chip antippt)
  // - Params deshalb bei jeder Änderung erneut anwenden.
  useEffect(() => {
    const parsed = parseBibleLinkParams(searchParams)
    if (!parsed) return
    setBook(parsed.book)
    setChapter(parsed.chapter)
    if (parsed.bibleId) setBibleId(parsed.bibleId)
    setPendingVerses(parsed.verseStart != null ? { start: parsed.verseStart, end: parsed.verseEnd ?? parsed.verseStart } : null)
    setSelectedVerses(new Set())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Sobald der Kapiteltext gerendert ist: zum Zielvers scrollen, kurz
  // hervorheben, dann aufräumen (URL bereinigen, damit ein Reload/manuelles
  // Blättern nicht erneut springt).
  useEffect(() => {
    if (!html || !pendingVerses || !contentRef.current) return
    const el = contentRef.current.querySelector(`[data-verse="${pendingVerses.start}"]`)
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    const nums = new Set()
    for (let n = pendingVerses.start; n <= pendingVerses.end; n++) nums.add(n)
    setFlashVerses(nums)
    const timeout = setTimeout(() => {
      setFlashVerses(null)
      setPendingVerses(null)
      setSearchParams({}, { replace: true })
    }, 2000)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html, pendingVerses])

  function selectVersion(id) {
    userNavigatedRef.current = true
    setBibleId(String(id))
    try { localStorage.setItem(BIBLE_ID_STORAGE_KEY, String(id)) } catch { /* ignore */ }
    setShowVersionPicker(false)
    syncPositionToUrl(book, chapter, id)
    if (user) saveReadingProgress(user.id, { bibleId: String(id), book, chapter })
  }

  function handleContentClick(e) {
    const el = e.target.closest('[data-verse]')
    if (!el) return
    const num = parseInt(el.getAttribute('data-verse'), 10)
    if (isNaN(num)) return
    setSelectedVerses(prev => {
      const next = new Set(prev)
      if (next.has(num)) next.delete(num)
      else next.add(num)
      return next
    })
  }

  const highlightFor = (verseNum) => highlights.find(h => verseNum >= h.verse_start && verseNum <= (h.verse_end ?? h.verse_start))
  const notesFor = (verseNum) => notes.filter(n => verseNum >= n.verse_start && verseNum <= (n.verse_end ?? n.verse_start))
  const isBookmarked = (verseNum) => bookmarks.some(b => b.verse === verseNum)

  // DOM-Overlay für Auswahl + bestehende Markierungen direkt auf die
  // gewrappten [data-verse]-Spans anwenden (dangerouslySetInnerHTML wird
  // von React nicht re-diffed, deshalb hier imperativ).
  useEffect(() => {
    const container = contentRef.current
    if (!container) return
    container.querySelectorAll('[data-verse]').forEach(el => {
      const num = parseInt(el.getAttribute('data-verse'), 10)
      const hl = highlightFor(num)
      if (selectedVerses.has(num)) {
        el.style.backgroundColor = hl ? resolveHighlightColor(hl.color) : 'var(--color-bg-secondary)'
        el.style.boxShadow = '0 0 0 2px var(--color-accent)'
        el.style.color = hl ? highlightTextColor(hl.color) : ''
        el.style.transition = ''
      } else if (flashVerses?.has(num)) {
        // Kurzes Aufblitzen nach einem Deep-Link-Sprung (siehe pendingVerses-
        // Effekt) - läuft bewusst im selben Overlay-Effekt wie Auswahl/
        // Highlights, sonst überschreiben sich die style-Properties gegenseitig.
        el.style.backgroundColor = 'var(--color-accent-light, var(--color-bg-secondary))'
        el.style.boxShadow = '0 0 0 2px var(--color-accent)'
        el.style.color = ''
        el.style.transition = 'background-color .4s ease'
      } else if (hl) {
        el.style.backgroundColor = resolveHighlightColor(hl.color)
        el.style.boxShadow = 'none'
        // Kontrast: dunkle Custom-Farben brauchen hellen Text (WCAG-ish).
        el.style.color = highlightTextColor(hl.color)
        el.style.transition = ''
      } else {
        el.style.backgroundColor = 'transparent'
        el.style.boxShadow = 'none'
        el.style.color = ''
        el.style.transition = ''
      }
    })
  }, [html, selectedVerses, highlights, flashVerses])

  function referenceLabel() {
    const nums = Array.from(selectedVerses).sort((a, b) => a - b)
    if (nums.length === 0) return ''
    return formatReferenceLabel({ book, chapter, verseStart: nums[0], verseEnd: nums[nums.length - 1] })
  }

  function goToChapter(nextBook, nextChapter) {
    userNavigatedRef.current = true
    setBook(nextBook)
    setChapter(nextChapter)
    setSelectedVerses(new Set())
    setShowBookPicker(false)
    setPendingVerses(null)
    syncPositionToUrl(nextBook, nextChapter, bibleId)
    if (user) saveReadingProgress(user.id, { bibleId, book: nextBook, chapter: nextChapter })
  }

  // "Als Beitrag teilen": markierte(r) Vers(e) + optionale Notiz als Feed-
  // Post vorschlagen (FeedPostSheet vorausgefüllt geöffnet).
  function handleShareToFeed() {
    const nums = Array.from(selectedVerses).sort((a, b) => a - b)
    if (!nums.length) return
    const vStart = nums[0]
    const vEnd = nums[nums.length - 1]
    const verseText = verseTextFromContainer(contentRef.current, nums)
    const attachment = {
      bibleId, book, chapter, verseStart: vStart, verseEnd: vEnd,
      referenceLabel: referenceLabel(), verseText,
    }
    const body = noteDraft.trim() || uniqueActiveNotes[0]?.note || ''
    setSharePayload({ attachment, body })
  }

  function goPrevChapter() {
    if (chapter > 1) return goToChapter(book, chapter - 1)
    const idx = BIBLE_BOOKS.findIndex(b => b.code === book)
    if (idx > 0) goToChapter(BIBLE_BOOKS[idx - 1].code, BIBLE_BOOKS[idx - 1].chapters)
  }

  function goNextChapter() {
    if (bookInfo && chapter < bookInfo.chapters) return goToChapter(book, chapter + 1)
    const idx = BIBLE_BOOKS.findIndex(b => b.code === book)
    if (idx < BIBLE_BOOKS.length - 1) goToChapter(BIBLE_BOOKS[idx + 1].code, 1)
  }

  const selectedNums = Array.from(selectedVerses).sort((a, b) => a - b)
  const verseStart = selectedNums[0]
  const verseEnd = selectedNums[selectedNums.length - 1]
  const activeNotes = selectedNums.length ? notesFor(verseStart).concat(verseEnd !== verseStart ? notesFor(verseEnd) : []) : []
  const uniqueActiveNotes = [...new Map(activeNotes.map(n => [n.id, n])).values()]
  // Nur abfragen, wenn ein Vers ausgewählt ist - keine unnötigen Requests beim
  // reinen Lesen ohne Marker-Modus.
  const { feedPosts: linkedFeedPosts, prayers: linkedPrayers, creeds: linkedCreeds, loading: referencesLoading } =
    useVerseReferences(book, selectedNums.length ? chapter : null, verseStart, verseEnd)

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Header */}
      <div className="sticky top-0 z-20 px-4 pt-4 pb-3" style={{ backgroundColor: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <BookMarked size={20} style={{ color: 'var(--color-accent)' }} /> Bibel
          </h1>
          <YouVersionBadge yv={yv} />
        </div>

        <div className="flex items-center justify-between gap-2">
          <button onClick={goPrevChapter} className="p-2 rounded-lg" style={{ color: 'var(--color-text-secondary)' }}>
            <ChevronLeft size={20} />
          </button>

          <button
            onClick={() => setShowBookPicker(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl font-semibold"
            style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text)' }}
          >
            {waitingForPosition ? "…" : `${bookInfo?.name || book} ${chapter}`} <ChevronDown size={16} />
          </button>

          <button onClick={goNextChapter} className="p-2 rounded-lg" style={{ color: 'var(--color-text-secondary)' }}>
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <button
            onClick={() => setShowVersionPicker(true)}
            className="flex items-center gap-1 text-xs font-medium"
            style={{ color: 'var(--color-accent)' }}
          >
            {currentVersion?.localized_abbreviation || currentVersion?.abbreviation || '…'} <ChevronDown size={12} />
          </button>
          <button
            onClick={() => setShowSaved(true)}
            className="p-1.5 rounded-lg"
            aria-label="Meine Verse"
            style={{ color: 'var(--color-accent)' }}
          >
            <Bookmark size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        className="px-5 py-5"
        style={{ paddingBottom: selectedVerses.size > 0 ? 220 : 'calc(84px + env(safe-area-inset-bottom, 0px))' }}
      >
        {loading && <p style={{ color: 'var(--color-text-tertiary)' }}>Lädt…</p>}
        {error && (
          <div className="rounded-xl p-4 text-sm" style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)' }}>
            Der Bibeltext konnte gerade nicht geladen werden. Bitte prüfe deine Internetverbindung.
            <button
              onClick={retryChapter}
              className="block mt-3 px-4 py-2 rounded-full text-sm font-semibold"
              style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
            >
              Erneut versuchen
            </button>
          </div>
        )}

        {!loading && !error && html && (
          // Text stammt aus der eigenen Edge Function (Proxy zu api.youversion.com),
          // nicht aus Nutzereingaben - dangerouslySetInnerHTML ist hier unbedenklich.
          <div
            ref={contentRef}
            className="bible-passage-content"
            onClick={handleContentClick}
            style={{ fontFamily: 'Lora, serif', fontSize: 17, lineHeight: 1.9, color: 'var(--color-text)' }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}

        {!loading && !error && !html && (
          <p style={{ color: 'var(--color-text-tertiary)' }}>Kein Text gefunden.</p>
        )}
      </div>

      {/* Marker-Aktionsleiste */}
      {selectedVerses.size > 0 && (
        <VerseActionBar
          referenceLabel={referenceLabel()}
          existingHighlight={verseStart != null ? highlightFor(verseStart) : null}
          bookmarked={verseStart != null && verseEnd === verseStart && isBookmarked(verseStart)}
          showBookmark={verseStart != null && verseEnd === verseStart}
          notes={uniqueActiveNotes}
          currentUserId={user?.id}
          noteDraft={noteDraft}
          setNoteDraft={setNoteDraft}
          noteLinks={noteLinks}
          setNoteLinks={setNoteLinks}
          onOpenLinkPicker={() => setShowLinkPicker(true)}
          noteVisibility={noteVisibility}
          setNoteVisibility={setNoteVisibility}
          noteCommunityId={noteCommunityId}
          setNoteCommunityId={setNoteCommunityId}
          noteSiblingIds={noteSiblingIds}
          setNoteSiblingIds={setNoteSiblingIds}
          myCommunities={myCommunities}
          linkedFeedPosts={linkedFeedPosts}
          linkedPrayers={linkedPrayers}
          linkedCreeds={linkedCreeds}
          referencesLoading={referencesLoading}
          savedColors={savedColors}
          recentColors={recentColors}
          isColorSaved={isColorSaved}
          onToggleSaveColor={toggleSaveColor}
          onClose={() => {
            setSelectedVerses(new Set())
            setNoteDraft(''); setNoteLinks([])
            setNoteVisibility('private')
            setNoteCommunityId(null)
            setNoteSiblingIds([])
          }}
          onHighlight={async (color) => {
            await addHighlight({ verseStart, verseEnd, referenceLabel: referenceLabel(), color, bibleId })
            reloadRecentColors()
          }}
          onRemoveHighlight={(id) => removeHighlight(id)}
          onBookmark={() => toggleBookmark({ verse: verseStart, referenceLabel: referenceLabel(), bibleId })}
          onSaveNote={async () => {
            if (!noteDraft.trim()) return
            await addNote({
              verseStart, verseEnd, referenceLabel: referenceLabel(), note: noteDraft.trim(), bibleId,
              visibility: noteVisibility, visibilityCommunityId: noteCommunityId, visibilitySiblingIds: noteSiblingIds,
              linkedVerses: noteLinks,
            })
            setNoteDraft(''); setNoteLinks([])
            setNoteVisibility('private')
            setNoteCommunityId(null)
            setNoteSiblingIds([])
          }}
          onRemoveNote={(id) => removeNote(id)}
          onShareToFeed={handleShareToFeed}
        />
      )}

      {showLinkPicker && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60 }}>
          <VersePickerSheet
            onClose={() => setShowLinkPicker(false)}
            onSelect={(att) => { setNoteLinks(prev => [...prev, att]); setShowLinkPicker(false) }}
          />
        </div>
      )}

      {showSaved && (
        <SavedVersesSheet
          onClose={() => setShowSaved(false)}
          onOpen={(v) => { setShowSaved(false); navigate(buildBibleLink({ ...v, bibleId: v.bibleId || bibleId })) }}
        />
      )}

      {showBookPicker && (
        <BookChapterPicker
          currentBook={book}
          currentChapter={chapter}
          onSelect={(code, ch) => goToChapter(code, ch)}
          onClose={() => setShowBookPicker(false)}
        />
      )}

      {showVersionPicker && (
        <VersionPicker
          versions={bibleVersions}
          loading={versionsLoading}
          currentId={bibleId}
          favorites={favoriteVersionIds}
          onToggleFavorite={toggleFavoriteVersion}
          onSelect={selectVersion}
          onClose={() => setShowVersionPicker(false)}
        />
      )}

      {sharePayload && (
        <FeedPostSheet
          initialBody={sharePayload.body}
          initialCategory="bibelstelle"
          initialVerse={sharePayload.attachment}
          onClose={() => setSharePayload(null)}
          onSubmit={async (data) => {
            const post = await createFeedPost(user.id, data)
            setSharePayload(null)
            if (post) {
              showToast('Beitrag geteilt 🙌')
              setSelectedVerses(new Set())
              setNoteDraft(''); setNoteLinks([])
            } else {
              showToast('Fehler beim Posten', 'error')
            }
          }}
        />
      )}
    </div>
  )
}

function YouVersionBadge({ yv }) {
  if (yv.connected === null) return null
  // Verbinden per OAuth-Redirect funktioniert nur im Browser (siehe Auth.jsx)
  if (!yv.connected && isNativeApp) return null
  if (yv.connected) {
    return (
      <span
        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
        style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-accent)' }}
        title="Highlights aus der YouVersion-App werden beim Öffnen eines Kapitels automatisch übernommen"
      >
        <BookMarked size={12} /> YouVersion ✓
      </span>
    )
  }
  return (
    <button
      onClick={yv.connect}
      disabled={yv.connecting}
      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
    >
      <BookMarked size={12} /> {yv.connecting ? '…' : 'Mit YouVersion verbinden'}
    </button>
  )
}

function VerseActionBar({
  referenceLabel, existingHighlight, bookmarked, showBookmark, notes, currentUserId, noteDraft, setNoteDraft, noteLinks, setNoteLinks, onOpenLinkPicker,
  noteVisibility, setNoteVisibility, noteCommunityId, setNoteCommunityId, noteSiblingIds, setNoteSiblingIds, myCommunities,
  linkedFeedPosts, linkedPrayers, linkedCreeds, referencesLoading,
  savedColors, recentColors, isColorSaved, onToggleSaveColor,
  onClose, onHighlight, onRemoveHighlight, onBookmark, onSaveNote, onRemoveNote, onShareToFeed,
}) {
  const navigate = useNavigate()
  const [showVisibilityPicker, setShowVisibilityPicker] = useState(false)
  const [showReferences, setShowReferences] = useState(false)
  const activeHex = existingHighlight && isCustomHex(existingHighlight.color)
    ? normalizeColorKey(existingHighlight.color)
    : null
  const [showMoreColors, setShowMoreColors] = useState(false)
  const [showPublicNotes, setShowPublicNotes] = useState(false)
  const otherNotes = notes.filter(n => !n.isOwn)
  const visibilityObj = VISIBILITY_OPTIONS.find(o => o.key === noteVisibility) || VISIBILITY_OPTIONS[0]
  const VisibilityIcon = visibilityObj.icon

  const references = [
    ...(linkedFeedPosts || []).map(p => ({ type: 'feed', id: p.id, text: p.body, author: p.author, to: `/feed/post/${p.id}` })),
    ...(linkedPrayers || []).map(p => ({ type: 'prayer', id: p.id, text: p.title || p.description, author: p.author, to: `/prayer/${p.id}` })),
    ...(linkedCreeds || []).map(c => ({ type: 'creed', id: c.id, text: c.body || c.creed?.title, author: c.creed?.author, to: c.creed?.user_id ? `/user/${c.creed.user_id}` : null })),
  ]

  return (
    <div
      className="verse-action-bar fixed left-1/2 -translate-x-1/2 w-full max-w-md rounded-t-2xl p-4 z-50 flex flex-col"
      style={{ bottom: 'calc(var(--bottom-nav-h, 0px) + var(--keyboard-inset, 0px))', backgroundColor: 'var(--color-bg)', borderTop: '1px solid var(--color-border)', boxShadow: '0 -4px 24px rgba(0,0,0,0.15)', paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))', maxHeight: 'min(80vh, calc(100dvh - var(--bottom-nav-h, 0px) - var(--keyboard-inset, 0px) - 12px))' }}
    >
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <p className="font-semibold" style={{ color: 'var(--color-text)' }}>{referenceLabel}</p>
        <div className="flex items-center gap-1">
          {onShareToFeed && (
            <button onClick={onShareToFeed} title="Als Beitrag teilen">
              <Share2 size={17} style={{ color: 'var(--color-text-tertiary)' }} />
            </button>
          )}
          <button onClick={onClose}><X size={18} style={{ color: 'var(--color-text-tertiary)' }} /></button>
        </div>
      </div>

      <div className="overflow-y-auto">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {(showMoreColors ? MORE_COLORS : PRIMARY_COLORS).map(name => {
            const hex = HIGHLIGHT_COLORS[name]
            const isActive = colorsEqual(existingHighlight?.color, name) || colorsEqual(existingHighlight?.color, hex)
            return (
              <button
                key={name}
                onClick={() => isActive ? onRemoveHighlight(existingHighlight.id) : onHighlight(name)}
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ backgroundColor: hex, boxShadow: isActive ? '0 0 0 2px var(--color-accent)' : `0 0 0 1px var(--color-border)`, color: highlightTextColor(hex) }}
              >
                {isActive && <span style={{ fontSize: 12 }}>✓</span>}
              </button>
            )
          })}
          {showMoreColors ? (
            <>
              {(savedColors || []).map(hex => {
                const isActive = colorsEqual(existingHighlight?.color, hex)
                return (
                  <button
                    key={hex}
                    onClick={() => isActive ? onRemoveHighlight(existingHighlight.id) : onHighlight(hex)}
                    onContextMenu={e => { e.preventDefault(); onToggleSaveColor?.(hex) }}
                    title="Gespeicherte Farbe (lang drücken: entfernen)"
                    className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: hex, boxShadow: isActive ? '0 0 0 2px var(--color-accent)' : '0 0 0 1px var(--color-border)', color: highlightTextColor(hex) }}
                  >
                    {isActive && <span style={{ fontSize: 12 }}>✓</span>}
                  </button>
                )
              })}
              <CustomColorButton
                value={null}
                onPick={(hex) => onHighlight(hex)}
                onCommit={(hex) => { if (!isColorSaved?.(hex)) onToggleSaveColor?.(hex) }}
                onRemove={() => onRemoveHighlight(existingHighlight.id)}
              />
              <button
                onClick={() => setShowMoreColors(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center ml-2"
                style={{ backgroundColor: 'var(--color-bg-secondary)' }}
                aria-label="Zurück"
              >
                <X size={16} style={{ color: 'var(--color-text)' }} />
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowMoreColors(true)}
              className="w-9 h-9 rounded-full relative"
              aria-label="Weitere Farben"
            >
              {['#f09ae9', '#e8312a', '#8ef98b'].map((c, i) => (
                <span key={c} className="absolute w-6 h-6 rounded-full" style={{ backgroundColor: c, left: 2 + i * 5, top: 6, border: '1px solid var(--color-bg)' }} />
              ))}
            </button>
          )}
          {showBookmark && (
            <button
              onClick={onBookmark}
              className="w-8 h-8 rounded-full flex items-center justify-center ml-auto"
              style={{ backgroundColor: 'var(--color-bg-secondary)' }}
            >
              <Bookmark size={16} style={{ color: bookmarked ? 'var(--color-accent)' : 'var(--color-text-tertiary)' }} fill={bookmarked ? 'var(--color-accent)' : 'none'} />
            </button>
          )}
        </div>

        {notes.filter(n => n.isOwn).map(n => (
          <BibleNoteCard key={n.id} note={n} onRemove={() => onRemoveNote(n.id)} />
        ))}

        {otherNotes.length > 0 && (
          <div className="mb-3">
            <button
              onClick={() => setShowPublicNotes(v => !v)}
              className="flex items-center gap-1.5 text-xs font-medium"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {showPublicNotes ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {showPublicNotes ? 'Notizen ausblenden' : `Öffentliche Notizen ansehen (${otherNotes.length})`}
            </button>
            {showPublicNotes && (
              <div className="mt-2">
                {otherNotes.map(n => <BibleNoteCard key={n.id} note={n} />)}
              </div>
            )}
          </div>
        )}

        {(referencesLoading || references.length > 0) && (
          <div className="mb-3">
            <button
              onClick={() => setShowReferences(v => !v)}
              className="flex items-center gap-1.5 text-xs font-medium"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {showReferences ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {referencesLoading ? 'Lädt Erwähnungen…' : `${references.length} Erwähnung${references.length === 1 ? '' : 'en'} anzeigen`}
            </button>
            {showReferences && (
              <div className="mt-2 flex flex-col gap-1.5">
                {references.map(r => (
                  <button
                    key={`${r.type}-${r.id}`}
                    onClick={() => r.to && navigate(r.to)}
                    className="flex items-start gap-2 p-2 rounded-lg text-left"
                    style={{ backgroundColor: 'var(--color-bg-secondary)' }}
                  >
                    <span style={{ fontSize: 14, flexShrink: 0 }}>
                      {r.type === 'feed' ? '📖' : r.type === 'prayer' ? '🙏' : '✝️'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>
                        {r.author?.full_name || r.author?.username || 'Jemand'}
                      </p>
                      {r.text && (
                        <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>{r.text}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 mb-2">
          <StickyNote size={16} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
          <textarea
            value={noteDraft}
            onChange={e => { setNoteDraft(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px` }}
            placeholder="Notiz hinzufügen…"
            rows={2}
            className="flex-1 px-3 py-2 rounded-xl text-sm"
            style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text)', border: '1px solid var(--color-border)', resize: 'none', lineHeight: 1.4 }}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap mb-2">
          {noteLinks.map((att, i) => (
            <BibleReferenceChip key={i} attachment={att} variant="chip" onRemove={() => setNoteLinks(noteLinks.filter((_, j) => j !== i))} />
          ))}
          <button
            onClick={onOpenLinkPicker}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)' }}
          >
            <Link2 size={13} /> Bibelvers verknüpfen
          </button>
        </div>

        {noteDraft.trim() && (
          <div className="mb-2">
            <button
              onClick={() => setShowVisibilityPicker(v => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)' }}
            >
              <VisibilityIcon size={13} /> {visibilityObj.label}
              {showVisibilityPicker ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {showVisibilityPicker && (
              <div className="mt-2">
                <VisibilityPicker
                  value={noteVisibility}
                  onChange={setNoteVisibility}
                  communityId={noteCommunityId}
                  onCommunityIdChange={setNoteCommunityId}
                  siblingIds={noteSiblingIds}
                  onSiblingIdsChange={setNoteSiblingIds}
                  myCommunities={myCommunities}
                />
              </div>
            )}
          </div>
        )}

        <button
          onClick={onSaveNote}
          disabled={!noteDraft.trim()}
          className="w-full px-3 py-2 rounded-xl text-sm font-medium"
          style={{ backgroundColor: noteDraft.trim() ? 'var(--color-accent)' : 'var(--color-bg-secondary)', color: noteDraft.trim() ? 'white' : 'var(--color-text-tertiary)' }}
        >
          Notiz sichern
        </button>
      </div>
    </div>
  )
}

// "…"-Button für frei wählbare Farben über den nativen Farbwähler (<input type="color">).
function CustomColorButton({ value, onPick, onCommit, onRemove }) {
  const inputRef = useRef(null)
  // Natives "change" feuert erst beim Schließen des Farbwählers → dann speichern
  // (React-onChange entspricht "input" und käme bei jedem Ziehen).
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    const h = e => onCommit?.(e.target.value)
    el.addEventListener('change', h)
    return () => el.removeEventListener('change', h)
  })
  const isActive = !!value

  return (
    <button
      type="button"
      onContextMenu={e => { e.preventDefault(); if (isActive) onRemove?.() }}
      className="w-9 h-9 rounded-full flex items-center justify-center relative overflow-hidden"
      style={{
        backgroundColor: isActive ? value : 'var(--color-bg-secondary)',
        boxShadow: isActive ? '0 0 0 2px var(--color-accent)' : 'none',
        color: isActive ? highlightTextColor(value) : undefined,
      }}
      title="Eigene Farbe"
    >
      {isActive ? <span style={{ fontSize: 12 }}>✓</span> : <MoreHorizontal size={16} style={{ color: 'var(--color-text-tertiary)' }} />}
      <input
        ref={inputRef}
        type="color"
        value={value || '#fff94f'}
        onInput={e => onPick(e.target.value)}
        onChange={() => {}}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        aria-label="Eigene Farbe wählen"
      />
    </button>
  )
}
