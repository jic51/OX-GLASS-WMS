# Project skills

## ui-ux-pro-max (and its companion skills: banner-design, brand, design,
design-system, slides, ui-styling)

Vendored from https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
(v2.11.0, MIT license — see `SKILLS_LICENSE_ui-ux-pro-max.txt`).

Local, offline database of UI/UX guidance (styles, color palettes, font
pairings, spacing/accessibility rules, chart types) plus a Python search
script (`ui-ux-pro-max/scripts/search.py`, stdlib only, no network calls).
No CLI/gallery/website build tooling from the upstream repo was copied —
only the `.claude/skills/*` folders, which is all a Claude Code session
needs to load these as skills.

Use it whenever designing or reviewing buttons, modals, popups, or any
other UI in this app — invoke via the `Skill` tool (e.g. `ui-ux-pro-max`)
so the guidance applies before writing CSS/HTML, not as an afterthought.
