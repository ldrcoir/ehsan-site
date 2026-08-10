# Personal Site

A clean, modern, fully responsive personal portfolio website built with plain HTML, CSS, and JavaScript — no build step, no dependencies, no frameworks.

## What's inside

```
personal-site/
├── index.html        # the page
├── css/
│   └── style.css     # all styles
├── js/
│   └── main.js       # interactions
├── assets/           # drop your images here
└── README.md         # this file
```

## Features

- Responsive — looks great on phone, tablet, and desktop
- Dark theme with gradient accents
- Sticky navbar with blur, mobile hamburger menu
- Smooth scroll + scroll-reveal animations
- Sections: Hero, About, Skills, Projects, Contact
- Working contact form (opens the user's email client)
- Back-to-top button
- Accessible — keyboard focus, reduced-motion support

## How to use

1. Unzip the folder.
2. Open `index.html` in your browser. That's it — the site runs.
3. To deploy: drag the folder into Netlify Drop, or upload to any static host (Vercel, GitHub Pages, Cloudflare Pages).

## How to customize

| Want to change... | Edit this |
|---|---|
| Your name, title, intro | `index.html` → Hero section |
| About text | `index.html` → `#about` |
| Skill list | `index.html` → `#skills` → `.tags` |
| Projects | `index.html` → `#projects` |
| Email / socials | Search for `you@example.com`, `github.com/`, `linkedin.com/`, `twitter.com/` in `index.html` |
| Colors | `css/style.css` → `:root` variables at the top |
| Fonts | `index.html` `<link>` + `--font` in CSS |

## Tech

- HTML5
- CSS3 (custom properties, grid, flexbox)
- Vanilla JS (IntersectionObserver, no libraries)

Built to be a solid starting point — extend it however you like.
