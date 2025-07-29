export const SERVER_ADDRESS = 'https://7aad926041db.ngrok-free.app';

export interface GameResults {
  winners: Array<string>;
  responses: Record<string, number>;
  rankings: Array<string>;
  gameId: string;
  targetNumber?: number;
}

export interface PlayerRanking {
  player: Player;
  points: number;
  rank: number;
  isRoundWinner: boolean;
  data: number | undefined; //variable field used differently by different games
}

export interface Player {
  name: string;
  playerId: string;
}

export interface GlobalRanking {
  [playerId: string]: GlobalRank;
}

export interface GlobalRank {
  playerId: string;
  points: number;
}
