# Orgami

A lightweight, self-hosted **organizational chart builder**. Paste your team data
as JSON, get an interactive, beautifully styled org chart in the browser, and
export it as a high-resolution **PNG** or a fully portable **SVG** — all running
locally, with no accounts, no tracking, and no data leaving your machine.

Built on [D3](https://d3js.org/) and
[d3-org-chart](https://github.com/bumbeishvili/org-chart).

## Features

- **JSON-driven** — describe your org as a flat array of `{ id, parentId, ... }`
  records; the hierarchy is derived automatically.
- **Live editing** — edit the JSON and the chart re-renders instantly. Data is
  persisted to `localStorage`, and can be imported/exported as `.json`.
- **Customizable layout** — top-down, bottom-up, or sideways orientation,
  adjustable card size, and selectable accent themes.
- **Search & navigate** — highlight matching people, zoom, fit, and
  expand/collapse the whole tree.
- **Portable exports** — PNG (1x/2x/3x) and SVG that render correctly everywhere
  (browsers, Preview/Quick Look, Illustrator, Figma, Inkscape), with avatars
  embedded and styles inlined so the files are fully self-contained.
- **Image proxy** — a tiny built-in proxy fetches remote avatars server-side so
  cross-origin images export cleanly without canvas tainting.

## Quick start

Requires Python 3 (standard library only — no dependencies to install).

```bash
git clone git@github.com:MenilV/Orgami.git
cd Orgami
python3 server.py          # serves on http://localhost:8080
```

Then open <http://localhost:8080> in your browser.

To use a different port:

```bash
python3 server.py 9000
```

> **Note:** run it through `server.py` rather than opening `index.html` directly.
> The server provides the `/proxy` endpoint that lets remote avatar images be
> embedded into exports.

## Data format

The editor expects a JSON **array** of node objects. Each node needs a unique
`id` and a `parentId` linking it to its manager (the root node uses an empty
`parentId`).

```json
[
  {
    "id": "1",
    "parentId": "",
    "name": "Sarah Jenkins",
    "role": "Chief Executive Officer",
    "department": "Executive",
    "imageUrl": "https://example.com/sarah.jpg"
  },
  {
    "id": "2",
    "parentId": "1",
    "name": "Marcus Vance",
    "role": "VP of Engineering",
    "department": "Engineering",
    "imageUrl": ""
  }
]
```

| Field        | Required | Description                                             |
| ------------ | -------- | ------------------------------------------------------- |
| `id`         | yes      | Unique identifier for the person.                       |
| `parentId`   | yes      | `id` of the manager; empty string for the root.         |
| `name`       | no       | Display name (falls back to a placeholder).             |
| `role`       | no       | Job title.                                              |
| `department` | no       | Shown as a chip on the card.                            |
| `imageUrl`   | no       | Avatar URL; when omitted, initials are shown instead.   |

## Exporting

Use the sidebar buttons:

- **Export High-Res PNG** — rasterized at the scale chosen under *Layout
  Settings → Export Image Quality* (1x / 2x / 3x).
- **Export SVG Vector** — a self-contained vector file. Both formats redraw each
  card with native, embedded content so the whole chart (not just the on-screen
  portion) is captured and renders consistently in any viewer.

## Tech stack

- **Frontend:** vanilla JavaScript, D3 v7, d3-org-chart v3, plain CSS.
- **Backend:** a ~60-line Python `http.server` handler for static files and the
  avatar proxy.

## License

Released under the [MIT License](LICENSE).
