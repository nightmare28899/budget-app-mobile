import { NativeModules, Platform } from 'react-native';

export type AppLanguage = 'en' | 'es';
export type TranslationValues = Record<string, string | number>;

const en = {
  'common.ok': 'OK',
  'common.cancel': 'Cancel',
  'common.continue': 'Continue',
  'common.save': 'Save',
  'common.edit': 'Edit',
  'common.delete': 'Delete',
  'common.remove': 'Remove',
  'common.logout': 'Logout',
  'common.send': 'Send',
  'common.retry': 'Retry',
  'common.success': 'Success',
  'common.error': 'Error',
  'common.loading': 'Loading...',
  'common.currency': 'Currency',
  'common.notAvailable': 'Not available',
  'common.maxAmountExceeded': 'Amount cannot exceed {max}',
  'common.amountPlaceholder': '0.00',

  'language.label': 'Language',
  'language.english': 'English',
  'language.spanish': 'Spanish',
  'app.name': 'BudgetApp',
  'app.tagline': 'Track. Plan. Grow.',

  'auth.appSubtitle': 'Track your spending, master your finances',
  'auth.emailPlaceholder': 'john@example.com',
  'auth.passwordPlaceholder': '••••••••',
  'auth.namePlaceholder': 'John Doe',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.signIn': 'Sign In',
  'auth.noAccount': "Don't have an account?",
  'auth.signUp': 'Sign Up',
  'auth.createAccount': 'Create Account',
  'auth.createAccountSubtitle': 'Start tracking your expenses today',
  'auth.fullName': 'Full Name',
  'auth.confirmPassword': 'Confirm Password',
  'auth.createAccountButton': 'Create Account',
  'auth.alreadyHaveAccount': 'Already have an account?',
  'auth.addPhoto': 'Add Photo',
  'auth.changePhoto': 'Change Photo',
  'auth.removePhoto': 'Remove',
  'auth.syncingPendingRegistrations': 'Syncing pending registrations...',
  'auth.pendingOfflineRegistrations.one':
    '{count} pending offline registration',
  'auth.pendingOfflineRegistrations.other':
    '{count} pending offline registrations',
  'auth.offlineSavedHint':
    'Saved registrations are sent automatically when internet connection is available.',
  'auth.continueGuest': 'Continue in guest mode',
  'auth.orContinueWith': 'or continue with',
  'auth.continueWithGoogle': 'Continue with Google',
  'legal.readTerms': 'Read Terms and Conditions',
  'legal.registerNotice':
    'By creating your account, you accept the Terms and Conditions.',
  'legal.googleNotice':
    'By continuing with Google, you accept the Terms and Conditions.',
  'legal.termsTitle': 'Terms and Conditions',
  'legal.termsSubtitle':
    'Review the rules, responsibilities, and service limits that apply when you use BudgetApp.',
  'legal.effectiveDate': 'Effective date',
  'auth.googleSignInFailed': 'Google Sign-In Failed',
  'auth.googleConfigMissing':
    'Google sign-in is not configured yet. Add GOOGLE_WEB_CLIENT_ID to the mobile .env and enable Google Authentication in Firebase.',
  'auth.googleMissingIdToken':
    'Google sign-in did not return an ID token. Check your Firebase Authentication and OAuth client configuration.',
  'auth.googleInProgress':
    'A Google sign-in request is already in progress. Please wait a moment and try again.',
  'auth.googlePlayServicesUnavailable':
    'Google Play Services are not available on this device.',
  'auth.googleDeveloperError':
    'Android Google sign-in is not fully configured yet. Add the app SHA-1 and SHA-256 in Firebase, download a new google-services.json, and rebuild the app.',
  'auth.googleSignInGeneric':
    'We could not complete Google sign-in right now. Please try again.',
  'guest.accessTitle': 'Access & Backup',
  'guest.statusGuest': 'Guest mode',
  'guest.statusAccount': 'Account connected',
  'guest.accessGuestDescription':
    'You can use the app immediately with local data stored on this device. Sign in later for cloud backup, sync, recovery, and future premium restore.',
  'guest.accessAccountDescription':
    'Your account keeps the app ready for backup, sync, recovery, and future premium restore across devices.',
  'guest.benefitCloudBackup': 'Cloud backup when you sign in',
  'guest.benefitSync': 'Sync across devices later',
  'guest.benefitRecovery': 'Account recovery if you change phones',
  'guest.benefitPremiumRestore': 'Future premium restore tied to your account',
  'guest.benefitContinuity': 'Better long-term data continuity',
  'guest.accountReadyHint':
    'You can keep using the app normally. Account features stay available here whenever you need them.',
  'premium.title': 'Premium Required',
  'premium.acquiredTitle': 'Premium Acquired',
  'premium.subtitle': 'This feature is available only in the Premium version.',
  'premium.acquiredSubtitle':
    'Your account already has Premium. These tools are unlocked and ready to use.',
  'premium.lockedBadge': 'Premium locked',
  'premium.activeBadge': 'Premium acquired',
  'premium.benefitsTitle': 'Unlocked benefits',
  'premium.benefitsDescription':
    'These advantages are already active in your account and available whenever you need them.',
  'premium.creditCardsTitle': 'Manage your wallet with saved credit cards',
  'premium.creditCardsDescription':
    'Upgrade to Premium to access the credit cards catalog and reuse cards across expenses and subscriptions.',
  'premium.creditCardsEnabledDescription':
    'Your Premium access unlocks a reusable card catalog for expenses and subscriptions.',
  'premium.creditCardsBullet1': 'Create, edit, and organize saved cards',
  'premium.creditCardsBullet2':
    'Reuse the same card in expenses and subscriptions',
  'premium.creditCardsBullet3':
    'Keep limits, closing day, and due day in one place',
  'premium.installmentsTitle': 'Split purchases into installment plans',
  'premium.installmentsDescription':
    'Get Premium to create multi-payment expenses and keep each monthly charge organized.',
  'premium.installmentsEnabledDescription':
    'Your Premium access unlocks multi-payment expenses with clear monthly tracking.',
  'premium.installmentsBullet1': 'Create 3, 6, 12, or custom monthly plans',
  'premium.installmentsBullet2':
    'Track installment progress in history and details',
  'premium.installmentsBullet3':
    'Keep the plan total and first payment date visible',
  'premium.managementTitle': 'Premium is managed outside the app',
  'premium.managementDescription':
    'For now, Premium can only be enabled from the admin panel linked to your account.',
  'premium.signInTitle': 'Sign in for restore and sync',
  'premium.signInDescription':
    'Creating an account adds backup, recovery, and future premium restore to your setup.',
  'premium.activeStatus': 'Premium active',
  'premium.inactiveStatus': 'Free plan',
  'premium.manageButton': 'View Premium',
  'premium.viewButton': 'See Premium',
  'premium.accountManagedHint':
    'This account already reports Premium from account state and cannot be changed here.',
  'premium.externalManagementHint':
    'Premium access is managed outside the app for now.',
  'premium.featureCreditCards': 'Credit cards',
  'premium.featureInstallments': 'Installments',

  'error.fillAllFields': 'Please fill in all fields',
  'error.validEmail': 'Please enter a valid email address',
  'error.passwordsDoNotMatch': 'Passwords do not match',
  'error.passwordMin': 'Password must be at least 6 characters',

  'auth.loginFailed': 'Login Failed',
  'auth.invalidCredentials': 'Invalid credentials',
  'auth.registrationSuccessful': 'Registration Successful',
  'auth.accountCreatedSuccess': 'Account created successfully',
  'auth.registrationPending': 'Registration Pending',
  'auth.registrationPendingDesc':
    'This email is already saved offline and waiting to sync when internet is available.',
  'auth.savedOffline': 'Saved Offline',
  'auth.savedOfflineDesc':
    'No internet connection right now. Registration was saved and will sync automatically when connection returns.',
  'auth.registrationFailed': 'Registration Failed',
  'auth.registrationTryAgain':
    'We could not complete the registration right now. Please try again.',
  'network.cannotReachApi':
    'Cannot reach API at {baseUrl}. Make sure the backend is running.',
  'network.cannotReachServer':
    'Cannot reach server right now. Check your internet connection and try again.',
  'session.expiredTitle': 'Session expired',
  'session.expiredMessage':
    'Your session has expired. Do you want to renew it now?',
  'session.renew': 'Renew session',
  'session.close': 'Close session',
  'session.renewFailedTitle': 'Session ended',
  'session.renewFailedMessage':
    'We could not renew your session. Please sign in again.',

  'onboarding.stepLabel': 'Step {current} of {total}',
  'onboarding.skip': 'Skip',
  'onboarding.back': 'Back',
  'onboarding.next': 'Next',
  'onboarding.finish': 'Start using the app',
  'onboarding.skipSetup': 'Skip setup for now',
  'onboarding.welcomeTitle': 'Start with a quick walkthrough',
  'onboarding.welcomeDescription':
    'BudgetApp works best when the first steps are clear. This short intro shows what matters.',
  'onboarding.heroTitle': 'See where your money goes without extra friction',
  'onboarding.heroDescription':
    'Use one place to log expenses, watch recurring charges, and move savings goals forward.',
  'onboarding.valueCaptureTitle': 'Capture daily spending fast',
  'onboarding.valueCaptureDescription':
    'Add purchases in a few taps and keep notes when you need more context.',
  'onboarding.valuePlanTitle': 'Plan around upcoming charges',
  'onboarding.valuePlanDescription':
    'Subscriptions and savings help you avoid surprises before they hit your budget.',
  'onboarding.valueControlTitle': 'Keep a clear budget view',
  'onboarding.valueControlDescription':
    'Track what is safe to spend and spot pressure points before the month gets away from you.',
  'onboarding.featuresTitle': 'Understand each module',
  'onboarding.featuresDescription':
    'Tap any area below to see what it does and how it helps your day-to-day flow.',
  'onboarding.moduleExpensesTitle': 'Expenses',
  'onboarding.moduleExpensesDescription':
    'Log daily spending and keep each purchase organized.',
  'onboarding.moduleExpensesBullet1':
    'Create entries with amount, category, date, and notes.',
  'onboarding.moduleExpensesBullet2':
    'Use history later to search, review, or edit what you added.',
  'onboarding.moduleSubscriptionsTitle': 'Subscriptions',
  'onboarding.moduleSubscriptionsDescription':
    'Track recurring services separately so they do not disappear inside normal spending.',
  'onboarding.moduleSubscriptionsBullet1':
    'Save billing cycle, charge date, and payment method for each service.',
  'onboarding.moduleSubscriptionsBullet2':
    'Check upcoming charges before they affect your available budget.',
  'onboarding.moduleSavingsTitle': 'Savings Box',
  'onboarding.moduleSavingsDescription':
    'Create goals and move money in or out without losing progress visibility.',
  'onboarding.moduleSavingsBullet1':
    'Set a target amount and optional date for each goal.',
  'onboarding.moduleSavingsBullet2':
    'Review deposits and withdrawals from the goal detail screen.',
  'onboarding.moduleAnalyticsTitle': 'Analytics',
  'onboarding.moduleAnalyticsDescription':
    'Turn your activity into trends so you can adjust faster.',
  'onboarding.moduleAnalyticsBullet1':
    'Compare spending against your budget and average pace.',
  'onboarding.moduleAnalyticsBullet2':
    'See category breakdowns to understand where the money is going.',
  'onboarding.workflowTitle': 'How to use the app day to day',
  'onboarding.workflowDescription':
    'This is the practical rhythm that keeps the app useful instead of becoming another forgotten tracker.',
  'onboarding.workflowHomeTitle': 'Start on Home',
  'onboarding.workflowHomeDescription':
    'Check your budget, recent activity, savings progress, and upcoming subscription pressure in one view.',
  'onboarding.workflowAddTitle': 'Use the add flow often',
  'onboarding.workflowAddDescription':
    'Open the add button when you spend money or create a recurring service so your numbers stay current.',
  'onboarding.workflowSavingsTitle': 'Review goals when you save',
  'onboarding.workflowSavingsDescription':
    'Move money into a goal as soon as you set it aside so the app reflects real progress.',
  'onboarding.workflowSettingsTitle': 'Adjust the app to fit you',
  'onboarding.workflowSettingsDescription':
    'Settings lets you change language, budget period, theme, and profile details whenever your routine changes.',
  'onboarding.setupTitle': 'Finish your initial setup',
  'onboarding.setupDescription':
    'Set the basics now so the home screen and analytics reflect the budget you actually want to follow.',
  'onboarding.languageTitle': 'Choose your language',
  'onboarding.languageDescription':
    'Pick the language you want to use across the whole app.',
  'onboarding.currencyTitle': 'Choose your main currency',
  'onboarding.currencyDescription':
    'Use your preferred currency as the default for new expenses, subscriptions, and budget setup.',
  'onboarding.budgetTitle': 'Set your spending plan',
  'onboarding.budgetDescription':
    'Define how much you want to allow yourself to spend in that period. Income is added separately as real money received.',
  'onboarding.setupHelper':
    'You can update this later from Settings, but saving it now makes your first dashboard more useful.',
  'onboarding.validationBudgetAmount': 'Enter a valid budget amount.',
  'onboarding.validationPeriodDatesRequired':
    'Start and end dates are required for a custom period.',
  'onboarding.validationPeriodDateFormat':
    'Use YYYY-MM-DD for custom period dates.',
  'onboarding.validationPeriodEndBeforeStart':
    'The custom period end date must be the same as or after the start date.',
  'onboarding.saveFailed':
    'We could not save your setup right now. Please try again.',

  'tab.home': 'Home',
  'tab.activity': 'Records',
  'tab.history': 'History',
  'tab.analytics': 'Analytics',
  'tab.settings': 'Settings',

  'filters.category': 'Category',
  'filters.allCategories': 'All categories',
  'filters.date': 'Date',
  'filters.datePlaceholder': 'YYYY-MM-DD',
  'filters.dateHint': 'Use YYYY-MM-DD format',

  'dashboard.hello': 'Hello, {name}',
  'dashboard.helloGeneric': 'Hello',
  'dashboard.subtitle': 'Personal finance at a glance',
  'dashboard.todaySpending': "Today's Spending",
  'dashboard.todayExpenses': "Today's Expenses",
  'dashboard.seeAll': 'See All',
  'dashboard.noExpensesTitle': 'No expenses yet today!',
  'dashboard.noExpensesDesc': 'Tap the + button to add your first expense',
  'dashboard.budget': 'Budget',
  'dashboard.remaining': 'Remaining',
  'dashboard.reservedFunds': 'Reserved (Subscriptions)',
  'dashboard.safeToSpend': 'Safe to Spend',
  'dashboard.recentActivity': 'Recent Activity',
  'dashboard.recentTransactions': 'Recent Transactions',
  'dashboard.upcomingTitle': 'Upcoming',
  'dashboard.upcomingSummary': '{count} subscriptions due in the next 3 days',
  'dashboard.upcomingNext': '{name} in {days} day(s)',
  'dashboard.upcomingRow': '{name} • {amount} • in {days} days',
  'dashboard.upcomingLoading': 'Loading upcoming charges...',
  'dashboard.upcomingError': 'Could not load upcoming charges.',
  'dashboard.upcomingNone': 'No charges due in the next 3 days',
  'dashboard.openSubscriptions': 'Open My Subscriptions',
  'dashboard.savingsTitle': 'Savings goals',
  'dashboard.savingsDescription':
    'Create goals and add money with a couple of taps.',
  'dashboard.loadError':
    'Some home data could not be loaded. Pull to refresh or retry.',
  'dashboard.cashflowTitle': 'Cashflow',
  'dashboard.savingsRate': 'Savings rate: {percent}%',
  'dashboard.cashflowEmptyHint':
    'Add at least one real income, like salary or a paycheck, so the app can calculate net cashflow, compare it against expenses, and estimate what you could move to savings safely.',
  'dashboard.incomeLabel': 'Income',
  'dashboard.expensesLabel': 'Expenses',
  'dashboard.netLabel': 'Net',
  'dashboard.actionsTitle': 'Recommended next steps',
  'dashboard.actionAddIncomeTitle': 'Add your first income',
  'dashboard.actionAddIncomeDescription':
    'Add real money received, like salary or a paycheck. Your spending plan is the limit you want to follow; income is what actually came in.',
  'dashboard.actionAddIncomeCta': 'Add income',
  'dashboard.actionCategoryBudgetsTitle': 'Review category limits',
  'dashboard.actionCategoryBudgetsOverDescription':
    '{count} categories are already over their limit in this plan.',
  'dashboard.actionCategoryBudgetsWatchDescription':
    '{count} categories are getting close to their limit in this plan.',
  'dashboard.actionCategoryBudgetsCta': 'Open limits',
  'dashboard.actionReviewSpendingTitle': 'Slow this week down',
  'dashboard.actionReviewSpendingDescription':
    'You are spending {amount} more than the previous week. Keep the rest of this period within {safeAmount}.',
  'dashboard.actionReviewSpendingNoRoomDescription':
    'You are spending {amount} more than the previous week and already used your safe room for this period.',
  'dashboard.actionReviewSpendingCta': 'See analytics',
  'dashboard.actionTrimSubscriptionsTitle': 'Review your subscriptions',
  'dashboard.actionTrimSubscriptionsDescription':
    'Your active subscriptions could free up {amount} in {months} months.',
  'dashboard.actionTrimSubscriptionsCta': 'Review services',
  'dashboard.actionMoveSavingsTitle': 'Move money to savings',
  'dashboard.actionMoveSavingsDescription':
    'At your current pace you could set aside {amount} without touching planned bills.',
  'dashboard.actionMoveSavingsCta': 'Open savings',
  'notifications.title': 'Notifications',
  'notifications.subtitle':
    'Review the financial signals that need attention and the suggestions that could improve your month.',
  'notifications.summaryTotal': 'Total',
  'notifications.summaryAttention': 'Need attention',
  'notifications.summarySuggestions': 'Suggestions',
  'notifications.loadError':
    'Some alerts could not be refreshed. Pull down to try again.',
  'notifications.emptyTitle': 'Everything looks calm',
  'notifications.emptyDescription':
    'When the app detects pressure points or useful opportunities, they will show up here.',
  'notifications.attentionSection': 'Needs attention',
  'notifications.suggestionSection': 'Suggestions',
  'notifications.attentionEmpty': 'No urgent items right now.',
  'notifications.suggestionEmpty': 'No extra suggestions right now.',
  'notifications.incomeTitle': 'Add income to unlock real cashflow',
  'notifications.incomeDescription':
    'Without income, the app can only show spending. Add real money received, like salary, transfers, or side income, to unlock net cashflow and safer savings suggestions.',
  'notifications.addIncomeCta': 'Add income',
  'notifications.categoryOverBudgetTitle': 'Category limits are already over',
  'notifications.categoryOverBudgetDescription':
    '{count} categories have already passed their budget in this spending plan.',
  'notifications.categoryWatchTitle': 'Some category limits need review',
  'notifications.categoryWatchDescription':
    '{count} categories are close to their limit in this spending plan.',
  'notifications.reviewBudgetsCta': 'Review limits',
  'notifications.spendingPaceTitle': 'This week needs a slowdown',
  'notifications.spendingPaceDescription':
    'You are spending {amount} more than the previous week. Try to keep the rest of the period within {safeAmount}.',
  'notifications.spendingPaceNoRoomDescription':
    'You are spending {amount} more than the previous week and already used the safe room for this period.',
  'notifications.reviewSpendingCta': 'Open analytics',
  'notifications.upcomingSubscriptionsTitle':
    '{count} subscription charges are near',
  'notifications.upcomingSubscriptionsDescription':
    '{name} and other charges could take around {amount} in the next few days.',
  'notifications.openUpcomingCta': 'Open upcoming',
  'notifications.cardPaymentTitle': '{name} needs a payment soon',
  'notifications.cardPaymentDescription':
    'This card already carries {amount} in the current cycle and the due date is {date}.',
  'notifications.openCardsCta': 'Open cards',
  'notifications.cardOverLimitTitle': '{name} is over the registered limit',
  'notifications.cardOverLimitDescription':
    'You already exceeded the registered limit by {amount}. Review this card before the next payment.',
  'notifications.cardUsageTitle': '{name} is getting heavy',
  'notifications.cardUsageDescription':
    'This card is already using {percent} of its limit and has {amount} left available.',
  'notifications.cardLimitMissingTitle': 'Some cards still miss a limit',
  'notifications.cardLimitMissingDescription':
    '{count} active cards do not have a registered limit, so usage alerts are less precise.',
  'notifications.subscriptionSavingsTitle': 'Subscriptions could free cash',
  'notifications.subscriptionSavingsDescription':
    'Canceling or trimming services could free up {amount} over the next {months} months.',
  'notifications.trimSubscriptionsCta': 'Review subscriptions',
  'notifications.savingsGoalTitle': '{name} is getting close',
  'notifications.savingsGoalDescription':
    'You still need {amount} and the target date is within {days} days.',
  'notifications.openSavingsGoalCta': 'Open goal',
  'notifications.startSavingsTitle': 'Start a savings goal',
  'notifications.startSavingsDescription':
    'You already have room in your month. Turn up to {amount} into a visible goal instead of leaving it loose.',
  'notifications.openSavingsCta': 'Open savings',
  'reports.title': 'Reports',
  'reports.subtitle':
    'Review a clean weekly or monthly snapshot and share the parts that matter.',
  'reports.periodWeek': 'Week',
  'reports.periodMonth': 'Month',
  'reports.dateLabel': 'Up to {date}',
  'reports.shareCta': 'Share',
  'reports.saveCta': 'Save',
  'reports.emailCta': 'Email',
  'reports.loadingRange': 'Loading range...',
  'reports.loadError':
    'The report could not be refreshed. Pull down or try again.',
  'reports.emptyTitle': 'No report data yet',
  'reports.emptyDescription':
    'Add income, expenses, subscriptions, or savings goals to build a useful report.',
  'reports.emptyCta': 'Add income',
  'reports.summaryIncome': 'Income',
  'reports.summaryIncomeMeta': '{count} records',
  'reports.summarySpent': 'Spent',
  'reports.summarySpentMeta': '{count} expenses',
  'reports.summaryNet': 'Net',
  'reports.summaryNoSavingsRate':
    'Savings rate will appear after income is tracked.',
  'reports.summarySavingsRateValue': 'Savings rate {value}%',
  'reports.summaryAverageDaily': 'Daily average',
  'reports.summaryTrackedDays': '{days} tracked days',
  'reports.highlightsTitle': 'Highlights',
  'reports.safeMoveTitle': 'Safe move',
  'reports.topCategoryTitle': 'Top category',
  'reports.noTopCategory': 'No dominant category yet',
  'reports.planTitle': 'Plan context',
  'reports.planBudget': 'Spending plan',
  'reports.planRemaining': 'Remaining',
  'reports.planSafeToSpend': 'Safe to spend',
  'reports.overBudgetCount': '{count} over limit',
  'reports.watchBudgetCount': '{count} close to limit',
  'reports.categoriesTitle': 'Category mix',
  'reports.noCategories':
    'No category spend was tracked in this report window.',
  'reports.categoryMeta': '{count} movements • {percent}%',
  'reports.subscriptionsTitle': 'Subscription pressure',
  'reports.subscriptionRecurringSpend': 'Recurring per month',
  'reports.subscriptionProjectedSavings': 'Potential savings',
  'reports.subscriptionActiveCount': 'Active subscriptions',
  'reports.subscriptionItemMeta': 'Potential savings in {months} months',
  'reports.savingsTitle': 'Savings progress',
  'reports.savingsSaved': 'Saved',
  'reports.savingsTarget': 'Target',
  'reports.savingsProgress': 'Progress',
  'reports.nextGoalTitle': 'Next goal',
  'reports.nextGoalValue': '{title} by {date}',
  'reports.noNextGoal': 'No dated savings goal yet.',
  'reports.noGoalDate': 'no date',
  'reports.emailTitle': 'Send report',
  'reports.emailConfirm': 'Send this report to your account email?',
  'reports.emailSentTitle': 'Report sent',
  'reports.emailSentDesc': 'Your selected report has been sent to your email.',
  'reports.emailFailed': 'The report email could not be sent.',
  'reports.saveSentTitle': 'Report saved',
  'reports.saveSentDesc': 'This report snapshot was saved to your history.',
  'reports.saveFailed': 'The report snapshot could not be saved.',
  'reports.historyTitle': 'Saved reports',
  'reports.historyLoading': 'Loading saved reports...',
  'reports.historyLoadError': 'Saved reports could not be loaded right now.',
  'reports.historyEmpty': 'Save or email a report and it will appear here.',
  'reports.historySourceManual': 'Saved',
  'reports.historySourceEmail': 'Emailed',
  'reports.historyGeneratedAt': 'Generated {date}',
  'planner.title': 'Monthly Planner',
  'planner.subtitle':
    'Review this month before charges, payments, and spending catch you off guard.',
  'planner.overviewTitle': 'Month overview',
  'planner.rangeLabel': '{start} - {end}',
  'planner.monthSummaryMeta': '{count} items across {days} active days',
  'planner.todayAction': 'Today',
  'planner.nextEvent': 'Next up',
  'planner.subscriptionChargesLabel': 'Planned subscriptions',
  'planner.cardRemindersLabel': 'Card reminders',
  'planner.agendaTitle': 'Monthly agenda',
  'planner.partialData':
    'Some planner blocks could not be loaded. Pull to refresh and try again.',
  'planner.emptyTitle': 'No events in this month',
  'planner.emptyDescription':
    'Add income, expenses, subscriptions, or cards to understand the month in one place.',
  'planner.addEntryCta': 'Add entry',
  'planner.dayCountLabel': '{count} items',
  'planner.subscriptionCharge': 'Subscription charge',
  'planner.cardClosing': 'Statement closes',
  'planner.cardPaymentDue': 'Payment due',
  'planner.incomeEntry': 'Income entry',
  'planner.expenseEntry': 'Expense entry',
  'categoryBudgets.title': 'Category Budgets',
  'categoryBudgets.subtitle':
    'Set a spending cap for each category and track it inside your current spending plan.',
  'categoryBudgets.currentPeriod': 'Current tracking window',
  'categoryBudgets.periodHint':
    'All category limits are measured inside {range}.',
  'categoryBudgets.summaryPlanned': 'With limit',
  'categoryBudgets.summaryWatch': 'Need review',
  'categoryBudgets.summaryRemaining': 'Remaining room',
  'categoryBudgets.summaryTotals': 'Planned {planned} • Spent {spent}',
  'categoryBudgets.loadError':
    'Could not load category budgets. Pull to refresh or retry.',
  'categoryBudgets.emptyTitle': 'No categories yet',
  'categoryBudgets.emptyDescription':
    'Create categories first so you can assign a limit to each one.',
  'categoryBudgets.sectionTitle': 'Category watchlist',
  'categoryBudgets.sectionMeta': '{count} categories',
  'categoryBudgets.spentOfLimit': '{spent} spent of {limit}',
  'categoryBudgets.noBudgetSpent': '{spent} spent without a limit',
  'categoryBudgets.noBudgetSet': 'No limit set yet',
  'categoryBudgets.setBudget': 'Set budget',
  'categoryBudgets.statusOffTrack': 'Over limit',
  'categoryBudgets.statusWatch': 'Close to limit',
  'categoryBudgets.statusOnTrack': 'On track',
  'categoryBudgets.statusNoBudget': 'No limit',
  'categoryBudgets.remainingLabel': 'Remaining {amount}',
  'categoryBudgets.expenseCountLabel': '{count} movements in this period',
  'categoryBudgets.modalTitle': '{name} budget',
  'categoryBudgets.modalSubtitle':
    'This limit follows your current {period} spending plan.',
  'categoryBudgets.inputLabel': 'Category limit',
  'categoryBudgets.removeBudget': 'Remove limit',
  'categoryBudgets.validationAmount': 'Enter a valid limit amount',
  'categoryBudgets.failedUpdate': 'Could not update this category limit.',
  'expenses.title': 'Expenses',
  'expenses.subtitle': '{count} expenses today • {total}',
  'expenses.overviewSubtitle': '{count} expenses • {total}',
  'expenses.totalSpending': 'Total Spending',
  'expenses.emptyTitle': 'No expenses yet',
  'expenses.emptyDescription': 'Tap the + button to add your first expense',
  'expenses.loadErrorDescription':
    'Could not load expenses. Pull to refresh or retry.',
  'expenses.loadMoreError': 'Could not load more expenses.',
  'income.title': 'Income',
  'income.overviewSubtitle': '{count} income records • {total}',
  'income.count.one': '{count} income record',
  'income.count.other': '{count} income records',
  'income.totalIncome': 'Total Income',
  'income.emptyTitle': 'No income yet',
  'income.emptyDescription':
    'Add your first income so the app can show your real cashflow.',
  'income.loadErrorDescription':
    'Could not load income. Pull to refresh or retry.',
  'income.addFirst': 'Add income',
  'income.addTitle': 'Add income',
  'income.editTitle': 'Edit income',
  'income.subtitle':
    'Track money that already came in, like salary, a paycheck, transfers, or side income.',
  'income.amountPlaceholder': '0.00',
  'income.amountPreview': 'Money received: {amount}',
  'income.currency': 'Currency',
  'income.source': 'Source',
  'income.sourcePlaceholder': 'Salary, freelance, bonus...',
  'income.receivedOn': 'Received on',
  'income.note': 'Note',
  'income.notePlaceholder': 'Optional context for this income.',
  'income.tip':
    'Add every paycheck, transfer, or side income to get a better net cashflow picture.',
  'income.save': 'Save income',
  'income.saveChanges': 'Save changes',
  'income.savedSuccess': 'Income saved successfully',
  'income.updatedSuccess': 'Income updated successfully',
  'income.enterTitle': 'Enter an income source',
  'income.enterAmount': 'Enter a valid amount',
  'income.chooseCurrency': 'Choose a currency',
  'income.chooseDate': 'Choose a received date',
  'income.deleteTitle': 'Delete income',
  'income.deleteMessage': 'Do you want to remove {title}?',
  'income.failedCreate': 'Could not save the income',
  'income.failedUpdate': 'Could not update the income',

  'history.title': 'History',
  'history.subtitle': '{count} records • {total}',
  'history.searchPlaceholder': 'Search expenses...',
  'history.noExpensesTitle': 'No expenses found',
  'history.noExpensesDescSearch': 'Try a different search term',
  'history.noExpensesDescDefault': 'Log your expenses to see them here',
  'history.noRecordsTitle': 'No records found',
  'history.noRecordsDesc': 'Adjust category/date filters or add new entries.',
  'history.manualExpense': 'Manual expense',
  'history.autoSubscription': 'Auto subscription',
  'history.subscriptionBadge': 'Subscription',
  'history.filterAction': 'Filter transactions',
  'history.recordsLabel': 'Records',
  'history.todayLabel': 'Today',

  'analytics.title': 'Analytics',
  'analytics.subtitle': 'Your spending insights',
  'analytics.thisWeek': 'Selected Period',
  'analytics.budget': 'Budget',
  'analytics.dailyAvg': 'Daily Avg',
  'analytics.expenses': 'Expenses',
  'analytics.dailySpending': 'Daily Spending (Last 7 Days)',
  'analytics.dailyTrendTitle': 'Daily Spending Trend (Last 7 Days)',
  'analytics.dateLabel': 'Up to {date}',
  'analytics.noDailyDataTitle': 'No daily data',
  'analytics.noDailyDataDesc': 'Log expenses to see your daily spending.',
  'analytics.byCategory': 'By Category',
  'analytics.noCategoryDataTitle': 'No category data',
  'analytics.noCategoryDataDesc':
    'Log expenses to see your spending by category.',
  'analytics.expenseCount.one': '{count} expense',
  'analytics.expenseCount.other': '{count} expenses',
  'analytics.spendingSignals': 'Spending Signals',
  'analytics.weekToDate': 'Week to Date',
  'analytics.monthToDate': 'Month to Date',
  'analytics.moreThanPrevious': '{amount} more than previous',
  'analytics.lessThanPrevious': '{amount} less than previous',
  'analytics.sameAsPrevious': 'Same as previous period',
  'analytics.projectedMonthEnd': 'Projected close: {amount}',
  'analytics.topCategoryImpact': 'Top category: {name} ({percent}%)',
  'analytics.noCategoryImpact': 'No dominant category yet for this month.',
  'analytics.cashflowTitle': 'Cashflow Snapshot',
  'analytics.savingsRate':
    'You are retaining about {percent}% of your income in this selected period.',
  'analytics.cashflowEmptyHint':
    'Add income records to compare what came in versus what went out.',
  'analytics.subscriptionSavingsTitle': 'Savings Opportunity',
  'analytics.saveByCancelling':
    'Cancel active subscriptions and save {amount} in {months} months.',
  'analytics.activeSubscriptionsMeta.one':
    '{count} active subscription · {amount}/month',
  'analytics.activeSubscriptionsMeta.other':
    '{count} active subscriptions · {amount}/month',
  'analytics.topSubscriptions': 'Biggest subscription impact',
  'analytics.saveInMonths': 'Save {amount} in {months} months',
  'analytics.noSubscriptionsToOptimize':
    'No active subscriptions to optimize right now.',
  'budget.period.daily': 'Daily',
  'budget.period.weekly': 'Weekly',
  'budget.period.monthly': 'Monthly',
  'budget.period.annual': 'Annual',
  'budget.period.period': 'Custom Period',
  'subscriptions.title': 'My Subscriptions',
  'subscriptions.subtitle': 'Track active services and your monthly total',
  'subscriptions.upcomingTitle': 'Upcoming charges',
  'subscriptions.upcomingSubtitle': 'Charges due in the next {days} days',
  'subscriptions.upcomingEmptyTitle': 'No upcoming charges',
  'subscriptions.upcomingEmptyDescription':
    'No subscriptions are due in the next {days} days.',
  'subscriptions.upcomingLoadError': 'Could not load upcoming subscriptions.',
  'subscriptions.unknownDate': 'Unknown date',
  'subscriptions.totalMonthly': 'Total Monthly Spend',
  'subscriptions.activeCount.one': '{count} active subscription',
  'subscriptions.activeCount.other': '{count} active subscriptions',
  'subscriptions.emptyTitle': 'No subscriptions yet',
  'subscriptions.emptyDescription':
    'Add your first service to see a premium dashboard here.',
  'subscriptions.addFirst': 'Add subscription',
  'subscriptions.chargeDate': 'Charge date',
  'subscriptions.cardTapHint': 'Tap to manage',
  'subscriptions.cardHint': 'You can remove this subscription from your list.',
  'subscriptions.searchLabel': 'Find a service',
  'subscriptions.searchPlaceholder': 'Netflix, Spotify...',
  'subscriptions.searchEmpty': 'No services found.',
  'subscriptions.groupStreaming': 'Streaming & music',
  'subscriptions.groupCloud': 'Cloud & utilities',
  'subscriptions.groupWork': 'Work & creative tools',
  'subscriptions.groupGaming': 'Gaming & community',
  'subscriptions.groupLifestyle': 'Lifestyle & learning',
  'subscriptions.groupOther': 'Other',
  'subscriptions.failedCreate': 'Could not create the subscription',
  'subscriptions.failedUpdate': 'Could not update the subscription',
  'subscriptions.failedRemove': 'Could not remove the subscription',
  'subscriptions.deleteTitle': 'Remove subscription',
  'subscriptions.deleteMessage': 'Do you want to remove {name}?',
  'savings.title': 'Savings Box',
  'savings.subtitle': 'Your goals, in one place.',
  'savings.totalSavedLabel': 'Total Saved',
  'savings.activeGoalsLabel': 'Active goals',
  'savings.overallProgressLabel': 'Overall progress',
  'savings.goalsSectionTitle': 'Your goals',
  'savings.goalsSectionSubtitle': 'Open one to see details or add money fast.',
  'savings.goalsCount.one': '{count} savings goal',
  'savings.goalsCount.other': '{count} savings goals',
  'savings.emptyTitle': 'No savings goals yet',
  'savings.emptyDescription':
    'Create your first goal to start building your savings habit.',
  'savings.goalReached': 'Goal reached',
  'savings.progressLabel': '{percent}% completed',
  'savings.savedAmountLabel': 'Saved',
  'savings.targetAmountLabel': 'Target',
  'savings.remainingAmountLabel': 'Remaining',
  'savings.remainingAmount': '{amount} left',
  'savings.openDetailHint': 'Tap the card to view the full movement history.',
  'savings.createGoalTitle': 'Create savings goal',
  'savings.createGoalSubtitle':
    'Start with the basics. You can personalize it later.',
  'savings.createGoalAction': 'Create my goal',
  'savings.newGoalAction': 'New goal',
  'savings.quickAddAction': 'Add',
  'savings.editGoalTitle': 'Edit savings goal',
  'savings.editGoalSubtitle':
    'Update what you need and keep this goal easy to recognize.',
  'savings.editGoalAction': 'Edit goal',
  'savings.deleteGoalTitle': 'Delete savings goal',
  'savings.deleteGoalDescription':
    'This will permanently remove the goal and its transaction history.',
  'savings.deleteGoalAction': 'Delete goal',
  'savings.deleteGoalRequiresEmptyBalance':
    'Withdraw all saved money before deleting this goal.',
  'savings.addFundsTitle': 'Add funds',
  'savings.addFundsAction': 'Add funds',
  'savings.withdrawFundsTitle': 'Withdraw funds',
  'savings.withdrawFundsAction': 'Withdraw funds',
  'savings.formGoalTitle': 'Goal name',
  'savings.formGoalPlaceholder': 'Ex. Emergency fund',
  'savings.formTargetAmount': 'Target amount',
  'savings.formTargetDate': 'Target date',
  'savings.formTargetDateHint':
    'Optional. Leave it empty if you do not have a target date yet.',
  'savings.formGoalIcon': 'Icon',
  'savings.formGoalColor': 'Color',
  'savings.personalizeToggleTitle': 'Personalize (optional)',
  'savings.personalizeToggleSubtitle':
    'Choose an icon and a color only if it helps you spot it faster.',
  'savings.formPreviewTitle': 'This is how it will look',
  'savings.formDetailsTitle': 'Basics',
  'savings.formDetailsSubtitle':
    'Give it a name, set the amount, and add a date only if you need one.',
  'savings.formStyleTitle': '2. Make it easy to recognize',
  'savings.formStyleSubtitle':
    'Choose an icon and color so you can find it faster.',
  'savings.formDismissAction': 'Not now',
  'savings.formDepositAmount': 'Deposit amount',
  'savings.formWithdrawAmount': 'Withdrawal amount',
  'savings.noTargetDate': 'No target date',
  'savings.clearTargetDate': 'Clear date',
  'savings.targetDateLabel': 'Target date',
  'savings.targetAmountPreview': 'Target: {amount}',
  'savings.goalCompactProgress': '{current} of {target}',
  'savings.targetDateShort': 'By {date}',
  'savings.formPreviewHint': 'Review how it will look before saving.',
  'savings.availableAmountLabel': 'Available',
  'savings.depositHelperText':
    'This amount will be added to the current saved balance.',
  'savings.withdrawHelperText':
    'This amount will be deducted from the current saved balance.',
  'savings.validationGoalTitle': 'Please enter a goal title',
  'savings.validationTargetAmount': 'Please enter a valid target amount',
  'savings.validationDepositAmount': 'Please enter a valid deposit amount',
  'savings.validationWithdrawAmount': 'Please enter a valid withdrawal amount',
  'savings.validationWithdrawExceeded': 'You can withdraw up to {amount}.',
  'savings.loadGoalsError': 'Could not load your savings goals.',
  'savings.loadTransactionsError': 'Could not load the transaction history.',
  'savings.failedCreateGoal': 'Could not create the savings goal.',
  'savings.failedAddFunds': 'Could not add funds to this goal.',
  'savings.failedWithdrawFunds': 'Could not withdraw funds from this goal.',
  'savings.failedUpdateGoal': 'Could not update this savings goal.',
  'savings.failedDeleteGoal': 'Could not delete this savings goal.',
  'savings.detailScreenTitle': 'Savings goal',
  'savings.detailHeroLabel': 'Savings progress',
  'savings.progressRingLabel': 'completed',
  'savings.createdAtLabel': 'Created on',
  'savings.transactionsTitle': 'Transactions',
  'savings.transactionsSubtitle':
    'Every deposit and withdrawal made into this goal.',
  'savings.emptyTransactionsTitle': 'No transactions yet',
  'savings.emptyTransactionsDescription':
    'Your first movement will appear here as soon as you use this goal.',
  'savings.goalNotFoundTitle': 'Goal not found',
  'savings.depositTypeLabel': 'Deposit',
  'savings.withdrawTypeLabel': 'Withdrawal',

  'paymentMethod.label': 'Payment Method',
  'paymentMethod.select': 'Select payment method',
  'paymentMethod.none': 'No payment method',
  'paymentMethod.cash': 'Cash',
  'paymentMethod.card': 'Card',
  'paymentMethod.creditCard': 'Credit card',
  'paymentMethod.debitCard': 'Debit card',
  'paymentMethod.transfer': 'Transfer',

  'creditCards.title': 'Credit Cards',
  'creditCards.subtitle':
    'Save your cards once and reuse them in expenses and subscriptions.',
  'creditCards.label': 'Credit Card',
  'creditCards.select': 'Select a credit card',
  'creditCards.helper': 'Choose the specific card used for this record.',
  'creditCards.none': 'No card selected',
  'creditCards.emptyShort': 'No cards registered',
  'creditCards.emptyHint': 'Add a card to use credit card payments.',
  'creditCards.emptyTitle': 'No credit cards yet',
  'creditCards.emptyDescription':
    'Create your first card so you can link it to expenses and subscriptions.',
  'creditCards.addFirst': 'Add first card',
  'creditCards.addNew': 'Add new card',
  'creditCards.openModule': 'Open credit cards',
  'creditCards.manageModule': 'Manage credit cards',
  'creditCards.moduleHint':
    'This module is always available from Settings and the side menu.',
  'creditCards.addTitle': 'Add Credit Card',
  'creditCards.editTitle': 'Edit Credit Card',
  'creditCards.formSubtitle':
    'Store only the catalog details you need. No full number, CVV, or expiry date.',
  'creditCards.previewName': 'Card alias',
  'creditCards.name': 'Alias',
  'creditCards.namePlaceholder': 'e.g. Nu Personal',
  'creditCards.bank': 'Bank',
  'creditCards.bankPlaceholder': 'e.g. Nu Bank',
  'creditCards.brand': 'Brand',
  'creditCards.last4': 'Last 4 digits',
  'creditCards.color': 'Color',
  'creditCards.limit': 'Credit limit',
  'creditCards.closingDay': 'Closing day',
  'creditCards.paymentDueDay': 'Payment due day',
  'creditCards.walletTitle': 'Card snapshot',
  'creditCards.walletHint':
    'Review current cycle spend, available credit, and the dates that need attention.',
  'creditCards.currentCycle': 'Current cycle',
  'creditCards.availableCredit': 'Available credit',
  'creditCards.utilization': 'Utilization',
  'creditCards.nextClosing': 'Next closing',
  'creditCards.nextPayment': 'Next payment',
  'creditCards.linkedSubscriptions': 'Linked subscriptions',
  'creditCards.monthlyRecurring': 'Monthly recurring',
  'creditCards.expensesInCycle': '{count} records in this cycle',
  'creditCards.dueSoon': 'Payment due soon',
  'creditCards.highUsage': 'High usage',
  'creditCards.limitMissing': 'Add the card limit',
  'creditCards.overLimit': 'Over the registered limit',
  'creditCards.closesSoon': 'Closing soon',
  'creditCards.noSchedule': 'No date set',
  'creditCards.today': 'Today',
  'creditCards.tomorrow': 'Tomorrow',
  'creditCards.inDays': 'In {count} days',
  'creditCards.status': 'Status',
  'creditCards.active': 'Active',
  'creditCards.inactive': 'Inactive',
  'creditCards.save': 'Save card',
  'creditCards.saveChanges': 'Save changes',
  'creditCards.deactivateTitle': 'Deactivate credit card',
  'creditCards.deactivateMessage':
    'Do you want to deactivate {name}? Historical records will keep their link.',
  'creditCards.deactivateAction': 'Deactivate',
  'creditCards.activateAction': 'Activate',
  'creditCards.failedCreate': 'Could not create the credit card',
  'creditCards.failedUpdate': 'Could not update the credit card',
  'creditCards.failedRemove': 'Could not deactivate the credit card',
  'creditCards.validationRequired': 'Please choose a credit card',
  'creditCards.validationName': 'Please enter a card alias',
  'creditCards.validationBank': 'Please enter the bank name',
  'creditCards.validationBrand': 'Please choose a brand',
  'creditCards.validationLast4': 'Please enter exactly 4 digits',
  'creditCards.validationLimit': 'Please enter a valid credit limit',
  'creditCards.validationClosingDay': 'Closing day must be between 1 and 31',
  'creditCards.validationDueDay': 'Payment due day must be between 1 and 31',

  'addSubscription.title': 'Add Subscription',
  'addSubscription.editTitle': 'Edit Subscription',
  'addSubscription.subtitle': 'Register a service in seconds',
  'addSubscription.editSubtitle': 'Update or remove this subscription',
  'addSubscription.quickPick': 'Quick Pick',
  'addSubscription.quickPickHint':
    'Choose a service to fill the name, icon, and color faster.',
  'addSubscription.name': 'Name',
  'addSubscription.namePlaceholder': 'e.g. Netflix',
  'addSubscription.cost': 'Cost',
  'addSubscription.frequency': 'Frequency',
  'addSubscription.frequencyWeekly': 'Weekly',
  'addSubscription.frequencyMonthly': 'Monthly',
  'addSubscription.frequencyYearly': 'Yearly',
  'addSubscription.chargeDate': 'Charge Date',
  'addSubscription.androidPickerHint': 'Uses native Android date picker',
  'addSubscription.brandColor': 'Brand color',
  'addSubscription.save': 'Save Subscription',
  'addSubscription.update': 'Update Subscription',
  'addSubscription.saved': 'Subscription saved',
  'addSubscription.updated': 'Subscription updated',
  'addSubscription.validationName': 'Please enter a subscription name',
  'addSubscription.validationCost': 'Please enter a valid cost',
  'addSubscription.validationDate': 'Please choose a charge date',
  'addSubscription.validationCurrency': 'Please choose a currency',
  'addEntry.expenseTab': 'Expense',
  'addEntry.incomeTab': 'Income',
  'addEntry.subscriptionTab': 'Subscription',

  'addExpense.title': 'Add Expense',
  'addExpense.subtitle': 'Log your purchase',
  'addExpense.amountPlaceholder': '0.00',
  'addExpense.titleLabel': 'Title',
  'addExpense.titlePlaceholder': 'What did you buy?',
  'addExpense.dateLabel': 'Purchase Date',
  'addExpense.categoryRequired': 'Category *',
  'addExpense.showCategoryCreator': 'Create new category',
  'addExpense.hideCategoryCreator': 'Hide category creator',
  'addExpense.categoryNamePlaceholder': 'Category name',
  'addExpense.icon': 'Icon',
  'addExpense.color': 'Color',
  'addExpense.scanReceipt': 'Scan Receipt',
  'addExpense.scanReceiptHint':
    'Use the camera to capture a ticket and autofill this form.',
  'addExpense.scanReceiptAction': 'Use Camera',
  'addExpense.retakeReceipt': 'Retake',
  'addExpense.removeReceipt': 'Remove',
  'addExpense.receiptReady': 'Receipt captured',
  'addExpense.receiptParsing': 'Reading receipt and filling your form...',
  'addExpense.receiptAutofillHint':
    'Review the autofilled fields before saving.',
  'addExpense.receiptAutofilled': 'Receipt data was added to the form.',
  'addExpense.receiptParseFailed':
    'Could not read this receipt. Try again with a clearer photo.',
  'addExpense.receiptParseTimedOut':
    'Receipt parsing took too long. Try again in a moment.',
  'addExpense.receiptParseUnavailable':
    'Could not reach the receipt parser right now.',
  'addExpense.cameraPermissionMessage':
    'BudgetApp needs camera access so you can capture receipts.',
  'addExpense.cancel': 'Cancel',
  'addExpense.saveCategory': 'Save Category',
  'addExpense.noteOptional': 'Note (optional)',
  'addExpense.notePlaceholder': 'Add a note...',
  'addExpense.saveExpense': 'Save Expense',
  'addExpense.savedSuccess': 'Expense saved successfully',

  'editExpense.screenTitle': 'Edit Expense',
  'editExpense.category': 'Category',
  'editExpense.updateExpense': 'Update Expense',
  'editExpense.updatedSuccess': 'Expense updated successfully',

  'expenseDetail.screenTitle': 'Expense Detail',
  'expenseDetail.uncategorized': 'Uncategorized',
  'expenseDetail.note': 'Note',
  'expenseDetail.editExpense': 'Edit Expense',
  'expenseDetail.deleteExpense': 'Delete Expense',
  'expenseDetail.deleteTitle': 'Delete Expense',
  'expenseDetail.deleteMessage':
    'Are you sure you want to delete this expense?',
  'expenseDetail.deleteInstallmentMessage':
    'Deleting this installment removes the entire installment plan. Continue?',

  'category.noneAvailable':
    'No categories available. You can create one below.',
  'category.created': 'Category created',
  'category.existsSelected':
    'Category already exists. Existing category selected.',
  'category.failedCreate': 'Failed to create category',
  'category.enterName': 'Please enter a category name',

  'expense.failedSave': 'Failed to save expense',
  'expense.failedUpdate': 'Failed to update expense',
  'expense.enterTitle': 'Please enter a title',
  'expense.enterAmount': 'Please enter a valid amount',
  'expense.paymentTimingLabel': 'Payment Type',
  'expense.singlePayment': 'Single payment',
  'expense.installmentPayment': 'Installments',
  'expense.installmentCountLabel': 'Number of installments',
  'expense.installmentCountPlaceholder': 'For example: 3, 6, 12',
  'expense.enterInstallmentCount':
    'Please enter an installment count greater than 1',
  'expense.purchaseDateLabel': 'Purchase date',
  'expense.firstPaymentDateLabel': 'First payment date',
  'expense.enterFirstPaymentDate': 'Please choose the first payment date',
  'expense.invalidFirstPaymentDate':
    'The first payment date must be the same as or after the purchase date.',
  'expense.installmentPreviewTitle': 'Installment breakdown',
  'expense.installmentPreviewHint':
    'Add the total amount and installment count to preview the monthly split.',
  'expense.installmentPreviewEqual': '{count} installments of {amount}',
  'expense.installmentPreviewAdjusted':
    '{count} installments: {amount} and a final payment of {finalAmount}',
  'expense.installmentFrequencyMonthly': 'Monthly schedule • Total {total}',
  'expense.installmentPositionLabel': 'Installment {current} of {count}',
  'expense.installmentPlanTotalLabel': 'Plan total',
  'expense.chooseCurrency': 'Please choose a currency',
  'expense.chooseCategory': 'Please choose a category',
  'expense.deleteTitle': 'Delete Expense',
  'expense.deleteMessage': 'Are you sure you want to delete this expense?',

  'image.error': 'Image Error',
  'image.selectFailed': 'Could not select image',
  'image.readFailed': 'Could not read selected image',
  'image.openCameraFailed': 'Could not open camera',
  'profileImage.title': 'Profile Image',
  'profileImage.message': 'Choose image source',
  'profileImage.takePhoto': 'Take Photo',
  'profileImage.chooseGallery': 'Choose from Gallery',
  'profileImage.removeTitle': 'Remove Photo',
  'profileImage.removeMessage': 'Do you want to remove your profile photo?',

  'camera.permissionTitle': 'Camera Permission',
  'camera.permissionMessage':
    'BudgetApp needs camera access so you can take a profile photo.',
  'camera.allow': 'Allow',
  'camera.deny': 'Deny',
  'camera.later': 'Later',
  'camera.blockedTitle': 'Camera Blocked',
  'camera.blockedMessage':
    'Camera permission is blocked. Enable it in system settings.',
  'camera.openSettings': 'Open Settings',
  'camera.permissionTitleGeneric': 'Permission',
  'camera.openSettingsFailed':
    'Could not open settings. Please enable camera permission manually.',
  'camera.permissionDeniedTitle': 'Permission Denied',
  'camera.permissionDeniedMessage': 'Camera permission was denied.',

  'settings.title': 'Settings',
  'settings.subtitle': 'Manage your profile, preferences, and access.',
  'settings.profile': 'Profile',
  'settings.preferencesTitle': 'Settings',
  'settings.name': 'Name',
  'settings.email': 'Email',
  'settings.dailyBudget': 'Daily Budget',
  'settings.budgetSettings': 'Spending Plan',
  'settings.currencyHelp':
    'This currency will be used by default when you create new expenses and subscriptions.',
  'settings.budgetAmount': 'Spending Limit',
  'settings.budgetPeriod': 'Spending Period',
  'settings.budgetHelp':
    'Keep this as the spending cap you want to follow for the selected period. It is not your income. Real income is tracked separately in Cashflow.',
  'settings.selectBudgetPeriod':
    'Choose how your spending limit should be calculated.',
  'settings.periodStart': 'Period start',
  'settings.periodEnd': 'Period end',
  'settings.currentBudget': 'Current spending plan: {value} ({period})',
  'settings.planTitle': 'Current plan',
  'settings.planLabel': 'Plan',
  'settings.planAccessLabel': 'Access',
  'settings.planShortcutDescription':
    'Review your access level, included tools, and Premium benefits in one place.',
  'settings.planOpenCta': 'Open plan details',
  'settings.planIncludedTitle': 'Included in your access',
  'settings.planFeatureEnabled': 'Available now',
  'settings.planFeatureLocked': 'Locked until Premium',
  'settings.planPremiumDescription':
    'This account currently has Premium unlocked, including saved credit cards and installment plans.',
  'settings.planFreeDescription':
    'This account is currently on the free plan. Upgrade when you want more control tools.',
  'settings.planGuestDescription':
    'You are using the free plan in guest mode on this device. Sign in later if you want backup and restore tied to your account.',
  'settings.backupLabel': 'Backup',
  'settings.backupGuestValue': 'Local only',
  'settings.backupAccountValue': 'Cloud ready',
  'settings.accessBackupGuestDescription':
    'You are using this device in local mode. Sign in when you want backup, sync, and recovery.',
  'settings.accessBackupAccountDescription':
    'Your account keeps backup, sync, and recovery ready across devices.',
  'settings.saveChanges': 'Save Changes',
  'settings.saveProfile': 'Save Profile',
  'settings.actions': 'Actions',
  'settings.accountActionsTitle': 'Account actions',
  'settings.seedCategories': 'Seed Default Categories',
  'settings.seedCategoriesDesc': 'Create Food, Transport, Shopping, etc.',
  'settings.autoWeeklyReport': 'Automatic weekly report',
  'settings.autoWeeklyReportDesc':
    'Email a weekly snapshot every Sunday night using your current account data.',
  'settings.autoMonthlyReport': 'Automatic monthly report',
  'settings.autoMonthlyReportDesc':
    'Email a monthly snapshot on the first day of each month.',
  'settings.autoReportsFailed':
    'Could not update your automatic report settings.',
  'settings.sendWeeklyReport': 'Send Weekly Report Now',
  'settings.sendWeeklyReportPending': 'Sending...',
  'settings.sendWeeklyReportDesc':
    'Send the current weekly snapshot to your account email right now.',
  'settings.logout': 'Logout',
  'settings.version': 'BudgetApp v1.0.0',
  'settings.updated': 'Settings updated!',
  'settings.failedUpdate':
    'Failed to update settings. Cannot reach API at {baseUrl}.',
  'settings.enterValidBudget': 'Please enter a valid budget amount',
  'settings.periodDatesRequired':
    'Start and end dates are required for a custom period.',
  'settings.periodDateFormat': 'Use YYYY-MM-DD format for period dates.',
  'settings.periodEndBeforeStart':
    'End date must be the same as or later than start date.',
  'settings.logoutTitle': 'Logout',
  'settings.logoutConfirm': 'Are you sure?',
  'settings.seedSuccess': 'Default categories created!',
  'settings.seedFailed': 'Failed to seed categories',
  'settings.reportSentTitle': 'Report Sent',
  'settings.reportSentDesc':
    'Your weekly spending report has been sent to your email.',
  'settings.reportFailed': 'Failed to send weekly report',
  'settings.noEmail': 'No email found for this account.',
  'settings.sendWeeklyTitle': 'Send Weekly Report',
  'settings.sendWeeklyConfirm':
    'This will send your weekly spending summary to your registered email.',

  'settings.languageTitle': 'Language',
  'settings.languageDesc': 'Choose app language',
  'settings.languageDialogTitle': 'App Language',
  'settings.languageDialogMessage': 'Select your preferred language',
  'settings.termsTitle': 'Terms and Conditions',
  'settings.termsDesc': 'Review the current rules for using BudgetApp',
  'settings.themeTitle': 'Theme',
  'settings.themeDesc': 'Choose the app appearance',
  'settings.themeDialogTitle': 'Theme mode',
  'settings.themeDialogMessage': 'Select your preferred theme mode',
  'settings.themeModeSystem': 'System',
  'settings.themeModeLight': 'Light',
  'settings.themeModeDark': 'Dark',
  'settings.themeModeCustom1': 'Midnight Blue',
  'settings.themeModeCustom2': 'Emerald',
  'settings.themeModeCustom3': 'Amethyst Purple',
  'settings.themeLivePreviewTitle': 'Live theme preview',
  'settings.themeLivePreviewDesc':
    'Container and button update instantly when you change the theme.',
  'settings.themeLivePreviewButton': 'Open theme selector',
  'plan.title': 'Plan & access',
  'plan.subtitle':
    'Adjust the spending cap you want to follow here. Real income is added separately in Cashflow, then review access, backup state, and the Premium tools available on this account.',
  'plan.spendingHint':
    'This plan marks how much you want to allow yourself to spend. It does not represent money already received.',
  'plan.heroPremiumDescription':
    'This account has Premium active, including saved credit cards and installment plans.',
  'plan.heroFreeDescription':
    'You are on the free plan right now. Upgrade when you want saved cards and installment tracking.',
  'plan.heroGuestDescription':
    'You are using the free plan in guest mode on this device. Sign in later if you want backup and restore linked to your account.',
  'plan.featuresTitle': 'Included benefits',
  'plan.featuresSubtitle':
    'These are the tools currently enabled for your access level.',
} as const;

