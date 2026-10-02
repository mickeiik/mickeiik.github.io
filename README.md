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

## Workflow

Development happens in the private `mickeiik.github.io-staging` repository:

- `staging`: work branch, WIP and drafts.
- `main`: publishing branch. A push to `main` is mirrored automatically to the public `mickeiik.github.io` repository, whose workflow builds and deploys the site.

Publish a change:

```sh
git switch main
git merge --ff-only staging
git push
```

Rules: never commit directly to the public repository, and always use the GitHub noreply email (`mickeiik@users.noreply.github.com`) for commits, otherwise the mirror push is rejected by GitHub (GH007).

## Deploying

The `.github/workflows/deploy.yml` workflow builds the site and deploys it to
GitHub Pages automatically on every push to `main`.
