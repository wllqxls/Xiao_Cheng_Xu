import type { GameState, UpgradeConfigFile, UpgradeEffects } from '../types/GameTypes';

const EMPTY_EFFECTS: UpgradeEffects = {
  restorePowerBonus: 0,
  spreadReduction: 0,
  resourceYieldBonus: 0,
};

export function getUpgradeCost(baseCost: number, costGrowth: number, currentLevel: number): number {
  return Math.ceil(baseCost * costGrowth ** currentLevel);
}

export function getCombinedUpgradeEffects(
  state: GameState,
  upgradeConfig: UpgradeConfigFile,
): UpgradeEffects {
  return upgradeConfig.upgrades.reduce<UpgradeEffects>((total, upgrade) => {
    const level = state.upgradeLevels[upgrade.id] ?? 0;

    total.restorePowerBonus += (upgrade.effects.restorePowerBonus ?? 0) * level;
    total.spreadReduction += (upgrade.effects.spreadReduction ?? 0) * level;
    total.resourceYieldBonus += (upgrade.effects.resourceYieldBonus ?? 0) * level;

    return total;
  }, { ...EMPTY_EFFECTS });
}

export function buyUpgrade(
  state: GameState,
  upgradeConfig: UpgradeConfigFile,
  upgradeId: string,
): boolean {
  const upgrade = upgradeConfig.upgrades.find((item) => item.id === upgradeId);

  if (!upgrade) {
    return false;
  }

  const currentLevel = state.upgradeLevels[upgradeId] ?? 0;

  if (currentLevel >= upgrade.maxLevel) {
    return false;
  }

  const cost = getUpgradeCost(upgrade.baseCost, upgrade.costGrowth, currentLevel);

  if (state.resources < cost) {
    return false;
  }

  state.resources -= cost;
  state.upgradeLevels[upgradeId] = currentLevel + 1;

  return true;
}
