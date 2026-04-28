# Commercial System Video

This workspace becomes runnable after `videos/commercial-system/index.html` exists.

## Preview

```bash
cd videos/commercial-system
npx hyperframes preview
```

Requires `videos/commercial-system/index.html` to exist.

## Validation

```bash
cd videos/commercial-system
npx hyperframes lint
npx hyperframes validate
npx hyperframes inspect --samples 15
```

These checks also depend on `videos/commercial-system/index.html` to exist.

## Render

```bash
cd videos/commercial-system
npx hyperframes render --output commercial-system.mp4
```

Render also depends on `videos/commercial-system/index.html` to exist.
