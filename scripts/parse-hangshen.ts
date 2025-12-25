import { writeFile } from "fs/promises";
import { XMLParser } from "fast-xml-parser";

// Sources
const JP_URL = "https://jprailfan.com/tools/stat/?linename=%E6%9D%AD%E6%B7%B1%E7%BA%BF";
const OSM_RELATION_ID = "2052885"; // Hangzhou-Shenzhen Line

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });

type StationOut = {
  id: string;
  nameLocal: string;
  nameRomaji: string;
  nameEnglish: string;
  location: { latitude: number; longitude: number };
  hasPassengerService: boolean;
};

type EdgeOut = { station1Id: string; station2Id: string; distance: number };

type OsmNode = { id: string; lat: number; lon: number; tags: Record<string, string> };

type OsmData = {
  nodes: Map<string, OsmNode>;
  ways: Map<string, string[]>;
  relation: any;
};

function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function parseTags(tag: any): Record<string, string> {
  if (!tag) return {};
  const tagsArray = toArray(tag);
  const result: Record<string, string> = {};
  for (const t of tagsArray) {
    if (t.k && typeof t.v !== "undefined") result[t.k] = String(t.v);
  }
  return result;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}

function normalizeHtmlToLines(html: string): string[] {
  return html
    .replace(/<tr[^>]*>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<td[^>]*>/gi, "|")
    .replace(/<\/td>/gi, "|")
    .replace(/<th[^>]*>/gi, "|")
    .replace(/<\/th>/gi, "|")
    .replace(/<[^>]+>/g, " ")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.includes("杭深线"));
}

function parseJpStations(html: string): StationOut[] {
  const lines = normalizeHtmlToLines(html);
  const result: StationOut[] = [];

  for (const line of lines) {
    const cols = line
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);
    if (cols.length < 5) continue;
    const [lineName, stationName, , , stationCode] = cols;
    if (lineName !== "杭深线") continue;
    if (!stationName || !stationCode) continue;

    const hasPassengerService = !cols.includes("连接");

    result.push({
      id: stationCode,
      nameLocal: stationName,
      nameRomaji: stationName,
      nameEnglish: stationName,
      location: { latitude: 0, longitude: 0 },
      hasPassengerService,
    });
  }

  return result;
}

function stripSuffixes(name: string): string {
  return name
    .replace(/线路所/g, "所")
    .replace(/站/g, "");
}

