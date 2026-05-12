export class TurnOrder {
  static create(playerIds: string[], startIndex: number): string[] {
    const order: string[] = [];
    for (let i = 0; i < playerIds.length; i++) {
      order.push(playerIds[(startIndex + i) % playerIds.length]);
    }
    return order;
  }

  static nextIndex(currentIndex: number, total: number): number {
    return (currentIndex + 1) % total;
  }

  static prevIndex(currentIndex: number, total: number): number {
    return (currentIndex - 1 + total) % total;
  }

  static getNextPlayer(
    currentPlayerId: string,
    playerIds: string[],
    skippedIds: string[],
  ): string | null {
    const currentIdx = playerIds.indexOf(currentPlayerId);
    const total = playerIds.length;

    for (let i = 1; i <= total; i++) {
      const nextIdx = (currentIdx + i) % total;
      if (!skippedIds.includes(playerIds[nextIdx])) {
        return playerIds[nextIdx];
      }
    }
    return null;
  }

  static getReversedOrder(playerIds: string[]): string[] {
    return [...playerIds].reverse();
  }
}
