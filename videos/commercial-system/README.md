# Commercial System Video

## Preview

```bash
cd videos/commercial-system
npx hyperframes preview
```

Requires `index.html` from Task 2.

## Validation

```bash
cd videos/commercial-system
npx hyperframes lint
npx hyperframes validate
npx hyperframes inspect --samples 15
```

These checks also depend on `index.html` from Task 2.

## Render

```bash
cd videos/commercial-system
npx hyperframes render index.html --output commercial-system.mp4
```

Render also depends on `index.html` from Task 2.
