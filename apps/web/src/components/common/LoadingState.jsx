import { useEffect, useState } from 'react'

// Building a plan takes a while — the planner has to read the whole setup, find
// recipes that clear it, and balance them. A spinner on its own reads as a
// frozen page for that long, so the steps say what is happening and advance as
// it goes. The last step stays put rather than looping, because a cycle that
// starts over suggests the work started over too.
export function LoadingState({ label = 'Working…', steps = [], stepMs = 3200 }) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (steps.length < 2) return undefined

    const timer = setInterval(() => {
      setStep((current) => Math.min(current + 1, steps.length - 1))
    }, stepMs)

    return () => clearInterval(timer)
  }, [steps.length, stepMs])

  return (
    <div className="loading" role="status" aria-live="polite">
      <span className="loading__spinner" aria-hidden="true" />
      <span className="loading__label">{steps[step] ?? label}</span>

      {steps.length > 1 ? (
        <>
          <span className="loading__track" aria-hidden="true">
            {steps.map((item, index) => (
              <span
                key={item}
                className={`loading__tick${index <= step ? ' is-done' : ''}`}
              />
            ))}
          </span>
          <span className="loading__note">
            This usually takes about fifteen seconds.
          </span>
        </>
      ) : null}
    </div>
  )
}