type TranslationKeyInternal = keyof typeof en;
export type TranslationKey = TranslationKeyInternal;

const es: Record<TranslationKeyInternal, string> = {
  'common.ok': 'Aceptar',
  'common.cancel': 'Cancelar',
  'common.continue': 'Continuar',
  'common.save': 'Guardar',
  'common.edit': 'Editar',
  'common.delete': 'Eliminar',
  'common.remove': 'Quitar',
  'common.logout': 'Cerrar sesión',
  'common.send': 'Enviar',
  'common.retry': 'Reintentar',
  'common.success': 'Éxito',
  'common.error': 'Error',
  'common.loading': 'Cargando...',
  'common.notAvailable': 'No disponible',
  'common.maxAmountExceeded': 'El monto no puede superar {max}',
  'common.amountPlaceholder': '0.00',

  'language.label': 'Idioma',
  'language.english': 'Inglés',
  'language.spanish': 'Español',
  'app.name': 'BudgetApp',
  'app.tagline': 'Controla. Planea. Crece.',

  'auth.appSubtitle': 'Controla tus gastos y domina tus finanzas',
  'auth.emailPlaceholder': 'juan@ejemplo.com',
  'auth.passwordPlaceholder': '••••••••',
  'auth.namePlaceholder': 'Juan Perez',
  'auth.email': 'Correo',
  'auth.password': 'Contraseña',
  'auth.signIn': 'Iniciar sesión',
  'auth.noAccount': '¿No tienes una cuenta?',
  'auth.signUp': 'Registrarse',
  'auth.createAccount': 'Crear cuenta',
  'auth.createAccountSubtitle': 'Empieza a registrar tus gastos hoy',
  'auth.fullName': 'Nombre completo',
  'auth.confirmPassword': 'Confirmar contraseña',
  'auth.createAccountButton': 'Crear cuenta',
  'auth.alreadyHaveAccount': '¿Ya tienes una cuenta?',
  'auth.addPhoto': 'Agregar foto',
  'auth.changePhoto': 'Cambiar foto',
  'auth.removePhoto': 'Quitar',
  'auth.syncingPendingRegistrations': 'Sincronizando registros pendientes...',
  'auth.pendingOfflineRegistrations.one':
    '{count} registro pendiente sin conexión',
  'auth.pendingOfflineRegistrations.other':
    '{count} registros pendientes sin conexión',
  'auth.offlineSavedHint':
    'Los registros guardados se envían automáticamente cuando hay conexión a internet.',
  'auth.continueGuest': 'Continuar en modo invitado',
  'auth.orContinueWith': 'o continuar con',
  'auth.continueWithGoogle': 'Continuar con Google',
  'legal.readTerms': 'Leer Términos y Condiciones',
  'legal.registerNotice':
    'Al crear tu cuenta, aceptas los Términos y Condiciones.',
  'legal.googleNotice':
    'Al continuar con Google, aceptas los Términos y Condiciones.',
  'legal.termsTitle': 'Términos y Condiciones',
  'legal.termsSubtitle':
    'Revisa las reglas, responsabilidades y límites del servicio que aplican cuando usas BudgetApp.',
  'legal.effectiveDate': 'Fecha de vigencia',
  'auth.googleSignInFailed': 'Error con Google',
  'auth.googleConfigMissing':
    'El acceso con Google aún no está configurado. Agrega GOOGLE_WEB_CLIENT_ID al .env móvil y habilita Google Authentication en Firebase.',
  'auth.googleMissingIdToken':
    'Google no devolvió un ID token. Revisa la configuración de Firebase Authentication y de los clientes OAuth.',
  'auth.googleInProgress':
    'Ya hay una solicitud de inicio con Google en progreso. Espera un momento e inténtalo de nuevo.',
  'auth.googlePlayServicesUnavailable':
    'Google Play Services no está disponible en este dispositivo.',
  'auth.googleDeveloperError':
    'El acceso con Google en Android aún no está configurado por completo. Agrega la SHA-1 y la SHA-256 de la app en Firebase, descarga un nuevo google-services.json y vuelve a compilar la app.',
  'auth.googleSignInGeneric':
    'No pudimos completar el acceso con Google en este momento. Inténtalo de nuevo.',
  'guest.accessTitle': 'Acceso y respaldo',
  'guest.statusGuest': 'Modo invitado',
  'guest.statusAccount': 'Cuenta conectada',
  'guest.accessGuestDescription':
    'Puedes usar la app de inmediato con datos locales guardados en este dispositivo. Inicia sesión después para respaldo en la nube, sincronización, recuperación y futura restauración Premium.',
  'guest.accessAccountDescription':
    'Tu cuenta deja la app lista para respaldo, sincronización, recuperación y futura restauración Premium entre dispositivos.',
  'guest.benefitCloudBackup': 'Respaldo en la nube al iniciar sesión',
  'guest.benefitSync': 'Sincronización futura entre dispositivos',
  'guest.benefitRecovery': 'Recuperación de cuenta si cambias de teléfono',
  'guest.benefitPremiumRestore':
    'Futura restauración Premium ligada a tu cuenta',
  'guest.benefitContinuity': 'Mejor continuidad de tus datos a largo plazo',
  'guest.accountReadyHint':
    'Puedes seguir usando la app normalmente. Las funciones de cuenta seguirán disponibles aquí cuando las necesites.',
  'premium.title': 'Premium requerido',
  'premium.acquiredTitle': 'Premium adquirido',
  'premium.subtitle':
    'Esta función está disponible solo en la versión Premium.',
  'premium.acquiredSubtitle':
    'Tu cuenta ya tiene Premium. Estas herramientas están desbloqueadas y listas para usarse.',
  'premium.lockedBadge': 'Premium bloqueado',
  'premium.activeBadge': 'Premium adquirido',
  'premium.benefitsTitle': 'Beneficios desbloqueados',
  'premium.benefitsDescription':
    'Estas ventajas ya están activas en tu cuenta y disponibles cada vez que las necesites.',
  'premium.creditCardsTitle': 'Administra tu cartera con tarjetas guardadas',
  'premium.creditCardsDescription':
    'Actualiza a Premium para acceder al catálogo de tarjetas y reutilizarlas en gastos y suscripciones.',
  'premium.creditCardsEnabledDescription':
    'Tu acceso Premium desbloquea un catálogo reutilizable de tarjetas para gastos y suscripciones.',
  'premium.creditCardsBullet1': 'Crea, edita y organiza tus tarjetas guardadas',
  'premium.creditCardsBullet2':
    'Reutiliza la misma tarjeta en gastos y suscripciones',
  'premium.creditCardsBullet3':
    'Mantén límite, fecha de corte y fecha de pago en un solo lugar',
  'premium.installmentsTitle': 'Divide compras en planes de mensualidades',
  'premium.installmentsDescription':
    'Obtén Premium para crear gastos en múltiples pagos y mantener ordenado cada cargo mensual.',
  'premium.installmentsEnabledDescription':
    'Tu acceso Premium desbloquea gastos a múltiples pagos con seguimiento mensual claro.',
  'premium.installmentsBullet1': 'Crea planes de 3, 6, 12 o más mensualidades',
  'premium.installmentsBullet2':
    'Sigue el progreso de mensualidades en historial y detalles',
  'premium.installmentsBullet3':
    'Mantén visible el total del plan y la fecha del primer pago',
  'premium.managementTitle': 'Premium se administra fuera de la app',
  'premium.managementDescription':
    'Por ahora, Premium solo se puede activar desde el panel administrativo vinculado a tu cuenta.',
  'premium.signInTitle': 'Inicia sesión para restaurar y sincronizar',
  'premium.signInDescription':
    'Crear una cuenta agrega respaldo, recuperación y futura restauración Premium a tu configuración.',
  'premium.activeStatus': 'Premium activo',
  'premium.inactiveStatus': 'Plan gratis',
  'premium.manageButton': 'Ver Premium',
  'premium.viewButton': 'Ver Premium',
  'premium.accountManagedHint':
    'Esta cuenta ya reporta Premium desde el estado de la cuenta y no se puede cambiar aquí.',
  'premium.externalManagementHint':
    'El acceso Premium se administra fuera de la app por ahora.',
  'premium.featureCreditCards': 'Tarjetas',
  'premium.featureInstallments': 'Mensualidades',

  'error.fillAllFields': 'Por favor completa todos los campos',
  'error.validEmail': 'Por favor ingresa un correo válido',
  'error.passwordsDoNotMatch': 'Las contraseñas no coinciden',
  'error.passwordMin': 'La contraseña debe tener al menos 6 caracteres',

  'auth.loginFailed': 'Error de inicio de sesión',
  'auth.invalidCredentials': 'Credenciales inválidas',
  'auth.registrationSuccessful': 'Registro exitoso',
  'auth.accountCreatedSuccess': 'Cuenta creada correctamente',
  'auth.registrationPending': 'Registro pendiente',
  'auth.registrationPendingDesc':
    'Este correo ya está guardado sin conexión y se sincronizará cuando haya internet.',
  'auth.savedOffline': 'Guardado sin conexión',
  'auth.savedOfflineDesc':
    'No hay conexión en este momento. El registro se guardó y se sincronizará automáticamente cuando vuelva la conexión.',
  'auth.registrationFailed': 'Registro fallido',
  'auth.registrationTryAgain':
    'No pudimos completar el registro en este momento. Inténtalo de nuevo.',
  'network.cannotReachApi':
    'No se puede conectar con la API en {baseUrl}. Verifica que el backend esté ejecutándose.',
  'network.cannotReachServer':
    'No se puede conectar al servidor ahora. Revisa tu conexión a internet e inténtalo de nuevo.',
  'session.expiredTitle': 'Sesión expirada',
  'session.expiredMessage': 'Tu sesión expiró. ¿Quieres renovarla ahora?',
  'session.renew': 'Renovar sesión',
  'session.close': 'Cerrar sesión',
  'session.renewFailedTitle': 'Sesión finalizada',
  'session.renewFailedMessage':
    'No pudimos renovar tu sesión. Inicia sesión nuevamente.',
  'common.currency': 'Moneda',

  'onboarding.stepLabel': 'Paso {current} de {total}',
  'onboarding.skip': 'Omitir',
  'onboarding.back': 'Atrás',
  'onboarding.next': 'Siguiente',
  'onboarding.finish': 'Empezar a usar la app',
  'onboarding.skipSetup': 'Omitir configuración por ahora',
  'onboarding.welcomeTitle': 'Empieza con un recorrido corto',
  'onboarding.welcomeDescription':
    'BudgetApp funciona mejor cuando los primeros pasos son claros. Esta introducción te muestra lo importante.',
  'onboarding.heroTitle': 'Mira a dónde se va tu dinero sin fricción extra',
  'onboarding.heroDescription':
    'Usa un solo lugar para registrar gastos, vigilar cobros recurrentes y avanzar metas de ahorro.',
  'onboarding.valueCaptureTitle': 'Captura tus gastos diarios rápido',
  'onboarding.valueCaptureDescription':
    'Agrega compras en pocos toques y guarda notas cuando necesites más contexto.',
  'onboarding.valuePlanTitle': 'Planea alrededor de tus próximos cobros',
  'onboarding.valuePlanDescription':
    'Las suscripciones y el ahorro te ayudan a evitar sorpresas antes de que golpeen tu presupuesto.',
  'onboarding.valueControlTitle': 'Mantén un presupuesto claro',
  'onboarding.valueControlDescription':
    'Controla cuánto puedes gastar y detecta presión en tus finanzas antes de que el mes se te vaya.',
  'onboarding.featuresTitle': 'Entiende cada módulo',
  'onboarding.featuresDescription':
    'Toca cualquier área para ver qué hace y cómo ayuda a tu flujo diario.',
  'onboarding.moduleExpensesTitle': 'Gastos',
  'onboarding.moduleExpensesDescription':
    'Registra tus gastos diarios y mantén cada compra organizada.',
  'onboarding.moduleExpensesBullet1':
    'Crea registros con monto, categoría, fecha y notas.',
  'onboarding.moduleExpensesBullet2':
    'Después usa el historial para buscar, revisar o editar lo que agregaste.',
  'onboarding.moduleSubscriptionsTitle': 'Suscripciones',
  'onboarding.moduleSubscriptionsDescription':
    'Controla los servicios recurrentes por separado para que no se pierdan entre los gastos normales.',
  'onboarding.moduleSubscriptionsBullet1':
    'Guarda ciclo de cobro, fecha de pago y método de pago para cada servicio.',
  'onboarding.moduleSubscriptionsBullet2':
    'Revisa próximos cobros antes de que afecten tu presupuesto disponible.',
  'onboarding.moduleSavingsTitle': 'Caja de ahorro',
  'onboarding.moduleSavingsDescription':
    'Crea metas y mueve dinero dentro o fuera sin perder visibilidad del avance.',
  'onboarding.moduleSavingsBullet1':
    'Define una meta de monto y una fecha opcional para cada objetivo.',
  'onboarding.moduleSavingsBullet2':
    'Revisa depósitos y retiros desde el detalle de cada meta.',
  'onboarding.moduleAnalyticsTitle': 'Analíticas',
  'onboarding.moduleAnalyticsDescription':
    'Convierte tu actividad en tendencias para ajustar más rápido.',
  'onboarding.moduleAnalyticsBullet1':
    'Compara tus gastos contra tu presupuesto y tu ritmo promedio.',
  'onboarding.moduleAnalyticsBullet2':
    'Ve el desglose por categorías para entender a dónde se va el dinero.',
  'onboarding.workflowTitle': 'Cómo usar la app en el día a día',
  'onboarding.workflowDescription':
    'Este es el ritmo práctico que mantiene útil la app en lugar de convertirse en otro registro olvidado.',
  'onboarding.workflowHomeTitle': 'Empieza en Inicio',
  'onboarding.workflowHomeDescription':
    'Revisa tu presupuesto, actividad reciente, avance de ahorro y presión por próximos cobros en una sola vista.',
  'onboarding.workflowAddTitle': 'Usa seguido el flujo de agregar',
  'onboarding.workflowAddDescription':
    'Abre el botón de agregar cuando gastes dinero o crees un servicio recurrente para mantener tus números al día.',
  'onboarding.workflowSavingsTitle': 'Revisa tus metas cuando ahorres',
  'onboarding.workflowSavingsDescription':
    'Mueve dinero a una meta apenas lo apartes para que la app refleje el progreso real.',
  'onboarding.workflowSettingsTitle': 'Ajusta la app a tu manera',
  'onboarding.workflowSettingsDescription':
    'Desde Ajustes puedes cambiar idioma, período de presupuesto, tema y perfil cuando cambie tu rutina.',
  'onboarding.setupTitle': 'Termina tu configuración inicial',
  'onboarding.setupDescription':
    'Define lo básico ahora para que Inicio y Analíticas reflejen el presupuesto que realmente quieres seguir.',
  'onboarding.languageTitle': 'Elige tu idioma',
  'onboarding.languageDescription':
    'Selecciona el idioma que quieres usar en toda la app.',
  'onboarding.currencyTitle': 'Elige tu moneda principal',
  'onboarding.currencyDescription':
    'Usa tu moneda preferida como valor predeterminado para nuevos gastos, suscripciones y presupuesto.',
  'onboarding.budgetTitle': 'Configura tu plan de gasto',
  'onboarding.budgetDescription':
    'Define cuánto te quieres permitir gastar en ese período. Tus ingresos, como sueldo o quincena, se registran aparte.',
  'onboarding.setupHelper':
    'Puedes cambiar esto después en Ajustes, pero guardarlo ahora hace más útil tu primer panel.',
  'onboarding.validationBudgetAmount':
    'Ingresa un monto de presupuesto válido.',
  'onboarding.validationPeriodDatesRequired':
    'La fecha de inicio y fin son obligatorias para un período personalizado.',
  'onboarding.validationPeriodDateFormat':
    'Usa el formato YYYY-MM-DD para las fechas del período personalizado.',
  'onboarding.validationPeriodEndBeforeStart':
    'La fecha final del período personalizado debe ser igual o posterior a la fecha inicial.',
  'onboarding.saveFailed':
    'No pudimos guardar tu configuración ahora mismo. Inténtalo de nuevo.',

  'tab.home': 'Inicio',
  'tab.activity': 'Registros',
  'tab.history': 'Historial',
  'tab.analytics': 'Analíticas',
  'tab.settings': 'Ajustes',

  'filters.category': 'Categoría',
  'filters.allCategories': 'Todas las categorías',
  'filters.date': 'Fecha',
  'filters.datePlaceholder': 'YYYY-MM-DD',
  'filters.dateHint': 'Usa el formato YYYY-MM-DD',

  'dashboard.hello': 'Hola, {name}',
  'dashboard.helloGeneric': 'Hola',
  'dashboard.subtitle': 'Tus finanzas personales de un vistazo',
  'dashboard.todaySpending': 'Gasto de hoy',
  'dashboard.todayExpenses': 'Gastos de hoy',
  'dashboard.seeAll': 'Ver todo',
  'dashboard.noExpensesTitle': '¡Aún no hay gastos hoy!',
  'dashboard.noExpensesDesc': 'Toca el botón + para agregar tu primer gasto',
  'dashboard.budget': 'Presupuesto',
  'dashboard.remaining': 'Restante',
  'dashboard.reservedFunds': 'Reservado (Suscripciones)',
  'dashboard.safeToSpend': 'Disponible Seguro',
  'dashboard.recentActivity': 'Actividad reciente',
  'dashboard.recentTransactions': 'Movimientos recientes',
  'dashboard.upcomingTitle': 'Próximos cobros',
  'dashboard.upcomingSummary':
    '{count} suscripciones vencen en los próximos 3 días',
  'dashboard.upcomingNext': '{name} en {days} día(s)',
  'dashboard.upcomingRow': '{name} • {amount} • en {days} días',
  'dashboard.upcomingLoading': 'Cargando próximos cobros...',
  'dashboard.upcomingError': 'No se pudieron cargar los próximos cobros.',
  'dashboard.upcomingNone': 'No hay cobros en los próximos 3 días',
  'dashboard.loadError':
    'No se pudieron cargar algunos datos del inicio. Desliza para refrescar o reintentar.',
  'dashboard.openSubscriptions': 'Abrir Mis Suscripciones',
  'dashboard.savingsTitle': 'Caja de ahorro',
  'dashboard.savingsDescription':
    'Crea metas y agrega dinero en unos pocos toques.',
  'dashboard.cashflowTitle': 'Flujo de efectivo',
  'dashboard.savingsRate': 'Tasa de ahorro: {percent}%',
  'dashboard.cashflowEmptyHint':
    'Agrega al menos un ingreso real, como tu sueldo o quincena, para que la app calcule tu flujo neto, lo compare contra tus gastos y estime cuánto podrías mover a ahorro con seguridad.',
  'dashboard.incomeLabel': 'Ingresos',
  'dashboard.expensesLabel': 'Gastos',
  'dashboard.netLabel': 'Neto',
  'dashboard.actionsTitle': 'Siguientes pasos recomendados',
  'dashboard.actionAddIncomeTitle': 'Agrega tu primer ingreso',
  'dashboard.actionAddIncomeDescription':
    'Registra dinero que realmente te entró, como sueldo o quincena. Tu plan de gasto es el tope que quieres seguir; el ingreso es lo que sí recibiste.',
  'dashboard.actionAddIncomeCta': 'Agregar ingreso',
  'dashboard.actionCategoryBudgetsTitle': 'Revisa tus límites por categoría',
  'dashboard.actionCategoryBudgetsOverDescription':
    '{count} categorías ya se pasaron de su límite en este plan.',
  'dashboard.actionCategoryBudgetsWatchDescription':
    '{count} categorías ya van cerca de su límite en este plan.',
  'dashboard.actionCategoryBudgetsCta': 'Abrir límites',
  'dashboard.actionReviewSpendingTitle': 'Baja el ritmo esta semana',
  'dashboard.actionReviewSpendingDescription':
    'Estás gastando {amount} más que en la semana anterior. Mantén lo que resta del período dentro de {safeAmount}.',
  'dashboard.actionReviewSpendingNoRoomDescription':
    'Estás gastando {amount} más que en la semana anterior y ya consumiste tu margen seguro de este período.',
  'dashboard.actionReviewSpendingCta': 'Ver analíticas',
  'dashboard.actionTrimSubscriptionsTitle': 'Revisa tus suscripciones',
  'dashboard.actionTrimSubscriptionsDescription':
    'Tus suscripciones activas podrían liberarte {amount} en {months} meses.',
  'dashboard.actionTrimSubscriptionsCta': 'Revisar servicios',
  'dashboard.actionMoveSavingsTitle': 'Mueve dinero a ahorro',
  'dashboard.actionMoveSavingsDescription':
    'Con tu ritmo actual podrías apartar {amount} sin tocar tus pagos planeados.',
  'dashboard.actionMoveSavingsCta': 'Abrir ahorro',
  'notifications.title': 'Notificaciones',
  'notifications.subtitle':
    'Revisa las señales financieras que necesitan atención y las sugerencias que podrían mejorar tu mes.',
  'notifications.summaryTotal': 'Total',
  'notifications.summaryAttention': 'Atención',
  'notifications.summarySuggestions': 'Sugerencias',
  'notifications.loadError':
    'No se pudieron refrescar algunas alertas. Desliza hacia abajo para intentar otra vez.',
  'notifications.emptyTitle': 'Todo se ve en calma',
  'notifications.emptyDescription':
    'Cuando la app detecte presión o una oportunidad útil, aparecerá aquí.',
  'notifications.attentionSection': 'Necesita atención',
  'notifications.suggestionSection': 'Sugerencias',
  'notifications.attentionEmpty': 'No hay nada urgente por ahora.',
  'notifications.suggestionEmpty': 'No hay sugerencias extra por ahora.',
  'notifications.incomeTitle': 'Agrega ingresos para desbloquear tu flujo real',
  'notifications.incomeDescription':
    'Sin ingresos, la app solo puede mostrar gasto. Agrega dinero que realmente te entró, como sueldo, quincena, transferencias o ingresos extra, para desbloquear el flujo neto y sugerencias de ahorro más seguras.',
  'notifications.addIncomeCta': 'Agregar ingreso',
  'notifications.categoryOverBudgetTitle': 'Ya rebasaste límites por categoría',
  'notifications.categoryOverBudgetDescription':
    'Ya hay {count} categorías que superaron su presupuesto dentro de este plan.',
  'notifications.categoryWatchTitle': 'Algunas categorías necesitan revisión',
  'notifications.categoryWatchDescription':
    'Hay {count} categorías cerca de su límite dentro de este plan.',
  'notifications.reviewBudgetsCta': 'Revisar límites',
  'notifications.spendingPaceTitle': 'Esta semana necesita freno',
  'notifications.spendingPaceDescription':
    'Vas gastando {amount} más que la semana anterior. Intenta dejar el resto del período dentro de {safeAmount}.',
  'notifications.spendingPaceNoRoomDescription':
    'Vas gastando {amount} más que la semana anterior y ya consumiste el margen seguro de este período.',
  'notifications.reviewSpendingCta': 'Abrir analíticas',
  'notifications.upcomingSubscriptionsTitle':
    'Se acercan {count} cobros recurrentes',
  'notifications.upcomingSubscriptionsDescription':
    '{name} y otros cobros podrían llevarse alrededor de {amount} en los próximos días.',
  'notifications.openUpcomingCta': 'Abrir próximos',
  'notifications.cardPaymentTitle': '{name} requiere pago pronto',
  'notifications.cardPaymentDescription':
    'Esta tarjeta ya lleva {amount} en el ciclo actual y la fecha límite es {date}.',
  'notifications.openCardsCta': 'Abrir tarjetas',
  'notifications.cardOverLimitTitle': '{name} supera el límite registrado',
  'notifications.cardOverLimitDescription':
    'Ya rebasaste el límite registrado por {amount}. Revisa esta tarjeta antes del próximo pago.',
  'notifications.cardUsageTitle': '{name} ya va pesada',
  'notifications.cardUsageDescription':
    'Esta tarjeta ya usa {percent} de su límite y le quedan {amount} disponibles.',
  'notifications.cardLimitMissingTitle':
    'Aún faltan límites en algunas tarjetas',
  'notifications.cardLimitMissingDescription':
    '{count} tarjetas activas no tienen límite registrado, así que las alertas de uso son menos precisas.',
  'notifications.subscriptionSavingsTitle':
    'Tus suscripciones pueden liberar flujo',
  'notifications.subscriptionSavingsDescription':
    'Cancelar o recortar servicios podría liberar {amount} en los próximos {months} meses.',
  'notifications.trimSubscriptionsCta': 'Revisar suscripciones',
  'notifications.savingsGoalTitle': '{name} ya está cerca',
  'notifications.savingsGoalDescription':
    'Todavía te faltan {amount} y la fecha objetivo llega en {days} días.',
  'notifications.openSavingsGoalCta': 'Abrir meta',
  'notifications.startSavingsTitle': 'Empieza una meta de ahorro',
  'notifications.startSavingsDescription':
    'Ya tienes margen dentro del mes. Convierte hasta {amount} en una meta visible en lugar de dejarlo suelto.',
  'notifications.openSavingsCta': 'Abrir ahorro',
  'reports.title': 'Reportes',
  'reports.subtitle':
    'Revisa un resumen semanal o mensual y comparte solo lo que importa.',
  'reports.periodWeek': 'Semana',
  'reports.periodMonth': 'Mes',
  'reports.dateLabel': 'Hasta {date}',
  'reports.shareCta': 'Compartir',
  'reports.saveCta': 'Guardar',
  'reports.emailCta': 'Correo',
  'reports.loadingRange': 'Cargando rango...',
  'reports.loadError':
    'No se pudo refrescar el reporte. Desliza hacia abajo o intenta otra vez.',
  'reports.emptyTitle': 'Todavía no hay datos para reportar',
  'reports.emptyDescription':
    'Agrega ingresos, gastos, suscripciones o metas de ahorro para construir un reporte útil.',
  'reports.emptyCta': 'Agregar ingreso',
  'reports.summaryIncome': 'Ingresos',
  'reports.summaryIncomeMeta': '{count} registros',
  'reports.summarySpent': 'Gasto',
  'reports.summarySpentMeta': '{count} gastos',
  'reports.summaryNet': 'Neto',
  'reports.summaryNoSavingsRate':
    'La tasa de ahorro aparecerá cuando registres ingresos.',
  'reports.summarySavingsRateValue': 'Tasa de ahorro {value}%',
  'reports.summaryAverageDaily': 'Promedio diario',
  'reports.summaryTrackedDays': '{days} días seguidos',
  'reports.highlightsTitle': 'Hallazgos clave',
  'reports.safeMoveTitle': 'Movimiento seguro',
  'reports.topCategoryTitle': 'Categoría principal',
  'reports.noTopCategory': 'Todavía no hay una categoría dominante',
  'reports.planTitle': 'Contexto del plan',
  'reports.planBudget': 'Plan de gasto',
  'reports.planRemaining': 'Restante',
  'reports.planSafeToSpend': 'Disponible seguro',
  'reports.overBudgetCount': '{count} sobre el límite',
  'reports.watchBudgetCount': '{count} cerca del límite',
  'reports.categoriesTitle': 'Mezcla por categoría',
  'reports.noCategories':
    'No hubo gasto por categoría en esta ventana del reporte.',
  'reports.categoryMeta': '{count} movimientos • {percent}%',
  'reports.subscriptionsTitle': 'Presión por suscripciones',
  'reports.subscriptionRecurringSpend': 'Recurrente al mes',
  'reports.subscriptionProjectedSavings': 'Ahorro potencial',
  'reports.subscriptionActiveCount': 'Suscripciones activas',
  'reports.subscriptionItemMeta': 'Ahorro potencial en {months} meses',
  'reports.savingsTitle': 'Avance de ahorro',
  'reports.savingsSaved': 'Ahorrado',
  'reports.savingsTarget': 'Meta',
  'reports.savingsProgress': 'Avance',
  'reports.nextGoalTitle': 'Siguiente meta',
  'reports.nextGoalValue': '{title} para {date}',
  'reports.noNextGoal': 'Todavía no hay una meta con fecha.',
  'reports.noGoalDate': 'sin fecha',
  'reports.emailTitle': 'Enviar reporte',
  'reports.emailConfirm':
    '¿Quieres enviar este reporte al correo de tu cuenta?',
  'reports.emailSentTitle': 'Reporte enviado',
  'reports.emailSentDesc': 'El reporte seleccionado se envió a tu correo.',
  'reports.emailFailed': 'No se pudo enviar el reporte por correo.',
  'reports.saveSentTitle': 'Reporte guardado',
  'reports.saveSentDesc': 'Este corte quedó guardado en tu historial.',
  'reports.saveFailed': 'No se pudo guardar el corte del reporte.',
  'reports.historyTitle': 'Reportes guardados',
  'reports.historyLoading': 'Cargando reportes guardados...',
  'reports.historyLoadError': 'No se pudieron cargar los reportes guardados.',
  'reports.historyEmpty': 'Guarda o envía un reporte y aparecerá aquí.',
  'reports.historySourceManual': 'Guardado',
  'reports.historySourceEmail': 'Enviado',
  'reports.historyGeneratedAt': 'Generado {date}',
  'planner.title': 'Planner mensual',
  'planner.subtitle':
    'Revisa este mes antes de que los cobros, pagos y gastos te agarren sin margen.',
  'planner.overviewTitle': 'Resumen del mes',
  'planner.rangeLabel': '{start} - {end}',
  'planner.monthSummaryMeta': '{count} movimientos en {days} días activos',
  'planner.todayAction': 'Hoy',
  'planner.nextEvent': 'Próximo',
  'planner.subscriptionChargesLabel': 'Suscripciones planeadas',
  'planner.cardRemindersLabel': 'Recordatorios de tarjeta',
  'planner.agendaTitle': 'Agenda mensual',
  'planner.partialData':
    'No se pudieron cargar algunos bloques del planner. Desliza para actualizar e intenta de nuevo.',
  'planner.emptyTitle': 'No hay movimientos en este mes',
  'planner.emptyDescription':
    'Agrega ingresos, gastos, suscripciones o tarjetas para entender el mes completo en un solo lugar.',
  'planner.addEntryCta': 'Agregar movimiento',
  'planner.dayCountLabel': '{count} movimientos',
  'planner.subscriptionCharge': 'Cargo de suscripción',
  'planner.cardClosing': 'Corte de tarjeta',
  'planner.cardPaymentDue': 'Pago límite',
  'planner.incomeEntry': 'Registro de ingreso',
  'planner.expenseEntry': 'Registro de gasto',
  'categoryBudgets.title': 'Presupuestos por categoría',
  'categoryBudgets.subtitle':
    'Define un tope por categoría y síguelo dentro de tu plan de gasto actual.',
  'categoryBudgets.currentPeriod': 'Ventana actual',
  'categoryBudgets.periodHint':
    'Todos los límites por categoría se miden dentro de {range}.',
  'categoryBudgets.summaryPlanned': 'Con límite',
  'categoryBudgets.summaryWatch': 'Por revisar',
  'categoryBudgets.summaryRemaining': 'Margen restante',
  'categoryBudgets.summaryTotals': 'Planeado {planned} • Gastado {spent}',
  'categoryBudgets.loadError':
    'No se pudieron cargar los presupuestos por categoría. Desliza para refrescar o reintenta.',
  'categoryBudgets.emptyTitle': 'Aún no hay categorías',
  'categoryBudgets.emptyDescription':
    'Crea primero tus categorías para poder asignar un límite a cada una.',
  'categoryBudgets.sectionTitle': 'Radar de categorías',
  'categoryBudgets.sectionMeta': '{count} categorías',
  'categoryBudgets.spentOfLimit': '{spent} gastados de {limit}',
  'categoryBudgets.noBudgetSpent': '{spent} gastados sin límite',
  'categoryBudgets.noBudgetSet': 'Aún no tiene límite',
  'categoryBudgets.setBudget': 'Definir límite',
  'categoryBudgets.statusOffTrack': 'Pasado del límite',
  'categoryBudgets.statusWatch': 'Cerca del límite',
  'categoryBudgets.statusOnTrack': 'En control',
  'categoryBudgets.statusNoBudget': 'Sin límite',
  'categoryBudgets.remainingLabel': 'Restan {amount}',
  'categoryBudgets.expenseCountLabel': '{count} movimientos en este período',
  'categoryBudgets.modalTitle': 'Presupuesto de {name}',
  'categoryBudgets.modalSubtitle':
    'Este límite sigue tu plan de gasto {period} actual.',
  'categoryBudgets.inputLabel': 'Límite de la categoría',
  'categoryBudgets.removeBudget': 'Quitar límite',
  'categoryBudgets.validationAmount': 'Ingresa un límite válido',
  'categoryBudgets.failedUpdate':
    'No se pudo actualizar el límite de esta categoría.',
  'expenses.title': 'Gastos',
  'expenses.subtitle': '{count} gastos hoy • {total}',
  'expenses.overviewSubtitle': '{count} gastos • {total}',
  'expenses.totalSpending': 'Gasto total',
  'expenses.emptyTitle': 'Aún no hay gastos',
  'expenses.emptyDescription': 'Toca el botón + para agregar tu primer gasto',
  'expenses.loadErrorDescription':
    'No se pudieron cargar los gastos. Desliza para refrescar o reintentar.',
  'expenses.loadMoreError': 'No se pudieron cargar más gastos.',
  'income.title': 'Ingresos',
  'income.overviewSubtitle': '{count} ingresos • {total}',
  'income.count.one': '{count} ingreso',
  'income.count.other': '{count} ingresos',
  'income.totalIncome': 'Ingresos totales',
  'income.emptyTitle': 'Aún no hay ingresos',
  'income.emptyDescription':
    'Agrega tu primer ingreso para que la app te muestre tu flujo real.',
  'income.loadErrorDescription':
    'No se pudieron cargar los ingresos. Desliza para refrescar o reintentar.',
  'income.addFirst': 'Agregar ingreso',
  'income.addTitle': 'Agregar ingreso',
  'income.editTitle': 'Editar ingreso',
  'income.subtitle':
    'Registra dinero que realmente te entró, como sueldo, quincena, transferencias o ingresos extra.',
  'income.amountPlaceholder': '0.00',
  'income.amountPreview': 'Dinero recibido: {amount}',
  'income.currency': 'Moneda',
  'income.source': 'Origen',
  'income.sourcePlaceholder': 'Sueldo, freelance, bono...',
  'income.receivedOn': 'Recibido el',
  'income.note': 'Nota',
  'income.notePlaceholder': 'Contexto opcional para este ingreso.',
  'income.tip':
    'Agrega cada nómina, transferencia o ingreso extra para ver mejor tu flujo neto.',
  'income.save': 'Guardar ingreso',
  'income.saveChanges': 'Guardar cambios',
  'income.savedSuccess': 'Ingreso guardado correctamente',
  'income.updatedSuccess': 'Ingreso actualizado correctamente',
  'income.enterTitle': 'Ingresa el origen del ingreso',
  'income.enterAmount': 'Ingresa un monto válido',
  'income.chooseCurrency': 'Elige una moneda',
  'income.chooseDate': 'Elige la fecha de recepción',
  'income.deleteTitle': 'Eliminar ingreso',
  'income.deleteMessage': '¿Quieres eliminar {title}?',
  'income.failedCreate': 'No se pudo guardar el ingreso',
  'income.failedUpdate': 'No se pudo actualizar el ingreso',

  'history.title': 'Historial',
  'history.subtitle': '{count} movimientos • {total}',
  'history.searchPlaceholder': 'Buscar gastos...',
  'history.noExpensesTitle': 'No se encontraron gastos',
  'history.noExpensesDescSearch': 'Prueba con otro término de búsqueda',
  'history.noExpensesDescDefault': 'Registra tus gastos para verlos aquí',
  'history.noRecordsTitle': 'No se encontraron registros',
  'history.noRecordsDesc':
    'Ajusta los filtros de categoría/fecha o agrega nuevos movimientos.',
  'history.manualExpense': 'Gasto manual',
  'history.autoSubscription': 'Suscripción automática',
  'history.subscriptionBadge': 'Suscripción',
  'history.filterAction': 'Filtrar movimientos',
  'history.recordsLabel': 'Movimientos',
  'history.todayLabel': 'Hoy',

  'analytics.title': 'Analíticas',
  'analytics.subtitle': 'Tus insights de gasto',
  'analytics.thisWeek': 'Período seleccionado',
  'analytics.budget': 'Presupuesto',
  'analytics.dailyAvg': 'Promedio diario',
  'analytics.expenses': 'Gastos',
  'analytics.dailySpending': 'Gasto diario (últimos 7 días)',
  'analytics.dailyTrendTitle': 'Tendencia diaria (Últimos 7 días)',
  'analytics.dateLabel': 'Hasta {date}',
  'analytics.noDailyDataTitle': 'Sin datos diarios',
  'analytics.noDailyDataDesc': 'Registra gastos para ver tu gasto diario.',
  'analytics.byCategory': 'Por categoría',
  'analytics.noCategoryDataTitle': 'Sin datos por categoría',
  'analytics.noCategoryDataDesc':
    'Registra gastos para ver tus gastos por categoría.',
  'analytics.expenseCount.one': '{count} gasto',
  'analytics.expenseCount.other': '{count} gastos',
  'analytics.spendingSignals': 'Señales de gasto',
  'analytics.weekToDate': 'Semana a la fecha',
  'analytics.monthToDate': 'Mes a la fecha',
  'analytics.moreThanPrevious': '{amount} más que el período anterior',
  'analytics.lessThanPrevious': '{amount} menos que el período anterior',
  'analytics.sameAsPrevious': 'Igual que el período anterior',
  'analytics.projectedMonthEnd': 'Cierre proyectado: {amount}',
  'analytics.topCategoryImpact': 'Categoría principal: {name} ({percent}%)',
  'analytics.noCategoryImpact':
    'Todavía no hay una categoría dominante este mes.',
  'analytics.cashflowTitle': 'Resumen de flujo',
  'analytics.savingsRate':
    'Estás reteniendo alrededor del {percent}% de tus ingresos en este período seleccionado.',
  'analytics.cashflowEmptyHint':
    'Agrega ingresos para comparar lo que entró contra lo que salió.',
  'analytics.subscriptionSavingsTitle': 'Oportunidad de ahorro',
  'analytics.saveByCancelling':
    'Si cancelas tus suscripciones activas, podrías ahorrar {amount} en {months} meses.',
  'analytics.activeSubscriptionsMeta.one':
    '{count} suscripción activa · {amount}/mes',
  'analytics.activeSubscriptionsMeta.other':
    '{count} suscripciones activas · {amount}/mes',
  'analytics.topSubscriptions': 'Suscripciones con mayor impacto',
  'analytics.saveInMonths': 'Ahorra {amount} en {months} meses',
  'analytics.noSubscriptionsToOptimize':
    'No hay suscripciones activas para optimizar en este momento.',
  'budget.period.daily': 'Diario',
  'budget.period.weekly': 'Semanal',
  'budget.period.monthly': 'Mensual',
  'budget.period.annual': 'Anual',
  'budget.period.period': 'Período personalizado',
  'subscriptions.title': 'Mis Suscripciones',
  'subscriptions.subtitle': 'Controla servicios activos y tu total mensual',
  'subscriptions.upcomingTitle': 'Próximos cobros',
  'subscriptions.upcomingSubtitle': 'Cobros en los próximos {days} días',
  'subscriptions.upcomingEmptyTitle': 'No hay próximos cobros',
  'subscriptions.upcomingEmptyDescription':
    'No hay suscripciones con cobro en los próximos {days} días.',
  'subscriptions.upcomingLoadError':
    'No se pudieron cargar las suscripciones próximas.',
  'subscriptions.unknownDate': 'Fecha desconocida',
  'subscriptions.totalMonthly': 'Gasto mensual total',
  'subscriptions.activeCount.one': '{count} suscripción activa',
  'subscriptions.activeCount.other': '{count} suscripciones activas',
  'subscriptions.emptyTitle': 'Aún no tienes suscripciones',
  'subscriptions.emptyDescription':
    'Agrega tu primer servicio para ver aquí tu dashboard premium.',
  'subscriptions.addFirst': 'Agregar suscripción',
  'subscriptions.chargeDate': 'Fecha de cobro',
  'subscriptions.cardTapHint': 'Toca para administrar',
  'subscriptions.cardHint': 'Puedes eliminar esta suscripción de tu lista.',
  'subscriptions.searchLabel': 'Buscar servicio',
  'subscriptions.searchPlaceholder': 'Netflix, Spotify...',
  'subscriptions.searchEmpty': 'No se encontraron servicios.',
  'subscriptions.groupStreaming': 'Streaming y música',
  'subscriptions.groupCloud': 'Nube y servicios',
  'subscriptions.groupWork': 'Trabajo y creatividad',
  'subscriptions.groupGaming': 'Gaming y comunidad',
  'subscriptions.groupLifestyle': 'Estilo de vida y aprendizaje',
  'subscriptions.groupOther': 'Otros',
  'subscriptions.failedCreate': 'No se pudo crear la suscripción',
  'subscriptions.failedUpdate': 'No se pudo actualizar la suscripción',
  'subscriptions.failedRemove': 'No se pudo eliminar la suscripción',
  'subscriptions.deleteTitle': 'Eliminar suscripción',
  'subscriptions.deleteMessage': '¿Quieres eliminar {name}?',
  'savings.title': 'Caja de Ahorro',
  'savings.subtitle': 'Tus metas, en un vistazo.',
  'savings.totalSavedLabel': 'Total ahorrado',
  'savings.activeGoalsLabel': 'Metas activas',
  'savings.overallProgressLabel': 'Avance general',
  'savings.goalsSectionTitle': 'Tus metas',
  'savings.goalsSectionSubtitle': 'Toca una meta para verla o agregar dinero.',
  'savings.goalsCount.one': '{count} meta de ahorro',
  'savings.goalsCount.other': '{count} metas de ahorro',
  'savings.emptyTitle': 'Aún no tienes metas de ahorro',
  'savings.emptyDescription':
    'Crea tu primera meta para empezar a construir tu hábito de ahorro.',
  'savings.goalReached': 'Meta alcanzada',
  'savings.progressLabel': '{percent}% completado',
  'savings.savedAmountLabel': 'Ahorrado',
  'savings.targetAmountLabel': 'Meta',
  'savings.remainingAmountLabel': 'Faltante',
  'savings.remainingAmount': 'Faltan {amount}',
  'savings.openDetailHint':
    'Toca la tarjeta para ver el historial completo de movimientos.',
  'savings.createGoalTitle': 'Crear meta de ahorro',
  'savings.createGoalSubtitle':
    'Empieza con lo básico. Puedes personalizarla después.',
  'savings.createGoalAction': 'Crear mi meta',
  'savings.newGoalAction': 'Nueva meta',
  'savings.quickAddAction': 'Agregar',
  'savings.editGoalTitle': 'Editar meta de ahorro',
  'savings.editGoalSubtitle':
    'Ajusta lo necesario y mantén esta meta fácil de reconocer.',
  'savings.editGoalAction': 'Editar meta',
  'savings.deleteGoalTitle': 'Eliminar meta de ahorro',
  'savings.deleteGoalDescription':
    'Esta acción eliminará permanentemente la meta y su historial de movimientos.',
  'savings.deleteGoalAction': 'Eliminar meta',
  'savings.deleteGoalRequiresEmptyBalance':
    'Retira todo el dinero ahorrado antes de eliminar esta meta.',
  'savings.addFundsTitle': 'Agregar fondos',
  'savings.addFundsAction': 'Agregar fondos',
  'savings.withdrawFundsTitle': 'Retirar fondos',
  'savings.withdrawFundsAction': 'Retirar fondos',
  'savings.formGoalTitle': 'Nombre de la meta',
  'savings.formGoalPlaceholder': 'Ej. Fondo de emergencia',
  'savings.formTargetAmount': 'Monto objetivo',
  'savings.formTargetDate': 'Fecha meta',
  'savings.formTargetDateHint':
    'Opcional. Déjala vacía si todavía no tienes una fecha definida.',
  'savings.formGoalIcon': 'Ícono',
  'savings.formGoalColor': 'Color',
  'savings.personalizeToggleTitle': 'Personalizar (opcional)',
  'savings.personalizeToggleSubtitle':
    'Elige ícono y color solo si te ayuda a identificarla más rápido.',
  'savings.formPreviewTitle': 'Así se verá',
  'savings.formDetailsTitle': 'Lo esencial',
  'savings.formDetailsSubtitle':
    'Ponle nombre, define el monto y agrega una fecha solo si la necesitas.',
  'savings.formStyleTitle': '2. Hazla fácil de reconocer',
  'savings.formStyleSubtitle':
    'Elige un ícono y un color para ubicarla más rápido.',
  'savings.formDismissAction': 'Ahora no',
  'savings.formDepositAmount': 'Monto a depositar',
  'savings.formWithdrawAmount': 'Monto a retirar',
  'savings.noTargetDate': 'Sin fecha meta',
  'savings.clearTargetDate': 'Quitar fecha',
  'savings.targetDateLabel': 'Fecha meta',
  'savings.targetAmountPreview': 'Meta: {amount}',
  'savings.goalCompactProgress': '{current} de {target}',
  'savings.targetDateShort': 'Para el {date}',
  'savings.formPreviewHint': 'Revisa cómo se verá antes de guardarla.',
  'savings.availableAmountLabel': 'Disponible',
  'savings.depositHelperText': 'Este monto se sumará al saldo ahorrado actual.',
  'savings.withdrawHelperText':
    'Este monto se restará del saldo ahorrado actual.',
  'savings.validationGoalTitle': 'Por favor ingresa un título para la meta',
  'savings.validationTargetAmount':
    'Por favor ingresa un monto objetivo válido',
  'savings.validationDepositAmount':
    'Por favor ingresa un monto de depósito válido',
  'savings.validationWithdrawAmount':
    'Por favor ingresa un monto de retiro válido',
  'savings.validationWithdrawExceeded': 'Puedes retirar hasta {amount}.',
  'savings.loadGoalsError': 'No se pudieron cargar tus metas de ahorro.',
  'savings.loadTransactionsError':
    'No se pudo cargar el historial de movimientos.',
  'savings.failedCreateGoal': 'No se pudo crear la meta de ahorro.',
  'savings.failedAddFunds': 'No se pudieron agregar fondos a esta meta.',
  'savings.failedWithdrawFunds': 'No se pudieron retirar fondos de esta meta.',
  'savings.failedUpdateGoal': 'No se pudo actualizar esta meta de ahorro.',
  'savings.failedDeleteGoal': 'No se pudo eliminar esta meta de ahorro.',
  'savings.detailScreenTitle': 'Meta de ahorro',
  'savings.detailHeroLabel': 'Progreso del ahorro',
  'savings.progressRingLabel': 'completado',
  'savings.createdAtLabel': 'Creada el',
  'savings.transactionsTitle': 'Movimientos',
  'savings.transactionsSubtitle':
    'Cada depósito y retiro realizado en esta meta.',
  'savings.emptyTransactionsTitle': 'Aún no hay movimientos',
  'savings.emptyTransactionsDescription':
    'Tu primer movimiento aparecerá aquí en cuanto uses esta meta.',
  'savings.goalNotFoundTitle': 'No se encontró la meta',
  'savings.depositTypeLabel': 'Depósito',
  'savings.withdrawTypeLabel': 'Retiro',

  'paymentMethod.label': 'Método de pago',
  'paymentMethod.select': 'Selecciona un método de pago',
  'paymentMethod.none': 'Sin método de pago',
  'paymentMethod.cash': 'Efectivo',
  'paymentMethod.card': 'Tarjeta',
  'paymentMethod.creditCard': 'Tarjeta de crédito',
  'paymentMethod.debitCard': 'Tarjeta de débito',
  'paymentMethod.transfer': 'Transferencia',

  'creditCards.title': 'Tarjetas de crédito',
  'creditCards.subtitle':
    'Guarda tus tarjetas una vez y reutilízalas en gastos y suscripciones.',
  'creditCards.label': 'Tarjeta de crédito',
  'creditCards.select': 'Selecciona una tarjeta de crédito',
  'creditCards.helper': 'Elige la tarjeta específica usada en este movimiento.',
  'creditCards.none': 'Sin tarjeta seleccionada',
  'creditCards.emptyShort': 'No hay tarjetas registradas',
  'creditCards.emptyHint':
    'Agrega una tarjeta para usar pagos con tarjeta de crédito.',
  'creditCards.emptyTitle': 'Aún no tienes tarjetas de crédito',
  'creditCards.emptyDescription':
    'Crea tu primera tarjeta para poder vincularla a gastos y suscripciones.',
  'creditCards.addFirst': 'Agregar primera tarjeta',
  'creditCards.addNew': 'Agregar nueva tarjeta',
  'creditCards.openModule': 'Abrir tarjetas de credito',
  'creditCards.manageModule': 'Administrar tarjetas',
  'creditCards.moduleHint':
    'Este modulo siempre esta disponible desde Ajustes y el menu lateral.',
  'creditCards.addTitle': 'Agregar tarjeta de crédito',
  'creditCards.editTitle': 'Editar tarjeta de crédito',
  'creditCards.formSubtitle':
    'Guarda solo los datos de catálogo que necesitas. No se guarda el número completo, CVV ni vencimiento.',
  'creditCards.previewName': 'Alias de la tarjeta',
  'creditCards.name': 'Alias',
  'creditCards.namePlaceholder': 'Ej. Nu Personal',
  'creditCards.bank': 'Banco',
  'creditCards.bankPlaceholder': 'Ej. Nu Bank',
  'creditCards.brand': 'Marca',
  'creditCards.last4': 'Últimos 4 dígitos',
  'creditCards.color': 'Color',
  'creditCards.limit': 'Límite de crédito',
  'creditCards.closingDay': 'Día de corte',
  'creditCards.paymentDueDay': 'Día límite de pago',
  'creditCards.walletTitle': 'Resumen de tarjetas',
  'creditCards.walletHint':
    'Revisa el gasto del ciclo actual, tu crédito disponible y las fechas que requieren atención.',
  'creditCards.currentCycle': 'Ciclo actual',
  'creditCards.availableCredit': 'Crédito disponible',
  'creditCards.utilization': 'Utilización',
  'creditCards.nextClosing': 'Próximo corte',
  'creditCards.nextPayment': 'Próximo pago',
  'creditCards.linkedSubscriptions': 'Suscripciones vinculadas',
  'creditCards.monthlyRecurring': 'Cargo recurrente mensual',
  'creditCards.expensesInCycle': '{count} movimientos en este ciclo',
  'creditCards.dueSoon': 'Pago próximo',
  'creditCards.highUsage': 'Uso alto',
  'creditCards.limitMissing': 'Agrega el límite de la tarjeta',
  'creditCards.overLimit': 'Supera el límite registrado',
  'creditCards.closesSoon': 'Corte cercano',
  'creditCards.noSchedule': 'Sin fecha configurada',
  'creditCards.today': 'Hoy',
  'creditCards.tomorrow': 'Mañana',
  'creditCards.inDays': 'En {count} días',
  'creditCards.status': 'Estado',
  'creditCards.active': 'Activa',
  'creditCards.inactive': 'Inactiva',
  'creditCards.save': 'Guardar tarjeta',
  'creditCards.saveChanges': 'Guardar cambios',
  'creditCards.deactivateTitle': 'Desactivar tarjeta de crédito',
  'creditCards.deactivateMessage':
    '¿Quieres desactivar {name}? Los registros históricos conservarán el vínculo.',
  'creditCards.deactivateAction': 'Desactivar',
  'creditCards.activateAction': 'Activar',
  'creditCards.failedCreate': 'No se pudo crear la tarjeta de crédito',
  'creditCards.failedUpdate': 'No se pudo actualizar la tarjeta de crédito',
  'creditCards.failedRemove': 'No se pudo desactivar la tarjeta de crédito',
  'creditCards.validationRequired': 'Selecciona una tarjeta de crédito',
  'creditCards.validationName': 'Ingresa un alias para la tarjeta',
  'creditCards.validationBank': 'Ingresa el nombre del banco',
  'creditCards.validationBrand': 'Selecciona una marca',
  'creditCards.validationLast4': 'Ingresa exactamente 4 dígitos',
  'creditCards.validationLimit': 'Ingresa un límite de crédito válido',
  'creditCards.validationClosingDay': 'El día de corte debe estar entre 1 y 31',
  'creditCards.validationDueDay':
    'El día límite de pago debe estar entre 1 y 31',

  'addSubscription.title': 'Agregar Suscripción',
  'addSubscription.editTitle': 'Editar Suscripción',
  'addSubscription.subtitle': 'Registra un servicio en segundos',
  'addSubscription.editSubtitle': 'Actualiza o elimina esta suscripción',
  'addSubscription.quickPick': 'Selección rápida',
  'addSubscription.quickPickHint':
    'Elige un servicio para llenar más rápido el nombre, el icono y el color.',
  'addSubscription.name': 'Nombre',
  'addSubscription.namePlaceholder': 'Ej. Netflix',
  'addSubscription.cost': 'Costo',
  'addSubscription.frequency': 'Frecuencia',
  'addSubscription.frequencyWeekly': 'Semanal',
  'addSubscription.frequencyMonthly': 'Mensual',
  'addSubscription.frequencyYearly': 'Anual',
  'addSubscription.chargeDate': 'Fecha de cobro',
  'addSubscription.androidPickerHint':
    'Usa el selector nativo de fecha de Android',
  'addSubscription.brandColor': 'Color de marca',
  'addSubscription.save': 'Guardar suscripción',
  'addSubscription.update': 'Actualizar suscripción',
  'addSubscription.saved': 'Suscripción guardada',
  'addSubscription.updated': 'Suscripción actualizada',
  'addSubscription.validationName':
    'Por favor ingresa el nombre de la suscripción',
  'addSubscription.validationCost': 'Por favor ingresa un costo válido',
  'addSubscription.validationDate': 'Selecciona una fecha de cobro',
  'addSubscription.validationCurrency': 'Selecciona una moneda',
  'addEntry.expenseTab': 'Gasto',
  'addEntry.incomeTab': 'Ingreso',
  'addEntry.subscriptionTab': 'Suscripción',

  'addExpense.title': 'Agregar gasto',
  'addExpense.subtitle': 'Registra tu compra',
  'addExpense.amountPlaceholder': '0.00',
  'addExpense.titleLabel': 'Título',
  'addExpense.titlePlaceholder': '¿Qué compraste?',
  'addExpense.dateLabel': 'Fecha de compra',
  'addExpense.categoryRequired': 'Categoría *',
  'addExpense.showCategoryCreator': 'Crear nueva categoría',
  'addExpense.hideCategoryCreator': 'Ocultar creador de categoría',
  'addExpense.categoryNamePlaceholder': 'Nombre de categoría',
  'addExpense.icon': 'Ícono',
  'addExpense.color': 'Color',
  'addExpense.scanReceipt': 'Escanear ticket',
  'addExpense.scanReceiptHint':
    'Usa la cámara para capturar un ticket y autocompletar este formulario.',
  'addExpense.scanReceiptAction': 'Usar cámara',
  'addExpense.retakeReceipt': 'Tomar de nuevo',
  'addExpense.removeReceipt': 'Quitar',
  'addExpense.receiptReady': 'Ticket capturado',
  'addExpense.receiptParsing':
    'Leyendo el ticket y completando tu formulario...',
  'addExpense.receiptAutofillHint':
    'Revisa los campos autocompletados antes de guardar.',
  'addExpense.receiptAutofilled':
    'Los datos del ticket se agregaron al formulario.',
  'addExpense.receiptParseFailed':
    'No se pudo leer este ticket. Intenta otra vez con una foto más clara.',
  'addExpense.receiptParseTimedOut':
    'El análisis del ticket tardó demasiado. Intenta de nuevo en un momento.',
  'addExpense.receiptParseUnavailable':
    'No se pudo conectar con el analizador de tickets en este momento.',
  'addExpense.cameraPermissionMessage':
    'BudgetApp necesita acceso a la cámara para capturar tickets.',
  'addExpense.cancel': 'Cancelar',
  'addExpense.saveCategory': 'Guardar categoría',
  'addExpense.noteOptional': 'Nota (opcional)',
  'addExpense.notePlaceholder': 'Agregar una nota...',
  'addExpense.saveExpense': 'Guardar gasto',
  'addExpense.savedSuccess': 'Gasto guardado correctamente',

  'editExpense.screenTitle': 'Editar gasto',
  'editExpense.category': 'Categoría',
  'editExpense.updateExpense': 'Actualizar gasto',
  'editExpense.updatedSuccess': 'Gasto actualizado correctamente',

  'expenseDetail.screenTitle': 'Detalle del gasto',
  'expenseDetail.uncategorized': 'Sin categoría',
  'expenseDetail.note': 'Nota',
  'expenseDetail.editExpense': 'Editar gasto',
  'expenseDetail.deleteExpense': 'Eliminar gasto',
  'expenseDetail.deleteTitle': 'Eliminar gasto',
  'expenseDetail.deleteMessage': '¿Seguro que quieres eliminar este gasto?',
  'expenseDetail.deleteInstallmentMessage':
    'Si eliminas esta mensualidad se eliminará todo el plan de pagos. ¿Continuar?',

  'category.noneAvailable':
    'No hay categorías disponibles. Puedes crear una abajo.',
  'category.created': 'Categoría creada',
  'category.existsSelected':
    'La categoría ya existe. Se seleccionó la existente.',
  'category.failedCreate': 'No se pudo crear la categoría',
  'category.enterName': 'Por favor ingresa un nombre de categoría',

  'expense.failedSave': 'No se pudo guardar el gasto',
  'expense.failedUpdate': 'No se pudo actualizar el gasto',
  'expense.enterTitle': 'Por favor ingresa un título',
  'expense.enterAmount': 'Por favor ingresa un monto válido',
  'expense.paymentTimingLabel': 'Tipo de pago',
  'expense.singlePayment': 'Pago único',
  'expense.installmentPayment': 'Meses',
  'expense.installmentCountLabel': 'Número de mensualidades',
  'expense.installmentCountPlaceholder': 'Por ejemplo: 3, 6, 12',
  'expense.enterInstallmentCount':
    'Ingresa un número de mensualidades mayor a 1',
  'expense.purchaseDateLabel': 'Fecha de compra',
  'expense.firstPaymentDateLabel': 'Fecha del primer pago',
  'expense.enterFirstPaymentDate': 'Selecciona la fecha del primer pago',
  'expense.invalidFirstPaymentDate':
    'La fecha del primer pago debe ser igual o posterior a la fecha de compra.',
  'expense.installmentPreviewTitle': 'Desglose de mensualidades',
  'expense.installmentPreviewHint':
    'Agrega el monto total y el número de mensualidades para ver el cálculo.',
  'expense.installmentPreviewEqual': '{count} mensualidades de {amount}',
  'expense.installmentPreviewAdjusted':
    '{count} mensualidades: {amount} y un último pago de {finalAmount}',
  'expense.installmentFrequencyMonthly': 'Plan mensual • Total {total}',
  'expense.installmentPositionLabel': 'Mensualidad {current} de {count}',
  'expense.installmentPlanTotalLabel': 'Total del plan',
  'expense.chooseCurrency': 'Selecciona una moneda',
  'expense.chooseCategory': 'Por favor elige una categoría',
  'expense.deleteTitle': 'Eliminar gasto',
  'expense.deleteMessage': '¿Seguro que quieres eliminar este gasto?',

  'image.error': 'Error de imagen',
  'image.selectFailed': 'No se pudo seleccionar la imagen',
  'image.readFailed': 'No se pudo leer la imagen seleccionada',
  'image.openCameraFailed': 'No se pudo abrir la cámara',
  'profileImage.title': 'Imagen de perfil',
  'profileImage.message': 'Elige una fuente de imagen',
  'profileImage.takePhoto': 'Tomar foto',
  'profileImage.chooseGallery': 'Elegir de galería',
  'profileImage.removeTitle': 'Quitar foto',
  'profileImage.removeMessage': '¿Quieres quitar tu foto de perfil?',

  'camera.permissionTitle': 'Permiso de cámara',
  'camera.permissionMessage':
    'BudgetApp necesita acceso a la cámara para que puedas tomar una foto de perfil.',
  'camera.allow': 'Permitir',
  'camera.deny': 'Denegar',
  'camera.later': 'Después',
  'camera.blockedTitle': 'Cámara bloqueada',
  'camera.blockedMessage':
    'El permiso de cámara está bloqueado. Actívalo en la configuración del sistema.',
  'camera.openSettings': 'Abrir configuración',
  'camera.permissionTitleGeneric': 'Permiso',
  'camera.openSettingsFailed':
    'No se pudo abrir la configuración. Activa el permiso manualmente.',
  'camera.permissionDeniedTitle': 'Permiso denegado',
  'camera.permissionDeniedMessage': 'Se denegó el permiso de cámara.',

  'settings.title': 'Ajustes',
  'settings.subtitle': 'Administra tu perfil, ajustes y acceso.',
  'settings.profile': 'Perfil',
  'settings.preferencesTitle': 'Ajustes',
  'settings.name': 'Nombre',
  'settings.email': 'Correo',
  'settings.dailyBudget': 'Presupuesto diario',
  'settings.budgetSettings': 'Plan de gasto',
  'settings.currencyHelp':
    'Esta moneda se usará por defecto cuando crees nuevos gastos y suscripciones.',
  'settings.budgetAmount': 'Límite de gasto',
  'settings.budgetPeriod': 'Período de gasto',
  'settings.budgetHelp':
    'Déjalo como el tope de gasto que quieres seguir en ese período. No es tu ingreso. El dinero real que te entra se registra aparte en Flujo de efectivo.',
  'settings.selectBudgetPeriod': 'Elige cómo se calculará tu límite de gasto.',
  'settings.periodStart': 'Inicio del período',
  'settings.periodEnd': 'Fin del período',
  'settings.currentBudget': 'Plan de gasto actual: {value} ({period})',
  'settings.planTitle': 'Plan actual',
  'settings.planLabel': 'Plan',
  'settings.planAccessLabel': 'Acceso',
  'settings.planShortcutDescription':
    'Revisa tu nivel de acceso, las herramientas incluidas y los beneficios Premium en un solo lugar.',
  'settings.planOpenCta': 'Abrir detalles del plan',
  'settings.planIncludedTitle': 'Incluido en tu acceso',
  'settings.planFeatureEnabled': 'Disponible ahora',
  'settings.planFeatureLocked': 'Bloqueado hasta Premium',
  'settings.planPremiumDescription':
    'Esta cuenta ya tiene Premium desbloqueado, incluyendo tarjetas guardadas y planes de mensualidades.',
  'settings.planFreeDescription':
    'Esta cuenta está actualmente en el plan gratis. Mejora cuando quieras más herramientas de control.',
  'settings.planGuestDescription':
    'Estás usando el plan gratis en modo invitado en este dispositivo. Inicia sesión después si quieres respaldo y restauración ligados a tu cuenta.',
  'settings.backupLabel': 'Respaldo',
  'settings.backupGuestValue': 'Solo local',
  'settings.backupAccountValue': 'Nube lista',
  'settings.accessBackupGuestDescription':
    'Estás usando este dispositivo en modo local. Inicia sesión cuando quieras respaldo, sincronización y recuperación.',
  'settings.accessBackupAccountDescription':
    'Tu cuenta mantiene listo el respaldo, la sincronización y la recuperación entre dispositivos.',
  'settings.saveChanges': 'Guardar cambios',
  'settings.saveProfile': 'Guardar perfil',
  'settings.actions': 'Acciones',
  'settings.accountActionsTitle': 'Acciones de la cuenta',
  'settings.seedCategories': 'Crear categorías por defecto',
  'settings.seedCategoriesDesc': 'Crear Comida, Transporte, Compras, etc.',
  'settings.autoWeeklyReport': 'Reporte semanal automático',
  'settings.autoWeeklyReportDesc':
    'Envía por correo un corte semanal cada domingo por la noche con tus datos actuales.',
  'settings.autoMonthlyReport': 'Reporte mensual automático',
  'settings.autoMonthlyReportDesc':
    'Envía por correo un corte mensual el primer día de cada mes.',
  'settings.autoReportsFailed':
    'No se pudieron actualizar tus ajustes de reportes automáticos.',
  'settings.sendWeeklyReport': 'Enviar reporte semanal ahora',
  'settings.sendWeeklyReportPending': 'Enviando...',
  'settings.sendWeeklyReportDesc':
    'Envía ahora mismo el corte semanal actual al correo de tu cuenta.',
  'settings.logout': 'Cerrar sesión',
  'settings.version': 'BudgetApp v1.0.0',
  'settings.updated': '¡Ajustes actualizados!',
  'settings.failedUpdate':
    'No se pudieron actualizar los ajustes. No se puede conectar con la API en {baseUrl}.',
  'settings.enterValidBudget': 'Por favor ingresa un presupuesto válido',
  'settings.periodDatesRequired':
    'La fecha de inicio y fin son obligatorias para un período personalizado.',
  'settings.periodDateFormat':
    'Usa el formato YYYY-MM-DD para las fechas del período.',
  'settings.periodEndBeforeStart':
    'La fecha de fin debe ser igual o posterior a la fecha de inicio.',
  'settings.logoutTitle': 'Cerrar sesión',
  'settings.logoutConfirm': '¿Estás seguro?',
  'settings.seedSuccess': '¡Categorías por defecto creadas!',
  'settings.seedFailed': 'No se pudieron crear las categorías',
  'settings.reportSentTitle': 'Reporte enviado',
  'settings.reportSentDesc':
    'Tu reporte semanal de gastos fue enviado a tu correo.',
  'settings.reportFailed': 'No se pudo enviar el reporte semanal',
  'settings.noEmail': 'No se encontró correo para esta cuenta.',
  'settings.sendWeeklyTitle': 'Enviar reporte semanal',
  'settings.sendWeeklyConfirm':
    'Esto enviará tu resumen semanal de gastos a tu correo registrado.',

  'settings.languageTitle': 'Idioma',
  'settings.languageDesc': 'Elige el idioma de la app',
  'settings.languageDialogTitle': 'Idioma de la app',
  'settings.languageDialogMessage': 'Selecciona tu idioma preferido',
  'settings.termsTitle': 'Términos y Condiciones',
  'settings.termsDesc': 'Revisa las reglas vigentes para usar BudgetApp',
  'settings.themeTitle': 'Tema',
  'settings.themeDesc': 'Elige la apariencia de la app',
  'settings.themeDialogTitle': 'Modo de tema',
  'settings.themeDialogMessage': 'Selecciona tu modo de tema preferido',
  'settings.themeModeSystem': 'Sistema',
  'settings.themeModeLight': 'Claro',
  'settings.themeModeDark': 'Oscuro',
  'settings.themeModeCustom1': 'Azul medianoche',
  'settings.themeModeCustom2': 'Esmeralda',
  'settings.themeModeCustom3': 'Púrpura amatista',
  'settings.themeLivePreviewTitle': 'Vista previa del tema',
  'settings.themeLivePreviewDesc':
    'El contenedor y el botón cambian al instante cuando eliges otro tema.',
  'settings.themeLivePreviewButton': 'Abrir selector de tema',
  'plan.title': 'Plan y acceso',
  'plan.subtitle':
    'Ajusta aquí el tope de gasto que quieres seguir. Tus ingresos reales se agregan aparte en Flujo de efectivo; luego revisa tu acceso, respaldo y las herramientas Premium disponibles en esta cuenta.',
  'plan.spendingHint':
    'Este plan marca cuánto te quieres permitir gastar. No representa dinero que ya te entró.',
  'plan.heroPremiumDescription':
    'Esta cuenta tiene Premium activo, incluyendo tarjetas guardadas y planes de mensualidades.',
  'plan.heroFreeDescription':
    'Ahora mismo estás en el plan gratis. Mejora cuando quieras tarjetas guardadas y seguimiento de mensualidades.',
  'plan.heroGuestDescription':
    'Estás usando el plan gratis en modo invitado en este dispositivo. Inicia sesión después si quieres respaldo y restauración ligados a tu cuenta.',
  'plan.featuresTitle': 'Beneficios incluidos',
  'plan.featuresSubtitle':
    'Estas son las herramientas habilitadas actualmente para tu nivel de acceso.',
};

const translations = { en, es } as const;

export function isAppLanguage(
  value: string | null | undefined,
): value is AppLanguage {
  return value === 'en' || value === 'es';
}

export function detectDeviceLanguage(): AppLanguage {
  const normalize = (locale?: string): AppLanguage => {
    if (!locale) {
      return 'en';
    }
    return locale.toLowerCase().startsWith('es') ? 'es' : 'en';
  };

  if (Platform.OS === 'ios') {
    const settings = (NativeModules.SettingsManager?.settings ?? {}) as any;
    const locale = settings.AppleLocale || settings.AppleLanguages?.[0];
    return normalize(locale);
  }

  const androidLocale = (NativeModules.I18nManager?.localeIdentifier ??
    NativeModules.I18nManager?.locale) as string | undefined;
  return normalize(androidLocale);
}

export function translate(
  language: AppLanguage,
  key: TranslationKey,
  values?: TranslationValues,
): string {
  const template = translations[language][key] ?? translations.en[key] ?? key;

  if (!values) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_, variable: string) => {
    const value = values[variable];
    return value === undefined ? `{${variable}}` : String(value);
  });
}
