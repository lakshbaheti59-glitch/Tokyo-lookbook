# Tokyo 2026 Garment Export Lookbook

A self-contained editorial lookbook for a garment export presentation aimed at buyers in Tokyo.

## Files

- `index.html` contains the page structure and copy.
- `products.html` is a separate large-format product page builder.
- `styles.css` contains the visual design, responsive layout, and print styling.
- `script.js` powers the animations, direct uploads, drag-and-drop, and optional saved media.
- `products.css` styles the dedicated product boards.
- `products.js` handles adding unlimited products, product details, and media for each one.
- `media/` contains the GitHub-visible photos and videos loaded by the lookbook.

## Fastest Way To Add Media

1. Open `index.html` in a browser.
2. Click any frame, or drag and drop a photo or video directly onto it.
3. Use `Replace` or `Clear` inside the frame any time.

Your selected files are stored in the browser for this lookbook, so the layout stays usable without renaming files.

For GitHub sharing, also place the final media files in `media/` using the fixed names below. Browser uploads are convenient while editing, but committed files in `media/` are what other people can see online.

## Products Page

Open `products.html` for a separate editorial product catalog page.

- Use `Add Product` to create as many product sheets as you want.
- Each sheet has two large product media frames for garment images, videos, alternate angles, or detail shots.
- Product name and details can be filled directly on each board.
- `Duplicate`, `Move`, and `Remove` controls are built in.
- Product boards also load GitHub-visible files named `product-01-front`, `product-01-back`, `product-02-front`, and so on.

## Optional Fixed File Loading

If you prefer fixed files, put them in the `media/` folder and match the slot names below.

Images can be `jpg`, `jpeg`, `png`, `webp`, `avif`, or `svg`.

- `cover-hero`
- `story-editorial`
- `story-detail`
- `collection-01`
- `collection-02`
- `collection-03`
- `factory-floor`
- `factory-craft`
- `contact-qr`
- `closing-hero`

Videos can be `mp4`, `webm`, or `mov`.

- `factory-film`

Product boards use the same image and video extensions. Keep the number in the filename matched to the board order:

- `product-01-front`
- `product-01-back`
- `product-02-front`
- `product-02-back`
- `product-03-front`
- `product-03-back`

Examples:

- `media/cover-hero.jpg`
- `media/collection-02.webp`
- `media/factory-film.mp4`
- `media/factory-process-flow.png`
- `media/product-01-front.jpeg`

## Optional Local Browser View

If you want a cleaner local browser view, from this folder you can run:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Print / PDF

The layout includes print styling, so you can also export the lookbook to PDF directly from the browser.
