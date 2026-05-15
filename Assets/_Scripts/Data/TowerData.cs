using UnityEngine;

[System.Serializable]
public struct TowerLevelStats
{
    public float range;
    public float fireRate;
    public float damage;
    public int upgradeCost;
    public int sellValue;
    public Sprite towerSprite;
    public Sprite projectileSprite;
}

[CreateAssetMenu(fileName = "TowerData", menuName = "TD/TowerData")]
public class TowerData : ScriptableObject
{
    [Header("Identity")]
    public string towerName = "Tower";
    public TowerType towerType = TowerType.BottleCannon;
    [TextArea(2, 4)]
    public string description;
    public Sprite icon;
    public GameObject prefab;

    [Header("Level Stats")]
    public TowerLevelStats[] levels = new TowerLevelStats[3];

    [Header("Combat")]
    public DamageType damageType = DamageType.Physical;
    public float projectileSpeed = 8f;
    public bool hasSplash = false;
    public float splashRadius = 1f;
    public bool isPenetrating = false;
    public bool appliesSlow = false;
    public float slowFactor = 0.5f;
    public float slowDuration = 2f;

    public TowerLevelStats GetLevelStats(int level)
    {
        int index = Mathf.Clamp(level - 1, 0, levels.Length - 1);
        return levels[index];
    }

    public int GetTotalInvested(int level)
    {
        int total = levels[0].upgradeCost;
        for (int i = 1; i < level && i < levels.Length; i++)
            total += levels[i].upgradeCost;
        return total;
    }
}
