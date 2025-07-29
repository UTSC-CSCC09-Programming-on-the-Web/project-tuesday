export const SERVER_ADDRESS = 'https://b14f6346a0f2.ngrok-free.app';

export interface GameResults {
  winners: Array<string>;
  responses: Record<string, number>;
  rankings: Array<string>;
  gameId: string;
  targetNumber?: number;
}

export interface PlayerRanking {
  player: Player;

  /*
    Magic Number: points
    Load Balancing: unused...?
  */
  points: number;
  rank: number;
  isRoundWinner: boolean;

  /*
    Magic Number: guess
    Load Balancing: score
  */
  data: number | undefined;
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
