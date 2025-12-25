Railway route planning system with support for importing data from OpenStreetMap.

## Features

- 🚄 Railway route planning and shortest path calculation
- 🗺️ OpenStreetMap data import support
- 📊 Station and railway management
- 🧪 Comprehensive test suite
- 🔄 GitHub Actions CI/CD integration

## Installation

```bash
bun install
```

## Usage

### Run the application

```bash
bun start
```

## Current Railway Data

### Guangshengang High-Speed Line (广深港高速线)

Imported from [OpenStreetMap relation 9405634](https://www.openstreetmap.org/relation/9405634)

**Stations:**
1. Guangzhounan (广州南)
2. Nanshabei (南沙北)
3. Humen (虎门)
4. Guangmingcheng (光明城)
5. Shenzhen North (深圳北)
6. Futian (福田)
7. Hong Kong West Kowloon (香港西九龍)

## CI/CD

The project uses GitHub Actions for continuous integration. Tests run automatically on:
- Push to `main`, `master`, or `develop` branches
- Pull requests to these branches
- Manual workflow dispatch

View the workflow at [.github/workflows/test.yml](.github/workflows/test.yml)

## Project Structure

```
.
├── src/
│   ├── db/           # Database initialization
│   ├── models/       # Railway and Station models
│   ├── repositories/ # Data access layer
│   └── services/     # Route planning service
├── index.ts          # Main application entry
└── parse_osm.py      # OpenStreetMap XML parser
```

## Adding New Railway Data

1. Find the railway relation on OpenStreetMap
2. Download the XML data using the API:
   ```bash
   curl "https://www.openstreetmap.org/api/0.6/relation/RELATION_ID/full" -o railway.xml
   ```
3. Parse and generate TypeScript code using the parser
4. Add the stations and railway to your codebase

---

This project was created using `bun init` in bun v1.3.5. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
