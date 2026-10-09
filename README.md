# mickeiik.github.io

Personal portfolio built with [Astro](https://astro.build).

## Commands

| Command           | Action                                      |
| :---------------- | :------------------------------------------ |
| `npm install`     | Install dependencies                        |
| `npm run dev`     | Start the dev server at `localhost:4321`    |
| `npm run build`   | Build the production site to `./dist/`      |
| `npm run preview` | Preview the production build locally        |

## Writing posts

Posts are Markdown files in `src/content/blog/<lang>/` (same file name = translation). Optional frontmatter:

```yaml
draft: true                         # only visible in `astro dev`
aiAssisted: true                    # shows the "drafted with AI" note
series: { id: engflow, part: 1 }    # id must exist in src/data/series.ts
soundtrack: { title: '...', artist: '...' }
```

Code blocks accept a file name and highlighted lines: ` ```ts title="file.ts" {3,5-7} `.

## Environment

- `GITHUB_TOKEN`: enables the GitHub contribution tile at build time. Without it, the tile shows sample data in dev and is hidden in production.
