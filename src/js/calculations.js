/**
 * Sumukha Co-Op Society - Financial Calculations & Loan Analytics Engine
 */

export function formatCurrency(num) {
  if (num === null || num === undefined || isNaN(num)) return '₹0';
  return '₹' + Math.round(Number(num)).toLocaleString('en-IN');
}

export function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

export function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export function addMonths(dateStr, months) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function getMemberCommitment(member, defaultMonthly = 10000) {
  if (!member) return defaultMonthly;
  return member.monthly !== undefined ? Number(member.monthly) : defaultMonthly;
}

/**
 * Society-wide Financial Health KPI Aggregator
 */
export function calculateTotals(data) {
  const contribs = data.contribs || [];
  const loans = data.loans || [];
  const invs = data.invs || [];

  const totalContributions = contribs.reduce((sum, c) => sum + Number(c.amt || 0), 0);
  const totalLent = loans.reduce((sum, l) => sum + Number(l.amt || 0), 0);
  
  // Total repayments received across all loans
  const totalRepayments = loans.reduce((sum, l) => {
    const reps = l.reps || [];
    return sum + reps.reduce((rSum, r) => rSum + Number(r.amt || 0), 0);
  }, 0);

  const totalInvestedCost = invs.reduce((sum, i) => sum + Number(i.cost || 0), 0);
  const totalInvestmentValue = invs.reduce((sum, i) => sum + Number(i.value || 0), 0);
  const investmentGain = totalInvestmentValue - totalInvestedCost;

  // Cash in hand = Contributions + Repayments - Loans Issued - Investments Cost
  const cashInHand = totalContributions + totalRepayments - totalLent - totalInvestedCost;

  // Detailed loan metrics
  let totalOutstandingLoans = 0;
  let totalInterestEarned = 0;

  for (const loan of loans) {
    const analytics = calculateLoanAnalytics(loan);
    totalOutstandingLoans += Math.max(0, analytics.outstandingPrincipal);
    totalInterestEarned += analytics.interestPaid;
  }

  const totalNetProfit = totalInterestEarned + investmentGain;

  return {
    totalContributions,
    totalLent,
    totalRepayments,
    totalInvestedCost,
    totalInvestmentValue,
    investmentGain,
    cashInHand,
    totalOutstandingLoans,
    totalInterestEarned,
    totalNetProfit
  };
}

/**
 * Deep Loan Analytics Engine (User Requirement 5)
 * Returns every requested detail: date taken, tenure, monthly installment,
 * amount paid, months paid, months remaining, balance, and amortization.
 */
export function calculateLoanAnalytics(loan) {
  const principal = Number(loan.amt || 0);
  const interestRatePct = Number(loan.rate !== undefined ? loan.rate : 1);
  const principalPct = Number(loan.pct !== undefined ? loan.pct : 5);
  const tenure = Number(loan.n || 20);
  const issueDate = loan.date || getTodayDate();
  const reps = loan.reps || [];
  const today = getTodayDate();

  let repaymentPool = reps.reduce((s, r) => s + Number(r.amt || 0), 0);
  let openBalance = principal;
  const scheduleRows = [];

  for (let k = 1; k <= tenure; k++) {
    const dueDate = addMonths(issueDate, k);
    // Principal for this installment
    const prComponent = k === tenure ? openBalance : Math.min(openBalance, (principal * principalPct) / 100);
    // Interest is calculated on the opening principal for the month
    const intComponent = (openBalance * interestRatePct) / 100;
    const totalDue = intComponent + prComponent;

    // Apply repayment pool (Interest first, then Principal)
    const intPaid = Math.min(repaymentPool, intComponent);
    repaymentPool -= intPaid;

    const prPaid = Math.min(repaymentPool, prComponent);
    repaymentPool -= prPaid;

    const isDueNow = dueDate <= today;
    const isPaid = (intPaid + prPaid) >= (totalDue - 0.5);

    scheduleRows.push({
      k,
      dueDate,
      openingPrincipal: openBalance,
      interest: intComponent,
      principal: prComponent,
      totalDue,
      interestPaid: intPaid,
      principalPaid: prPaid,
      totalPaidForInstallment: intPaid + prPaid,
      remainingForInstallment: Math.max(0, totalDue - (intPaid + prPaid)),
      isDueNow,
      isPaid
    });

    openBalance = Math.max(0, openBalance - prComponent);
  }

  // Summary figures
  const totalPrincipalRepaid = scheduleRows.reduce((sum, r) => sum + r.principalPaid, 0);
  const totalInterestPaid = scheduleRows.reduce((sum, r) => sum + r.interestPaid, 0);
  const totalPaid = reps.reduce((s, r) => s + Number(r.amt || 0), 0);

  const outstandingPrincipal = loan.closed ? 0 : Math.max(0, principal - totalPrincipalRepaid);
  
  // Count full months paid
  const monthsPaid = scheduleRows.filter(r => r.isPaid).length;
  const monthsRemaining = Math.max(0, tenure - monthsPaid);

  // Overdue and upcoming
  const overdueAmount = scheduleRows.reduce((sum, r) => {
    return r.isDueNow ? sum + r.remainingForInstallment : sum;
  }, 0);

  const nextInstallment = scheduleRows.find(r => r.remainingForInstallment > 0.5) || null;
  const currentMonthlyPaying = nextInstallment ? nextInstallment.totalDue : ((principal * principalPct) / 100) + (outstandingPrincipal * interestRatePct / 100);

  // Foreclosure rules: Lock-in for first 2 months
  const foreclosureEligibleDate = addMonths(issueDate, 2);
  const isForeclosureEligible = today >= foreclosureEligibleDate;
  
  // Unbilled interest due now
  const unbilledInterestDue = scheduleRows.reduce((sum, r) => {
    return r.isDueNow ? sum + (r.interest - r.interestPaid) : sum;
  }, 0);
  const foreclosureAmount = outstandingPrincipal + unbilledInterestDue;

  return {
    loanId: loan.id,
    borrowerId: loan.m,
    principalBorrowed: principal,
    issueDate,
    tenure,
    monthlyPrincipalPct: principalPct,
    interestRatePct,
    currentMonthlyPaying,
    totalPaid,
    totalPrincipalRepaid,
    interestPaid: totalInterestPaid,
    monthsPaid,
    monthsRemaining,
    outstandingPrincipal,
    overdueAmount,
    nextInstallment,
    isClosed: Boolean(loan.closed),
    foreclosureEligibleDate,
    isForeclosureEligible,
    foreclosureAmount,
    scheduleRows
  };
}

