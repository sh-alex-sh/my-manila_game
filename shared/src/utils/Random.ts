export class Random {
  private static seed: number = Date.now();

  static setSeed(seed: number): void {
    this.seed = seed;
  }

  static int(min: number, max: number): number {
    this.seed = (this.seed * 16807 + 0) % 2147483647;
    return min + (this.seed % (max - min + 1));
  }

  static shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Random.int(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}
