import { useGroceryList } from '../../hooks/useGroceryList'
import { useMealPlan } from '../../hooks/useMealPlan'
import { SafetyDisclaimer } from '../common/SafetyDisclaimer'
import { GroceryList } from './GroceryList'

export function GroceryView({ onBackToPlan }) {
  const { plan } = useMealPlan()
  const { items } = useGroceryList()

  const confirmed = Boolean(plan?.confirmedDates?.length)

  return (
    <>
      <h1 className="page-title">Your grocery list</h1>

      <section className="panel">
        <h2 className="panel__title">
          {confirmed ? 'Everything this plan needs' : 'Confirm your plan first'}
        </h2>

        {confirmed && items.length ? (
          <GroceryList />
        ) : (
          <>
            <p className="panel__lede">
              The grocery list is built from the days you confirm, so nothing
              is bought for a plan you are still editing. Head back to your
              plan, get the days how you want them, then confirm.
            </p>
            <button type="button" className="button button--primary button--large" onClick={onBackToPlan}>
              Back to my plan
            </button>
          </>
        )}
      </section>

      <SafetyDisclaimer />
    </>
  )
}
