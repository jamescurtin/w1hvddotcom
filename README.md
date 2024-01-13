# w1hvd.com

![Build site](https://github.com/jamescurtin/w1hvddotcom/workflows/Build/badge.svg)

Page for the amateur station W1HVD

## Local Development

This repository contains submodules.
Be sure to recursively clone all submodules (_e.g._ `git clone --recursive ...`).

To setup for the first time:

```bash
npm install
```

### Running

Start the local dev server by running:

```bash
npm run dev
```

and navigate to http://localhost:1313

### Updating

```bash
npm run update-modules
```

### Linting

To attempt to auto-fix lint errors:

```bash
npm run format
```

To fail on lint errors:

```bash
npm run format-check
```

## Deployments

The site auto-deploys when merging to main.
