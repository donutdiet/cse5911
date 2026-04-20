# 🚀 AnatWithMe
📌 This application is meant to help anatomy students schedule student groups. They are matched based on their selected availability and if they want to meet in-person or online. The admins are able to manually adjust selected groups and import assignment links for each weekly agenda.

Documentation PDF: [5911 Hand Off Documentation.pdf](https://github.com/user-attachments/files/26911859/5911.Hand.Off.Documentation.pdf)

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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
👉 [http://localhost:3000](http://localhost:3000)

4. Once deployed, go to [https://anatwithme.org/](https://anatwithme.org/) 

## 🧱 Project Structure
- app/page.tsx        # Main landing page
- app/layout.tsx      # Root layout
- components/       # Reusable UI components
- public/           # Static assets
- lib/              # Admin, matching structure + Supabase access

## 🎨 Tech Stack
- Next.js (App Router)
- React
- TypeScript
- next/font (Geist font optimization)
- Vercel (deployment)
- Supabase
- Tailwind
- Radix
- shadcn