/**
 * Generates Member-wise Contributions Matrix across months
 */
export function calculateContributionsMatrix(data) {
  const currentMo = getCurrentMonth();
  const contribs = data.contribs || [];
  const members = data.members || [];

  // Determine chronological range of months
  const recordedMonths = Array.from(new Set(contribs.map(c => c.month))).concat([currentMo]).sort();
  const startMonth = recordedMonths[0] || currentMo;
  const endMonth = recordedMonths[recordedMonths.length - 1] || currentMo;

  const allMonths = [];
  let [y, m] = startMonth.split('-').map(Number);
  const [endY, endM] = endMonth.split('-').map(Number);

  while (y < endY || (y === endY && m <= endM)) {
    allMonths.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }

  // Monthly totals across members
  const monthTotals = {};
  allMonths.forEach(mo => { monthTotals[mo] = 0; });

  let grandTotal = 0;

  const memberRows = members.map(member => {
    const commitment = getMemberCommitment(member, data.monthly);
    let memberTotal = 0;

    const monthCells = allMonths.map(mo => {
      const match = contribs.find(c => c.m === member.id && c.month === mo);
      const paidAmt = match ? Number(match.amt) : 0;
      monthTotals[mo] += paidAmt;
      memberTotal += paidAmt;

      const isCurrentOrPast = mo <= currentMo;
      const isShortfall = isCurrentOrPast && paidAmt < commitment;
      const isDue = isCurrentOrPast && paidAmt === 0;

      return {
        month: mo,
        paid: paidAmt,
        isDue,
        isShortfall,
        status: paidAmt > 0 ? (paidAmt >= commitment ? 'paid' : 'partial') : (isCurrentOrPast ? 'due' : 'future')
      };
    });

    grandTotal += memberTotal;

    // Expected to date
    const elapsedMonthsCount = allMonths.filter(mo => mo <= currentMo).length;
    const expectedToDate = commitment * elapsedMonthsCount;
    const pendingBalance = Math.max(0, expectedToDate - memberTotal);

    return {
      member,
      commitment,
      monthCells,
      totalContributed: memberTotal,
      pendingBalance
    };
  });

  return {
    months: allMonths,
    monthTotals,
    grandTotal,
    memberRows
  };
}

/**
 * Month-wise investments aggregator
 */
export function calculateInvestmentsSummary(data) {
  const invs = data.invs || [];
  const monthlyGroups = {};

  invs.forEach(inv => {
    const mo = (inv.date || '').slice(0, 7) || 'Unspecified';
    if (!monthlyGroups[mo]) {
      monthlyGroups[mo] = { month: mo, count: 0, cost: 0, value: 0 };
    }
    monthlyGroups[mo].count++;
    monthlyGroups[mo].cost += Number(inv.cost || 0);
    monthlyGroups[mo].value += Number(inv.value || 0);
  });

  const sortedMonths = Object.keys(monthlyGroups).sort();
  let cumulativeCost = 0;
  let totalCost = 0;
  let totalValue = 0;

  const rows = sortedMonths.map(mo => {
    const g = monthlyGroups[mo];
    cumulativeCost += g.cost;
    totalCost += g.cost;
    totalValue += g.value;
    const gain = g.value - g.cost;

    return {
      month: mo,
      count: g.count,
      cost: g.cost,
      value: g.value,
      gain,
      cumulativeCost
    };
  });

  return {
    rows,
    totalCost,
    totalValue,
    totalGain: totalValue - totalCost
  };
}
