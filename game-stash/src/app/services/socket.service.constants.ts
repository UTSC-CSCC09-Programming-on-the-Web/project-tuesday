export const SERVER_ADDRESS = 'https://6d08a20f821e.ngrok-free.app';

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
