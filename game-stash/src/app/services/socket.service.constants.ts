import { environment } from '../../environments/environment';

// Use environment-based server address for Socket.IO
export const SERVER_ADDRESS = environment.socketUrl + '/';

export interface GameResults {
  winners: Array<string>
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
  response: string;
  data: number; //variable field used differently by different games
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
