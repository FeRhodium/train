import { Station } from './Station';

export interface RailwayEdge {
  station1: Station;
  station2: Station;
  distance: number;
}

export class Railway {
  id: string;
  nameLocal: string;
  nameEnglish: string;
  edges: RailwayEdge[];

  constructor(id: string, nameLocal: string, nameEnglish: string) {
    this.id = id;
    this.nameLocal = nameLocal;
    this.nameEnglish = nameEnglish;
    this.edges = [];
  }

  addEdge(s1: Station, s2: Station, distance: number): void {
    this.edges.push({ station1: s1, station2: s2, distance });
  }
}
