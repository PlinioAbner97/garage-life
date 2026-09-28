export const levelFromXp = (xp: number) => 1 + Math.floor(Math.sqrt(xp / 25));
export const xpForLevel = (level: number) => 25 * (level - 1) * (level - 1);
export const WORK_REWARD = { money: 60, xp: 15 };
export const xpForPurchase = (price: number) => Math.floor(price / 10);
export const fmtMoney = (n: number) => '$' + n.toLocaleString('en-US');
