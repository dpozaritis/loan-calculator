# Mortgage Studio

A static, privacy-friendly mortgage calculator and two-scenario comparator. No backend, external libraries, or account required.

## Run

Open `index.html` in your browser, or publish the entire directory on GitHub Pages.

For GitHub Pages: create a public repository, upload `index.html`, `styles.css`, and `app.js` at its root, then go to **Settings → Pages → Build and deployment → Deploy from a branch**, choosing `main` and `/ (root)`.

## Calculations

Monthly payment uses `P*r/(1-(1+r)^(-n))`, where `r` is the annual nominal interest rate divided by 1200 and `n` is months. Zero-rate loans are handled separately. For fixed-to-variable mortgages, the loan is amortized on the requested payoff schedule at the fixed rate, then re-amortized for the remaining term using the midpoint of the minimum and maximum variable rates. The forecast variable rate is held constant thereafter.

The payoff slider changes the target amortization duration, so both scheduled monthly payment and interest cost are recomputed. A faster payoff than the contractual term is equivalent to sustaining payments that amortize the balance on the chosen shorter schedule (not a lump-sum prepayment). Interest and balances are calculated monthly without rounding intermediate payments; displayed amounts are rounded to cents.

This is a scenario planner. Real-world variable rates can change repeatedly. Mortgage offers may use other conventions. Fees, insurance, taxes, and prepayment penalties are excluded.
