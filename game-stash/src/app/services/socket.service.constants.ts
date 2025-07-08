export const SERVER_ADDRESS = 'http://localhost:3000/';

export interface GameResults {
  winners: Array<string>
  response: Record<string, number>;
  rankings: Array<string>;
  gameId: string;
  targetNumber?: number;
}
