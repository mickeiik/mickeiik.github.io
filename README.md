# mickeiik.github.io

Personal portfolio built with [Astro](https://astro.build).

## Project structure

```text
/
├── public/                 Static assets (favicon)
├── src/
│   ├── styles/
│   │   ├── tokens.css      Design tokens: colors, type, radii, spacing, motion, code colors
│   │   ├── motion.css      Shared animations (entrance, list enter/leave, loops)
│   │   ├── global.css      Reset, base elements, utilities
│   │   └── prose.css       Article body and code block styles
│   ├── components/
│   │   ├── ui/             Building blocks: Tile, Button, Icon, Prompt
│   │   ├── layout/         Persistent header, footer, logo
│   │   ├── home/           Homepage bento tiles
│   │   ├── blog/           Writing list, filters and article parts
│   │   ├── music/          Now playing card and phone player panel
│   │   └── notfound/       404 illustration
│   ├── views/              Page bodies shared by the English and French routes
│   ├── pages/              Thin routes (/, /blog/, /fr/...) plus 404
│   ├── scripts/            Client behavior: header, filters, contents, clock, code copy
│   ├── layouts/            BaseLayout (head, fonts, page transitions, header, footer)
│   ├── lib/                Post helpers, live data shapes, GitHub fetch, code block transformer
│   ├── data/
│   │   ├── site.ts         Site config: title, navigation, social links
│   │   ├── home.ts         Which homepage tiles are shown, curated "building" tile
│   │   └── series.ts       Series titles and descriptions
│   ├── i18n/               UI strings (ui.ts) and language helpers (utils.ts)
│   └── content/blog/       Posts in en/ and fr/ (same file name = translation)
└── package.json
```

## Writing posts

Posts are Markdown files in `src/content/blog/<lang>/`. Optional frontmatter:

```yaml
draft: true                         # only visible in `astro dev`
aiAssisted: true                    # shows the "drafted with AI" note
series: { id: engflow, part: 1 }    # id must exist in src/data/series.ts
soundtrack: { title: '...', artist: '...' }
```

Code blocks accept a file name and highlighted lines: ` ```ts title="file.ts" {3,5-7} `.

Live homepage tiles (music, reading, building) show sample data in `astro dev`
and stay hidden in production until their data source is connected (`src/data/home.ts`, `src/lib/live.ts`).

The GitHub tile reads the real contribution calendar at build time (`src/lib/github.ts`) when
`GITHUB_TOKEN` is set, for example in `.env` or with `GITHUB_TOKEN=$(gh auth token) npm run build`.
Without it, `astro dev` shows sample data and production builds hide the tile. The deploy workflow
passes the Actions token and rebuilds the site every day so the tile stays current.

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
