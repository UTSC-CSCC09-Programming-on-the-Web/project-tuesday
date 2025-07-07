export const SERVER_ADDRESS = 'http://localhost:3000/';

export interface GameResults {
  responses: Record<string, number>;
  rankings: Array<string>;
  gameId: string;
  targetNumber?: number;
}
