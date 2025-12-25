import { RailwayRepository } from "../repositories/RailwayRepository";
import { RailwayEdge, Railway } from "../models/Railway";

interface GraphEdge {
  toStationId: string;
  weight: number;
  edge: RailwayEdge;
  railway: Railway;
}

interface GraphNode {
  stationId: string;
  edges: GraphEdge[];
}

export interface RouteResult {
  edges: RailwayEdge[];
  totalDistance: number;
  pathDescription: string[];
}

export class RoutePlanner {
  private railwayRepo: RailwayRepository;

  constructor() {
    this.railwayRepo = new RailwayRepository();
  }

  async findShortestPath(startStationId: string, endStationId: string): Promise<RouteResult | null> {
    // 1. Build Graph
    const railways = this.railwayRepo.findAll();
    const graph = new Map<string, GraphNode>();

    railways.forEach(railway => {
      railway.edges.forEach(edge => {
        // Add node for station1 if not exists
        if (!graph.has(edge.station1.id)) {
          graph.set(edge.station1.id, { stationId: edge.station1.id, edges: [] });
        }
        // Add node for station2 if not exists
        if (!graph.has(edge.station2.id)) {
          graph.set(edge.station2.id, { stationId: edge.station2.id, edges: [] });
        }

        // Add bidirectional connections
        graph.get(edge.station1.id)!.edges.push({
          toStationId: edge.station2.id,
          weight: edge.distance,
          edge: edge,
          railway: railway
        });
        graph.get(edge.station2.id)!.edges.push({
          toStationId: edge.station1.id,
          weight: edge.distance,
          edge: edge,
          railway: railway
        });
      });
    });

    // 2. Dijkstra's Algorithm
    const distances = new Map<string, number>();
    const previous = new Map<string, { fromId: string; edge: RailwayEdge; railway: Railway }>();
    const unvisited = new Set<string>();

    // Initialize
    for (const stationId of graph.keys()) {
      distances.set(stationId, Infinity);
      unvisited.add(stationId);
    }
    distances.set(startStationId, 0);

    if (!graph.has(startStationId) || !graph.has(endStationId)) {
      return null; // One of the stations doesn't exist in the network
    }

    while (unvisited.size > 0) {
      // Find unvisited node with smallest distance
      let currentId: string | null = null;
      let minDist = Infinity;

      for (const id of unvisited) {
        const d = distances.get(id)!;
        if (d < minDist) {
          minDist = d;
          currentId = id;
        }
      }

      if (currentId === null || distances.get(currentId) === Infinity) {
        break; // No reachable nodes left
      }

      if (currentId === endStationId) {
        break; // Reached destination
      }

      unvisited.delete(currentId);

      // Explore neighbors
      const neighbors = graph.get(currentId)!.edges;
      for (const neighbor of neighbors) {
        if (!unvisited.has(neighbor.toStationId)) continue;

        const alt = distances.get(currentId)! + neighbor.weight;
        if (alt < distances.get(neighbor.toStationId)!) {
          distances.set(neighbor.toStationId, alt);
          previous.set(neighbor.toStationId, { 
            fromId: currentId, 
            edge: neighbor.edge, 
            railway: neighbor.railway 
          });
        }
      }
    }

    // 3. Reconstruct Path
    if (distances.get(endStationId) === Infinity) {
      return null; // No path found
    }

    const pathEdges: RailwayEdge[] = [];
    const pathRailways: Railway[] = []; // Keep track of railways per edge
    let curr = endStationId;
    
    while (curr !== startStationId) {
      const prev = previous.get(curr);
      if (!prev) break;
      pathEdges.unshift(prev.edge);
      pathRailways.unshift(prev.railway);
      curr = prev.fromId;
    }

    // Generate description
    const description: string[] = [];
    let currentStationId = startStationId;
    
    pathEdges.forEach((edge, index) => {
        const nextStation = edge.station1.id === currentStationId ? edge.station2 : edge.station1;
        const railway = pathRailways[index];
        
        description.push(
          `[${railway.nameLocal} / ${railway.nameEnglish}] ${edge.station1.nameLocal} <-> ${edge.station2.nameLocal} (${edge.distance}km)`
        );
        currentStationId = nextStation.id;
    });

    return {
      edges: pathEdges,
      totalDistance: distances.get(endStationId)!,
      pathDescription: description
    };
  }
}
