using UnityEngine;

public class Tower : MonoBehaviour
{
    [SerializeField] private TowerData towerData;
    [SerializeField] private SpriteRenderer bodyRenderer;
    [SerializeField] private SpriteRenderer turretRenderer;
    [SerializeField] private GameObject rangeIndicator;

    private int _currentLevel = 1;
    private TowerTargeting _targeting;
    private TowerAttack _attack;
    private Platform _platform;

    public TowerData Data => towerData;
    public int CurrentLevel => _currentLevel;
    public Platform Platform => _platform;
    public TowerLevelStats CurrentStats => towerData.GetLevelStats(_currentLevel);
    public Enemy CurrentTarget => _targeting != null ? _targeting.CurrentTarget : null;

    public System.Action<Tower> OnTowerSold;

    private void Awake()
    {
        _targeting = GetComponent<TowerTargeting>();
        _attack = GetComponent<TowerAttack>();
        if (bodyRenderer == null) bodyRenderer = GetComponent<SpriteRenderer>();
    }

    public void Initialize(TowerData data, int level, Platform platform)
    {
        towerData = data;
        _currentLevel = level;
        _platform = platform;

        ApplyLevelVisuals();
        _targeting?.Initialize(this);
        _attack?.Initialize(this);
    }

    public bool CanUpgrade()
    {
        return _currentLevel < 3 && GoldManager.Instance != null
            && GoldManager.Instance.CanAfford(towerData.GetLevelStats(_currentLevel + 1).upgradeCost);
    }

    public int GetUpgradeCost()
    {
        if (_currentLevel >= 3) return -1;
        return towerData.GetLevelStats(_currentLevel + 1).upgradeCost;
    }

    public void Upgrade()
    {
        if (_currentLevel >= 3) return;

        int cost = towerData.GetLevelStats(_currentLevel + 1).upgradeCost;
        if (GoldManager.Instance == null || !GoldManager.Instance.Spend(cost))
            return;

        _currentLevel++;
        ApplyLevelVisuals();
        _targeting?.RefreshRange(this);
    }

    public int GetSellValue()
    {
        float totalInvested = towerData.GetTotalInvested(_currentLevel);
        float ratio = GameBalanceSettings.Instance != null
            ? GameBalanceSettings.Instance.sellRefundRatio : 0.5f;
        return Mathf.RoundToInt(totalInvested * ratio);
    }

    public void Sell()
    {
        int value = GetSellValue();
        GoldManager.Instance?.Earn(value);

        _platform?.RemoveTower();
        OnTowerSold?.Invoke(this);
        Destroy(gameObject);
    }

    public void ShowRangeIndicator(bool show)
    {
        if (rangeIndicator != null)
        {
            rangeIndicator.SetActive(show);
            if (show)
            {
                float diameter = CurrentStats.range * 2f;
                rangeIndicator.transform.localScale = new Vector3(diameter, diameter, 1f);
            }
        }
    }

    public void SetHighlight(bool highlight)
    {
        if (bodyRenderer != null)
            bodyRenderer.color = highlight ? Color.yellow : Color.white;
    }

    private void ApplyLevelVisuals()
    {
        var stats = towerData.GetLevelStats(_currentLevel);
        if (bodyRenderer != null && stats.towerSprite != null)
            bodyRenderer.sprite = stats.towerSprite;
        if (turretRenderer != null)
            turretRenderer.sprite = stats.towerSprite;
    }
}
