export type TermUnit = 'days' | 'weeks' | 'months' | 'years'

export interface LoanScheduleItem {
  dueDate: Date
  principalDue: number
  interestDue: number
  totalDue: number
}

export interface LoanCalculation {
  periodicPayment: number   // payment per period (day / week / month / year)
  monthlyPayment: number    // alias kept for backward compatibility
  totalInterest: number
  totalPayment: number
  schedule: LoanScheduleItem[]
  periodLabel: string       // e.g. "Daily", "Weekly", "Monthly", "Annual"
}

function r(n: number) {
  return Math.round(n * 100) / 100
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

/**
 * Amortizing schedule for equal periodic payments.
 * Works for any period (days / weeks / months / years).
 */
function amortize(
  principal: number,
  periodicRate: number,
  periods: number,
  startDate: Date,
  periodDays: number  // how many calendar days between each payment
): LoanScheduleItem[] {
  const payment =
    periodicRate === 0
      ? principal / periods
      : principal * (periodicRate * Math.pow(1 + periodicRate, periods)) /
        (Math.pow(1 + periodicRate, periods) - 1)

  const schedule: LoanScheduleItem[] = []
  let balance = principal

  for (let i = 1; i <= periods; i++) {
    const interest = balance * periodicRate
    const principalDue = payment - interest
    schedule.push({
      dueDate: addDays(startDate, i * periodDays),
      principalDue: r(principalDue),
      interestDue: r(interest),
      totalDue: r(payment),
    })
    balance -= principalDue
  }

  return schedule
}

export function calculateLoan(
  principal: number,
  annualRate: number,
  termValue: number,
  startDate: Date,
  termUnit: TermUnit = 'months'
): LoanCalculation {
  const rate = annualRate / 100

  switch (termUnit) {
    case 'days': {
      // Short-term bullet: single payment at end of term
      const interest = r(principal * rate * (termValue / 365))
      const totalPayment = r(principal + interest)
      return {
        periodicPayment: totalPayment,
        monthlyPayment: totalPayment,
        totalInterest: interest,
        totalPayment,
        periodLabel: 'Bullet',
        schedule: [{
          dueDate: addDays(startDate, termValue),
          principalDue: r(principal),
          interestDue: interest,
          totalDue: totalPayment,
        }],
      }
    }

    case 'weeks': {
      const weeklyRate = rate / 52
      const schedule = amortize(principal, weeklyRate, termValue, startDate, 7)
      const totalPayment = r(schedule.reduce((s, x) => s + x.totalDue, 0))
      const periodicPayment = schedule[0]?.totalDue ?? 0
      return {
        periodicPayment,
        monthlyPayment: r(periodicPayment * 4),  // approx monthly equivalent
        totalInterest: r(totalPayment - principal),
        totalPayment,
        periodLabel: 'Weekly',
        schedule,
      }
    }

    case 'months': {
      const monthlyRate = rate / 12
      const schedule = amortize(principal, monthlyRate, termValue, startDate, 30)
      // Re-use setMonth for accurate dates
      const accurateSchedule: LoanScheduleItem[] = []
      let balance = principal
      const payment =
        monthlyRate === 0
          ? principal / termValue
          : principal * (monthlyRate * Math.pow(1 + monthlyRate, termValue)) /
            (Math.pow(1 + monthlyRate, termValue) - 1)

      for (let i = 1; i <= termValue; i++) {
        const interest = balance * monthlyRate
        const principalDue = payment - interest
        const dueDate = new Date(startDate)
        dueDate.setMonth(dueDate.getMonth() + i)
        accurateSchedule.push({
          dueDate,
          principalDue: r(principalDue),
          interestDue: r(interest),
          totalDue: r(payment),
        })
        balance -= principalDue
      }

      const totalPayment = r(payment * termValue)
      return {
        periodicPayment: r(payment),
        monthlyPayment: r(payment),
        totalInterest: r(totalPayment - principal),
        totalPayment,
        periodLabel: 'Monthly',
        schedule: accurateSchedule,
      }
    }

    case 'years': {
      const yearlyRate = rate
      const schedule = amortize(principal, yearlyRate, termValue, startDate, 365)
      // Use accurate setFullYear dates
      const accurateSchedule: LoanScheduleItem[] = []
      let balance = principal
      const payment =
        yearlyRate === 0
          ? principal / termValue
          : principal * (yearlyRate * Math.pow(1 + yearlyRate, termValue)) /
            (Math.pow(1 + yearlyRate, termValue) - 1)

      for (let i = 1; i <= termValue; i++) {
        const interest = balance * yearlyRate
        const principalDue = payment - interest
        const dueDate = new Date(startDate)
        dueDate.setFullYear(dueDate.getFullYear() + i)
        accurateSchedule.push({
          dueDate,
          principalDue: r(principalDue),
          interestDue: r(interest),
          totalDue: r(payment),
        })
        balance -= principalDue
      }

      const totalPayment = r(payment * termValue)
      return {
        periodicPayment: r(payment),
        monthlyPayment: r(payment / 12),  // approx monthly
        totalInterest: r(totalPayment - principal),
        totalPayment,
        periodLabel: 'Annual',
        schedule: accurateSchedule,
      }
    }
  }
}

export function generateLoanNumber(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 7)
  return `LN-${timestamp}-${random}`.toUpperCase()
}
