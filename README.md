# 🚀 AnatWithMe
📌 This application is meant to help anatomy students schedule student groups. They are matched based on their selected availability and if they want to meet in-person or online. The admins are able to manually adjust selected groups and import assignment links for each weekly agenda.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## ✨ Key Features
## 👨‍🏫 Admin Features
- View full roster of registered students
- Generate student groups based on availability
- Manually adjust group assignments
- Remove or reassign students from groups
- Regenerate groups when needed
- Add tasks and links to weekly agendas

## 🎓 Student Features
- Select weekly availability in hourly time slots
- Choose meeting preference (online or in-person)
- View assigned group members after matching
- Edit personal profile information
- 
## ⚙️ Getting Started

1. Install dependencies
```bash
npm install
# or
yarn install
# or
pnpm install
```

2. Run the development server
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```
3. Open your browser and go to:
👉 http://localhost:3000


You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## 🧱 Project Structure
- app/page.tsx        # Main landing page
- app/layout.tsx      # Root layout
- components/       # Reusable UI components
- public/           # Static assets
- styles/           # Global styles

## 🎨 Tech Stack
- Next.js (App Router)
- React
- TypeScript
- next/font (Geist font optimization)
- Vercel (deployment)

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