async function fetchRelationOsm(relationId: string): Promise<OsmData> {
  const url = `https://www.openstreetmap.org/api/0.6/relation/${relationId}/full`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch relation ${relationId}: ${res.status}`);
  const xml = await res.text();
  const data = parser.parse(xml);
  const osm = data.osm;

  const nodes = new Map<string, OsmNode>();
  for (const node of toArray(osm.node)) {
    const tags = parseTags(node.tag);
    const lat = Number(node.lat);
    const lon = Number(node.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    nodes.set(String(node.id), { id: String(node.id), lat, lon, tags });
  }

  const ways = new Map<string, string[]>();
  for (const way of toArray(osm.way)) {
    const nds = toArray(way.nd).map((n: any) => String(n.ref)).filter(Boolean);
    ways.set(String(way.id), nds);
  }

  const relation = toArray(osm.relation).find((r) => String(r.id) === relationId);
  if (!relation) throw new Error(`Relation ${relationId} not found`);

  return { nodes, ways, relation };
}

function isStationLike(node: OsmNode, role?: string) {
  const railwayTag = node.tags["railway"];
  const ptTag = node.tags["public_transport"];
  const roleVal = role || "";
  return (
    railwayTag === "station" ||
    railwayTag === "junction" ||
    railwayTag === "halt" ||
    railwayTag === "stop" ||
    railwayTag === "stop_position" ||
    ptTag === "station" ||
    ptTag === "stop_position" ||
    ptTag === "platform" ||
    roleVal.includes("stop") ||
    roleVal.includes("station")
  );
}

function buildSequence(relation: any, ways: Map<string, string[]>): string[] {
  const seq: string[] = [];
  for (const member of toArray(relation.member)) {
    if (member.type === "node") {
      seq.push(String(member.ref));
    } else if (member.type === "way") {
      const nds = ways.get(String(member.ref));
      if (nds && nds.length) seq.push(...nds);
    }
  }
  return seq;
}

function sliceDistance(seq: string[], nodes: Map<string, OsmNode>, startIdx: number, endIdx: number): number {
  let dist = 0;
  for (let i = startIdx; i < endIdx; i++) {
    const n1 = nodes.get(seq[i]);
    const n2 = nodes.get(seq[i + 1]);
    if (n1 && n2) dist += haversineKm(n1.lat, n1.lon, n2.lat, n2.lon);
  }
  return Number(dist.toFixed(2));
}

async function main() {
  // Step 1: JP station list
  const jpHtml = await fetchHtml(JP_URL);
  const jpStations = parseJpStations(jpHtml);

  // Step 2: OSM relation data
  const osm = await fetchRelationOsm(OSM_RELATION_ID);
  const relation = osm.relation;

  // Build station list filtered to jp names
  const stationNodes: string[] = [];
  for (const member of toArray(relation.member)) {
    if (member.type !== "node") continue;
    const ref = String(member.ref);
    const node = osm.nodes.get(ref);
    if (!node) continue;
    if (isStationLike(node, member.role)) stationNodes.push(ref);
  }

  // Log all OSM stations (station-like nodes) to file
  const osmStations = stationNodes.map((ref) => {
    const node = osm.nodes.get(ref)!;
    const rawName = node.tags["name:zh"] || node.tags["name"] || "";
    const stripped = rawName ? stripSuffixes(rawName) : rawName;
    return {
      osmNodeId: ref,
      nameLocalRaw: rawName,
      nameLocal: stripped,
      nameRomaji: node.tags["name:en"] || stripped || rawName,
      nameEnglish: node.tags["name:en"] || stripped || rawName,
      location: { latitude: node.lat, longitude: node.lon },
      hasPassengerService: true,
    };
  });

  // Map jp name -> code
  const jpNameToId = new Map(jpStations.map((s) => [s.nameLocal, s.id]));

  // Keep only stations present in jp list, preserve relation order
  const stations: StationOut[] = [];
  const keptRefs: string[] = [];
  for (const ref of stationNodes) {
    const node = osm.nodes.get(ref);
    if (!node) continue;
    const rawName = node.tags["name:zh"] || node.tags["name"];
    const nameLocal = rawName ? stripSuffixes(rawName) : rawName;
    if (!nameLocal) continue;
    const id = jpNameToId.get(nameLocal);
    if (!id) continue;
    const jpStation = jpStations.find((s) => s.id === id);
    const hasPassengerService = jpStation?.hasPassengerService ?? true;
    keptRefs.push(ref);
    stations.push({
      id,
      nameLocal,
      nameRomaji: node.tags["name:en"] || nameLocal,
      nameEnglish: node.tags["name:en"] || nameLocal,
      location: { latitude: node.lat, longitude: node.lon },
      hasPassengerService,
    });
  }

  // Build path sequence and distances between kept stations
  const seq = buildSequence(relation, osm.ways);
  const idxMap = new Map<string, number>();
  seq.forEach((ref, idx) => {
    if (!idxMap.has(ref)) idxMap.set(ref, idx);
  });

  const edges: EdgeOut[] = [];
  for (let i = 0; i < keptRefs.length - 1; i++) {
    const aRef = keptRefs[i];
    const bRef = keptRefs[i + 1];
    const aIdx = idxMap.get(aRef) ?? -1;
    const bIdx = idxMap.get(bRef) ?? -1;
    let distance = 0;
    if (aIdx >= 0 && bIdx > aIdx) {
      distance = sliceDistance(seq, osm.nodes, aIdx, bIdx);
    } else {
      const n1 = osm.nodes.get(aRef);
      const n2 = osm.nodes.get(bRef);
      if (n1 && n2) distance = haversineKm(n1.lat, n1.lon, n2.lat, n2.lon);
    }
    distance = Number(distance.toFixed(2));
    edges.push({ station1Id: jpStations.find((s) => s.id === stations[i].id) ? stations[i].id : stations[i].id, station2Id: stations[i + 1].id, distance });
  }

  // Outputs
  const stationsOut = jpStations.map((s) => {
    const match = stations.find((t) => t.id === s.id);
    return match ? match : { ...s, location: { latitude: 0, longitude: 0 }, hasPassengerService: s.hasPassengerService };
  });

  await writeFile(
    "data/hangshen-jp-stations.json",
    JSON.stringify({ generatedAt: new Date().toISOString(), sourceUrl: JP_URL, stations: stationsOut }, null, 2),
    "utf8"
  );

  await writeFile(
    "data/hangshen-line-filtered.json",
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        jpSource: JP_URL,
        osmRelation: `https://www.openstreetmap.org/relation/${OSM_RELATION_ID}`,
        stations,
        edges,
      },
      null,
      2
    ),
    "utf8"
  );

  await writeFile(
    "data/hangshen-osm-stations.json",
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        osmRelation: `https://www.openstreetmap.org/relation/${OSM_RELATION_ID}`,
        stations: osmStations,
      },
      null,
      2
    ),
    "utf8"
  );

  console.log(
    `Wrote data/hangshen-jp-stations.json (${stationsOut.length} jp stations), data/hangshen-line-filtered.json (${stations.length} matched stations, ${edges.length} edges), and data/hangshen-osm-stations.json (${osmStations.length} osm stations).`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
