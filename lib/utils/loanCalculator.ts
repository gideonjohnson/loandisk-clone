export interface LoanScheduleItem {
  dueDate: Date
  principalDue: number
  interestDue: number
  totalDue: number
}

export interface LoanCalculation {
  monthlyPayment: number
  totalInterest: number
  totalPayment: number
  schedule: LoanScheduleItem[]
}

export function calculateLoan(
  principal: number,
  annualRate: number,
  termMonths: number,
  startDate: Date
): LoanCalculation {
  const monthlyRate = annualRate / 100 / 12
  
  // Calculate monthly payment using amortization formula
  const monthlyPayment =
    principal *
    (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
    (Math.pow(1 + monthlyRate, termMonths) - 1)

  const schedule: LoanScheduleItem[] = []
  let remainingBalance = principal
  const totalPayment = monthlyPayment * termMonths
  const totalInterest = totalPayment - principal

  for (let month = 1; month <= termMonths; month++) {
    const interestDue = remainingBalance * monthlyRate
    const principalDue = monthlyPayment - interestDue
    
    const dueDate = new Date(startDate)
    dueDate.setMonth(dueDate.getMonth() + month)

    schedule.push({
      dueDate,
      principalDue: Math.round(principalDue * 100) / 100,
      interestDue: Math.round(interestDue * 100) / 100,
      totalDue: Math.round(monthlyPayment * 100) / 100,
    })

    remainingBalance -= principalDue
  }

  return {
    monthlyPayment: Math.round(monthlyPayment * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalPayment: Math.round(totalPayment * 100) / 100,
    schedule,
  }
}

export function generateLoanNumber(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 7)
  return `LN-${timestamp}-${random}`.toUpperCase()
}
