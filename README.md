# mickeiik.github.io

Personal portfolio built with [Astro](https://astro.build).

## Project structure

```text
/
├── public/               Static assets (favicon)
├── src/
│   ├── data/
│   │   ├── site.ts       Site config: title, navigation, social links
│   │   └── projects.ts   Project list (edit this to add projects)
│   ├── layouts/
│   │   └── BaseLayout.astro
│   └── pages/
│       ├── index.astro       Home page
│       └── projects.astro   Projects page
└── package.json
```

## Commands

| Command                   | Action                                        |
| :------------------------ | :-------------------------------------------- |
| `npm install`             | Installs dependencies                         |
| `npm run dev`             | Starts local dev server at `localhost:4321`   |
| `npm run build`           | Build your production site to `./dist/`       |
| `npm run preview`         | Preview your build locally, before deploying  |

## Deploying

The `.github/workflows/deploy.yml` workflow builds the site and deploys it to
GitHub Pages automatically on every push to `main`.
