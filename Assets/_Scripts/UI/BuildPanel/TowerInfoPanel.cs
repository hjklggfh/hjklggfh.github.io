using UnityEngine;
using UnityEngine.UI;
using TMPro;

public class TowerInfoPanel : MonoBehaviour
{
    [SerializeField] private TextMeshProUGUI towerNameText;
    [SerializeField] private TextMeshProUGUI levelText;
    [SerializeField] private TextMeshProUGUI statsText;
    [SerializeField] private Button upgradeButton;
    [SerializeField] private TextMeshProUGUI upgradeCostText;
    [SerializeField] private Button sellButton;
    [SerializeField] private TextMeshProUGUI sellValueText;
    [SerializeField] private Button closeButton;

    private Tower _currentTower;

    public System.Action<Tower> OnUpgradeClicked;
    public System.Action<Tower> OnSellClicked;
    public System.Action OnCloseClicked;

    private void Awake()
    {
        if (upgradeButton != null)
            upgradeButton.onClick.AddListener(() => OnUpgradeClicked?.Invoke(_currentTower));

        if (sellButton != null)
            sellButton.onClick.AddListener(() => OnSellClicked?.Invoke(_currentTower));

        if (closeButton != null)
            closeButton.onClick.AddListener(() => OnCloseClicked?.Invoke());
    }

    public void Show(Tower tower)
    {
        _currentTower = tower;
        RefreshUI();
    }

    private void RefreshUI()
    {
        if (_currentTower == null) return;

        var stats = _currentTower.CurrentStats;
        var data = _currentTower.Data;

        if (towerNameText != null)
            towerNameText.text = $"{data.towerName}";

        if (levelText != null)
            levelText.text = $"Lv.{_currentTower.CurrentLevel}";

        if (statsText != null)
        {
            statsText.text = $"DMG: {stats.damage:F0}\n"
                + $"Range: {stats.range:F1}\n"
                + $"Speed: {stats.fireRate:F1}/s\n"
                + (data.appliesSlow ? $"Slow: {data.slowFactor * 100}%\n" : "")
                + (data.hasSplash ? $"Splash: {data.splashRadius:F1}\n" : "")
                + (data.isPenetrating ? "Penetrating\n" : "");
        }

        // Upgrade
        bool canUpgrade = _currentTower.CanUpgrade();
        if (upgradeButton != null)
        {
            upgradeButton.gameObject.SetActive(_currentTower.CurrentLevel < 3);
            upgradeButton.interactable = canUpgrade;
        }

        if (upgradeCostText != null)
        {
            int cost = _currentTower.GetUpgradeCost();
            upgradeCostText.text = cost > 0 ? cost.ToString() : "MAX";
        }

        // Sell
        if (sellValueText != null)
            sellValueText.text = _currentTower.GetSellValue().ToString();
    }

    private void Update()
    {
        // Update affordability indicator
        if (_currentTower != null && _currentTower.CurrentLevel < 3)
        {
            bool canAfford = GoldManager.Instance != null
                && GoldManager.Instance.CanAfford(_currentTower.GetUpgradeCost());
            if (upgradeButton != null)
                upgradeButton.interactable = canAfford;
            if (upgradeCostText != null)
                upgradeCostText.color = canAfford ? Color.white : Color.red;
        }
    }
}
