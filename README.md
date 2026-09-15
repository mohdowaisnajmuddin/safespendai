💰 Buy or Wait? — AI Affordability & Payment Planning Agent

🔗 Live demo: https://safespendai.netlify.app/

An AI agent that evaluates whether a purchase is safe to make right now, based on a user's actual cash flow — not a generic budgeting calculator.

✨ What it actually does

🤖 Ask Agent. The user describes a purchase in plain language ("Can I afford this M3 MacBook Pro ($1,800) for design freelance work?"), sets an amount, currency, purchase date, and needed-by date, and optionally attaches a receipt/invoice screenshot.

🛡️ Affordability verdict with a protected reserve floor. The agent checks the purchase against the user's current balance, upcoming income, upcoming expenses, and a user-defined minimum safety balance (e.g. $800 floor), and returns a verdict such as "Safe with a Structured Payment Plan" rather than a flat yes/no.

📅 Recommended payment schedule. Breaks the purchase into a concrete step-by-step plan (e.g. pay $350 today, $1,450 on a specific future date) timed against confirmed incoming income.

⚖️ Compare Payment Options. Evaluates and labels safe/unsafe: full payment, partial payment, 3-payment installment, 6-payment installment (including any financing fee), and "wait for upcoming income" — each shown with its own reserve safety buffer and payment schedule, flagging issues like installments scheduled after a completion deadline.

📈 90-day cash-flow simulation. A day-by-day balance projection chart showing the reserve floor, confirmed income inflows, and plan payments, with the lowest projected balance called out explicitly.

✂️ Flexible spending & budget optimizer. Surfaces specific recurring discretionary expenses (e.g. entertainment subscriptions, gym membership) with one-click "Cut 50%" or "Pause Service" actions to free up safe cash capacity.

🌐 Multi-currency support, with the selected currency and protected reserve floor shown persistently in the header.
🛠️ Tech stack

[Fill in — frontend framework, LLM/agent framework used, hosting]

⚙️ Running locally
git clone https://github.com/yourusername/safespendai.git
cd safespendai
npm install
npm run dev
📸 Screenshots

<img width="1893" height="876" alt="Screenshot 2026-09-14 184743" src="https://github.com/user-attachments/assets/0facef55-2b12-49c5-b5ba-577ca743f388" />
<img width="1910" height="587" alt="Screenshot 2026-09-14 184750" src="https://github.com/user-attachments/assets/884a39ba-0a65-4775-ad9e-a485ef9911d2" />


📄 License

MIT License

Copyright (c) 2026 Mohammed Owais Najmuddin

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

