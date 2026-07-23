# Firestore Security Specification: Database-Level Calculation Security

This specification outlines the data invariants, calculation formulas, validation patterns, and threat models for the SAAKO Holy Child Academy administrative platform. It ensures strict verification of transactions, prevents tampering with financial ledger fields, and secures structural data.

---

## 1. Core Data Invariants & Calculations

We enforce the following calculations at the database level using Firestore rules:

### A. Worker Salary (`/salaries/{salaryId}`)
* **Invariant Formula:** `netPaid == baseSalary + allowance - deduction`
* **Type Constraints:** `baseSalary`, `allowance`, `deduction`, and `netPaid` must be non-negative numeric types.
* **Integrity Lock:** Modification or insertion of a salary document with tampered `netPaid` (e.g. paying an employee more than their formula dictates) must be rejected by the database.

### B. Exams Expense / Vendor Invoice (`/exams_expenses/{expenseId}`)
* **Invariant Formula (Publisher Exams):** If `billingPerChild > 0`, then `totalAmount == billingPerChild * studentCount`.
* **Invariant Formula (Other Expenses):** If `billingPerChild == 0`, then `studentCount == 0`, and `totalAmount >= 0`.
* **Type Constraints:** `billingPerChild`, `studentCount`, `totalAmount`, and `amountPaid` must be non-negative numeric types.
* **Integrity Lock:** No vendor printing billing or child quantities can be altered or submitted with calculated total amount discrepancies.

### C. Budget Target (`/budget_targets/{targetId}`)
* **Invariant Constraint:** `savedPercentage` must be a numeric value between `0` and `100` inclusive (`savedPercentage >= 0 && savedPercentage <= 100`).
* **Integrity Lock:** Attempts to set saving target percentages out of bonds (e.g., negative, or exceeding 100%) must fail.

### D. Payment Record (`/payments/{paymentId}`) and Exams Payment (`/exams_payments/{paymentId}`)
* **Type Constraints:** `amount` (and `amountPaid`) must be a positive number (`amount > 0`).

---

## 2. Threat Model: The "Dirty Dozen" Attack Payloads

We design rules to explicitly block the following types of malicious, corrupt, or invalid payloads:

1. **The Overpaid Salary Injection (WorkerSalary):**
   * *Payload:* `{ "baseSalary": 500, "allowance": 100, "deduction": 50, "netPaid": 1000 }`
   * *Outcome:* Rejected. Calculated net (550) does not match `netPaid` (1000).
2. **The Negative Salary Deduction (WorkerSalary):**
   * *Payload:* `{ "baseSalary": 500, "allowance": 100, "deduction": -50, "netPaid": 650 }`
   * *Outcome:* Rejected. Deduction is negative.
3. **The Inflated Exams Billing (ExamsExpense):**
   * *Payload:* `{ "billingPerChild": 10, "studentCount": 50, "totalAmount": 10000 }`
   * *Outcome:* Rejected. Total amount (10000) is far higher than the child rate calculation (500).
4. **The Negative Exams Student Count (ExamsExpense):**
   * *Payload:* `{ "billingPerChild": 10, "studentCount": -5, "totalAmount": -50 }`
   * *Outcome:* Rejected. Negative quantities are prohibited.
5. **The Excess Savings Allocation (BudgetTarget):**
   * *Payload:* `{ "itemName": "Generator", "targetAmount": 2000, "savedPercentage": 150 }`
   * *Outcome:* Rejected. `savedPercentage` exceeds 100%.
6. **The Negative Savings Allocation (BudgetTarget):**
   * *Payload:* `{ "itemName": "Generator", "targetAmount": 2000, "savedPercentage": -10 }`
   * *Outcome:* Rejected. `savedPercentage` must be non-negative.
7. **The Free Tuition Submission (PaymentRecord):**
   * *Payload:* `{ "studentId": "s123", "amount": 0, "verified": true }`
   * *Outcome:* Rejected. `amount` must be strictly positive.
8. **The Negative Check-In Tuition Fee (PaymentRecord):**
   * *Payload:* `{ "studentId": "s123", "amount": -5, "verified": true }`
   * *Outcome:* Rejected. Negative transactions are prohibited.
9. **The Zero Cost Exam Registration (ExamsPayment):**
   * *Payload:* `{ "studentId": "s456", "amountPaid": -20 }`
   * *Outcome:* Rejected. Positive exam fees are mandatory.
10. **The Orphaned Student Payment (PaymentRecord):**
    * *Payload:* `{ "studentId": "", "amount": 5, "studentName": "" }`
    * *Outcome:* Rejected. Valid student fields are required.
11. **The Missing Active Status Term (Term):**
    * *Payload:* `{ "name": "Term 3", "daysCount": -10 }`
    * *Outcome:* Rejected. `daysCount` must be positive.
12. **The Corrupt User Account (UserAccount):**
    * *Payload:* `{ "email": "invalid-email", "role": "Hacker" }`
    * *Outcome:* Rejected. Role is not in the valid enum and email address fails schema checks.

---

## 3. Translation of Requirements to Security Rules

We will build reusable helper functions to validate types and math calculations:

* `isNum(v)`: Verifies variable is `number` (either `int` or `float`).
* `isString(v)`: Verifies variable is non-empty string.
* `isBool(v)`: Verifies variable is a boolean.
* `isValidWorkerSalary(data)`: Enforces netPaid formula and field constraints.
* `isValidExamsExpense(data)`: Enforces publisher invoice calculations and other non-publisher criteria.
* `isValidBudgetTarget(data)`: Enforces bounds on savings allocations.
* `isValidPayment(data)`: Enforces positive collection amounts.
