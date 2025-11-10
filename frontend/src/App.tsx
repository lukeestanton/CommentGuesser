import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type CommentOption = {
  commentId: string
  text: string
}

type GameRound = {
  roundId: string
  videoLink: string
  options: CommentOption[]
}

type RevealedOption = CommentOption & {
  likes: number
  isCorrect: boolean
}

type GuessResult = {
  isCorrect: boolean
  selectedOptionId: string
  options: RevealedOption[]
}

type YTPlayer = {
  destroy: () => void
  getDuration: () => number
  getCurrentTime: () => number
}

type YTPlayerOptions = {
  videoId: string
  height: string
  width: string
  playerVars?: Record<string, number>
  events?: {
    onReady?: (event: { target: YTPlayer }) => void
  }
}

type YTNamespace = {
  Player: new (element: HTMLElement | string, options: YTPlayerOptions) => YTPlayer
}

declare global {
  interface Window {
    YT?: YTNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? ''

const GET_ROUND_ENDPOINT = `${API_BASE_URL}/api/get-game-round`
const SUBMIT_GUESS_ENDPOINT = `${API_BASE_URL}/api/submit-guess`
const SCORE_BASE = 100

const formatLikes = (value: number) =>
  new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)

const getVideoId = (url: string) => {
  try {
    const parsed = new URL(url)
    return (
      parsed.searchParams.get('v') ??
      parsed.pathname.split('/').filter(Boolean).pop() ??
      null
    )
  } catch (err) {
    console.error('Failed to parse video id', err)
    return null
  }
}

function App() {
  const [gameRound, setGameRound] = useState<GameRound | null>(null)
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [guessResult, setGuessResult] = useState<GuessResult | null>(null)
  const [isLoadingRound, setIsLoadingRound] = useState(true)
  const [isSubmittingGuess, setIsSubmittingGuess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [streak, setStreak] = useState(0)
  const [score, setScore] = useState(0)
  const [lastRoundScore, setLastRoundScore] = useState<number | null>(null)
  const [isPlayerApiReady, setIsPlayerApiReady] = useState(false)
  const [isPlayerReady, setIsPlayerReady] = useState(false)
  const playerRef = useRef<YTPlayer | null>(null)
  const playerContainerRef = useRef<HTMLDivElement | null>(null)

  const fetchRound = useCallback(async (signal?: AbortSignal) => {
    setIsLoadingRound(true)
    if (!signal?.aborted) {
      setError(null)
    }

    try {
      const response = await fetch(GET_ROUND_ENDPOINT, { signal })
      const payload = await response.json()

      if (!response.ok) {
        const message =
          typeof payload?.detail === 'string'
            ? payload.detail
            : 'Unable to fetch a new video right now. Please try again soon.'
        throw new Error(message)
      }

      const data = payload as GameRound

      if (signal?.aborted) {
        return
      }

      setGameRound(data)
      setSelectedOptionId(null)
      setGuessResult(null)
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        return
      }

      const message =
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.'
      setError(message)
      setGameRound(null)
      setGuessResult(null)
      setSelectedOptionId(null)
    } finally {
      if (!signal?.aborted) {
        setIsLoadingRound(false)
      }
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetchRound(controller.signal)

    return () => controller.abort()
  }, [fetchRound])

  const videoId = useMemo(
    () => (gameRound ? getVideoId(gameRound.videoLink) : null),
    [gameRound],
  )

  const isInitialLoading = isLoadingRound && !gameRound && !error

  useEffect(() => {
    setIsPlayerReady(false)
    if (playerRef.current) {
      playerRef.current.destroy()
      playerRef.current = null
    }
  }, [videoId])

  useEffect(() => {
    if (window.YT?.Player) {
      setIsPlayerApiReady(true)
      return
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]',
    )

    if (existingScript) {
      const handleReady = () => setIsPlayerApiReady(true)
      window.onYouTubeIframeAPIReady = handleReady
      return
    }

    const handleReady = () => {
      setIsPlayerApiReady(true)
    }

    window.onYouTubeIframeAPIReady = handleReady

    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.async = true
    document.body.appendChild(script)

    return () => {
      if (window.onYouTubeIframeAPIReady === handleReady) {
        delete window.onYouTubeIframeAPIReady
      }
    }
  }, [])

  useEffect(() => {
    if (!isPlayerApiReady || !videoId || !playerContainerRef.current) {
      return
    }

    playerContainerRef.current.innerHTML = ''

    const player = new window.YT!.Player(playerContainerRef.current, {
      height: '100%',
      width: '100%',
      videoId,
      playerVars: {
        modestbranding: 1,
        rel: 0,
        playsinline: 1,
        // controls: 0,
        // disablekb: 1,
      },
      events: {
        onReady: () => {
          setIsPlayerReady(true)
        },
      },
    })

    playerRef.current = player

    return () => {
      player.destroy()
      playerRef.current = null
    }
  }, [isPlayerApiReady, videoId])

  const handleOptionSelect = (commentId: string) => {
    if (isLoadingRound || isSubmittingGuess || guessResult) {
      return
    }

    setSelectedOptionId(commentId)
  }

  const handleSubmitGuess = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()

    if (!gameRound || !selectedOptionId || guessResult) {
      return
    }

    setIsSubmittingGuess(true)

    try {
      const response = await fetch(SUBMIT_GUESS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roundId: gameRound.roundId,
          commentId: selectedOptionId,
        }),
      })

      const payload = await response.json()

      if (!response.ok) {
        const message =
          typeof payload?.detail === 'string'
            ? payload.detail
            : 'We could not score that guess. Please try a new round.'
        throw new Error(message)
      }

      const data = payload as GuessResult
      setGuessResult(data)

      const duration = playerRef.current?.getDuration() ?? 0
      const currentTime = playerRef.current?.getCurrentTime() ?? 0
      const remaining = Math.max(duration - currentTime, 0)
      const ratio = duration > 0 ? remaining / duration : 1
      // Bucketize remaining time into 0..10 (in increments of 10%), higher is faster
      const timeLeftBuckets = Math.max(0, Math.min(10, Math.floor(ratio * 10)))
      const sortedByLikes = [...data.options].sort((a, b) => b.likes - a.likes)
      const rank =
        sortedByLikes.findIndex((option) => option.commentId === data.selectedOptionId) + 1
      const isTop = rank === 1

      const nextStreak = isTop ? streak + 1 : 0
      setStreak(nextStreak)

      const roundScore = isTop
        ? Math.round(SCORE_BASE * (1.1 * nextStreak + 1.1 * timeLeftBuckets))
        : 0
      const normalizedRoundScore = roundScore || 0

      if (isTop) {
        setScore((prev) => prev + normalizedRoundScore)
        setLastRoundScore(normalizedRoundScore)
      } else {
        setScore(0)
        setLastRoundScore(0)
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setError(message)
      setGameRound(null)
      setGuessResult(null)
      setSelectedOptionId(null)
    } finally {
      setIsSubmittingGuess(false)
    }
  }

  const handleNextRound = () => {
    fetchRound()
  }

  const handleRetry = () => {
    fetchRound()
  }

  const isSubmitDisabled =
    isLoadingRound || isSubmittingGuess || !selectedOptionId || Boolean(guessResult)

  const isNextDisabled = isLoadingRound || !guessResult

  return (
    <div className="page-shell">
      <div className="page-shell__glow page-shell__glow--one" />
      <div className="page-shell__glow page-shell__glow--two" />
      <main className="layout">
        <header className="masthead">
          <div className="masthead__intro">
            <span className="masthead__eyebrow">Comment Guesser</span>
            <h1 className="masthead__title">Guess the Top Comment</h1>
          </div>
          <aside className="masthead__scoreboard" aria-label="Live stats">
            <div className="scoreboard__header">
              <span>Live scorecard</span>
            </div>
            <div className="status-cards">
              <div
                className={`streak-card ${streak > 0 ? 'streak-card--active' : ''}`}
                role="status"
                aria-live="polite"
              >
                <span className="streak-card__label">Current streak</span>
                <span className="streak-card__value">{streak}</span>
              </div>
              <div className="score-card" role="status" aria-live="polite">
                <span className="score-card__label">Total score</span>
                <span className="score-card__value">{score}</span>
                {lastRoundScore !== null && (
                  <span
                    className={`score-card__delta ${
                      lastRoundScore >= 0 ? 'score-card__delta--positive' : 'score-card__delta--negative'
                    }`}
                  >
                    {lastRoundScore >= 0 ? '+' : ''}
                    {lastRoundScore}
                  </span>
                )}
              </div>
            </div>
          </aside>
        </header>

        {error && (
          <section className="state-card state-card--error">
            <h2>We hit a snag</h2>
            <p>{error}</p>
            <button className="button button--primary" onClick={handleRetry}>
              Try again
            </button>
          </section>
        )}

        {isInitialLoading && (
          <section className="state-card state-card--loading">
            <div className="loading-spinner" />
            <p>Fetching a new short and its comment section...</p>
          </section>
        )}

        {!error && gameRound && (
          <section className="game-board">
            <article className="surface surface--video">
              <div className="surface__header">
                <h2>Featured short</h2>
              </div>
              <div className="video-frame">
                {videoId ? (
                  <div
                    ref={playerContainerRef}
                    className={`video-frame__player ${isPlayerReady ? '' : 'video-frame__player--loading'}`}
                  />
                ) : (
                  <div className="video-frame__fallback">
                    <p>Video unavailable</p>
                  </div>
                )}
                {isLoadingRound && (
                  <div className="surface__overlay">
                    <div className="loading-spinner" />
                  </div>
                )}
              </div>
            </article>

            <article className="surface surface--choices">
              <form className="choices-form" onSubmit={handleSubmitGuess}>
                <div className="surface__header">
                  <h2>Guess</h2>
                </div>

                <div className="choices-grid">
                  {gameRound.options.map((option, index) => {
                    const revealedOption = guessResult?.options.find(
                      (revealed) => revealed.commentId === option.commentId,
                    )
                    const isCorrect = Boolean(revealedOption?.isCorrect)
                    const isUserChoice = guessResult
                      ? guessResult.selectedOptionId === option.commentId
                      : selectedOptionId === option.commentId
                    const isDisabled =
                      isLoadingRound || isSubmittingGuess || Boolean(guessResult)

                    const classNames = ['choice']

                    if (isCorrect && guessResult) {
                      classNames.push('choice--correct')
                    } else if (guessResult && isUserChoice && !isCorrect) {
                      classNames.push('choice--incorrect')
                    } else if (!guessResult && isUserChoice) {
                      classNames.push('choice--selected')
                    }

                    if (isDisabled) {
                      classNames.push('choice--disabled')
                    }

                    return (
                      <button
                        type="button"
                        key={option.commentId}
                        className={classNames.join(' ')}
                        onClick={() => handleOptionSelect(option.commentId)}
                        disabled={isDisabled}
                        aria-pressed={isUserChoice}
                      >
                        <span className="choice__index">{String.fromCharCode(65 + index)}.</span>
                        <p className="choice__text">{option.text}</p>

                        {guessResult && revealedOption && (
                          <div className="choice__meta">
                            <div className="choice__badges">
                              {isCorrect && <span className="choice__badge choice__badge--win">Top comment</span>}
                              {guessResult.selectedOptionId === option.commentId && !isCorrect && (
                                <span className="choice__badge choice__badge--warn">Your pick</span>
                              )}
                            </div>
                            <span className="choice__likes">
                              {formatLikes(revealedOption.likes)} likes
                            </span>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>

                <div className="form-actions">
                  <button type="submit" className="button button--primary" disabled={isSubmitDisabled}>
                    Lock in guess
                  </button>
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={handleNextRound}
                    disabled={isNextDisabled}
                  >
                    Next video
                  </button>
                </div>
              </form>

              {(isLoadingRound || isSubmittingGuess) && gameRound && (
                <div className="surface__overlay surface__overlay--subtle">
                  <div className="loading-spinner" />
                </div>
              )}
            </article>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
