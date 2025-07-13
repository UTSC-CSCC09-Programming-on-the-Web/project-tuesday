export const SERVER_ADDRESS = 'http://localhost:3000/';

export interface GameResults {
  winners: Array<string>
  responses: Record<string, number>;
  rankings: Array<string>;
  gameId: string;
  targetNumber?: number;
}

export interface PlayerRanking {
  name: string;
  playerId: string;
  points: number;
  rank: number;
  isRoundWinner: boolean;
  response: string;
  data: number; //variable field used differently by different games
}
