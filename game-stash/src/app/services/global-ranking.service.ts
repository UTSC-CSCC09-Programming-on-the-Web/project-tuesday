import { Injectable } from '@angular/core';

interface GlobalRanking {
  [playerId: string]: GlobalRank;
}

interface GlobalRank {
  playerId: string;
  points: number;
}

@Injectable({
  providedIn: 'root',
})
export class GlobalRankingService {
  constructor() {}

  private rankings: GlobalRanking = {};

  updateRanking(playerId: string, points: number): void {
    if (!this.rankings[playerId]) {
      this.rankings[playerId] = { playerId, points };
    } else {
      this.rankings[playerId].points += points;
    }
  }

  getRanking(playerId: string): GlobalRank | undefined {
    return this.rankings[playerId];
  }

  getAllRankings(): GlobalRanking {
    return this.rankings;
  }
}
