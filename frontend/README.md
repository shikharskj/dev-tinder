# DevTinder — Frontend

React 19 + Vite + Tailwind CSS 4 / daisyUI client for [DevTinder](https://dev-tinder-community.in/).

See the [root README](../README.md) for the full project overview, architecture, and setup.

```bash
npm install
npm run dev      # start Vite dev server
npm run build    # production build
npm run lint     # oxlint
```

In development the app calls the API at `http://localhost:7777`; in production it uses `/api`.

## Test payment card details (Razorpay test mode)

- Card: 4718 6091 0820 4366
- Expiry: 12/29
- CVV: 123
- OTP: Any random 6 digit OTP
